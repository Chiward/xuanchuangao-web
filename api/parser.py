import io
from fastapi import UploadFile, HTTPException
import docx
import pptx
import PyPDF2

async def extract_text_from_file(file: UploadFile) -> str:
    """
    Extract text from uploaded file based on its content type or extension.
    """
    filename = file.filename.lower()
    content = await file.read()
    file_stream = io.BytesIO(content)

    try:
        if filename.endswith(".docx"):
            return parse_docx(file_stream)
        elif filename.endswith(".pptx"):
            return parse_pptx(file_stream)
        elif filename.endswith(".pdf"):
            return parse_pdf(file_stream)
        elif filename.endswith(".txt"):
            return content.decode("utf-8")
        else:
            # Try to read as plain text for other extensions
            try:
                return content.decode("utf-8")
            except:
                raise HTTPException(status_code=400, detail="Unsupported file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")

def parse_docx(file_stream) -> str:
    doc = docx.Document(file_stream)
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text)
    return "\n".join(full_text)

def parse_pptx(file_stream) -> str:
    prs = pptx.Presentation(file_stream)
    full_text = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                full_text.append(shape.text)
    return "\n".join(full_text)

def parse_pdf(file_stream) -> str:
    reader = PyPDF2.PdfReader(file_stream)
    full_text = []
    for page in reader.pages:
        text = page.extract_text()
        if text and text.strip():
            full_text.append(text)
    return "\n".join(full_text)
