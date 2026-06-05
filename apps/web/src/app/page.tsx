"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, BadgeCheck, BookOpen, Brain, CheckCircle2, ChevronRight, FileText, Gauge, Sparkles, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const workflowCards = [
  {
    href: "/tender-analysis",
    icon: UploadCloud,
    title: "导入招标文件",
    desc: "上传 PDF、DOCX 或 Markdown，自动解析评分办法、技术要求和废标条款。",
    state: "可上传",
    color: "text-primary"
  },
  {
    href: "/technical-plan",
    icon: Brain,
    title: "生成标书大纲",
    desc: "结合招标要求和企业知识库，输出可编辑、可追溯的技术标目录。",
    state: "待接入",
    color: "text-accent"
  },
  {
    href: "/technical-plan",
    icon: FileText,
    title: "编写正文与图表",
    desc: "分章节生成正文，支持 Mermaid 图表、插图、表格和全文一致性事实。",
    state: "规划中",
    color: "text-success"
  },
  {
    href: "/risk-check",
    icon: BadgeCheck,
    title: "检查并导出",
    desc: "执行废标项、错别字、逻辑和重复内容检查后，一键导出 Word。",
    state: "规划中",
    color: "text-danger"
  }
] as const;

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

interface DocumentItem {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
}

interface TaskItem {
  id: string;
  type: string;
  status: string;
  progress: number;
  createdAt: string;
  payload?: {
    fileName?: string;
  };
}

interface DashboardState {
  projects: ProjectItem[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  healthy: boolean;
}

const initialState: DashboardState = {
  projects: [],
  documents: [],
  tasks: [],
  healthy: false
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: "排队中",
    running: "处理中",
    success: "已完成",
    error: "失败",
    uploaded: "已上传",
    parsing: "解析中",
    parsed: "已解析"
  };
  return labels[status] || status;
}

export default function Home() {
  const [dashboard, setDashboard] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("正在同步工作台数据...");

  async function loadDashboard() {
    try {
      const [healthResponse, projectsResponse, documentsResponse, tasksResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/health`),
        fetch(`${apiBaseUrl}/api/projects`),
        fetch(`${apiBaseUrl}/api/documents`),
        fetch(`${apiBaseUrl}/api/tasks`)
      ]);

      const [projects, documents, tasks] = await Promise.all([
        projectsResponse.json() as Promise<ProjectItem[]>,
        documentsResponse.json() as Promise<DocumentItem[]>,
        tasksResponse.json() as Promise<TaskItem[]>
      ]);

      setDashboard({
        projects,
        documents,
        tasks,
        healthy: healthResponse.ok
      });
      setMessage("数据已同步。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  const latestTasks = dashboard.tasks.slice(0, 5);
  const parsedDocuments = dashboard.documents.filter((document) => document.status === "parsed").length;
  const runningTasks = dashboard.tasks.filter((task) => ["queued", "running"].includes(task.status)).length;
  const failedTasks = dashboard.tasks.filter((task) => task.status === "error").length;

  const metrics = useMemo(
    () => [
      { label: "项目总数", value: String(dashboard.projects.length), trend: runningTasks ? `${runningTasks} 个任务进行中` : "暂无排队任务" },
      { label: "上传文件", value: String(dashboard.documents.length), trend: `${parsedDocuments} 个已解析` },
      { label: "任务总数", value: String(dashboard.tasks.length), trend: failedTasks ? `${failedTasks} 个失败` : "队列稳定" },
      { label: "服务状态", value: dashboard.healthy ? "正常" : "异常", trend: dashboard.healthy ? "API 可访问" : "请检查后端" }
    ],
    [dashboard.documents.length, dashboard.healthy, dashboard.projects.length, dashboard.tasks.length, failedTasks, parsedDocuments, runningTasks]
  );

  return (
    <AppShell active="/">
      <PageHeader description="从招标文件到可交付标书，集中管理每一步。" title="项目工作台" />
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
        <div className="space-y-6">
          <section className="soft-gradient-panel relative overflow-hidden rounded-2xl border border-white/75 p-6 shadow-panel">
            <div className="absolute right-8 top-5 hidden h-28 w-48 rounded-[2rem] bg-white/30 shadow-2xl shadow-blue-500/20 ring-1 ring-white/60 md:block" />
            <div className="absolute right-20 top-12 hidden h-16 w-16 rotate-12 rounded-2xl bg-blue-500/20 ring-1 ring-white/60 md:block" />
            <div className="absolute right-40 top-16 hidden h-12 w-12 -rotate-12 rounded-2xl bg-cyan-400/20 ring-1 ring-white/60 md:block" />
            <div className="relative max-w-3xl">
              <span className="mb-3 inline-flex items-center gap-2 rounded-lg bg-white/55 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                <Activity className="h-3.5 w-3.5 text-cyan-500" />
                {loading ? "正在载入工作台" : message}
              </span>
              <h2 className="text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">让投标团队把精力放在判断和定稿上</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                禹都投标AI助手将招标解析、大纲生成、正文编写、知识库复用、风险检查和 Word 导出整合到一个 Web 工作台。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/tender-analysis">
                    开始解析招标文件
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="bg-white/70 text-blue-700 hover:bg-white" variant="outline">
                  <Link href="/knowledge-base">查看知识库</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {workflowCards.map((card) => (
              <Link href={card.href} key={card.title}>
                <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
                  <CardContent>
                    <div className="mb-4 flex items-start justify-between">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm", card.color)}>
                        <card.icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{card.state}</span>
                    </div>
                    <h3 className="font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{card.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>任务队列</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">每 8 秒自动刷新</p>
              </div>
              <Gauge className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-4">
              {latestTasks.length ? (
                latestTasks.map((task) => (
                  <article key={task.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="line-clamp-1 font-medium">{task.payload?.fileName || task.type}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{statusLabel(task.status)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-blue-50">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl bg-white/65 p-4 text-sm text-slate-500">暂无任务，上传招标文件后会在这里显示进度。</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>最近项目</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">来自项目与上传记录</p>
              </div>
              <BookOpen className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.projects.slice(0, 4).map((project) => (
                <article className="rounded-xl bg-white/65 p-3 shadow-sm" key={project.id}>
                  <div className="flex items-center justify-between gap-3">
                    <strong className="line-clamp-1 text-sm">{project.name}</strong>
                    <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{project.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(project.updatedAt).toLocaleString("zh-CN")}</p>
                </article>
              ))}
              {!dashboard.projects.length && <div className="rounded-xl bg-white/65 p-4 text-sm text-slate-500">还没有项目，先上传一份招标文件即可自动创建。</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>系统连接</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">模型、解析和存储服务</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "NestJS API", ok: dashboard.healthy },
                { label: "Python 文档服务", ok: true },
                { label: "MinIO 对象存储", ok: true }
              ].map((item) => (
                <div className="flex items-center justify-between rounded-xl bg-white/65 p-3 shadow-sm" key={item.label}>
                  <span className="text-sm font-medium">{item.label}</span>
                  <Sparkles className={cn("h-4 w-4", item.ok ? "text-primary" : "text-danger")} />
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}
