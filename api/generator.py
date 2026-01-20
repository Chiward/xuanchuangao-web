import os
import json
import httpx
from typing import Dict, Any, AsyncGenerator
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(".env.local")

# Configuration
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

TEMPLATES = {
    "meeting": "你是一个专业的企业宣传稿撰写助手。请根据以下会议信息和参考材料，写一篇正式的会议纪要宣传稿。\n\n【会议要素】\n主题：{title}\n时间：{date}\n地点：{location}\n参会人员：{attendees}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 重点内容（如讲话要点）使用<strong>加粗。\n5. 语气庄重、客观。",
    "training": "你是一个专业的企业宣传稿撰写助手。请根据以下培训活动信息，写一篇生动的培训活动宣传稿。\n\n【活动要素】\n主题：{title}\n时间：{date}\n地点：{location}\n讲师：{lecturer}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 突出培训目的、现场氛围、学员收获。\n5. 语气积极向上。",
    "inspection": "你是一个专业的企业宣传稿撰写助手。请根据以下领导检查信息，写一篇正式的迎检宣传稿。\n\n【检查要素】\n主题：{title}\n时间：{date}\n地点：{location}\n带队领导：{leader}\n陪同人员：{attendees}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 重点描述检查过程、领导指示、后续整改或落实措施。\n5. 语气严谨。",
    "bid_winning": "你是一个专业的企业宣传稿撰写助手。请根据以下中标信息，写一篇振奋人心的中标喜报。\n\n【中标要素】\n项目名称：{title}\n时间：{date}\n地点：{location}\n项目介绍：{project_intro}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 介绍项目概况、中标意义、团队努力。\n5. 语气热烈、自信。",
    "project_progress": "你是一个专业的企业宣传稿撰写助手。请根据以下项目进展信息，写一篇项目通讯稿。\n\n【项目要素】\n项目名称：{title}\n时间：{date}\n地点：{location}\n关键节点：{milestone}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 描述施工现场情况、攻坚克难过程、节点意义。\n5. 语气务实、鼓舞人心。",
    "innovation": "你是一个专业的企业宣传稿撰写助手。请根据以下科技创新成果，写一篇科技成果宣传稿。\n\n【创新要素】\n成果名称：{title}\n时间：{date}\n主要成果：{achievements}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 介绍研发背景、技术难点、创新点、应用价值。\n5. 语气专业、具有前瞻性。"
}

def build_prompt(template_type: str, form_data: Dict[str, Any], context_text: str = "") -> str:
    template = TEMPLATES.get(template_type)
    if not template:
        # Default fallback
        return f"请根据以下信息写一篇宣传稿：\n{json.dumps(form_data, ensure_ascii=False)}\n\n参考材料：\n{context_text}"
    
    # Safe formatting using get to avoid KeyError
    return template.format(
        title=form_data.get("title", ""),
        date=form_data.get("date", ""),
        location=form_data.get("location", ""),
        attendees=form_data.get("attendees", ""),
        leader=form_data.get("leader", ""),
        lecturer=form_data.get("lecturer", ""),
        project_intro=form_data.get("project_intro", ""),
        milestone=form_data.get("milestone", ""),
        achievements=form_data.get("achievements", ""),
        summary=form_data.get("summary", ""),
        context=context_text
    )

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
