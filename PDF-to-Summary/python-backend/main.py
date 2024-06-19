from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing_extensions import Annotated
from docx import Document
from PyPDF2 import PdfReader
from pathlib import Path
import os
from groq import Groq
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import traceback

UPLOAD_DIR = Path() / "upload"

client = Groq(
    api_key="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",
)

class Data(BaseModel):
    file: UploadFile
    userPrompt: str | None = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def read_root():
    return {"status": "ok"}

def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_path):
    doc = Document(file_path)
    text = ""
    for para in doc.paragraphs:
        text += para.text
    return text

def extract_text_from_txt(file_path):
    with open(file_path, "r") as f:
        text = f.read()
    return text

def chunk_text(text, chunk_size=500):
    words = text.split()
    return [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]

class DocumentStore:
    def __init__(self):
        self.documents = []
        self.vectorizer = TfidfVectorizer()
        self.document_matrix = None

    def add_document(self, text):
        new_chunks = chunk_text(text)
        self.documents.extend(new_chunks)
        self.document_matrix = self.vectorizer.fit_transform(self.documents)

    def query(self, userPrompt, top_k=5):
        if not self.documents:
            return []

        query_vector = self.vectorizer.transform([userPrompt])
        similarities = cosine_similarity(query_vector, self.document_matrix).flatten()
        indices = similarities.argsort()[-top_k:][::-1]
        return [self.documents[i] for i in indices]

store = DocumentStore()

@app.post("/summarize")
async def file_summary(
    upload_file: Annotated[UploadFile, File()],
    userPrompt: Annotated[str, Form()] = None):
    try:
        file_read = await upload_file.read()
        file_path = os.path.join(UPLOAD_DIR, upload_file.filename)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(file_read)

        if upload_file.filename.endswith(".pdf"):
            text = extract_text_from_pdf(file_path)
        elif upload_file.filename.endswith(".docx"):
            text = extract_text_from_docx(file_path)
        elif upload_file.filename.endswith(".txt"):
            text = extract_text_from_txt(file_path)
        else:
            os.remove(file_path)
            return {"error": "Unsupported file type"}
        
        os.remove(file_path)

        store.add_document(text)

        if not userPrompt:
            userPrompt = ""

        relevant_chunks = store.query(userPrompt, top_k=5)
        combined_text = " ".join(relevant_chunks)

        max_tokens = 3000 
        tokens = combined_text.split()
        if len(tokens) > max_tokens:
            combined_text = " ".join(tokens[:max_tokens])

        content = (
            f"Instruction: You are a summary generator, your job is to generate a summary of the given data. "
            f"You have to follow the instructions given on how to generate the summary. If no instruction is given, "
            f"then just generate the summary. Data: {combined_text} Instruction: {userPrompt} "
            f"Instruction: The summary should be at least 200 words long."
        )

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": content}],
            model="mixtral-8x7b-32768",
        )

        summary = chat_completion.choices[0].message.content
        print("Summary:", summary)  ##Debugging summary
        return {"summary": summary}
    
    except Exception as e:
        error_trace = traceback.format_exc()
        print("Error:", error_trace)  
        return {"error": "An error occurred while processing your request. Please check the server logs for more details."}

@app.post("/chat")
async def file_chat(
    upload_file: Annotated[UploadFile, File()],
    userPrompt: Annotated[str, Form()] = None):
    try:
        file_read = await upload_file.read()
        file_path = os.path.join(UPLOAD_DIR, upload_file.filename)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(file_read)

        if upload_file.filename.endswith(".pdf"):
            text = extract_text_from_pdf(file_path)
        elif upload_file.filename.endswith(".docx"):
            text = extract_text_from_docx(file_path)
        elif upload_file.filename.endswith(".txt"):
            text = extract_text_from_txt(file_path)
        else:
            os.remove(file_path)
            return {"error": "Unsupported file type"}
        
        os.remove(file_path)

        store.add_document(text)

        if not userPrompt:
            userPrompt = ""

        relevant_chunks = store.query(userPrompt, top_k=5)
        combined_text = " ".join(relevant_chunks)

        # Token size for chunks
        max_tokens = 3000 
        tokens = combined_text.split()
        if len(tokens) > max_tokens:
            combined_text = " ".join(tokens[:max_tokens])

        content = (
            f"Role: You are the Q&A solver. Here is your information: Data: {combined_text} "
            f"Using this information, answer the following question: Question: {userPrompt} "
            f"Instruction: Answer the question using the information provided in the data."
        )

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": content}],
            model="mixtral-8x7b-32768",
        )

        answer = chat_completion.choices[0].message.content
        print("Answer:", answer)  # Debugging
        return {"answer": answer}
    
    except Exception as e:
        error_trace = traceback.format_exc()
        print("Error:", error_trace)  
        return {"error": "An error occurred while processing your request. Please check the server logs for more details."}
