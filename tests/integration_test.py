import requests
import os
import json

# Configuration
API_URL = "http://127.0.0.1:8000"
EXAMPLES_DIR = "examples"

def test_health():
    print("Testing /api/health...")
    try:
        response = requests.get(f"{API_URL}/api/health")
        print(response.json())
        assert response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")

def test_parse_and_generate():
    print("\nTesting Parsing and Generation Flow...")
    
    # Find a test file
    test_file_path = None
    for root, dirs, files in os.walk(EXAMPLES_DIR):
        for file in files:
            if file.endswith(".docx") and not file.startswith("~$"):
                test_file_path = os.path.join(root, file)
                break
        if test_file_path:
            break
    
    if not test_file_path:
        print("No .docx file found in examples directory for testing.")
        return

    print(f"Using test file: {test_file_path}")

    # 1. Test Parse
    context_text = ""
    try:
        with open(test_file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(f"{API_URL}/api/parse", files=files)
            if response.status_code == 200:
                data = response.json()
                context_text = data.get("content", "")
                print(f"Parse successful. Extracted {len(context_text)} characters.")
            else:
                print(f"Parse failed: {response.text}")
                return
    except Exception as e:
        print(f"Parse request error: {e}")
        return

    # 2. Test Generate
    print("Testing Generation...")
    payload = {
        "template_type": "meeting",
        "form_data": {
            "title": "Integration Test Meeting",
            "date": "2023-10-27",
            "location": "Virtual",
            "attendees": "Dev Team",
            "summary": "Testing the system integration."
        },
        "context_text": context_text[:1000] # Limit context for test speed
    }

    try:
        with requests.post(f"{API_URL}/api/generate", json=payload, stream=True) as response:
            if response.status_code == 200:
                print("Generation stream started...")
                chunk_count = 0
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        chunk_count += 1
                        print(chunk.decode("utf-8"), end="", flush=True)
                        if chunk_count > 5: # Just verify we get some chunks then break to save time/tokens
                            print("\n... (stream truncated for test)")
                            break
                print("\nGeneration test passed.")
            else:
                print(f"Generation failed: {response.text}")
    except Exception as e:
        print(f"Generate request error: {e}")

if __name__ == "__main__":
    test_health()
    test_parse_and_generate()
