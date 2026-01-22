import os
import json
import httpx
from typing import Dict, Any, AsyncGenerator
from dotenv import load_dotenv
from supabase import create_client, Client

try:
    from api.parser import read_text_from_path
except ImportError:
    from parser import read_text_from_path

# Load environment variables
_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(_env_path)

# Configuration
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase (Use Service Role Key if available to ensure reading templates)
sb: Client = None
if SUPABASE_URL and (SERVICE_ROLE_KEY or SUPABASE_KEY):
    sb = create_client(SUPABASE_URL, SERVICE_ROLE_KEY or SUPABASE_KEY)

def get_template_from_db(template_key: str):
    if not sb:
        return None
    try:
        res = sb.table("templates").select("*").eq("key", template_key).eq("status", "active").single().execute()
        return res.data
    except Exception as e:
        print(f"Error fetching template {template_key}: {e}")
        return None

def build_prompt(template_type: str, form_data: Dict[str, Any], context_text: str = "") -> str:
    template_config = get_template_from_db(template_type)
    
    if not template_config:
        # Fallback if DB fetch fails or template not found
        return f"请根据以下信息写一篇宣传稿：\n{json.dumps(form_data, ensure_ascii=False)}\n\n参考材料：\n{context_text}"
    
    prompt_template = template_config.get("prompt_template", "")
    examples_text = template_config.get("example_content", "") or ""

    # Format logic: Replace placeholders with form data
    # We need to handle potential missing keys in form_data gracefully
    # We'll use a safe formatting approach
    
    format_args = {
        "context": context_text,
        "examples": examples_text,
        **form_data
    }
    
    # Simple replace for placeholders {key} in prompt
    # Using format_map with a defaultdict-like behavior or just loop replace
    # because .format() raises KeyError if a key is missing
    
    formatted_prompt = prompt_template
    for key, value in format_args.items():
        formatted_prompt = formatted_prompt.replace(f"{{{key}}}", str(value or ""))
        
    # Clean up any remaining {key} placeholders that weren't filled? 
    # Or just leave them (Deepseek might ignore or hallucinate, better to strip?)
    # For now, we assume form_data covers all keys defined in the template config.
    
    return formatted_prompt

async def stream_generate(prompt: str) -> AsyncGenerator[str, None]:
    """
    Call Deepseek API with streaming enabled.
    """
    if not DEEPSEEK_API_KEY:
        yield "Error: DEEPSEEK_API_KEY not configured."
        return

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }
    
    payload = {
        "model": "deepseek-chat", # Or deepseek-reasoner depending on preference
        "messages": [
            {"role": "system", "content": "You are a helpful assistant specialized in writing corporate publicity articles."},
            {"role": "user", "content": prompt}
        ],
        "stream": True
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", DEEPSEEK_API_URL, headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data_json = json.loads(data_str)
                            content = data_json["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPStatusError as e:
            yield f"\n[API Error: {e.response.status_code} - {e.response.text}]"
        except Exception as e:
            yield f"\n[Network Error: {str(e)}]"

async def rewrite_text(text: str, command: str, context_before: str = "", context_after: str = "") -> AsyncGenerator[str, None]:
    """
    Rewrite specific text based on command (expand, shorten, rephrase).
    """
    prompt = f"""
    请对以下这段文字进行【{command}】：
    
    "{text}"
    
    上下文参考：
    前文：...{context_before[-200:]}
    后文：{context_after[:200]}...
    
    要求：只返回修改后的文本，不要包含解释性语言。
    """
    
    async for chunk in stream_generate(prompt):
        yield chunk
