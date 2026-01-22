"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface SmartFormProps {
  templateType: string;
  onGenerate: (data: any, contextText: string, fileInfo?: { path: string, name: string }) => void;
  isGenerating: boolean;
}

interface FormField {
  label: string;
  name: string;
  type: "text" | "date" | "textarea";
  placeholder?: string;
  required?: boolean;
}

export function SmartForm({ templateType, onGenerate, isGenerating }: SmartFormProps) {
  const { register, handleSubmit, reset } = useForm();
  const [contextText, setContextText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Dynamic config state
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Fetch template config from API
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const res = await fetch(`/api/templates?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const templates = await res.json();
          const currentTemplate = templates.find((t: any) => t.key === templateType);
          if (currentTemplate && currentTemplate.form_config) {
            setFields(currentTemplate.form_config);
          } else {
            toast.error("未找到该模板配置，请联系管理员");
          }
        } else {
          console.error("Failed to fetch templates");
        }
      } catch (error) {
        console.error("Error loading template config:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [templateType]);

  // Reset form when template changes
  useEffect(() => {
    reset();
    setContextText("");
    setUploadedFile(null);
    setFilePath(null);
  }, [templateType, reset]);

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

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    {...register(field.name, { required: field.required })}
                    className="min-h-[100px]"
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    {...register(field.name, { required: field.required })}
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
