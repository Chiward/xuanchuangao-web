import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CheckSquare, Award, TrendingUp, Lightbulb } from "lucide-react";

const templates = [
  {
    id: "meeting",
    title: "重要会议",
    description: "适用于各类党政会议、部门例会、专题研讨会等。",
    icon: Users,
    color: "text-blue-500",
  },
  {
    id: "training",
    title: "培训活动",
    description: "适用于内部培训、专家讲座、技能比武等活动。",
    icon: Lightbulb,
    color: "text-yellow-500",
  },
  {
    id: "inspection",
    title: "领导带队检查",
    description: "适用于上级视察、安全检查、现场督导等场景。",
    icon: CheckSquare,
    color: "text-red-500",
  },
  {
    id: "bid_winning",
    title: "项目中标",
    description: "适用于中标喜报、市场突破、签约仪式等。",
    icon: Award,
    color: "text-orange-500",
  },
  {
    id: "project_progress",
    title: "项目重大进展",
    description: "适用于工程节点突破、阶段性成果、竣工交付等。",
    icon: TrendingUp,
    color: "text-green-500",
  },
  {
    id: "innovation",
    title: "科技创新",
    description: "适用于科研成果获奖、专利申请、技术认定等。",
    icon: FileText,
    color: "text-purple-500",
  },
];

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Link href={`/editor?template=${template.id}`} key={template.id} className="block group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <template.icon className={`w-8 h-8 ${template.color}`} />
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {template.title}
                    </CardTitle>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    点击开始写作 &rarr;
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
