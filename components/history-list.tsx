"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, FileText, Download, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  template_type: string;
  form_data: any;
  context_file_path: string | null;
  context_filename: string | null;
  generated_content: string;
  created_at: string;
}

const TEMPLATE_NAMES: Record<string, string> = {
  meeting: "重要会议",
  training: "培训活动",
  inspection: "领导检查",
  bid_winning: "项目中标",
  project_progress: "项目进展",
  innovation: "科技创新",
};

export function HistoryList() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchHistory(0, true);
  }, [filter]);

  const fetchHistory = async (pageIndex: number, refresh = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from("generation_history")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

      if (filter !== "all") {
        query = query.eq("template_type", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        if (refresh) {
          setHistory(data);
        } else {
          setHistory((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageIndex);
      }
    } catch (error) {
      console.error(error);
      toast.error("获取历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage.from("user_uploads").download(path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("文件下载失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    
    try {
      const { error } = await supabase.from("generation_history").delete().eq("id", id);
      if (error) throw error;
      
      setHistory((prev) => prev.filter((item) => item.id !== id));
      toast.success("记录已删除");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("内容已复制");
  };

  return (
    <div className="space-y-6 mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" /> 历史生成记录
        </h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="筛选类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(TEMPLATE_NAMES).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && page === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-10 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">暂无生成记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded">
                        {TEMPLATE_NAMES[item.template_type] || item.template_type}
                      </span>
                      {item.form_data.title || "未命名文稿"}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-4">
                      <span>{format(new Date(item.created_at), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}</span>
                      {item.context_filename && (
                        <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                          <FileText className="w-3 h-3" /> {item.context_filename}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedId === item.id && (
                <CardContent className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">输入信息</h4>
                      <div className="bg-muted/30 p-3 rounded text-sm space-y-1">
                        {Object.entries(item.form_data).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="col-span-2 truncate">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                      {item.context_file_path && (
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleDownload(item.context_file_path!, item.context_filename!)}>
                          <Download className="w-4 h-4 mr-2" /> 下载附件
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm text-muted-foreground">生成内容</h4>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(item.generated_content)}>
                          <Copy className="w-3 h-3 mr-1" /> 复制
                        </Button>
                      </div>
                      <div 
                        className="bg-muted/30 p-3 rounded text-sm max-h-[300px] overflow-y-auto prose prose-sm dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: item.generated_content }}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          
          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => fetchHistory(page + 1)} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "加载更多"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
