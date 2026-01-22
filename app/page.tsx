import { SiteHeader } from "@/components/site-header";
import { TemplateCards } from "@/components/template-cards";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="container mx-auto py-10 px-4 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">AI 智能宣传稿生成助手</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            选择一个写作场景，只需简单填写关键要素并上传素材，即可快速生成结构严谨、内容丰富的企业宣传稿。
          </p>
        </div>
        <TemplateCards />
      </main>
    </div>
  );
}
