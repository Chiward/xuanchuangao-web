-- 后台管理系统初始化脚本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 扩展 profiles 表
alter table public.profiles 
add column if not exists status text default 'active', -- active | frozen
add column if not exists credit_limit int default 99999;

-- 2. 创建管理员表
create table if not exists public.admins (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  password_hash text not null,
  password_salt text,
  role text default 'admin',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admins
add column if not exists password_salt text;

-- 插入默认管理员 (密码: ZRJS888888)
insert into public.admins (username, password_hash)
values ('admin', 'b79e88ac7529b8a1130a7de15877e364e672c4c2d764db7fc7fd7b467887dfb4')
on conflict (username) do nothing;

-- 3. 创建审计日志表
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_username text not null,
  action text not null,
  target_user_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RLS 策略 (Admin 表仅允许通过 Service Role 访问，或不启用 RLS 但后端严格校验)
-- 这里我们选择启用 RLS 但不添加 public 访问策略，完全依赖后端 Service Role Key 操作
alter table public.admins enable row level security;
alter table public.audit_logs enable row level security;

-- 允许 Admin 角色读取 Profiles (如果前端直接查 Supabase)
-- 但为了安全，建议所有管理操作走后端 API，后端使用 Service Role Key
