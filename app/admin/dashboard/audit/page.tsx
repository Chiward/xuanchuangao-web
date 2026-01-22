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
import { Loader2 } from "lucide-react";

interface AuditLog {
  id: string;
  admin_username: string;
  action: string;
  target_user_id?: string;
  details?: any;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const res = await fetch(`/api/admin/audit?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">操作审计日志</h1>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>管理员</TableHead>
              <TableHead>动作</TableHead>
              <TableHead>目标用户</TableHead>
              <TableHead>详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.admin_username}</TableCell>
                  <TableCell>
                    <span className="font-medium bg-muted px-2 py-1 rounded text-xs">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.target_user_id ? log.target_user_id.slice(0, 8) + "..." : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {JSON.stringify(log.details)}
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