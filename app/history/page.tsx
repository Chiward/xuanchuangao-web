"use client";

import { HistoryList } from "@/components/history-list";
import { SiteHeader } from "@/components/site-header";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="container mx-auto py-10 px-4 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">历史生成记录</h1>
          <p className="text-muted-foreground mt-2">
            查看您过去生成的所有宣传稿件，支持下载附件和复制内容。
          </p>
        </div>
        
        <HistoryList />
      </main>
    </div>
  );
}
