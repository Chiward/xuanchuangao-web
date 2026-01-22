"use client";

import { Home, Users, FileText, Activity, LogOut, LayoutTemplate, MessageSquare } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  {
    title: "仪表盘",
    url: "/admin/dashboard",
    icon: Home,
  },
  {
    title: "模板管理",
    url: "/admin/dashboard/templates",
    icon: LayoutTemplate,
  },
  {
    title: "用户管理",
    url: "/admin/dashboard/users",
    icon: Users,
  },
  {
    title: "用户意见",
    url: "/admin/dashboard/feedback",
    icon: MessageSquare,
  },
  {
    title: "生成记录",
    url: "/admin/dashboard/history",
    icon: FileText,
  },
  {
    title: "操作日志",
    url: "/admin/dashboard/audit",
    icon: Activity,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      try {
        const res = await fetch("/api/admin/feedback/unread-count", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setUnreadCount(data.count);
        }
      } catch (e) {
        console.error("Failed to fetch unread count", e);
      }
    };
    
    fetchUnreadCount();
    // Refresh every minute
    const interval = setInterval(fetchUnreadCount, 60000);
    
    // Listen for custom event to update immediately
    const handleUpdate = () => fetchUnreadCount();
    window.addEventListener("feedback-unread-changed", handleUpdate);
    
    return () => {
        clearInterval(interval);
        window.removeEventListener("feedback-unread-changed", handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>宣传稿助手后台</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url} className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.title}</span>
                      </div>
                      {item.title === "用户意见" && unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>退出登录</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}