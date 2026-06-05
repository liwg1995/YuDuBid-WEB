"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileStack, Image, Loader2, Rows3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const tabs = [
  { icon: FileStack, label: "元数据", desc: "设备、账号、编辑时间、作者" },
  { icon: Rows3, label: "目录", desc: "章节结构和标题顺序" },
  { icon: ClipboardCheck, label: "正文", desc: "段落、表格和关键描述" },
  { icon: Image, label: "图片", desc: "原图哈希一致性" }
];

interface ProjectItem {
  id: string;
  name: string;
}

interface DocumentItem {
  id: string;
  projectId?: string;
  fileName: string;
  status: string;
  metadata?: {
    stats?: {
      heading_count?: number;
      char_count?: number;
      headings?: string[];
    };
    markdownPreview?: string;
  };
}

interface TaskItem {
  id: string;
  projectId?: string;
  type: string;
  status: string;
  progress: number;
  createdAt: string;
  payload?: {
    bidDocumentIds?: string[];
  };
}

function statusLabel(status: string) {
  return ({ queued: "排队中", running: "查重中", success: "已完成", error: "失败" } as Record<string, string>)[status] || status;
}

export default function DuplicateCheckPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("请选择至少 2 份文件开始查重。");
  const [busy, setBusy] = useState(false);

  async function loadData() {
    const [projectsData, documentsData, tasksData] = await Promise.all([
      fetch(`${apiBaseUrl}/api/projects`).then((response) => response.json()) as Promise<ProjectItem[]>,
      fetch(`${apiBaseUrl}/api/documents`).then((response) => response.json()) as Promise<DocumentItem[]>,
      fetch(`${apiBaseUrl}/api/tasks`).then((response) => response.json()) as Promise<TaskItem[]>
    ]);
    setProjects(projectsData);
    setDocuments(documentsData);
    setTasks(tasksData);
    setProjectId((current) => current || projectsData[0]?.id || "");
  }

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  const projectDocuments = useMemo(() => documents.filter((document) => document.projectId === projectId), [documents, projectId]);
  const duplicateTasks = tasks.filter((task) => task.type === "duplicate_check");
  const projectDuplicateTasks = duplicateTasks.filter((task) => task.projectId === projectId);
  const selectedDocuments = projectDocuments.filter((document) => selectedIds.includes(document.id));
  const totalHeadings = selectedDocuments.reduce((total, document) => total + (document.metadata?.stats?.heading_count || 0), 0);
  const totalChars = selectedDocuments.reduce((total, document) => total + (document.metadata?.stats?.char_count || 0), 0);

  useEffect(() => {
    setSelectedIds(projectDocuments.slice(0, 2).map((document) => document.id));
  }, [projectDocuments]);

  function toggleDocument(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function runDuplicateCheck() {
    if (selectedIds.length < 2) {
      setMessage("至少选择 2 份文件才能进行查重。");
      return;
    }

    setBusy(true);
    setMessage("正在创建查重任务...");
    try {
      const response = await fetch(`${apiBaseUrl}/api/duplicate-check/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          bidDocumentIds: selectedIds
        })
      });
      if (!response.ok) throw new Error(`查重任务创建失败：${response.status}`);
      setMessage("查重任务已进入队列。");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell active="/duplicate-check">
      <PageHeader actionLabel="选择标书" description="多份投标文件并行对比，识别模板化复制和重复表达。" title="标书查重" />
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="候选文件" trend="当前项目" value={String(projectDocuments.length)} />
        <StatCard label="本次选择" trend="参与查重" value={String(selectedIds.length)} />
        <StatCard label="目录标题" trend="合计" value={String(totalHeadings)} />
        <StatCard label="文本规模" trend="字符数" value={String(totalChars)} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>选择对比文件</CardTitle>
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">选择项目</span>
              <select className="h-10 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {projectDocuments.map((document) => (
                <label className="rounded-xl bg-white/65 p-4 shadow-sm" key={document.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <strong className="line-clamp-1 text-sm">{document.fileName}</strong>
                    <input checked={selectedIds.includes(document.id)} className="h-4 w-4 accent-blue-600" onChange={() => toggleDocument(document.id)} type="checkbox" />
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{document.metadata?.markdownPreview || "暂无 Markdown 摘要"}</p>
                </label>
              ))}
            </div>
            {!projectDocuments.length && <div className="rounded-xl bg-white/65 p-6 text-sm text-slate-500">当前项目暂无文档，请先上传标书文件。</div>}
            <Button disabled={busy || selectedIds.length < 2} onClick={runDuplicateCheck}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              开始查重
            </Button>
            <p className="text-sm leading-6 text-slate-500">{message}</p>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {tabs.map((tab) => (
            <Card key={tab.label}>
              <CardContent>
                <tab.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="font-semibold">{tab.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{tab.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>查重任务记录</CardTitle>
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {projectDuplicateTasks.slice(0, 6).map((task) => (
            <article className="rounded-xl bg-white/65 p-4 shadow-sm" key={task.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">对比 {task.payload?.bidDocumentIds?.length || 0} 份文件</span>
                <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{statusLabel(task.status)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-50">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
              </div>
            </article>
          ))}
          {!projectDuplicateTasks.length && <div className="rounded-xl bg-white/65 p-6 text-sm text-slate-500">暂无查重记录。</div>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
