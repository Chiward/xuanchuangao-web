我已阅读并分析了 `PRD文档.txt`、`Deepseek API key.txt` 以及 `examples` 目录下的参考范文。

根据您的要求，我制定了详细的开发行动计划。由于当前处于 **计划模式 (Plan Mode)**，我无法直接创建文件。**请确认以下计划，批准后我将立即创建 `cc-runner.md` 文档并写入以下内容，随后等待您的进一步开发指令。**

### 拟生成的 `cc-runner.md` 内容规划

该文档将作为项目的核心执行指南，分为 5 个阶段，每一步都包含具体的操作指令。

#### **阶段 1: 项目初始化与环境搭建 (Setup)**
**目标**: 完成 Next.js 前端与 Python Serverless 后端的基础架构。
1.  **初始化 Next.js 项目**:
    *   执行 `npx create-next-app@latest . --typescript --tailwind --eslint`。
    *   清理默认页面，创建基础目录结构 (`app/`, `components/`, `api/`, `lib/`)。
2.  **安装 UI 组件库**:
    *   初始化 Shadcn/UI: `npx shadcn-ui@latest init`。
    *   安装核心组件: `Button`, `Card`, `Input`, `Select`, `Textarea`, `Dialog`, `Toast`。
    *   安装图标库: `lucide-react`。
3.  **配置 Python Serverless 环境**:
    *   创建 `api/index.py` (FastAPI 入口)。
    *   创建 `requirements.txt` (包含 `fastapi`, `mangum`, `openai` 或 `httpx`, `python-docx`, `python-pptx`, `pypdf2`)。
    *   创建 `vercel.json` 配置混合运行时 (Mixed Runtime)，将 `/api/**` 路由指向 Python 处理函数。
4.  **环境变量配置**:
    *   创建 `.env.local`。
    *   写入 `DEEPSEEK_API_KEY=sk-a48adb8b543f46218e157d565b0763d4` (来源于您提供的文件)。

#### **阶段 2: 后端核心功能开发 (Backend API)**
**目标**: 实现文档解析与 AI 接口调用。
1.  **开发文档解析服务 (`api/parser.py`)**:
    *   编写 `parse_docx(file)`: 使用 `python-docx` 提取文本。
    *   编写 `parse_pptx(file)`: 使用 `python-pptx` 提取幻灯片文本。
    *   编写 `parse_pdf(file)`: 使用 `PyPDF2` 提取文本。
    *   封装统一接口 `extract_text_from_file(file_stream, file_type)`。
2.  **开发 Deepseek 生成服务 (`api/generator.py`)**:
    *   编写 `build_prompt(template_type, form_data, context_text)`: 根据 PRD 规则组装 Prompt。
    *   编写 `stream_generate(prompt)`: 调用 Deepseek API (chat/completions)，启用 `stream=True`。
    *   编写 `rewrite_text(text, command)`: 处理“扩写”、“精简”、“换个说法”请求。
3.  **暴露 API 接口 (`api/index.py`)**:
    *   `POST /api/parse`: 接收文件，返回解析后的纯文本。
    *   `POST /api/generate`: 接收 JSON 数据，返回流式响应 (SSE)。
    *   `POST /api/rewrite`: 接收选中文本，返回修改建议。

#### **阶段 3: 前端核心模块开发 (Frontend)**
**目标**: 实现用户界面与交互逻辑。
1.  **开发首页 (Home)**:
    *   实现模板选择卡片网格 (6种预设场景)。
    *   点击卡片跳转至 `/editor?template={id}`。
2.  **开发智能输入区 (Smart Input)**:
    *   集成 `react-hook-form`。
    *   根据 URL 参数动态渲染对应的表单字段 (5W1H)。
    *   实现文件上传组件，调用 `/api/parse` 并自动填充/附加到上下文。
3.  **开发 AI 编辑器 (AI Editor)**:
    *   集成 `TipTap` 编辑器。
    *   实现流式响应渲染：将 SSE 数据实时追加到编辑器内容中。
    *   实现气泡菜单 (Bubble Menu)：选中文字弹出“AI 优化”选项。
4.  **开发导出功能**:
    *   实现“导出 Word”按钮，使用 `html-docx-js` 将编辑器 HTML 内容转换为 `.docx` 下载。

#### **阶段 4: 联调与测试 (Integration)**
**目标**: 确保全流程跑通。
1.  **本地联调**: 使用 `vercel dev` 同时启动前端和 Python 后端。
2.  **真实数据测试**:
    *   使用 `examples` 目录下的 `.docx` 和 `.png` (参考内容) 进行模拟输入。
    *   验证 Deepseek 生成的内容质量和格式。
3.  **Bug 修复与 UI 微调**: 优化 Loading 状态、错误处理 (Toast 提示)。

#### **阶段 5: 部署 (Deployment)**
1.  检查 `vercel.json` 配置。
2.  (可选) 协助推送到 GitHub 并连接 Vercel 进行部署。

---
**确认后，我将立即创建 `cc-runner.md` 文件。**