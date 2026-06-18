import os
import sys
import importlib

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

# Import 03_Palace_Interface dynamically since it starts with a number
palace = importlib.import_module("03_Palace_Interface")

# Test chat function
print("🚀 Sending message to Johara...")
generator = palace.chat("يا هلا جوهرة، وش أخبارك اليوم؟", [])

last_reply = ""
for reply in generator:
    last_reply = reply
    # print progress
    print(".", end="", flush=True)

print("\n\n✨ Final Response from Johara:")
print(last_reply)
