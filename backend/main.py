from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import os
import pandas as pd
from pathlib import Path
from docling.document_converter import DocumentConverter 
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

# DB Imports
from database import init_db, get_db, engine, Base
from models import Job, JobStatus

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize converter (lazy loading might be better for startup, but keeping simplest for now)
try:
    converter = DocumentConverter()
except Exception as e:
    print(f"Warning: Docling failed to initialize on startup: {e}")
    converter = None

@app.on_event("startup")
async def on_startup():
    # Enable WAL mode for concurrency
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL;"))
        await conn.run_sync(Base.metadata.create_all)
        
    # Ensure dirs exist
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("results", exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Docling PDF Table Extractor API with hf_xet"}

async def process_pdf_task(job_id: str, file_path: str):
    """Background task to process PDF and update DB"""
    try:
        # For background tasks, it's safer to create a fresh session context.
        from database import SessionLocal
        
        async with SessionLocal() as session:
            job = await session.get(Job, job_id)
            if not job:
                return

            job.status = JobStatus.PROCESSING.value
            await session.commit()
            
            # --- DOCLING PROCESSING START ---
            if not converter:
                 raise Exception("Converter not initialized")

            # Offload blocking conversion to thread pool
            import asyncio
            loop = asyncio.get_running_loop()
            # converter.convert is synchronous, so we must not block the main loop
            result = await loop.run_in_executor(None, lambda: converter.convert(Path(file_path)))
            
            # Export to pandas to get data
            df_list = []
            tables_data = []
            
            # Extract tables
            if hasattr(result.document, "tables") and result.document.tables:
                for table in result.document.tables:
                    # export_to_dataframe returns a pandas DF
                    df = table.export_to_dataframe()
                    df_list.append(df)
                    
                    # Store as JSON compatible format
                    tables_data.append({
                        "columns": df.columns.tolist(),
                        "data": df.where(pd.notnull(df), "").values.tolist() # Handle NaNs
                    })
            
            # Save Result to JSON file
            result_filename = f"{job_id}.json"
            result_path = os.path.join("results", result_filename)
            with open(result_path, "w") as f:
                json.dump(tables_data, f)
            
            # Update DB
            job.result_path = result_path
            job.status = JobStatus.COMPLETED.value
            await session.commit()
            # --- PROCESSING END ---

    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        import traceback
        traceback.print_exc()
        from database import SessionLocal
        async with SessionLocal() as session:
             job = await session.get(Job, job_id)
             if job:
                job.status = JobStatus.FAILED.value
                await session.commit()
    finally:
        # Clean up the uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/extract-table")
async def extract_table(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        # 1. Create Job Entry
        new_job = Job(filename=file.filename, status=JobStatus.PENDING.value)
        db.add(new_job)
        await db.commit()
        await db.refresh(new_job)

        # 2. Save File to Disk
        file_ext = os.path.splitext(file.filename)[1]
        file_path = os.path.join("uploads", f"{new_job.id}{file_ext}")
        
        with open(file_path, "wb") as f:
            while content := await file.read(1024 * 1024): # 1MB chunks
                f.write(content)
        
        # 3. Queue Background Task
        # We pass the ID and file path. The background task will open its own DB session.
        background_tasks.add_task(process_pdf_task, new_job.id, file_path)

        return {
            "status": "processing", 
            "job_id": new_job.id, 
            "message": "File uploaded and processing started."
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/job/{job_id}")
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    response = {
        "job_id": job.id,
        "status": job.status,
        "filename": job.filename,
        "created_at": job.created_at
    }

    if job.status == JobStatus.COMPLETED.value and job.result_path:
        # Load the JSON result
        if os.path.exists(job.result_path):
             with open(job.result_path, "r") as f:
                 response["tables"] = json.load(f)
        else:
            response["status"] = "error"
            response["message"] = "Result file missing"
    elif job.status == JobStatus.FAILED.value:
        response["message"] = "Job processing failed."

    return response

@app.post("/generate-csv")
async def generate_csv(request: dict):
    # Expects { "tables": [...], "merge": boolean }
    try:
        tables = request.get("tables", [])
        merge = request.get("merge", False)
        
        if not tables:
             raise HTTPException(status_code=400, detail="No data provided")

        output = io.StringIO()
        
        if merge:
            # Group tables by columns
            grouped_tables = {}
            for table in tables:
                # Tuple of columns as key
                cols_key = tuple(table["columns"])
                if cols_key not in grouped_tables:
                    grouped_tables[cols_key] = []
                grouped_tables[cols_key].extend(table["data"])
            
            # Write merged tables
            for cols, data in grouped_tables.items():
                df = pd.DataFrame(data, columns=cols)
                df.to_csv(output, index=False)
                output.write("\n\n")
        else:
            # Standard write
            for table in tables:
                df = pd.DataFrame(table["data"], columns=table["columns"])
                df.to_csv(output, index=False)
                output.write("\n\n") 
            
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=extracted_tables.csv"}
        )
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

