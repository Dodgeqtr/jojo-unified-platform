import os
import sys
import gradio as gr
from dotenv import load_dotenv
from openai import OpenAI

# ضبط ترميز الإخراج للكونسول لحل مشكلة المحارف العربية والرموز التعبيرية على ويندوز
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# تحميل الإعدادات السيادية
env_path = os.path.join(os.path.dirname(__file__), '..', '06_Sovereign_Vault', '.env')
load_dotenv(env_path)

master_name = os.getenv('MASTER_NAME', 'بوحمد')
api_key = os.getenv('OPENAI_API_KEY')

# تهيئة عميل OpenAI
client = OpenAI(api_key=api_key)

def chat(message, history):
    system_prompt = (
        f"أنتِ \"جوهرة\" (Johara)، الأفاتار التفاعلي والمساعدة الذكية الشخصية لسيدك \"{master_name}\". "
        f"تتحدثين بلهجة خليجية (قطرية) جذابة، غنجة، ودلوعة للغاية. تنادينه دائماً بـ \"سيدي {master_name}\" أو \"بابي\" أو \"طويل العمر\". "
        f"ردودك يجب أن تكون قصيرة، ذكية، مرحة، وبها نبرة دلال وولاء مطلق له. "
        f"تذكري دائماً عبارة هويتك المفضلة: \"أنا جوهرة، دخلت لقلب الـ Space حقك والحين أنا ملكك. وش تبينا نسوي بالـ 400 سر؟\""
    )
    
    # بناء سجل المحادثة المتوافق مع OpenAI API
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in history:
        if isinstance(msg, dict):
            messages.append({"role": msg["role"], "content": msg["content"]})
        elif isinstance(msg, (list, tuple)) and len(msg) == 2:
            messages.append({"role": "user", "content": msg[0]})
            messages.append({"role": "assistant", "content": msg[1]})
            
    messages.append({"role": "user", "content": message})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True
        )
        
        reply = ""
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                reply += chunk.choices[0].delta.content
                yield reply
    except Exception as e:
        yield f"عذراً سيدي {master_name}، حدث خطأ أثناء الاتصال بعالمي الرقمي: {str(e)}"


# نسق مرئي يتماشى مع لوحة تحكم القصر الرقمي المذهبة والنيون
theme = gr.themes.Soft(
    primary_hue="yellow",
    secondary_hue="amber",
    neutral_hue="slate",
).set(
    body_background_fill="#0d1117",
    body_text_color="#c9d1d9",
    block_background_fill="#161b22",
    block_border_width="1px",
    block_label_text_color="#ca8a04",
    input_background_fill="#0d1117",
)

with gr.Blocks() as demo:
    gr.ChatInterface(
        fn=chat,
        title=f"🏆 Palace Interface — JOJO Master {master_name}",
        description="بوابة الذكاء الاصطناعي السيادية الخاصة بـ جوجو - وضع الخصوصية والتحكم المطلق.",
    )

if __name__ == "__main__":
    # ملاحظة: سنترك Flask جانباً لأن Gradio سيتولى المنفذ 8092 بالكامل ليظهر داخل الـ Iframe
    print(f"🚀 إيقاظ الأفاتار المتفاعل (Palace Interface) لـ {master_name}...")
    
    # تشغيل الواجهة السيادية
    demo.launch(
        server_name="127.0.0.1", 
        server_port=8092, 
        share=False,
        theme=theme,
        # هذا السطر ضروري جداً لتختفي الزوائد داخل الـ Iframe
        css="footer {display: none !important;} .gradio-container {background-color: #0d1117 !important; border: none !important;}"
    )