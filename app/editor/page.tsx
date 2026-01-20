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

function EditorPageContent() {
  const searchParams = useSearchParams();
  const templateType = searchParams.get("template") || "meeting";
  
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (formData: any, contextText: string) => {
    setIsGenerating(true);
    setGeneratedContent(""); // Clear previous content
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_type: templateType,
          form_data: formData,
          context_text: contextText,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");

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
        
        setGeneratedContent((prev) => prev + chunk);
      }
    } catch (error) {
      console.error(error);
      // toast.error("生成失败");
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
