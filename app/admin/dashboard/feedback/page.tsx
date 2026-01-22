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
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Feedback {
  id: string;
  user_id: string;
  feedback_type: string;
  content: string;
  contact: string;
  image_urls: string[];
  status: string; // pending | processing | resolved
  is_read: boolean;
  created_at: string;
  username?: string;
  full_name?: string;
}

export default function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      let url = `/api/admin/feedback?page=${page}&limit=10`;
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbacks(data.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("获取反馈列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [page, statusFilter]);

  const handleMarkRead = async (feedback: Feedback) => {
    if (feedback.is_read) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/feedback/${feedback.id}/read`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ is_read: true }),
      });
      if (res.ok) {
        // Update local state
        setFeedbacks(prev => prev.map(f => f.id === feedback.id ? { ...f, is_read: true } : f));
        // Also update selected feedback
        if (selectedFeedback?.id === feedback.id) {
            setSelectedFeedback(prev => prev ? { ...prev, is_read: true } : null);
        }
        // Notify Sidebar to update count
        window.dispatchEvent(new Event("feedback-unread-changed"));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/feedback/${feedbackId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success("状态已更新");
        setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, status: newStatus } : f));
        if (selectedFeedback?.id === feedbackId) {
             setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };
  
  const openDetail = (feedback: Feedback) => {
      setSelectedFeedback(feedback);
      handleMarkRead(feedback);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
        case "pending": return <Badge variant="secondary">待处理</Badge>;
        case "processing": return <Badge variant="default" className="bg-blue-500">处理中</Badge>;
        case "resolved": return <Badge variant="default" className="bg-green-500">已解决</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户意见管理</h1>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>类型</TableHead>
              <TableHead>内容摘要</TableHead>
              <TableHead>用户ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>提交时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : feedbacks.length === 0 ? (
                <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  暂无反馈
                </TableCell>
              </TableRow>
            ) : (
              feedbacks.map((feedback) => (
                <TableRow key={feedback.id} className={!feedback.is_read ? "bg-muted/30 font-medium" : ""}>
                   <TableCell>
                        {!feedback.is_read && <div className="w-2 h-2 rounded-full bg-red-500 mx-auto" />}
                   </TableCell>
                  <TableCell>{feedback.feedback_type}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{feedback.content}</TableCell>
                  <TableCell className="font-mono text-xs">{feedback.user_id ? feedback.user_id.slice(0, 8) + "..." : "-"}</TableCell>
                  <TableCell>{feedback.username || feedback.full_name || "-"}</TableCell>
                  <TableCell>
                    {getStatusBadge(feedback.status)}
                  </TableCell>
                  <TableCell>{new Date(feedback.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Dialog open={selectedFeedback?.id === feedback.id} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDetail(feedback)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> 查看
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>反馈详情</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-bold text-right">类型:</span>
                                <span className="col-span-3">{selectedFeedback?.feedback_type}</span>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <span className="font-bold text-right">内容:</span>
                                <p className="col-span-3 whitespace-pre-wrap">{selectedFeedback?.content}</p>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-bold text-right">联系方式:</span>
                                <span className="col-span-3">{selectedFeedback?.contact || "无"}</span>
                            </div>
                            {selectedFeedback?.image_urls && selectedFeedback.image_urls.length > 0 && (
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <span className="font-bold text-right">附件:</span>
                                    <div className="col-span-3 flex flex-wrap gap-2">
                                        {selectedFeedback.image_urls.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer">
                                                <img src={url} alt={`attachment-${i}`} className="w-24 h-24 object-cover rounded border" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-bold text-right">当前状态:</span>
                                <div className="col-span-3">
                                     <Select 
                                        value={selectedFeedback?.status} 
                                        onValueChange={(val) => handleStatusChange(selectedFeedback!.id, val)}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">待处理</SelectItem>
                                            <SelectItem value="processing">处理中</SelectItem>
                                            <SelectItem value="resolved">已解决</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => setSelectedFeedback(null)}>关闭</Button>
                        </DialogFooter>
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
