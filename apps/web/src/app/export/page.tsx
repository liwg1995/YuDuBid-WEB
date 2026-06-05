"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileArchive, FileDown, Loader2, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  markdownKey?: string | null;
  metadata?: {
    stats?: {
      heading_count?: number;
      char_count?: number;
      headings?: string[];
    };
  };
}

const exportItems = ["技术标正文", "商务响应矩阵", "风险检查摘要", "查重检查摘要", "图表与附件清单"];
const templates = ["通用技术标模板", "政府采购响应模板", "工程服务投标模板", "自定义 Word 模板"];

export default function ExportPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [template, setTemplate] = useState(templates[0]);
  const [selectedItems, setSelectedItems] = useState(exportItems.slice(0, 3));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("请选择项目并确认导出内容。");

  async function loadData() {
    const [projectsData, documentsData] = await Promise.all([
      fetch(`${apiBaseUrl}/api/projects`).then((response) => response.json()) as Promise<ProjectItem[]>,
      fetch(`${apiBaseUrl}/api/documents`).then((response) => response.json()) as Promise<DocumentItem[]>
    ]);
    setProjects(projectsData);
    setDocuments(documentsData);
    setProjectId((current) => current || projectsData[0]?.id || "");
  }

  useEffect(() => {
    void loadData();
  }, []);

  const projectDocuments = documents.filter((document) => document.projectId === projectId);
  const parsedDocuments = projectDocuments.filter((document) => document.status === "parsed");
  const headings = useMemo(() => parsedDocuments.flatMap((document) => document.metadata?.stats?.headings || []).slice(0, 8), [parsedDocuments]);

  function toggleItem(item: string) {
    setSelectedItems((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  }

  function generateExport() {
    if (!projectId) {
      setMessage("请先选择项目。");
      return;
    }
    if (!selectedItems.length) {
      setMessage("至少选择一类导出内容。");
      return;
    }

    setBusy(true);
    setProgress(12);
    setMessage("正在整理 Word 导出内容...");
    const steps = [
      { progress: 36, message: "正在合并 Markdown、章节和响应矩阵..." },
      { progress: 68, message: "正在检查目录、页眉页脚和附件清单..." },
      { progress: 100, message: "导出包已准备完成。后续接入后端后将生成真实 .docx 文件。" }
    ];
    steps.forEach((step, index) => {
      window.setTimeout(() => {
        setProgress(step.progress);
        setMessage(step.message);
        if (step.progress === 100) setBusy(false);
      }, (index + 1) * 550);
    });
  }

  return (
    <AppShell active="/export">
      <PageHeader actionLabel="生成 Word" description="汇总技术标、商务标、检查报告和附件清单，准备 Word 导出。" title="Word 导出" />
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="项目文件" trend="当前项目" value={String(projectDocuments.length)} />
        <StatCard label="可导出文档" trend="已解析" value={String(parsedDocuments.length)} />
        <StatCard label="导出模块" trend="已选择" value={String(selectedItems.length)} />
        <StatCard label="目录标题" trend="来自 Markdown" value={String(headings.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>导出配置</CardTitle>
            <Settings2 className="h-5 w-5 text-primary" />
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
                <span className="mb-2 block text-sm font-medium">Word 模板</span>
                <select className="h-10 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setTemplate(event.target.value)} value={template}>
                  {templates.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {exportItems.map((item) => (
                <label className="flex items-center justify-between rounded-xl bg-white/65 p-3 text-sm shadow-sm" key={item}>
                  <span>{item}</span>
                  <input checked={selectedItems.includes(item)} className="h-4 w-4 accent-blue-600" onChange={() => toggleItem(item)} type="checkbox" />
                </label>
              ))}
            </div>
            <Button disabled={busy || !projectId} onClick={generateExport}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              生成导出包
            </Button>
            <p className="text-sm leading-6 text-slate-500">{message}</p>
            <div className="h-2 overflow-hidden rounded-full bg-blue-50">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>导出前检查</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "已解析文档", ok: parsedDocuments.length > 0 },
              { label: "已选择模板", ok: Boolean(template) },
              { label: "已选择导出模块", ok: selectedItems.length > 0 },
              { label: "目录结构可用", ok: headings.length > 0 }
            ].map((item) => (
              <div className="flex items-center justify-between rounded-xl bg-white/65 p-3 shadow-sm" key={item.label}>
                <span className="text-sm">{item.label}</span>
                <span className={item.ok ? "text-xs text-emerald-600" : "text-xs text-amber-600"}>{item.ok ? "通过" : "待补"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>导出预览</CardTitle>
          <FileArchive className="h-5 w-5 text-accent" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white/65 p-4 shadow-sm">
            <strong className="text-sm">目录预览</strong>
            <div className="mt-3 space-y-2">
              {(headings.length ? headings : ["项目概况", "技术方案", "商务响应", "风险检查", "附件清单"]).map((heading, index) => (
                <div className="flex items-center gap-3 text-sm" key={`${heading}-${index}`}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs text-blue-600">{index + 1}</span>
                  <span>{heading}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-950 to-blue-700 p-4 text-white shadow-lg shadow-blue-950/20">
            <Download className="mb-3 h-5 w-5 text-cyan-300" />
            <strong className="text-sm">后续导出服务</strong>
            <p className="mt-2 text-sm leading-6 text-blue-50">
              当前为前端导出体验闭环。后端接入 docx 模板渲染后，这里将下载真实 Word 文件并保留导出记录。
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
