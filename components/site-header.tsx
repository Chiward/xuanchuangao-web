"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { Loader2, User as UserIcon, Coins, Home, History, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          fetchCredits(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
        fetchCredits(session.user.id);
      } else {
        setUser(null);
        setCredits(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setCredits(data.credits);
      }
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { href: "/", label: "首页", icon: Home },
    { href: "/history", label: "历史记录", icon: History },
    { href: "/feedback", label: "意见反馈", icon: MessageSquare },
  ];

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
            <span className="text-primary">✨</span>
            <span>宣传稿助手</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <div className="flex items-center gap-4">
              {credits !== null && (
                <div className="flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                  <Coins className="w-4 h-4" />
                  <span>{credits} 积分</span>
                </div>
              )}
              <Link href="/auth">
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{user.user_metadata?.username || "用户"}</span>
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/auth">
              <Button size="sm">登录 / 注册</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
