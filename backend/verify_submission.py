import requests
import time
import sys
import os

# Configuration
BASE_URL = "http://localhost:8080"
FILE_PATH = r"C:\Users\Athur\Documents\Matchmade\Source Code\part_1.Mutation - BCA (PIZZAHUT).pdf"
TIMEOUT_SECONDS = 120  # 2 minutes

def test_extraction():
    if not os.path.exists(FILE_PATH):
        print(f"Error: File not found at {FILE_PATH}")
        sys.exit(1)

    print(f"Starting upload test for: {FILE_PATH}")
    print(f"Max wait time: {TIMEOUT_SECONDS} seconds")

    start_time = time.time()

    # 1. Upload File
    try:
        with open(FILE_PATH, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{BASE_URL}/extract-table", files=files)
            
        if response.status_code != 200:
            print(f"Upload failed: {response.status_code} - {response.text}")
            sys.exit(1)
            
        data = response.json()
        job_id = data.get("job_id")
        print(f"Upload successful. Job ID: {job_id}")
        
    except Exception as e:
        print(f"Failed to connect to server: {e}")
        sys.exit(1)

    # 2. Poll Status
    while True:
        elapsed = time.time() - start_time
        if elapsed > TIMEOUT_SECONDS:
            print(f"TIMEOUT: Job did not complete within {TIMEOUT_SECONDS} seconds.")
            sys.exit(1)
            
        try:
            status_res = requests.get(f"{BASE_URL}/job/{job_id}")
            if status_res.status_code != 200:
                print(f"Status check failed: {status_res.status_code}")
                time.sleep(2)
                continue
                
            job_data = status_res.json()
            status = job_data.get("status")
            print(f"Status: {status} (Elapsed: {elapsed:.2f}s)")
            
            if status == "completed":
                print("SUCCESS: Job completed successfully.")
                print(f"Total time: {elapsed:.2f} seconds")
                # Optional: Check if we can get the data
                tables = job_data.get("tables", [])
                print(f"Extracted {len(tables)} tables.")
                break
                
            if status == "failed":
                print("FAILED: Job reported failure.")
                sys.exit(1)
                
        except Exception as e:
            print(f"Error polling status: {e}")
            
        time.sleep(2)

if __name__ == "__main__":
    test_extraction()
