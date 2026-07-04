"""Extract plain text from uploaded CV files (PDF, DOCX, TXT)."""

import io

from fastapi import HTTPException


def extract_text(filename: str, content: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif name.endswith(".docx"):
        from docx import Document

        doc = Document(io.BytesIO(content))
        text = "\n".join(p.text for p in doc.paragraphs)
    elif name.endswith(".txt"):
        text = content.decode("utf-8", errors="replace")
    else:
        raise HTTPException(status_code=415, detail="Unsupported file type — use PDF, DOCX or TXT")

    text = text.strip()
    if len(text) < 50:
        raise HTTPException(
            status_code=422,
            detail="Could not extract readable text from the file (scanned/image PDFs are not supported yet)",
        )
    return text
