"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckSquare, FileText, Lightbulb, TrendingUp, Users } from "lucide-react";

type TemplateItem = {
  key: string;
  name: string;
  description?: string;
};

const ICON_MAP: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  meeting: { icon: Users, color: "text-blue-500" },
  training: { icon: Lightbulb, color: "text-yellow-500" },
  inspection: { icon: CheckSquare, color: "text-red-500" },
  bid_winning: { icon: Award, color: "text-orange-500" },
  project_progress: { icon: TrendingUp, color: "text-green-500" },
  innovation: { icon: FileText, color: "text-purple-500" },
};

export function TemplateCards() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`/api/templates?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          setTemplates([]);
          return;
        }
        const data = (await res.json()) as any[];
        const normalized: TemplateItem[] = (Array.isArray(data) ? data : [])
          .map((t) => ({
            key: String(t.key ?? ""),
            name: String(t.name ?? ""),
            description: t.description == null ? "" : String(t.description),
          }))
          .filter((t) => t.key && t.name);
        setTemplates(normalized);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const cards = useMemo(() => {
    if (loading) {
      return Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="h-full">
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded mt-3" />
            <div className="h-4 w-2/3 bg-muted rounded mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-10 w-full bg-muted/50 rounded" />
          </CardContent>
        </Card>
      ));
    }

    if (templates.length === 0) {
      return (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>暂无可用模板</CardTitle>
            <CardDescription>请联系管理员在后台启用或创建模板。</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return templates.map((template) => {
      const mapped = ICON_MAP[template.key];
      const Icon = mapped?.icon ?? FileText;
      const color = mapped?.color ?? "text-muted-foreground";
      return (
        <Link
          href={`/editor?template=${encodeURIComponent(template.key)}`}
          key={template.key}
          className="block group"
        >
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-8 h-8 ${color}`} />
                <CardTitle className="group-hover:text-primary transition-colors">
                  {template.name}
                </CardTitle>
              </div>
              <CardDescription>{template.description || "—"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                点击开始写作 &rarr;
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    });
  }, [loading, templates]);

  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{cards}</div>;
}

