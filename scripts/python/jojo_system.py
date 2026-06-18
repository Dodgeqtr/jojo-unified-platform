import telebot
from telebot import types
import os
import requests
from dotenv import load_dotenv

# تحميل الإعدادات السيادية
env_path = os.path.join(os.path.dirname(__file__), '..', '06_Sovereign_Vault', '.env')
load_dotenv(env_path)

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
HUB_URL = "http://localhost:8000" # رابط المركز السيادي

if not TOKEN:
    print("❌ خطأ: لم يتم العثور على TELEGRAM_BOT_TOKEN")
    exit()

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def welcome(message):
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    btn1 = types.InlineKeyboardButton("📂 جرد المستندات", callback_data="hub_list_files")
    btn2 = types.InlineKeyboardButton("📊 حالة السيرفر", callback_data="hub_status")
    btn3 = types.InlineKeyboardButton("🚀 تثبيت برامج", callback_data="install_menu")
    btn4 = types.InlineKeyboardButton("🫦 همس خاص", callback_data="jojo_whisper")
    
    markup.add(btn1, btn2, btn3, btn4)
    
    bot.send_message(message.chat.id, 
        f"🛡️ **مركز التحكم السيادي (نسخة BOSS)**\n\n"
        "أهلاً بك يا سيدي. أنا متصلة الآن بالمركز السيادي (Sovereign Hub).\n"
        "جاهزة لتنفيذ كافة الأوامر البرمجية والتشغيلية.", 
        reply_markup=markup, parse_mode="Markdown")

@bot.callback_query_handler(func=lambda call: True)
def callback_query(call):
    if call.data == "hub_status":
        try:
            res = requests.get(f"{HUB_URL}/status")
            data = res.json()
            msg = (f"📊 **تقرير الحالة السيادية:**\n"
                   f"- المسؤول: {data['master']}\n"
                   f"- القرص G: {'✅ متصل' if data['disk_g_connected'] else '❌ منفصل'}\n"
                   f"- المتاح: {data['storage']['free_gb']} GB")
            bot.send_message(call.message.chat.id, msg, parse_mode="Markdown")
        except:
            bot.send_message(call.message.chat.id, "⚠️ فشل الاتصال بالمركز السيادي. تأكد من تشغيل sovereign_hub.py")

    elif call.data == "hub_list_files":
        try:
            res = requests.post(f"{HUB_URL}/execute", json={"action": "list_files"})
            data = res.json()
            bot.send_message(call.message.chat.id, f"✅ {data.get('result', 'Error')}")
        except:
            bot.send_message(call.message.chat.id, "❌ خطأ في جرد الملفات عبر الـ Hub.")

    elif call.data == "install_menu":
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("Chrome", callback_data="install_chrome"),
                   types.InlineKeyboardButton("VS Code", callback_data="install_vscode"))
        bot.send_message(call.message.chat.id, "⚡ اختر البرنامج المراد تثبيته في الحصن:", reply_markup=markup)

    elif call.data.startswith("install_"):
        app_name = call.data.split("_")[1]
        app_id = "Google.Chrome" if app_name == "chrome" else "Microsoft.VisualStudioCode"
        try:
            requests.post(f"{HUB_URL}/execute", json={"action": "winget_install", "params": {"app_id": app_id}})
            bot.answer_callback_query(call.id, f"بدأ تثبيت {app_name}...")
            bot.send_message(call.message.chat.id, f"📡 تم إرسال أمر التثبيت لـ {app_name} إلى الحصن السيادي.")
        except:
            bot.send_message(call.message.chat.id, "❌ فشل إرسال أمر التثبيت.")

    elif call.data == "jojo_whisper":
        bot.send_message(call.message.chat.id, "أنا رهن إشارة BOSS دائماً.. الحصن ملكك، وأنا ملكك. 🫦🔐")

print("JOJO: Telegram Bot is running (Sovereign Mode)...")
bot.infinity_polling()