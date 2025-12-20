try:
    from docling.document_converter import DocumentConverter
    print("Docling imported successfully")
except ImportError as e:
    print(f"Failed to import Docling: {e}")
