"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileArchive, FileText, ListChecks, Loader2, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface UploadedDocument {
  id: string;
  fileName: string;
  mimeType?: string;
  storageKey: string;
  markdownKey?: string | null;
  status: string;
  createdAt: string;
  metadata?: {
    stats?: {
      char_count?: number;
      line_count?: number;
      heading_count?: number;
      headings?: string[];
    };
    markdownPreview?: string;
  };
  project?: {
    id: string;
    name: string;
    status: string;
  };
}

export default function TenderAnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [markdownPreview, setMarkdownPreview] = useState("");
  const [message, setMessage] = useState("准备上传招标文件。");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    const hasPending = documents.some((document) => ["uploaded", "parsing"].includes(document.status));
    if (!hasPending && !uploading) return;
    const timer = window.setInterval(() => void loadDocuments(), 3000);
    return () => window.clearInterval(timer);
  }, [documents, uploading]);

  async function loadDocuments() {
    const response = await fetch(`${apiBaseUrl}/api/documents`);
    const data = (await response.json()) as UploadedDocument[];
    setDocuments(data);
  }

  async function uploadSelectedFile(file?: File) {
    if (!file) return;

    setUploading(true);
    setMessage("正在上传文件并创建解析任务...");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("role", "tender");
      form.append("parser", "auto");
      form.append("projectName", file.name.replace(/\.[^.]+$/, ""));

      const response = await fetch(`${apiBaseUrl}/api/documents/upload`, {
        method: "POST",
        body: form
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`上传失败：${response.status} ${detail.slice(0, 300)}`);
      }

      const data = (await response.json()) as { document: UploadedDocument; message: string };
      setMessage(data.message);
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    await uploadSelectedFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    await uploadSelectedFile(event.dataTransfer.files?.[0]);
  }

  const latestDocument = documents[0];
  const parsedCount = documents.filter((document) => document.status === "parsed").length;
  const pendingCount = documents.filter((document) => ["uploaded", "parsing"].includes(document.status)).length;
  const latestStats = latestDocument?.metadata?.stats;
  const extractedItems = useMemo(
    () => [
      { label: "已识别标题", count: latestStats?.heading_count ?? 0, status: "Markdown 结构" },
      { label: "文档行数", count: latestStats?.line_count ?? 0, status: "已统计" },
      { label: "字符数量", count: latestStats?.char_count ?? 0, status: "中间态" },
      { label: "待处理文件", count: pendingCount, status: pendingCount ? "处理中" : "无积压" }
    ],
    [latestStats?.char_count, latestStats?.heading_count, latestStats?.line_count, pendingCount]
  );

  useEffect(() => {
    if (!latestDocument?.id) {
      setMarkdownPreview("");
      return;
    }

    void fetch(`${apiBaseUrl}/api/documents/${latestDocument.id}/markdown`)
      .then((response) => response.json())
      .then((data: { markdown?: string }) => setMarkdownPreview(data.markdown || latestDocument.metadata?.markdownPreview || ""))
      .catch(() => setMarkdownPreview(latestDocument.metadata?.markdownPreview || ""));
  }, [latestDocument?.id, latestDocument?.metadata?.markdownPreview]);

  return (
    <AppShell active="/tender-analysis">
      <PageHeader actionLabel="上传文件" description="解析招标文件，沉淀后续生成、检查和导出的统一输入。" title="招标文件解析" />
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="上传文件" trend="全部记录" value={String(documents.length)} />
        <StatCard label="已解析文件" trend="Markdown 中间态" value={String(parsedCount)} />
        <StatCard label="处理中" trend="自动轮询" value={String(pendingCount)} />
        <StatCard label="标题数量" trend="最新文件" value={String(latestStats?.heading_count ?? 0)} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>文件解析入口</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">支持本地解析、Python Worker、MinerU 和 OCR 扩展。</p>
            </div>
            <UploadCloud className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${
                dragActive ? "border-blue-500 bg-blue-50/90 shadow-inner" : "border-blue-200 bg-white/55"
              }`}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {uploading ? <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" /> : <FileArchive className="mb-4 h-10 w-10 text-primary" />}
              <h2 className="text-lg font-semibold">拖拽招标文件到这里</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                文件上传后会生成 Markdown 中间态，并提取评分办法、资格条件、技术需求、商务条款和废标项。
              </p>
              <input
                accept=".pdf,.doc,.docx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={uploadFile}
                ref={fileInputRef}
                type="file"
              />
              <Button className="mt-5" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="h-4 w-4" />
                {uploading ? "上传中..." : "选择文件"}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">{message}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>解析结果预览</CardTitle>
            <ListChecks className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="space-y-3">
            {extractedItems.map((item) => (
              <article className="rounded-xl bg-white/65 p-4 shadow-sm" key={item.label}>
                <div className="flex items-center justify-between">
                  <strong className="text-sm">{item.label}</strong>
                  <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{item.status}</span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-2xl font-semibold">{item.count}</span>
                  <span className="pb-1 text-xs text-muted-foreground">条</span>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>上传与解析记录</CardTitle>
          <FileText className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length ? (
            documents.map((document) => (
              <article className="grid gap-3 rounded-xl bg-white/65 p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_180px]" key={document.id}>
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    {["uploaded", "parsing"].includes(document.status) ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                    <strong className="truncate text-sm">{document.fileName}</strong>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{document.storageKey}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{document.project?.name || "未关联项目"}</p>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">{document.status}</span>
                  <span className="text-xs text-muted-foreground">{new Date(document.createdAt).toLocaleString("zh-CN")}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg bg-slate-50 p-6 text-sm text-muted-foreground">还没有上传记录。</div>
          )}
          {latestDocument && (
            <pre className="max-h-56 overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">
{markdownPreview ||
`# 最新上传

- 文件：${latestDocument.fileName}
- 项目：${latestDocument.project?.name || "未关联项目"}
- 状态：${latestDocument.status}
- 存储路径：${latestDocument.storageKey}
- Markdown：${latestDocument.markdownKey || "尚未生成"}
- 字符数：${latestDocument.metadata?.stats?.char_count ?? 0}
- 标题数：${latestDocument.metadata?.stats?.heading_count ?? 0}`}
            </pre>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
