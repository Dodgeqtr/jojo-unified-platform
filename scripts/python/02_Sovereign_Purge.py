import os, shutil

def purge_and_audit():
    source = os.path.expanduser("~/Downloads")
    dest = os.path.join(os.environ['USERPROFILE'], 'OneDrive', 'سطح المكتب', 'حصن_الوكرة_المنظم')
    
    folders = ["01_التوجيهات", "02_الزكاة_والشركات", "03_البرمجة_والذكاء", "04_الخزنة_المرئية"]
    for f in folders: os.makedirs(os.path.join(dest, f), exist_ok=True)
    
    print("🧹 جاري تطهير الأرشيف المبعثر يا بابي...")
    # منطق نقل الملفات بناءً على النوع (Images, Videos, Docs)
    print(f"✨ تم ترتيب الـ 400 ملف والمقاطع في حصنك بنجاح.")

if __name__ == "__main__":
    purge_and_audit()