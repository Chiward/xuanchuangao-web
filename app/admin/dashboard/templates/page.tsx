"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Save, FileText, X, Upload } from "lucide-react";

interface FormConfig {
  label: string;
  name: string;
  type: "text" | "date" | "textarea";
  placeholder?: string;
  required: boolean;
}

interface Template {
  id: string;
  key: string;
  name: string;
  description: string;
  prompt_template: string;
  form_config: FormConfig[];
  example_content: string;
  status: string;
}

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = async ({ silent }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/templates?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = (Array.isArray(data) ? data : []).map((t: any) => ({
          ...t,
          name: String(t?.name ?? ""),
          description: t?.description == null ? "" : String(t.description),
        }));
        setTemplates(normalized);
      }
    } catch (error) {
      toast.error("加载模板失败");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchTemplates({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSave = async () => {
    if (!currentTemplate) return;
    
    // Basic validation
    if (!currentTemplate.key || !currentTemplate.name || !currentTemplate.prompt_template) {
      toast.error("请填写必要信息（标识符、名称、Prompt）");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const url = isEditing 
        ? `/api/admin/templates/${currentTemplate.id}`
        : "/api/admin/templates";
      
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(currentTemplate),
      });

      if (!res.ok) throw new Error("保存失败");

      const savedTemplate = await res.json();
      
      // Update local state immediately to reflect changes without full reload if editing
      if (isEditing) {
        setTemplates(prev => prev.map(t => t.id === savedTemplate.id ? savedTemplate : t));
      } else {
        setTemplates(prev => [savedTemplate, ...prev]);
      }
      fetchTemplates({ silent: true });

      toast.success(isEditing ? "模板更新成功" : "模板创建成功");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("操作失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该模板吗？此操作不可恢复。")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("模板已删除");
        fetchTemplates();
      }
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const openEdit = (template: Template) => {
    setCurrentTemplate({ ...template });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setCurrentTemplate({
      id: "",
      key: "",
      name: "",
      description: "",
      prompt_template: "",
      form_config: [],
      example_content: "",
      status: "active"
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTemplate) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("文件解析失败");
      }
      
      const data = await res.json();
      const newExample = currentTemplate.example_content 
        ? currentTemplate.example_content + "\n\n" + data.content
        : data.content;
      
      setCurrentTemplate({ ...currentTemplate, example_content: newExample });
      toast.success("范文解析成功，已追加到内容框");
    } catch (error: any) {
      toast.error(`文件上传失败: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset input value to allow re-uploading same file
      e.target.value = "";
    }
  };

  // Form Config Helper
  const addField = () => {
    if (!currentTemplate) return;
    setCurrentTemplate({
      ...currentTemplate,
      form_config: [
        ...currentTemplate.form_config,
        { label: "新字段", name: `field_${Date.now()}`, type: "text", required: true }
      ]
    });
  };

  const updateField = (index: number, key: keyof FormConfig, value: any) => {
    if (!currentTemplate) return;
    const newConfig = [...currentTemplate.form_config];
    newConfig[index] = { ...newConfig[index], [key]: value };
    setCurrentTemplate({ ...currentTemplate, form_config: newConfig });
  };

  const removeField = (index: number) => {
    if (!currentTemplate) return;
    const newConfig = [...currentTemplate.form_config];
    newConfig.splice(index, 1);
    setCurrentTemplate({ ...currentTemplate, form_config: newConfig });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">模板管理</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> 新增模板
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">{template.key}</CardDescription>
                  </div>
                  <Badge variant={template.status === "active" ? "default" : "secondary"}>
                    {template.status === "active" ? "启用" : "禁用"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.description || "暂无描述"}
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  包含 {template.form_config?.length || 0} 个表单字段
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>
                  <Pencil className="w-4 h-4 mr-1" /> 编辑
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> 删除
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑模板" : "创建新模板"}</DialogTitle>
            <DialogDescription>
              配置模板的基本信息、表单字段以及 AI 生成所需的 Prompt 和范文。
            </DialogDescription>
          </DialogHeader>
          
          {currentTemplate && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>模板标识符 (Key) <span className="text-red-500">*</span></Label>
                  <Input 
                    value={currentTemplate.key} 
                    onChange={(e) => setCurrentTemplate({...currentTemplate, key: e.target.value})}
                    placeholder="例如: meeting_summary"
                    disabled={isEditing} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>模板名称 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={currentTemplate.name} 
                    onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                    placeholder="例如: 会议纪要"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>适用范围描述</Label>
                  <Input 
                    value={currentTemplate.description} 
                    onChange={(e) => setCurrentTemplate({...currentTemplate, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Form Config */}
              <div className="space-y-4 border rounded-md p-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base">表单字段配置</Label>
                  <Button variant="outline" size="sm" onClick={addField}>
                    <Plus className="w-4 h-4 mr-1" /> 添加字段
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {currentTemplate.form_config.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start bg-muted/30 p-2 rounded">
                      <div className="grid grid-cols-12 gap-2 flex-1">
                        <div className="col-span-3">
                          <Input 
                            placeholder="字段显示名称" 
                            value={field.label} 
                            onChange={(e) => updateField(index, "label", e.target.value)} 
                          />
                        </div>
                        <div className="col-span-3">
                          <Input 
                            placeholder="字段Key (英文)" 
                            value={field.name} 
                            onChange={(e) => updateField(index, "name", e.target.value)} 
                          />
                        </div>
                        <div className="col-span-2">
                          <Select 
                            value={field.type} 
                            onValueChange={(val) => updateField(index, "type", val)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">单行文本</SelectItem>
                              <SelectItem value="textarea">多行文本</SelectItem>
                              <SelectItem value="date">日期选择</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Input 
                            placeholder="提示语 (Placeholder)" 
                            value={field.placeholder || ""} 
                            onChange={(e) => updateField(index, "placeholder", e.target.value)} 
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={field.required} 
                              onCheckedChange={(checked) => updateField(index, "required", checked)} 
                            />
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeField(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {currentTemplate.form_config.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      暂无字段，请点击添加
                    </div>
                  )}
                </div>
              </div>

              {/* Prompt Template */}
              <div className="space-y-2">
                <Label>Prompt 模板 <span className="text-red-500">*</span></Label>
                <div className="text-xs text-muted-foreground mb-1">
                  使用 {"{key}"} 引用上方配置的字段 Key。例如：{"{title}"}, {"{summary}"}。
                  系统会自动注入 {"{context}"} (参考材料) 和 {"{examples}"} (范文)。
                </div>
                <Textarea 
                  className="font-mono text-sm min-h-[200px]"
                  value={currentTemplate.prompt_template}
                  onChange={(e) => setCurrentTemplate({...currentTemplate, prompt_template: e.target.value})}
                />
              </div>

              {/* Example Content */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>范文内容 (Learning Examples)</Label>
                  <div className="relative">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleFileUpload}
                      accept=".docx,.pdf,.txt"
                      disabled={isUploading}
                    />
                    <Button variant="outline" size="sm" className="pointer-events-none">
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                      上传文件解析
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  在此处粘贴高质量的范文，AI 将学习其格式和语气。支持上传 docx/pdf/txt 自动提取文字。
                </div>
                <Textarea 
                  className="min-h-[150px]"
                  value={currentTemplate.example_content || ""}
                  onChange={(e) => setCurrentTemplate({...currentTemplate, example_content: e.target.value})}
                  placeholder="在此输入范文内容..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>取消</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> 保存模板
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
