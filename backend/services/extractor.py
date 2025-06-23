import fitz  # PyMuPDF

def extract_text_from_pdf(file_path: str) -> list[dict]:
    """
    Extracts text from a PDF and returns a list of page-wise text chunks.
    Each item is a dict with page number and content.
    """
    doc = fitz.open(file_path)
    extracted = []

    for i, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if text:
            extracted.append({
                "page": i,
                "text": text
            })

    return extracted
