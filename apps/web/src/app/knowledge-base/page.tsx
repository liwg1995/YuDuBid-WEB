"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Database, FileText, FolderPlus, Search, Tags, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const folders = ["公司资质", "历史业绩", "技术方案模板", "人员证书", "设备清单"];

interface KnowledgeSummary {
  documents: number;
  items: number;
  status: string;
}

interface DocumentItem {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
  metadata?: {
    stats?: {
      heading_count?: number;
      char_count?: number;
      headings?: string[];
    };
    markdownPreview?: string;
  };
  project?: {
    name: string;
  };
}

export default function KnowledgeBasePage() {
  const [summary, setSummary] = useState<KnowledgeSummary>({ documents: 0, items: 0, status: "loading" });
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState(folders[0]);
  const [importingDocument, setImportingDocument] = useState<DocumentItem | null>(null);
  const [importedItems, setImportedItems] = useState<Array<{ title: string; folder: string; tags: string; summary: string }>>([]);
  const [form, setForm] = useState({ title: "", folder: folders[0], tags: "技术标,案例", summary: "" });

  async function loadData() {
    const [summaryData, documentsData] = await Promise.all([
      fetch(`${apiBaseUrl}/api/knowledge-base/summary`).then((response) => response.json()) as Promise<KnowledgeSummary>,
      fetch(`${apiBaseUrl}/api/documents`).then((response) => response.json()) as Promise<DocumentItem[]>
    ]);
    setSummary(summaryData);
    setDocuments(documentsData);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const parsedDocuments = documents.filter((document) => document.status === "parsed");
  const filteredDocuments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return parsedDocuments;
    return parsedDocuments.filter((document) => {
      const text = `${document.fileName} ${document.project?.name || ""} ${(document.metadata?.stats?.headings || []).join(" ")}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [parsedDocuments, query]);

  function openImportModal(document: DocumentItem) {
    setImportingDocument(document);
    setForm({
      title: document.fileName.replace(/\.[^.]+$/, ""),
      folder: activeFolder,
      tags: "技术标,案例",
      summary: document.metadata?.markdownPreview?.slice(0, 180) || "从 Markdown 中间态生成的候选知识素材。"
    });
  }

  function saveKnowledgeItem() {
    setImportedItems((current) => [{ ...form }, ...current]);
    setImportingDocument(null);
  }

  return (
    <AppShell active="/knowledge-base">
      <PageHeader actionLabel="导入资料" description="沉淀企业资料、历史案例和方案素材，让 AI 输出更贴合企业能力。" title="企业知识库" />
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="知识文件" trend="正式入库" value={String(summary.documents)} />
        <StatCard label="知识条目" trend="结构化素材" value={String(summary.items + importedItems.length)} />
        <StatCard label="候选素材" trend="来自解析文档" value={String(parsedDocuments.length)} />
        <StatCard label="可提取标题" trend="最新文档" value={String(parsedDocuments[0]?.metadata?.stats?.heading_count ?? 0)} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>资料分类</CardTitle>
            <FolderPlus className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            {folders.map((folder, index) => (
              <button
                className={`flex h-11 w-full items-center justify-between rounded-xl px-3 text-sm transition ${activeFolder === folder ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/55 hover:bg-white"}`}
                key={folder}
                onClick={() => setActiveFolder(folder)}
                type="button"
              >
                <span>{folder}</span>
                <span className={activeFolder === folder ? "text-blue-100" : "text-xs text-muted-foreground"}>{index === 0 ? parsedDocuments.length : 0}</span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>候选知识素材</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">从已解析招标文件中挑选可复用内容，后续可正式入库并绑定章节。</p>
            </div>
            <Database className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              <input
                className="h-10 w-full rounded-xl border border-white/70 bg-white/70 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文件、项目、标题"
                value={query}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDocuments.map((document) => (
                <article className="rounded-xl bg-white/65 p-4 shadow-sm" key={document.id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <BookOpenText className="h-5 w-5 text-primary" />
                    <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{document.status}</span>
                  </div>
                  <strong className="line-clamp-1 text-sm">{document.fileName}</strong>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {document.metadata?.markdownPreview || "该文件已生成 Markdown，可继续进行知识条目抽取。"}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Tags className="h-3.5 w-3.5" />
                    {document.metadata?.stats?.heading_count ?? 0} 个标题 / {document.metadata?.stats?.char_count ?? 0} 字符
                  </div>
                  <Button className="mt-4 w-full" onClick={() => openImportModal(document)} variant="outline">
                    正式入库
                  </Button>
                </article>
              ))}
            </div>
            {importedItems.length > 0 && (
              <div className="rounded-xl bg-blue-50/80 p-4">
                <strong className="text-sm text-blue-900">本次入库记录</strong>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {importedItems.map((item, index) => (
                    <article className="rounded-xl bg-white/80 p-3 text-sm shadow-sm" key={`${item.title}-${index}`}>
                      <strong>{item.title}</strong>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summary}</p>
                      <p className="mt-2 text-xs text-blue-600">{item.folder} / {item.tags}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {!filteredDocuments.length && (
              <div className="rounded-xl bg-white/65 p-8 text-center text-sm text-slate-500">
                <FileText className="mx-auto mb-3 h-8 w-8 text-blue-400" />
                暂无可用素材。先上传并解析招标文件，系统会把 Markdown 结果列为候选知识素材。
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      {importingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">正式入库</h2>
                <p className="mt-1 text-sm text-muted-foreground">{importingDocument.fileName}</p>
              </div>
              <button className="rounded-xl bg-white/70 p-2" onClick={() => setImportingDocument(null)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">素材标题</span>
                <input className="h-10 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">分类</span>
                <select className="h-10 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setForm({ ...form, folder: event.target.value })} value={form.folder}>
                  {folders.map((folder) => (
                    <option key={folder}>{folder}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">标签</span>
                <input className="h-10 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setForm({ ...form, tags: event.target.value })} value={form.tags} />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">摘要</span>
                <textarea className="min-h-32 w-full rounded-xl border border-white/70 bg-white/70 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setForm({ ...form, summary: event.target.value })} value={form.summary} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setImportingDocument(null)} variant="outline">取消</Button>
              <Button onClick={saveKnowledgeItem}>确认入库</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
