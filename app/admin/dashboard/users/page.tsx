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
import { Input } from "@/components/ui/input";
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
import { Loader2, Edit2, Ban, CheckCircle } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  credits: number;
  status: string; // active | frozen
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [editingCredit, setEditingCredit] = useState<{ id: string; credits: number } | null>(null);
  const [creditValue, setCreditValue] = useState("");

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const res = await fetch(`/api/admin/users?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleStatusChange = async (userId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const newStatus = currentStatus === "active" ? "frozen" : "active";
      
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success("状态已更新");
        fetchUsers();
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const handleCreditUpdate = async () => {
    if (!editingCredit) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/users/${editingCredit.id}/credits`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ credits: parseInt(creditValue) }),
      });

      if (res.ok) {
        toast.success("积分已更新");
        setEditingCredit(null);
        fetchUsers();
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>积分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>注册时间</TableHead>
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
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                  <TableCell>{user.username || "-"}</TableCell>
                  <TableCell>{user.full_name || "-"}</TableCell>
                  <TableCell>{user.credits}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "destructive"}>
                      {user.status === "active" ? "正常" : "冻结"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="flex gap-2">
                    <Dialog open={editingCredit?.id === user.id} onOpenChange={(open) => !open && setEditingCredit(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingCredit({ id: user.id, credits: user.credits });
                            setCreditValue(user.credits.toString());
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" /> 积分
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>修改积分</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <Input 
                            type="number" 
                            value={creditValue} 
                            onChange={(e) => setCreditValue(e.target.value)} 
                          />
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreditUpdate}>保存</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      variant={user.status === "active" ? "destructive" : "secondary"}
                      size="sm"
                      onClick={() => handleStatusChange(user.id, user.status)}
                    >
                      {user.status === "active" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
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