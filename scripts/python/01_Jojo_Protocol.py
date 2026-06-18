import os, platform, socket, shutil
from dotenv import load_dotenv

# تحميل الإعدادات السيادية
env_path = os.path.join(os.path.dirname(__file__), '..', '06_Sovereign_Vault', '.env')
load_dotenv(env_path)

def verify_sovereign_integrity():
    node_name = socket.gethostname()
    os_info = platform.system() + " " + platform.release()
    master = os.getenv('MASTER_NAME', 'بوحمد')
    sov_id = os.getenv('SOVEREIGN_ID', 'Unknown')
    
    print(f"═══ 🛡️ بروتوكول السيادة (إصدار فعلي) ═══")
    print(f"👤 السيد: {master}")
    print(f"🆔 معرف السيادة: {sov_id}")
    print(f"📍 الجهاز: {node_name} ({os_info})")
    
    # فحص القرص G (14TB Cloud/Physical Sync)
    target_disk = "G:"
    if os.path.exists(target_disk):
        total, used, free = shutil.disk_usage(target_disk)
        print(f"✅ تم رصد القرص G: متاح {free // (2**40)} TB من أصل {total // (2**40)} TB")
    else:
        print(f"⚠️ تحذير: القرص G غير متصل. النظام يعمل في وضع الحصن المحلي.")

    # فحص مفاتيح التشفير
    if os.getenv('BITLOCKER_KEY'):
        print(f"🔒 تشفير BitLocker: تم التحقق من وجود مفتاح الاستعادة.")
    
    print(f"🚀 بروتوكول التزامن مفعل وجاهز.")
    print(f"══════════════════════════════════")

if __name__ == "__main__":
    verify_sovereign_integrity()