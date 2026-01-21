"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface SmartFormProps {
  templateType: string;
  onGenerate: (data: any, contextText: string, fileInfo?: { path: string, name: string }) => void;
  isGenerating: boolean;
}

const FIELD_CONFIG: Record<string, { label: string; name: string; type: "text" | "date" | "textarea"; placeholder?: string }[]> = {
  meeting: [
    { label: "会议主题", name: "title", type: "text", placeholder: "例如：2023年度总结表彰大会" },
    { label: "会议时间", name: "date", type: "date" },
    { label: "会议地点", name: "location", type: "text", placeholder: "例如：公司一号会议室" },
    { label: "参会人员", name: "attendees", type: "text", placeholder: "例如：公司领导班子、各部门负责人" },
    { label: "内容摘要", name: "summary", type: "textarea", placeholder: "简要描述会议主要议程、强调重点..." },
  ],
  training: [
    { label: "培训主题", name: "title", type: "text", placeholder: "例如：合规风控专题培训" },
    { label: "培训时间", name: "date", type: "date" },
    { label: "培训地点", name: "location", type: "text" },
    { label: "培训讲师", name: "lecturer", type: "text" },
    { label: "内容摘要", name: "summary", type: "textarea", placeholder: "简要描述培训背景、主要内容..." },
  ],
  inspection: [
    { label: "检查主题", name: "title", type: "text", placeholder: "例如：安全生产专项检查" },
    { label: "检查时间", name: "date", type: "date" },
    { label: "检查地点", name: "location", type: "text" },
    { label: "带队领导", name: "leader", type: "text" },
    { label: "陪同人员", name: "attendees", type: "text" },
    { label: "内容摘要", name: "summary", type: "textarea", placeholder: "简要描述检查重点、发现问题及指示..." },
  ],
  bid_winning: [
    { label: "项目名称", name: "title", type: "text", placeholder: "例如：某产业园施工总承包项目" },
    { label: "中标时间", name: "date", type: "date" },
    { label: "项目地点", name: "location", type: "text" },
    { label: "项目介绍", name: "project_intro", type: "textarea", placeholder: "项目规模、建设内容、中标金额等..." },
    { label: "内容摘要", name: "summary", type: "textarea", placeholder: "中标意义、团队努力..." },
  ],
  project_progress: [
    { label: "项目名称", name: "title", type: "text" },
    { label: "当前时间", name: "date", type: "date" },
    { label: "项目地点", name: "location", type: "text" },
    { label: "关键节点", name: "milestone", type: "text", placeholder: "例如：主体结构封顶" },
    { label: "内容摘要", name: "summary", type: "textarea", placeholder: "施工进展、攻坚克难情况..." },
  ],
  innovation: [
    { label: "成果名称", name: "title", type: "text" },
    { label: "获奖/认定时间", name: "date", type: "date" },
    { label: "主要成果", name: "achievements", type: "textarea", placeholder: "技术创新点、应用效果..." },
    { label: "内容摘要", name: "summary", type: "textarea", placeholder: "研发历程、未来展望..." },
  ],
};

export function SmartForm({ templateType, onGenerate, isGenerating }: SmartFormProps) {
  const { register, handleSubmit } = useForm();
  const [contextText, setContextText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fields = FIELD_CONFIG[templateType] || FIELD_CONFIG["meeting"];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Parallel Upload to Supabase Storage & Parse API
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const uploadPromise = (async () => {
        if (!userId) return null; // If not logged in, skip storage (or allow anon?) - assuming logged in for history
        const ext = file.name.split('.').pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('user_uploads').upload(path, file);
        if (error) {
            console.error("Storage upload failed:", error);
            return null;
        }
        return path;
      })();

      const parsePromise = fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      const [storagePath, res] = await Promise.all([uploadPromise, parsePromise]);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "未知错误" }));
        throw new Error(errorData.detail || "文件解析失败");
      }
      
      const data = await res.json();
      setContextText((prev) => prev + "\n\n" + data.content);
      setUploadedFile(file.name);
      if (storagePath) setFilePath(storagePath);
      
      toast.success("文件解析成功，已提取关键信息");
    } catch (error: any) {
      toast.error(`文件上传失败: ${error.message}`);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: any) => {
    onGenerate(data, contextText, filePath && uploadedFile ? { path: filePath, name: uploadedFile } : undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    {...register(field.name)}
                    className="min-h-[100px]"
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    {...register(field.name)}
                  />
                )}
              </div>
            ))}

            <div className="space-y-2">
              <Label>参考素材 (支持 Word, PPT, PDF)</Label>
              {!uploadedFile ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    accept=".docx,.pptx,.pdf,.txt"
                    disabled={isUploading}
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm">
                      {isUploading ? "正在解析..." : "点击或拖拽上传文件"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate max-w-[200px]">{uploadedFile}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setUploadedFile(null);
                      setFilePath(null);
                      setContextText("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isGenerating}>
              {isGenerating ? "正在生成..." : "✨ 开始生成宣传稿"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
