"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Wand2, Download } from "lucide-react";
import { saveAs } from "file-saver";

import { toast } from "sonner";

interface RichEditorProps {
  content: string;
  isStreaming: boolean;
}

export function RichEditor({ content, isStreaming }: RichEditorProps) {
  const [isRewriting, setIsRewriting] = useState(false);
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    top: number;
    left: number;
  }>({ visible: false, top: 0, left: 0 });

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content && !isStreaming) {
       // Only set content if not streaming to avoid overwriting user edits during stream
       // But for MVP, if content changes (e.g. initial load or full regen), set it.
       // Check if content is different to avoid cursor jumps
       if (editor.getHTML() !== content) {
          editor.commands.setContent(content);
       }
    }
  }, [content, editor, isStreaming]);

  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setMenuState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      // Delay slightly to ensure coordinates are updated
      requestAnimationFrame(() => {
          try {
            const start = editor.view.coordsAtPos(from);
            const end = editor.view.coordsAtPos(to);
            // Use client coordinates for fixed positioning
            // Ensure we don't go off screen
            const left = (start.left + end.right) / 2;
            const top = start.top - 40; // Position above

            setMenuState({ visible: true, left, top });
          } catch {
            setMenuState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
          }
      });
    };

    const hideMenu = () => {
       // Delay hiding to allow button clicks to register if they don't prevent default
       setTimeout(() => {
          setMenuState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
       }, 200);
    };

    editor.on("selectionUpdate", updateMenu);
    editor.on("blur", hideMenu);

    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("blur", hideMenu);
    };
  }, [editor]);

  const handleRewrite = async (command: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    
    if (!text) {
        toast.error("请先选择要修改的文字");
        return;
    }

    setIsRewriting(true);
    const toastId = toast.loading(`正在${command}...`);
    const beforeDoc = editor.getJSON();
    const beforeSelection = { from, to };
    
    try {
      const docSize = editor.state.doc.content.size;
      const contextBefore = editor.state.doc.textBetween(Math.max(0, from - 500), from);
      const contextAfter = editor.state.doc.textBetween(to, Math.min(docSize, to + 500));

      editor.setEditable(false);
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          command,
          context_before: contextBefore,
          context_after: contextAfter,
        }),
      });

      if (!res.ok) throw new Error("Rewrite failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let rewritten = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rewritten += decoder.decode(value);
      }

      const finalText = rewritten.trim();
      if (!finalText) throw new Error("Empty rewrite result");

      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, finalText)
        .run();
      
      toast.success(`${command}完成`, {
        id: toastId,
        action: {
          label: "撤回",
          onClick: () => {
            editor.commands.setContent(beforeDoc);
            editor.commands.setTextSelection(beforeSelection);
            editor.commands.focus();
          },
        },
      });
    } catch (error) {
      console.error(error);
      toast.error(`${command}失败`, { id: toastId });
    } finally {
      editor.setEditable(true);
      setIsRewriting(false);
      setMenuState(prev => ({ ...prev, visible: false }));
    }
  };

  const handleExport = async () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    
    const { asBlob } = await import("html-docx-js-typescript");
    
    const converted = await asBlob(htmlContent);
    saveAs(converted as Blob, "宣传稿.docx");
  };

  if (!editor) {
    return null;
  }

  return (
    <Card className="min-h-[600px] relative flex flex-col">
      <div className="p-2 border-b bg-muted/30 flex justify-between items-center sticky top-0 z-10 backdrop-blur">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "bg-muted" : ""}
          >
            B
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
          >
            H2
          </Button>
        </div>
        <div className="flex gap-2">
            {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在生成...
                </div>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                导出 Word
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-b-lg">
        <EditorContent editor={editor} />
      </div>

      {menuState.visible && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: menuState.left, top: menuState.top }}
        >
          <Card className="flex gap-1 p-1 shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRewrite("换个说法")}
              disabled={isRewriting || isStreaming}
            >
              <Wand2 className="w-3 h-3 mr-1" /> 换个说法
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRewrite("扩写")}
              disabled={isRewriting || isStreaming}
            >
              扩写
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRewrite("精简")}
              disabled={isRewriting || isStreaming}
            >
              精简
            </Button>
          </Card>
        </div>
      )}
    </Card>
  );
}
