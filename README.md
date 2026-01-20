# AI 智能宣传稿生成助手 (AI Corporate Publicity Generator)

这是一个基于 Next.js 和 Python (FastAPI) 构建的现代化 Web 应用，旨在帮助企业用户快速生成高质量的宣传稿件。通过集成 Deepseek 大模型和文档解析技术，用户只需选择场景、填写关键信息并上传参考素材，即可一键生成结构严谨、内容丰富的文章。

## ✨ 核心功能

*   **多场景模板支持**：内置重要会议、培训活动、领导检查、项目中标、重大进展、科技创新等 6 大常用场景。
*   **智能文档解析 (RAG)**：支持上传 Word (.docx)、PDF (.pdf)、PPT (.pptx) 等格式文件，系统自动提取关键信息作为写作参考。
*   **AI 智能写作**：基于 Deepseek 模型，根据表单信息和参考素材，自动生成符合企业公文规范的稿件。
*   **所见即所得编辑器**：集成 TipTap 富文本编辑器，支持实时预览和编辑。
*   **AI 润色与改写**：支持选中文字后进行“换个说法”、“扩写”、“精简”等操作，并支持一键撤回。
*   **一键导出**：支持将最终定稿导出为 Word (.docx) 格式。

## 🛠️ 技术栈

### 前端 (Frontend)
*   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
*   **Editor**: [TipTap](https://tiptap.dev/)
*   **Icons**: [Lucide React](https://lucide.dev/)

### 后端 (Backend)
*   **Runtime**: Python 3.9+ (Serverless ready)
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
*   **AI Model**: Deepseek API
*   **Document Parsing**: `python-docx`, `python-pptx`, `pypdf2`

## 🚀 快速开始

### 1. 环境准备
确保你的本地环境已安装：
*   Node.js (v18+)
*   Python (v3.9+)

### 2. 安装依赖

**前端依赖：**
```bash
npm install
```

**后端依赖：**
```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

在项目根目录创建 `.env.local` 文件，并填入你的 Deepseek API Key：

```env
DEEPSEEK_API_KEY=sk-your-api-key-here
```

### 4. 启动开发服务器

你需要同时启动前端和后端服务。

**终端 1 (后端 API):**
```bash
python -m uvicorn api.index:app --reload --port 8000
```

**终端 2 (前端 Next.js):**
```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用。

## 📂 项目结构

```
.
├── app/                  # Next.js 页面路由
├── components/           # React UI 组件
│   ├── ui/               # Shadcn 基础组件
│   ├── rich-editor.tsx   # AI 富文本编辑器
│   └── smart-form.tsx    # 智能输入表单
├── api/                  # Python 后端逻辑
│   ├── index.py          # FastAPI 入口
│   ├── generator.py      # 生成与润色逻辑
│   └── parser.py         # 文档解析逻辑
├── public/               # 静态资源
└── examples/             # 示例素材文件
```

## 📝 开发注意事项

*   **API 代理**: 本地开发时，`next.config.ts` 配置了代理，将 `/api/*` 请求转发到 `localhost:8000`。
*   **文件上传限制**: 已配置 Next.js 代理支持最大 50MB 文件上传。

## 📄 License

MIT
