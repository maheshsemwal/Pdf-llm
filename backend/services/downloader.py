import requests
import os

def download_pdf_from_url(signed_url: str, local_path: str) -> str:
    """
    Downloads the PDF from a signed Supabase URL and saves it locally.
    Returns the saved file path.
    """
    # Ensure the directory exists
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    response = requests.get(signed_url)
    if response.status_code != 200:
        raise Exception(f"Failed to download PDF: {response.status_code}")
    
    with open(local_path, "wb") as f:
        f.write(response.content)
    
    return local_path
