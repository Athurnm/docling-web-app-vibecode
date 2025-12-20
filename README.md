# Matchmade Internal Utilities (DocLink)

An advanced PDF Table Extraction tool designed for high accuracy and performance. Powered by [Docling](https://github.com/DS4SD/docling) and wrapped in a premium, user-friendly Dashboard.

## Features

- **High-Fidelity Extraction**: Converts PDF tables into structured CSV data with high precision.
- **Header-Based Merging**: Automatically groups and merges split tables (e.g., tables spanning multiple pages) based on identical headers.
- **Job Tracking**: Persistent job history using SQLite. Handles large files and tracks processing status (Pending, Processing, Completed, Failed).
- **Interactive Loading**: Features a "Data Collector" mini-game to keep users engaged during long processing times.
- **Premium UI**: Clean, responsive dashboard design matching Matchmade branding.
- **Review Mode**: Side-by-side comparison of the original PDF and extracted data before downloading.

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy (Async), SQLite.
- **Core AI**: Docling (Document Converter).
- **Frontend**: React, Vite, Framer Motion, Lucide Icons.
- **Styling**: Vanilla CSS with comprehensive design tokens.

## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 16+

### 1. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
pip install -r requirements.txt
```

*Note: This will install `docling`, `fastapi`, `uvicorn`, `sqlalchemy`, `aiosqlite`, and `pandas`.*

Start the server (with hot-reload):

```bash
# Set PYTHONPATH to include local modules if needed, or just run:
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

The backend will run on `http://localhost:8080`.

### 2. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will typically run on `http://localhost:5173`.

## Usage

1. Open the web application.
2. Click **New Upload** or drag and drop a PDF file.
3. Play the **Data Collector** game while waiting for the AI to process the document.
4. Once complete, reviewing the extracted tables in the modal.
5. (Optional) Check **"Merge tables with same headers"** to combine split tables.
6. Click **Download CSV** to get your data.

## Deployment Notes

- **Database**: The app uses `doclink.db` (SQLite) in the `backend/` directory. For production, ensure this directory is writable.
- **Concurrency**: WAL (Write-Ahead Logging) mode is enabled for better concurrency.
- **Large Files**: Uploads are streamed to disk (`backend/uploads/`) to handle large files (e.g., 2.5GB+) without exhausting RAM.
