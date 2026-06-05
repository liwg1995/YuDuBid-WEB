"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileWarning, Loader2, SpellCheck, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

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
    tenderDocumentId?: string;
  };
}

const checkScopes = [
  { icon: FileWarning, label: "废标项检查", desc: "识别未响应、缺材料、硬性条款风险" },
  { icon: SpellCheck, label: "错别字检查", desc: "检查错字、术语不一致、数字格式问题" },
  { icon: CheckCircle2, label: "逻辑一致性", desc: "跨章节核对工期、人员、承诺和范围" }
];

const baseFindings = [
  { title: "项目经理资格证明需复核", severity: "高风险", type: "废标项", evidence: "检查招标文件资格条件与投标材料清单是否一致。", suggestion: "补齐项目经理证书、社保证明和授权材料，并在目录中明确位置。" },
  { title: "工期承诺需保持全文一致", severity: "中风险", type: "逻辑一致性", evidence: "项目概况、实施计划、商务响应中的工期表达需要统一。", suggestion: "统一为招标文件要求的工期口径，避免 90 日历天/3 个月混用。" },
  { title: "商务偏离说明需单独成表", severity: "中风险", type: "商务响应", evidence: "若合同条款存在轻微偏离，需要给出偏离表和说明。", suggestion: "在商务标中新增合同偏离表，并标注无偏离或具体偏离条款。" }
];

function statusLabel(status: string) {
  return ({ queued: "排队中", running: "检查中", success: "已完成", error: "失败" } as Record<string, string>)[status] || status;
}

export default function RiskCheckPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [message, setMessage] = useState("请选择项目与招标文件后开始检查。");
  const [busy, setBusy] = useState(false);
  const [activeFinding, setActiveFinding] = useState<(typeof baseFindings)[number] | null>(null);

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
  const selectedDocument = projectDocuments.find((document) => document.id === documentId) || projectDocuments[0];
  const riskTasks = tasks.filter((task) => task.type === "risk_check");
  const projectRiskTasks = riskTasks.filter((task) => task.projectId === projectId);
  const latestStats = selectedDocument?.metadata?.stats;
  const findings = useMemo(() => {
    if (!selectedDocument) return baseFindings;
    const textScale = latestStats?.char_count || 0;
    return baseFindings.map((finding, index) => ({
      ...finding,
      evidence:
        index === 0 && selectedDocument.metadata?.markdownPreview
          ? selectedDocument.metadata.markdownPreview.slice(0, 180)
          : finding.evidence,
      severity: index === 0 && textScale > 1000 ? "高风险" : finding.severity
    }));
  }, [latestStats?.char_count, selectedDocument]);

  useEffect(() => {
    setDocumentId(projectDocuments[0]?.id || "");
  }, [projectDocuments]);

  async function runRiskCheck() {
    const tenderDocumentId = selectedDocument?.id;
    if (!projectId || !tenderDocumentId) {
      setMessage("请先选择项目和已解析的招标文件。");
      return;
    }

    setBusy(true);
    setMessage("正在创建风险检查任务...");
    try {
      const response = await fetch(`${apiBaseUrl}/api/risk-check/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          tenderDocumentId
        })
      });
      if (!response.ok) throw new Error(`检查任务创建失败：${response.status}`);
      setMessage("风险检查任务已进入队列。");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell active="/risk-check">
      <PageHeader actionLabel="开始检查" description="检查无效标、废标项、错别字和前后逻辑矛盾。" title="废标项检查" />
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="检查任务" trend="历史记录" value={String(riskTasks.length)} />
        <StatCard label="项目文档" trend="当前项目" value={String(projectDocuments.length)} />
        <StatCard label="可检查标题" trend="来自 Markdown" value={String(latestStats?.heading_count ?? 0)} />
        <StatCard label="文本规模" trend="字符数" value={String(latestStats?.char_count ?? 0)} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>风险检查任务</CardTitle>
            <FileWarning className="h-5 w-5 text-danger" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
              <label className="block">
                <span className="mb-2 block text-sm font-medium">选择招标文件</span>
                <select className="h-10 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setDocumentId(event.target.value)} value={selectedDocument?.id || ""}>
                  {projectDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.fileName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!projectDocuments.length && <div className="rounded-xl bg-white/65 p-4 text-sm text-slate-500">当前项目暂无可检查文档，请先上传并解析招标文件。</div>}
            <div className="rounded-xl bg-white/65 p-4 shadow-sm">
              <strong className="text-sm">检查依据预览</strong>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{selectedDocument?.metadata?.markdownPreview || "选择已解析文档后会展示 Markdown 中间态摘要。"}</p>
            </div>
            <Button disabled={busy || !selectedDocument} onClick={runRiskCheck}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              开始检查
            </Button>
            <p className="text-sm leading-6 text-slate-500">{message}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>检查范围</CardTitle>
            <AlertTriangle className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="space-y-3">
            {checkScopes.map((item) => (
              <label className="flex items-center justify-between gap-3 rounded-xl bg-white/65 p-3 shadow-sm" key={item.label}>
                <span className="flex items-center gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.desc}</span>
                  </span>
                </span>
                <input defaultChecked className="h-4 w-4 accent-blue-600" type="checkbox" />
              </label>
            ))}
          </CardContent>
        </Card>
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>风险结果详情</CardTitle>
          <CheckCircle2 className="h-5 w-5 text-success" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {findings.map((finding) => (
            <button className="rounded-xl bg-white/65 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white" key={finding.title} onClick={() => setActiveFinding(finding)} type="button">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">{finding.title}</strong>
                <span className={finding.severity === "高风险" ? "rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600" : "rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-600"}>{finding.severity}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{finding.evidence}</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>最近检查任务</CardTitle>
          <CheckCircle2 className="h-5 w-5 text-success" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {projectRiskTasks.slice(0, 6).map((task) => (
            <article className="rounded-xl bg-white/65 p-4 shadow-sm" key={task.id}>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">风险检查</strong>
                <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{statusLabel(task.status)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-50">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleString("zh-CN")}</p>
            </article>
          ))}
          {!projectRiskTasks.length && <div className="rounded-xl bg-white/65 p-6 text-sm text-slate-500">还没有检查记录。</div>}
        </CardContent>
      </Card>
      {activeFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{activeFinding.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activeFinding.type} / {activeFinding.severity}</p>
              </div>
              <button className="rounded-xl bg-white/70 p-2" onClick={() => setActiveFinding(null)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-white/65 p-4 shadow-sm">
                <strong className="text-sm">命中依据</strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeFinding.evidence}</p>
              </div>
              <div className="rounded-xl bg-white/65 p-4 shadow-sm">
                <strong className="text-sm">处理建议</strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeFinding.suggestion}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                建议将该项加入投标文件复核清单，并在导出前再次运行废标项检查。
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
