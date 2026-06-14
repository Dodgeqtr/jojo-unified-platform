import socket
import json
import os

PORT_RANGE = range(3001, 3011)
ROUTING_TABLE = {}

def find_next_free_port():
    for port in PORT_RANGE:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return None

def start_switchboard():
    print("🟢 سنترال جوجو الذكي قيد العمل بالتوازي...")
    free_port = find_next_free_port()
    if free_port:
        ROUTING_TABLE["crm-service"] = free_port
        print(f"📡 تم تخصيص المنفذ الديناميكي {free_port} لخدمة الـ CRM")
        # حفظ جدول التوجيه ليقرأه n8n والـ Frontend بالتزامن
        with open("jojo_routing.json", "w") as f:
            json.dump(ROUTING_TABLE, f)

if __name__ == "__main__":
    start_switchboard()
