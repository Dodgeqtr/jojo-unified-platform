import re

path = r"C:\Users\dodge\.gemini\antigravity-ide\brain\c3f39fd9-2dc6-4b43-a75f-f05af3c50b19\.system_generated\steps\1133\content.md"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's strip HTML tags to see what readable text is there
text = re.sub(r'<[^>]*>', ' ', content)
text = re.sub(r'\s+', ' ', text).strip()

print("Readable text length:", len(text))
print("First 2000 characters of readable text:")
print(text[:2000])
