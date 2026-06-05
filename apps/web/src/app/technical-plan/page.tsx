"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, GitBranch, Layers3, Loader2, Plus, Save, Trash2, WandSparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const defaultOutline = ["项目理解与总体方案", "系统架构设计", "实施组织与进度计划", "质量保障体系", "运维服务方案"];

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
      headings?: string[];
    };
  };
}

interface TaskItem {
  id: string;
  projectId?: string;
  type: string;
  status: string;
  progress: number;
  createdAt: string;
}

interface OutlineNode {
  id: string;
  title: string;
  content: string;
}

function statusLabel(status: string) {
  return ({ queued: "排队中", running: "生成中", success: "已完成", error: "失败" } as Record<string, string>)[status] || status;
}

export default function TechnicalPlanPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [message, setMessage] = useState("请选择项目后生成技术标大纲。");
  const [busy, setBusy] = useState(false);
  const [editorNodes, setEditorNodes] = useState<OutlineNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState("");

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

  const selectedProject = projects.find((project) => project.id === projectId);
  const projectDocuments = useMemo(() => documents.filter((document) => document.projectId === projectId), [documents, projectId]);
  const projectTasks = tasks.filter((task) => task.projectId === projectId && ["outline_generate", "content_generate"].includes(task.type));
  const headings = useMemo(() => projectDocuments.flatMap((document) => document.metadata?.stats?.headings || []), [projectDocuments]);
  const outline = useMemo(() => (headings.length ? headings.slice(0, 7) : defaultOutline), [headings]);

  useEffect(() => {
    const nodes = outline.map((title, index) => ({
      id: `${projectId || "draft"}-${index}-${title}`,
      title,
      content: `## ${title}\n\n请在此补充本章节的技术响应、实施方法、保障措施和证据材料。`
    }));
    setEditorNodes(nodes);
    setActiveNodeId(nodes[0]?.id || "");
  }, [outline, projectId]);

  const activeNode = editorNodes.find((node) => node.id === activeNodeId);

  function updateNode(id: string, patch: Partial<OutlineNode>) {
    setEditorNodes((current) => current.map((node) => (node.id === id ? { ...node, ...patch } : node)));
  }

  function addNode() {
    const node = {
      id: `custom-${Date.now()}`,
      title: "新增章节",
      content: "## 新增章节\n\n请输入章节内容。"
    };
    setEditorNodes((current) => [...current, node]);
    setActiveNodeId(node.id);
  }

  function moveNode(id: string, offset: number) {
    setEditorNodes((current) => {
      const index = current.findIndex((node) => node.id === id);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [node] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, node);
      return copy;
    });
  }

  function deleteNode(id: string) {
    setEditorNodes((current) => {
      const next = current.filter((node) => node.id !== id);
      if (activeNodeId === id) setActiveNodeId(next[0]?.id || "");
      return next;
    });
  }

  async function createTask(type: "outline_generate" | "content_generate") {
    if (!projectId) {
      setMessage("请先上传招标文件或选择一个项目。");
      return;
    }

    setBusy(true);
    setMessage(type === "outline_generate" ? "正在创建大纲生成任务..." : "正在创建正文生成任务...");
    try {
      const response = await fetch(`${apiBaseUrl}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type,
          payload: {
            projectName: selectedProject?.name,
            sourceDocuments: projectDocuments.map((document) => document.id),
            outline: editorNodes.map((node) => ({ title: node.title, content: node.content }))
          }
        })
      });
      if (!response.ok) throw new Error(`任务创建失败：${response.status}`);
      setMessage(type === "outline_generate" ? "大纲生成任务已进入队列。" : "正文生成任务已进入队列。");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell active="/technical-plan">
      <PageHeader actionLabel="生成大纲" description="基于招标要求和知识库，生成可编辑的技术标目录与正文。" title="技术标生成" />
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>生成控制</CardTitle>
            <WandSparkles className="h-5 w-5 text-accent" />
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
            {!projects.length && <div className="rounded-xl bg-white/65 p-4 text-sm text-slate-500">还没有项目。先到“招标文件解析”上传文件，会自动创建项目。</div>}
            {["招标要求对齐", "知识库补充", "全文事实一致", "图表自动规划"].map((item) => (
              <label className="flex items-center justify-between rounded-xl bg-white/65 p-3 text-sm shadow-sm" key={item}>
                <span>{item}</span>
                <input defaultChecked className="h-4 w-4 accent-blue-600" type="checkbox" />
              </label>
            ))}
            <div className="grid gap-2">
              <Button disabled={busy || !projectId} onClick={() => createTask("outline_generate")}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                生成技术标大纲
              </Button>
              <Button disabled={busy || !projectId} onClick={() => createTask("content_generate")} variant="outline">
                生成正文任务
              </Button>
            </div>
            <Button onClick={addNode} variant="outline">
              <Plus className="h-4 w-4" />
              新增章节
            </Button>
            <p className="text-sm leading-6 text-slate-500">{message}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>技术标大纲</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">优先使用已解析 Markdown 标题生成初始目录。</p>
            </div>
            <GitBranch className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {editorNodes.map((item, index) => (
                <article className="grid gap-3 rounded-xl bg-white/65 p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_210px]" key={item.id}>
                  <button className="flex items-center gap-3 text-left" onClick={() => setActiveNodeId(item.id)} type="button">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">{index + 1}</span>
                    <div>
                      <strong className="text-sm">{item.title}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">来源文档 {projectDocuments.length} 份，待绑定知识素材</p>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600" onClick={() => moveNode(item.id, -1)} type="button">
                      上移
                    </button>
                    <button className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600" onClick={() => moveNode(item.id, 1)} type="button">
                      下移
                    </button>
                    <button className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600" onClick={() => deleteNode(item.id)} type="button">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>导出计划</CardTitle>
            <FileDown className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {["Word 标书正文", "响应矩阵", "图表与插图资产"].map((item) => (
                <div className="rounded-xl bg-white/65 p-4 shadow-sm" key={item}>
                  <Layers3 className="mb-3 h-5 w-5 text-primary" />
                  <strong className="text-sm">{item}</strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">生成完成后进入导出队列，可按模板输出。</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>生成任务</CardTitle>
            <Loader2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            {projectTasks.slice(0, 5).map((task) => (
              <article className="rounded-xl bg-white/65 p-3 shadow-sm" key={task.id}>
                <div className="flex items-center justify-between text-sm">
                  <strong>{task.type === "outline_generate" ? "大纲生成" : "正文生成"}</strong>
                  <span className="text-xs text-slate-500">{statusLabel(task.status)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-50">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
                </div>
              </article>
            ))}
            {!projectTasks.length && <div className="rounded-xl bg-white/65 p-4 text-sm text-slate-500">暂无生成任务。</div>}
          </CardContent>
        </Card>
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>章节编辑器</CardTitle>
          <Save className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2">
            {editorNodes.map((node, index) => (
              <button
                className={`w-full rounded-xl p-3 text-left text-sm shadow-sm transition ${node.id === activeNodeId ? "bg-blue-600 text-white" : "bg-white/65 hover:bg-white"}`}
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                type="button"
              >
                {index + 1}. {node.title}
              </button>
            ))}
          </div>
          {activeNode ? (
            <div className="space-y-3">
              <input
                className="h-11 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => updateNode(activeNode.id, { title: event.target.value })}
                value={activeNode.title}
              />
              <textarea
                className="min-h-72 w-full resize-y rounded-xl border border-white/70 bg-white/70 p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => updateNode(activeNode.id, { content: event.target.value })}
                value={activeNode.content}
              />
              <Button onClick={() => setMessage("章节草稿已保存到当前页面状态，后续可接入 OutlineNode 持久化。")}>
                <Save className="h-4 w-4" />
                保存章节草稿
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-white/65 p-6 text-sm text-slate-500">暂无章节，请新增章节。</div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
