-- 模板管理功能初始化脚本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 创建 templates 表
create table if not exists public.templates (
  id uuid default gen_random_uuid() primary key,
  key text not null unique, -- 模板标识符，如 'meeting'
  name text not null, -- 模板名称
  description text, -- 适用范围描述
  prompt_template text not null, -- AI Prompt 模板
  form_config jsonb not null, -- 表单字段配置
  example_content text, -- 范文内容
  status text default 'active', -- active | disabled
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用 RLS
alter table public.templates enable row level security;

-- RLS 策略：所有人可读（用于前端展示），仅管理员可写
create policy "Templates are viewable by everyone" 
  on public.templates for select 
  using (true);

-- 2. 插入初始数据 (从 hardcoded 迁移)

-- 会议纪要
insert into public.templates (key, name, description, prompt_template, form_config)
values (
  'meeting',
  '重要会议',
  '适用于各类正式会议、总结大会、座谈会的纪要与宣传报道。',
  '你是一个专业的企业宣传稿撰写助手。请根据以下会议信息和参考材料，写一篇正式的会议纪要宣传稿。\n\n【会议要素】\n主题：{title}\n时间：{date}\n地点：{location}\n参会人员：{attendees}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【学习范文】\n{examples}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 重点内容（如讲话要点）使用<strong>加粗。\n5. 语气庄重、客观。',
  '[
    {"label": "会议主题", "name": "title", "type": "text", "placeholder": "例如：2023年度总结表彰大会", "required": true},
    {"label": "会议时间", "name": "date", "type": "date", "required": true},
    {"label": "会议地点", "name": "location", "type": "text", "placeholder": "例如：公司一号会议室", "required": true},
    {"label": "参会人员", "name": "attendees", "type": "text", "placeholder": "例如：公司领导班子、各部门负责人", "required": true},
    {"label": "内容摘要", "name": "summary", "type": "textarea", "placeholder": "简要描述会议主要议程、强调重点...", "required": true}
  ]'
) on conflict (key) do nothing;

-- 培训活动
insert into public.templates (key, name, description, prompt_template, form_config)
values (
  'training',
  '培训活动',
  '适用于内部培训、讲座、技能比武等活动的宣传。',
  '你是一个专业的企业宣传稿撰写助手。请根据以下培训活动信息，写一篇生动的培训活动宣传稿。\n\n【活动要素】\n主题：{title}\n时间：{date}\n地点：{location}\n讲师：{lecturer}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【学习范文】\n{examples}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 突出培训目的、现场氛围、学员收获。\n5. 语气积极向上。',
  '[
    {"label": "培训主题", "name": "title", "type": "text", "placeholder": "例如：合规风控专题培训", "required": true},
    {"label": "培训时间", "name": "date", "type": "date", "required": true},
    {"label": "培训地点", "name": "location", "type": "text", "required": true},
    {"label": "培训讲师", "name": "lecturer", "type": "text", "required": true},
    {"label": "内容摘要", "name": "summary", "type": "textarea", "placeholder": "简要描述培训背景、主要内容...", "required": true}
  ]'
) on conflict (key) do nothing;

-- 领导检查
insert into public.templates (key, name, description, prompt_template, form_config)
values (
  'inspection',
  '领导带队检查',
  '适用于上级领导视察、安全检查、调研指导等场景。',
  '你是一个专业的企业宣传稿撰写助手。请根据以下领导检查信息，写一篇正式的迎检宣传稿。\n\n【检查要素】\n主题：{title}\n时间：{date}\n地点：{location}\n带队领导：{leader}\n陪同人员：{attendees}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【学习范文】\n{examples}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 重点描述检查过程、领导指示、后续整改或落实措施。\n5. 语气严谨。',
  '[
    {"label": "检查主题", "name": "title", "type": "text", "placeholder": "例如：安全生产专项检查", "required": true},
    {"label": "检查时间", "name": "date", "type": "date", "required": true},
    {"label": "检查地点", "name": "location", "type": "text", "required": true},
    {"label": "带队领导", "name": "leader", "type": "text", "required": true},
    {"label": "陪同人员", "name": "attendees", "type": "text", "required": false},
    {"label": "内容摘要", "name": "summary", "type": "textarea", "placeholder": "简要描述检查重点、发现问题及指示...", "required": true}
  ]'
) on conflict (key) do nothing;

