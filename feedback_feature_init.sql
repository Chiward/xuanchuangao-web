-- 意见反馈功能初始化脚本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 创建反馈记录表
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  feedback_type text not null, -- 问题 | 需求 | 建议
  content text not null,
  contact text,
  image_urls text[], -- 存储附件图片路径
  status text default 'pending', -- pending | processing | resolved
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用 RLS
alter table public.feedback enable row level security;

-- 策略：用户只能插入自己的反馈
create policy "Users can insert own feedback" 
  on public.feedback 
  for insert 
  with check (auth.uid() = user_id);

-- 策略：用户只能查看自己的反馈
create policy "Users can view own feedback" 
  on public.feedback 
  for select 
  using (auth.uid() = user_id);

-- 2. 创建 Storage Bucket 'feedback_uploads' 并配置策略
insert into storage.buckets (id, name, public)
values ('feedback_uploads', 'feedback_uploads', false)
on conflict (id) do nothing;

-- Storage 策略：允许用户上传反馈图片
create policy "Allow authenticated feedback uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'feedback_uploads' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage 策略：允许用户查看/下载自己的反馈图片
create policy "Allow authenticated feedback reads"
on storage.objects for select
to authenticated
using (
  bucket_id = 'feedback_uploads' and
  (storage.foldername(name))[1] = auth.uid()::text
);
