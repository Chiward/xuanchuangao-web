"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Eye } from "lucide-react";

interface HistoryItem {
  id: string;
  user_id: string;
  template_type: string;
  form_data: any;
  generated_content: string;
  created_at: string;
}

export default function HistoryManagement() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const res = await fetch(`/api/admin/history?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">全站生成记录</h1>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户ID</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>生成时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
                  <TableCell className="font-mono text-xs">{item.user_id.slice(0, 8)}...</TableCell>
                  <TableCell>{item.template_type}</TableCell>
                  <TableCell>{item.form_data.title || "未命名"}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" /> 查看
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>生成内容预览</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-muted p-4 rounded text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(item.form_data, null, 2)}
                          </div>
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none border p-4 rounded"
                            dangerouslySetInnerHTML={{ __html: item.generated_content }}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          disabled={page === 0} 
          onClick={() => setPage(p => p - 1)}
        >
          上一页
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setPage(p => p + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}