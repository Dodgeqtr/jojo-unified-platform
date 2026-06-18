from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import subprocess
import shutil
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# تحميل الإعدادات
env_path = os.path.join(os.path.dirname(__file__), '..', '06_Sovereign_Vault', '.env')
load_dotenv(env_path)

app = FastAPI(title="Sovereign Hub API")

# تفعيل CORS للتواصل مع واجهة الويب
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Command(BaseModel):
    action: str
    params: dict = {}

@app.get("/")
async def root():
    return {"status": "online", "system": "JOJO Sovereign Hub", "version": "2.0"}

@app.get("/status")
async def get_status():
    kok_path = os.getenv('KOK_PATH', r'G:\ملفاتي\Kok')
    disk_exists = os.path.exists(kok_path)
    
    # جلب مساحة القرص
    try:
        total, used, free = shutil.disk_usage("G:" if os.path.exists("G:") else "C:")
        storage = {
            "total_gb": total // (2**30),
            "used_gb": used // (2**30),
            "free_gb": free // (2**30)
        }
    except:
        storage = "Error reading disk"

    return {
        "master": os.getenv('MASTER_NAME', 'Bo Hamad'),
        "disk_g_connected": disk_exists,
        "storage": storage,
        "active_engines": ["Jojo_Protocol", "Knowledge_Orchestrator"]
    }

@app.post("/execute")
async def execute_command(cmd: Command):
    if cmd.action == "list_files":
        path = os.getenv('KOK_PATH', r'G:\ملفاتي\Kok')
        if os.path.exists(path):
            files = os.listdir(path)
            return {"result": f"Found {len(files)} files in Kok.", "files": files[:10]} # عودة بـ 10 ملفات فقط للعرض
        return {"error": "Disk G not connected"}
    
    elif cmd.action == "winget_install":
        app_id = cmd.params.get("app_id")
        if not app_id:
            raise HTTPException(status_code=400, detail="app_id required")
        # تنفيذ التثبيت في الخلفية (تبسيط للمثال)
        subprocess.Popen(["winget", "install", "--id", app_id, "--silent", "--accept-source-agreements"])
        return {"result": f"Installation of {app_id} started in background."}

    return {"error": "Unknown action"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
