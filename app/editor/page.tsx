"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SmartForm } from "@/components/smart-form";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function EditorPageContent() {
  const searchParams = useSearchParams();
  const templateType = searchParams.get("template") || "meeting";
  
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (formData: any, contextText: string, fileInfo?: { path: string, name: string }) => {
    setIsGenerating(true);
    setGeneratedContent(""); // Clear previous content
    let fullContent = "";
    let streamFailed = false;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      if (!user) {
        toast.error("请先登录后再使用生成功能");
        setIsGenerating(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      const credits = profile?.credits ?? 0;
      if (credits < 1) {
        toast.error("积分不足（需 1 积分）");
        return;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          template_type: templateType,
          form_data: formData,
          context_text: contextText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "生成失败");
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Process SSE format "data: ..." if needed, but our API returns raw text chunks 
        // if we simplified it. 
        // Wait, our API returns "data: JSON". 
        // We need to parse it properly.
        
        // Actually, the API `stream_generate` yields strings directly in Python?
        // Let's check api/generator.py
        // It yields content strings.
        // But api/index.py wraps it in StreamingResponse.
        // It sets media_type="text/event-stream".
        // Fastapi StreamingResponse with generator yields chunks.
        // If we didn't format as SSE in python, it's just raw text chunks.
        // Let's check `stream_generate` implementation in `api/generator.py`.
        
        // It yields `content` directly. 
        // So on client side we receive raw text parts.
        // We can just append them.
        
        if (chunk.includes("[API Error") || chunk.includes("[Network Error")) {
          streamFailed = true;
        }
        fullContent += chunk;
        setGeneratedContent((prev) => prev + chunk);
      }

      if (!fullContent.trim() || streamFailed) {
        toast.error("生成失败，请稍后重试");
        return;
      }

      let remainingCredits: number | null = null;
      const { data: rpcCredits, error: deductError } = await supabase.rpc("deduct_generation_credit");
      if (deductError) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({ credits: credits - 1 })
          .eq("id", user.id)
          .select("credits")
          .single();
        if (updateError) throw deductError;
        remainingCredits = updatedProfile?.credits ?? null;
      } else {
        remainingCredits = rpcCredits ?? null;
      }

      await supabase.from("generation_history").insert({
        user_id: user.id,
        template_type: templateType,
        form_data: formData,
        context_file_path: fileInfo?.path || null,
        context_filename: fileInfo?.name || null,
        generated_content: fullContent,
      });

      toast.success(`生成成功，消耗 1 积分${remainingCredits === null ? "" : `，剩余 ${remainingCredits} 积分`}`);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 h-screen flex flex-col">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">写作助手</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-4 overflow-y-auto pr-2">
          <SmartForm 
            templateType={templateType} 
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>
        
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <RichEditor content={generatedContent} isStreaming={isGenerating} />
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPageContent />
    </Suspense>
  );
}
