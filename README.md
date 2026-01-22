# AI 智能宣传稿生成助手 (AI Corporate Publicity Generator)

这是一个基于 Next.js 和 Python (FastAPI) 构建的现代化 Web 应用，旨在帮助企业用户快速生成高质量的宣传稿件。通过集成 Deepseek 大模型和文档解析技术，用户只需选择场景、填写关键信息并上传参考素材，即可一键生成结构严谨、内容丰富的文章。

## ✨ 核心功能

*   **多场景模板支持**：内置重要会议、培训活动、领导检查、项目中标、重大进展、科技创新等 6 大常用场景。
*   **智能文档解析 (RAG)**：支持上传 Word (.docx)、PDF (.pdf)、PPT (.pptx) 等格式文件，系统自动提取关键信息作为写作参考。
*   **AI 智能写作**：基于 Deepseek 模型，根据表单信息和参考素材，自动生成符合企业公文规范的稿件。
*   **所见即所得编辑器**：集成 TipTap 富文本编辑器，支持实时预览和编辑。
*   **AI 润色与改写**：支持选中文字后进行“换个说法”、“扩写”、“精简”等操作，并支持一键撤回（免费功能）。
*   **一键导出**：支持将最终定稿导出为 Word (.docx) 格式。
*   **用户系统与积分**：
    *   支持用户注册/登录（基于 Supabase Auth）。
    *   积分机制：首次注册赠送 100 积分，生成一次消耗 1 积分，每月自动补给。
*   **历史记录管理**：
    *   自动保存生成记录（含表单数据、生成内容、原始附件）。
    *   支持查看历史详情、下载附件、复制内容。
*   **意见反馈系统**：
    *   用户提交问题或建议（支持截图上传）。
    *   查看历史反馈记录与处理状态。
*   **后台管理系统**：
    *   **用户管理**：查看用户列表，支持冻结/解冻账号、手动增减积分。
    *   **用户意见管理**：查看用户反馈列表与详情，支持状态流转（待处理/处理中/已解决）、未读红点与侧边栏未读数徽章（页面内操作实时更新）。
    *   **生成记录查询**：全站生成历史查询与预览，支持导出 CSV。
    *   **数据可视化**：仪表盘展示最近 30 天生成趋势图表。
    *   **审计日志**：记录管理员关键操作（如修改积分、登录等）。
*   **动态模板管理**：
    *   **可视化配置**：管理员可在后台创建、编辑、删除写作模板。
    *   **动态表单**：支持自定义表单字段（文本、日期、多行文本），前端实时渲染。
    *   **范文管理**：支持在线编辑 Prompt 模板与范文，并提供文件上传（Word/PDF/TXT）自动解析回填功能。

## 🛠️ 技术栈

### 前端 (Frontend)
*   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
*   **Editor**: [TipTap](https://tiptap.dev/)
*   **Charts**: [Recharts](https://recharts.org/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **BaaS**: [Supabase](https://supabase.com/) (Auth, Database, Storage)

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

在项目根目录创建 `.env.local` 文件，并填入 Deepseek 和 Supabase 配置：

```env
# AI Model Provider
DEEPSEEK_API_KEY=sk-your-api-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # 必须配置，用于后台管理功能
```

### 4. 数据库初始化 (Supabase)

请在 Supabase Dashboard 的 SQL Editor 中依次执行以下脚本（位于项目根目录）：

1.  `history_feature_init.sql`: 初始化历史记录表和存储桶。
2.  `monthly_credit_renewal.sql`: 配置积分每月自动更新任务。
3.  `feedback_feature_init.sql`: 初始化反馈表和存储桶。
4.  `update_feedback_schema.sql`: 为反馈表补充未读标记字段（用于后台未读红点/徽章）。
5.  `credit_deduction_rpc.sql`: 配置积分扣减的安全函数。
6.  `admin_feature_init.sql`: 初始化管理员表、审计日志表及默认管理员账号。
7.  `template_feature_init.sql`: 初始化动态模板表并迁移默认模板数据。

### 5. 启动应用

**方式一：一键启动 (Windows)**
双击运行项目根目录下的 `start_app.bat` 脚本。

**方式二：手动启动**

终端 1 (后端 API):
```bash
python -m uvicorn api.index:app --reload --port 8000
```

终端 2 (前端 Next.js):
```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用。
访问 [http://localhost:3000/admin](http://localhost:3000/admin) 进入后台管理系统（默认账号：admin / ZRJS888888）。

## 📂 项目结构

```
.
├── app/                  # Next.js 页面路由
│   ├── admin/            # 后台管理系统页面
│   ├── auth/             # 认证相关页面
│   ├── editor/           # 写作编辑器页面
│   ├── history/          # 历史记录页面
│   ├── feedback/         # 反馈页面
│   └── page.tsx          # 首页
├── components/           # React UI 组件
│   ├── ui/               # Shadcn 基础组件
│   ├── rich-editor.tsx   # AI 富文本编辑器
│   ├── smart-form.tsx    # 智能动态表单
│   └── template-cards.tsx # 首页动态模板卡片
├── api/                  # Python 后端逻辑
│   ├── index.py          # FastAPI 入口 (含 Admin API)
│   ├── generator.py      # 生成与润色逻辑 (DB 驱动模板)
│   └── parser.py         # 文档解析逻辑
├── public/               # 静态资源
├── examples/             # 示例素材文件 (旧版备份)
└── *.sql                 # 数据库初始化脚本
```

## 📝 开发注意事项

*   **API 代理**: 本地开发时，`next.config.ts` 配置了代理，将 `/api/*` 请求转发到 `localhost:8000`。
*   **文件上传限制**: 已配置 Next.js 代理支持最大 50MB 文件上传。
*   **Supabase 认证**: 确保在 Supabase 后台关闭 "Confirm email" 选项，以便注册后立即登录。
*   **动态模板**:
    *   模板配置已完全迁移至数据库，修改 `examples/` 目录下的文件不再生效。
    *   请通过后台管理系统 (`/admin/dashboard/templates`) 修改模板 Prompt 和范文。

## 📄 License

MIT
