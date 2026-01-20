from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json

# Import internal modules
# Note: In Vercel serverless environment, imports might need adjustment depending on structure.
# But for local dev and standard structure:
try:
    from api.parser import extract_text_from_file
    from api.generator import build_prompt, stream_generate, rewrite_text
except ImportError:
    # Fallback for when running directly from api/ folder
    from parser import extract_text_from_file
    from generator import build_prompt, stream_generate, rewrite_text

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    template_type: str
    form_data: Dict[str, Any]
    context_text: Optional[str] = ""

class RewriteRequest(BaseModel):
    text: str
    command: str
    context_before: Optional[str] = ""
    context_after: Optional[str] = ""

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Python Serverless API is running"}

@app.post("/api/parse")
async def parse_file(file: UploadFile = File(...)):
    try:
        text = await extract_text_from_file(file)
        return {"filename": file.filename, "content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def generate(request: GenerateRequest):
    prompt = build_prompt(request.template_type, request.form_data, request.context_text)
    
    return StreamingResponse(
        stream_generate(prompt),
        media_type="text/event-stream"
    )

@app.post("/api/rewrite")
async def rewrite(request: RewriteRequest):
    return StreamingResponse(
        rewrite_text(request.text, request.command, request.context_before, request.context_after),
        media_type="text/event-stream"
    )
