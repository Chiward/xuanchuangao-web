"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { FeedbackList } from "@/components/feedback-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, X, MessageSquare } from "lucide-react";

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    feedbackType: "",
    content: "",
    contact: "",
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 3) {
        toast.error("最多只能上传3张图片");
        return;
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.feedbackType) {
      toast.error("请选择反馈类型");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("请输入反馈内容");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("请先登录");
        return;
      }

      // 1. Upload images if any
      const imageUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const path = `${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('feedback_uploads')
            .upload(path, file);
          
          if (uploadError) throw uploadError;
          imageUrls.push(path);
        }
      }

      // 2. Insert feedback record
      const { error } = await supabase.from("feedback").insert({
        user_id: session.user.id,
        feedback_type: formData.feedbackType,
        content: formData.content,
        contact: formData.contact,
        image_urls: imageUrls,
      });

      if (error) throw error;

      toast.success("反馈提交成功，感谢您的建议！");
      setFormData({ feedbackType: "", content: "", contact: "" });
      setFiles([]);
      setRefreshKey(prev => prev + 1); // Trigger list refresh
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "提交失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="container mx-auto py-10 px-4 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">意见反馈</h1>
            <p className="text-muted-foreground">
              您的建议是我们进步的动力。如果在使用过程中遇到问题或有任何想法，欢迎随时反馈。
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                填写反馈
              </CardTitle>
              <CardDescription>我们会认真阅读每一条反馈，并尽快改进。</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="type">反馈类型 <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.feedbackType} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, feedbackType: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择反馈类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="issue">功能异常/Bug</SelectItem>
                      <SelectItem value="feature">功能建议/需求</SelectItem>
                      <SelectItem value="optimization">体验优化</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">反馈内容 <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="content"
                    placeholder="请详细描述您遇到的问题或建议..."
                    className="min-h-[150px]"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>图片附件 (可选，最多3张)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground break-all p-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {files.length < 3 && (
                      <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">上传图片</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileChange}
                          multiple 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">联系方式 (可选)</Label>
                  <Input
                    id="contact"
                    placeholder="邮箱或手机号，方便我们需要时联系您"
                    value={formData.contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  提交反馈
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight mb-6">历史反馈记录</h2>
            <FeedbackList refreshTrigger={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
}