-- 项目中标
insert into public.templates (key, name, description, prompt_template, form_config)
values (
  'bid_winning',
  '项目中标',
  '适用于项目中标、合同签订等喜报类宣传。',
  '你是一个专业的企业宣传稿撰写助手。请根据以下中标信息，写一篇振奋人心的中标喜报。\n\n【中标要素】\n项目名称：{title}\n时间：{date}\n地点：{location}\n项目介绍：{project_intro}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【学习范文】\n{examples}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 介绍项目概况、中标意义、团队努力。\n5. 语气热烈、自信。',
  '[
    {"label": "项目名称", "name": "title", "type": "text", "placeholder": "例如：某产业园施工总承包项目", "required": true},
    {"label": "中标时间", "name": "date", "type": "date", "required": true},
    {"label": "项目地点", "name": "location", "type": "text", "required": true},
    {"label": "项目介绍", "name": "project_intro", "type": "textarea", "placeholder": "项目规模、建设内容、中标金额等...", "required": true},
    {"label": "内容摘要", "name": "summary", "type": "textarea", "placeholder": "中标意义、团队努力...", "required": true}
  ]'
) on conflict (key) do nothing;

-- 项目重大进展
insert into public.templates (key, name, description, prompt_template, form_config)
values (
  'project_progress',
  '项目重大进展',
  '适用于工程节点突破、阶段性成果等进度报道。',
  '你是一个专业的企业宣传稿撰写助手。请根据以下项目进展信息，写一篇项目通讯稿。\n\n【项目要素】\n项目名称：{title}\n时间：{date}\n地点：{location}\n关键节点：{milestone}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【学习范文】\n{examples}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 描述施工现场情况、攻坚克难过程、节点意义。\n5. 语气务实、鼓舞人心。',
  '[
    {"label": "项目名称", "name": "title", "type": "text", "required": true},
    {"label": "当前时间", "name": "date", "type": "date", "required": true},
    {"label": "项目地点", "name": "location", "type": "text", "required": true},
    {"label": "关键节点", "name": "milestone", "type": "text", "placeholder": "例如：主体结构封顶", "required": true},
    {"label": "内容摘要", "name": "summary", "type": "textarea", "placeholder": "施工进展、攻坚克难情况...", "required": true}
  ]'
) on conflict (key) do nothing;

-- 科技创新
insert into public.templates (key, name, description, prompt_template, form_config)
values (
  'innovation',
  '科技创新',
  '适用于科研成果、专利获奖、技术认定等宣传。',
  '你是一个专业的企业宣传稿撰写助手。请根据以下科技创新成果，写一篇科技成果宣传稿。\n\n【创新要素】\n成果名称：{title}\n时间：{date}\n主要成果：{achievements}\n内容摘要：{summary}\n\n【参考材料】\n{context}\n\n【学习范文】\n{examples}\n\n【要求】\n1. 使用HTML格式输出，只返回<body>标签内的内容。\n2. 标题使用<h2>标签，居中对齐。\n3. 正文分段清晰，使用<p>标签，每段开头空两格（使用&emsp;&emsp;）。\n4. 介绍研发背景、技术难点、创新点、应用价值。\n5. 语气专业、具有前瞻性。',
  '[
    {"label": "成果名称", "name": "title", "type": "text", "required": true},
    {"label": "获奖/认定时间", "name": "date", "type": "date", "required": true},
    {"label": "主要成果", "name": "achievements", "type": "textarea", "placeholder": "技术创新点、应用效果...", "required": true},
    {"label": "内容摘要", "name": "summary", "type": "textarea", "placeholder": "研发历程、未来展望...", "required": true}
  ]'
) on conflict (key) do nothing;
