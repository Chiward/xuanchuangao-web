"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Clock, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackItem {
  id: string;
  feedback_type: string;
  content: string;
  image_urls: string[] | null;
  status: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  issue: "功能异常",
  feature: "功能建议",
  optimization: "体验优化",
  other: "其他",
};

interface FeedbackListProps {
  refreshTrigger: number;
}

export function FeedbackList({ refreshTrigger }: FeedbackListProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 5;
  const listRef = useRef<HTMLDivElement>(null);

  // 当 refreshTrigger 变化时，重置列表并刷新
  useEffect(() => {
    fetchFeedback(0, true);
  }, [refreshTrigger]);

  const fetchFeedback = async (pageIndex: number, refresh = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        if (refresh) {
          setItems(data);
          // 如果是提交后的刷新，滚动到顶部
          if (refreshTrigger > 0 && listRef.current) {
            listRef.current.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          setItems((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageIndex);
      }
    } catch (error) {
      console.error(error);
      toast.error("加载历史反馈失败");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading && page === 0) {
    return (
      <div className="text-center py-10">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">正在加载反馈记录...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-muted-foreground">暂无反馈记录</h3>
        <p className="text-sm text-muted-foreground/80 mt-1">您提交的意见将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={listRef}>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Clock className="w-5 h-5" /> 历史反馈
      </h2>
      
      <div className="relative pl-6 border-l-2 border-muted space-y-8">
        {items.map((item, index) => {
          const isExpanded = expandedIds.has(item.id);
          const isLongContent = item.content.length > 100;
          const displayContent = isExpanded ? item.content : item.content.slice(0, 100) + (isLongContent ? "..." : "");
          // 高亮第一条（如果是刚刷新的）
          const isNewest = index === 0 && refreshTrigger > 0;

          return (
            <div key={item.id} className="relative">
              {/* 时间轴圆点 */}
              <div className={cn(
                "absolute -left-[29px] top-4 w-3 h-3 rounded-full border-2 border-background",
                isNewest ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
              )} />
              
              <Card className={cn("transition-colors", isNewest && "border-primary/50 bg-primary/5")}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        item.status === 'resolved' ? "bg-green-50 text-green-600 border-green-200" :
                        item.status === 'processing' ? "bg-blue-50 text-blue-600 border-blue-200" :
                        "bg-gray-50 text-gray-600 border-gray-200"
                      )}>
                        {TYPE_LABELS[item.feedback_type] || item.feedback_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {displayContent}
                  </p>

                  {isLongContent && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 mt-2 text-primary"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {isExpanded ? (
                        <span className="flex items-center gap-1">收起 <ChevronUp className="w-3 h-3" /></span>
                      ) : (
                        <span className="flex items-center gap-1">查看更多 <ChevronDown className="w-3 h-3" /></span>
                      )}
                    </Button>
                  )}

                  {item.image_urls && item.image_urls.length > 0 && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {item.image_urls.map((url, i) => (
                        <div key={i} className="relative group">
                          <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center border overflow-hidden">
                            <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                          {/* 实际项目中这里可以使用 Next.js Image 组件配合 Supabase Storage 签名 URL */}
                        </div>
                      ))}
                      <span className="text-xs text-muted-foreground self-end mb-1">
                        {item.image_urls.length} 个附件
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center pt-4 pl-6">
          <Button variant="outline" onClick={() => fetchFeedback(page + 1)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "加载更多"}
          </Button>
        </div>
      )}
    </div>
  );
}
