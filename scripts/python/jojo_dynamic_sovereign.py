# -*- coding: utf-8 -*-
import os
import socket
import threading
import requests
import webbrowser
from flask import Flask, render_template_string

app = Flask(__name__)

CONFIG = {
    "N8N_WEBHOOK": "https://dodgeqtr.app.n8n.cloud/webhook/jojo-command",
    "VERSION": "6.0-DynamicPort-Instant"
}

def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def notify_cloud_bridge(port):
    print(f"📡 [الباحث 1] - إرسال الإحداثيات للمنفذ [{port}]...")
    payload = {"event": "PORT_ROTATION", "current_port": port, "status": "ACTIVE"}
    try:
        requests.post(CONFIG["N8N_WEBHOOK"], json=payload, timeout=5)
        print("✅ تم تحديث السحاب!")
    except:
        print("❌ فشل تحديث السحاب")

@app.route('/')
def home():
    return render_template_string('<h1 style="color: #d4af37; text-align: center; background: #111; padding: 50px;">🏛️ حصن الوكرة - النواة نشطة الآن يا سيدي بوحمد 👑</h1>')

if __name__ == "__main__":
    port = find_free_port()
    threading.Thread(target=notify_cloud_bridge, args=(port,), daemon=True).start()
    webbrowser.open(f"http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port)
