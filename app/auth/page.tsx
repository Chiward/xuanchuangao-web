"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // 表单状态
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 用户信息与积分
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // 检查登录状态
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchCredits(session.user.id);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchCredits(session.user.id);
      } else {
        setUser(null);
        setCredits(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 获取积分
  const fetchCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching credits:", error);
      } else {
        setCredits(data?.credits ?? 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 处理登录/注册
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 为了简化，我们使用 username + 伪域名作为邮箱
    // 实际项目中建议直接让用户输入邮箱
    const email = `${username}@xuanchuangao.local`;

    try {
      if (isLogin) {
        // 登录逻辑
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("登录成功！");
        router.push("/editor"); // 登录后跳转到编辑器
      } else {
        // 注册逻辑
        if (password !== confirmPassword) {
          toast.error("两次输入的密码不一致");
          setLoading(false);
          return;
        }

        // 1. 注册 Auth 用户
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username, // 将用户名存在 metadata 中
            },
          },
        });

        if (authError) throw authError;

        // 注意：这里我们依赖 Supabase 的 Trigger 来创建 profiles 记录并赠送积分
        // 如果没有设置 Trigger，可以在这里手动插入，但 Trigger 更安全可靠

        toast.success("注册成功！已赠送 100 积分");
        // 注册成功后自动登录，通常 Supabase 会自动处理 session
      }
    } catch (error: any) {
      toast.error(error.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("已退出登录");
    router.refresh();
  };

  if (user) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>欢迎回来，{user.user_metadata?.username || username}</CardTitle>
            <CardDescription>当前账号状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">剩余积分</p>
              <p className="text-4xl font-bold text-primary">{credits !== null ? credits : "..."}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => router.push("/editor")}>进入编辑器</Button>
            <Button variant="outline" className="w-full" onClick={handleLogout}>退出登录</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 flex justify-center items-center min-h-[600px]">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>{isLogin ? "登录账号" : "注册新账号"}</CardTitle>
          <CardDescription>
            {isLogin 
              ? "登录以保存您的创作记录和积分" 
              : "注册即送 100 积分。生成稿件消耗 1 积分，润色/改写免费。每月自动补给 100 积分。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input 
                id="username" 
                placeholder="请输入用户名" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  建议使用名字的小写拼音，方便后台管理。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="请输入密码" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="请再次输入密码" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "登录" : "注册"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "没有账号？去注册" : "已有账号？去登录"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
