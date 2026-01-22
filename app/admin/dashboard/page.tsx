"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";

interface DailyStat {
  date: string;
  count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats?days=30", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const handleExport = () => {
    if (stats.length === 0) return;
    
    // Create CSV content
    const headers = "日期,生成数量\n";
    const rows = stats.map(row => `${row.date},${row.count}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + rows;
    
    // Trigger download
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `generation_stats_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <Button variant="outline" onClick={handleExport} disabled={stats.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          导出数据
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>生成趋势</CardTitle>
            <CardDescription>最近 30 天的全站内容生成数量统计</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)} // Show MM-DD
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    labelStyle={{ color: "#666" }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    name="生成数量"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}