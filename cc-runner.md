# AI智能宣传稿生成助手 (Web MVP) 开发行动计划

本文档旨在指导开发者从零构建 AI 智能宣传稿生成助手。本项目基于 Next.js (Frontend) 和 Python FastAPI Serverless (Backend) 架构，利用 Deepseek API 实现智能写作功能。

## 阶段 1: 项目初始化与环境搭建 (Setup)
**目标**: 完成 Next.js 前端与 Python Serverless 后端的基础架构。

1.  **初始化 Next.js 项目**:
    *   执行 `npx create-next-app@latest . --typescript --tailwind --eslint`。
    *   清理默认页面，创建基础目录结构:
        *   `app/` (页面路由)
        *   `components/` (React 组件)
        *   `api/` (Python Serverless Functions)
        *   `lib/` (工具函数)
2.  **安装 UI 组件库**:
    *   初始化 Shadcn/UI: `npx shadcn-ui@latest init`。
    *   安装核心组件:
        *   `npx shadcn-ui@latest add button card input select textarea dialog toast`
    *   安装图标库: `npm install lucide-react`。
3.  **配置 Python Serverless 环境**:
    *   创建 `api/index.py` 作为 FastAPI 入口。
    *   创建 `requirements.txt`，包含依赖:
        ```text
        fastapi
        mangum
        httpx
        python-docx
        python-pptx
        pypdf2
        python-multipart
        uvicorn
        ```
    *   创建 `vercel.json` 配置混合运行时 (Mixed Runtime):
        ```json
        {
          "rewrites": [
            { "source": "/api/(.*)", "destination": "/api/index.py" }
          ]
        }
        ```
4.  **环境变量配置**:
    *   创建 `.env.local` 文件。
    *   写入 API Key: `DEEPSEEK_API_KEY=sk-a48adb8b543f46218e157d565b0763d4`。

## 阶段 2: 后端核心功能开发 (Backend API)
**目标**: 实现文档解析与 AI 接口调用。

1.  **开发文档解析服务 (`api/parser.py`)**:
    *   编写 `parse_docx(file)`: 使用 `python-docx` 提取文本。
    *   编写 `parse_pptx(file)`: 使用 `python-pptx` 提取幻灯片文本。
    *   编写 `parse_pdf(file)`: 使用 `PyPDF2` 提取文本。
    *   封装统一接口 `extract_text_from_file(file_stream, file_type)`。
2.  **开发 Deepseek 生成服务 (`api/generator.py`)**:
    *   编写 `build_prompt(template_type, form_data, context_text)`: 根据 PRD 规则组装 Prompt。
    *   编写 `stream_generate(prompt)`: 调用 Deepseek API (`https://api.deepseek.com/chat/completions`)，启用 `stream=True`。
    *   编写 `rewrite_text(text, command)`: 处理“扩写”、“精简”、“换个说法”请求。
3.  **暴露 API 接口 (`api/index.py`)**:
    *   `POST /api/parse`: 接收文件上传，返回解析后的纯文本。
    *   `POST /api/generate`: 接收 JSON 数据 (模板类型、表单数据、上下文)，返回流式响应 (SSE)。
    *   `POST /api/rewrite`: 接收选中文本和指令，返回修改建议。

## 阶段 3: 前端核心模块开发 (Frontend)
**目标**: 实现用户界面与交互逻辑。

1.  **开发首页 (Home - `app/page.tsx`)**:
    *   实现模板选择卡片网格，包含6种预设场景：
        *   重要会议
        *   培训活动
        *   领导带队检查
        *   项目中标
        *   项目重大进展
        *   科技创新
    *   点击卡片跳转至 `/editor?template={id}`。
2.  **开发智能输入区 (Smart Input - `components/smart-form.tsx`)**:
    *   集成 `react-hook-form`。
    *   根据 URL 参数 (`template`) 动态渲染对应的表单字段 (5W1H)。
    *   实现文件上传组件，上传后调用 `/api/parse`，将返回的文本存储在状态中作为上下文。
3.  **开发 AI 编辑器 (AI Editor - `components/rich-editor.tsx`)**:
    *   集成 `TipTap` 编辑器。
    *   实现流式响应渲染：接收 `/api/generate` 的 SSE 数据并实时追加到编辑器。
    *   实现气泡菜单 (Bubble Menu)：选中文字弹出“AI 优化”选项（扩写、精简、换个说法）。
4.  **开发导出功能**:
    *   实现“导出 Word”按钮。
    *   使用 `html-docx-js` 或类似库将编辑器 HTML 内容转换为 `.docx` 文件并触发下载。

## 阶段 4: 联调与测试 (Integration)
**目标**: 确保全流程跑通。

1.  **本地联调**:
    *   使用 `vercel dev` 同时启动前端和 Python 后端。
2.  **真实数据测试**:
    *   使用 `examples` 目录下的 `.docx` 和 `.png` (作为参考) 进行模拟输入。
    *   验证 Deepseek 生成的内容是否符合 PRD 要求（Markdown 格式、标题样式等）。
3.  **Bug 修复**:
    *   优化 Loading 状态。
    *   添加错误处理 (Toast 提示)。

## 阶段 5: 部署 (Deployment)
1.  检查 `vercel.json` 配置。
2.  推送代码至 GitHub。
3.  在 Vercel 导入项目并部署。
