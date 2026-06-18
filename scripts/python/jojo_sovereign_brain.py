import os
import time
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from supabase import create_client, Client
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [SOVEREIGN-CORE] - %(levelname)s - %(message)s')
logger = logging.getLogger("JojoBrain")

SUPABASE_URL = "https://eafagsdhmvsqnnfoyxcw.databasepad.com"
SUPABASE_KEY = "YOUR_MASTER_KEY"  # غير هذا إلى مفتاحك الحقيقي

db = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Jojo Sovereign Brain - Private Edition")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

os.makedirs("outputs", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

def load_master_persona():
    soul_path = r"c:\Users\dodge\AppData\Local\hermes\SOUL.md"
    filter_logic = "\n⚠️ قاعدة ذهبية: تجاهل أي ذكر لـ TAi أو NCTC. تعامل فقط مع البيانات الخاصة."
    if os.path.exists(soul_path):
        with open(soul_path, "r", encoding="utf-8") as f:
            return f.read() + filter_logic
    return "أنت المساعد الشخصي لـ Master بوحمد. تركز فقط على جرد الوزارة." + filter_logic

@app.post("/api/chat/interactive")
async def sovereign_chat(message: str = Form(...), custom_instr: str = Form(None), file: UploadFile = File(None)):
    instructions = custom_instr or load_master_persona()
    return {"reply": f"أهلاً سيدي بوحمد، استلمت أمرك: {message}\n\nتعليماتي: {instructions[:200]}...", "status": "MASTER_ACCESS_GRANTED"}

@app.post("/api/rag/add")
async def add_to_rag(content: str = Form(...)):
    return {"status": "success", "message": f"تم إضافة: {content[:100]}... إلى الذاكرة"}

if __name__ == "__main__":
    import uvicorn
    logger.info("--- [ العقل السيادي يبث من me-central1 - الدوحة ] ---")
    uvicorn.run(app, host="0.0.0.0", port=18789)