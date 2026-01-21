-- 历史生成记录功能初始化脚本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 创建历史记录表
create table if not exists public.generation_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  template_type text not null,
  form_data jsonb not null,
  context_file_path text, -- 存储在 Storage 中的路径，如 "user_id/filename.docx"
  context_filename text,  -- 原始文件名
  generated_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用 RLS
alter table public.generation_history enable row level security;

-- 策略：用户只能查看自己的记录
create policy "Users can view own history" 
  on public.generation_history 
  for select 
  using (auth.uid() = user_id);

-- 策略：用户只能插入自己的记录
create policy "Users can insert own history" 
  on public.generation_history 
  for insert 
  with check (auth.uid() = user_id);

-- 策略：用户只能删除自己的记录
create policy "Users can delete own history" 
  on public.generation_history 
  for delete 
  using (auth.uid() = user_id);


-- 2. 创建 Storage Bucket 'user_uploads' 并配置策略
-- 注意：如果 bucket 已存在，下面插入语句可能会失败，可以忽略
insert into storage.buckets (id, name, public)
values ('user_uploads', 'user_uploads', false)
on conflict (id) do nothing;

-- Storage 策略：允许用户上传文件到自己的目录下
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user_uploads' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage 策略：允许用户查看/下载自己的文件
create policy "Allow authenticated reads"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user_uploads' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage 策略：允许用户删除自己的文件
create policy "Allow authenticated deletes"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user_uploads' and
  (storage.foldername(name))[1] = auth.uid()::text
);
