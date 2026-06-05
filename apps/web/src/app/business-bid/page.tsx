"use client";

import { BadgeCheck, Calculator, Clock, Construction, FileSpreadsheet, Landmark, ReceiptText, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";

const roadmap = [
  {
    icon: ReceiptText,
    title: "商务响应矩阵",
    description: "从招标文件中抽取付款、履约、服务期、报价有效期等商务条款，形成逐条响应。"
  },
  {
    icon: Landmark,
    title: "合同偏离表",
    description: "识别合同条款和实质性要求，区分无偏离、正偏离、负偏离与需人工确认内容。"
  },
  {
    icon: Calculator,
    title: "报价辅助",
    description: "预留报价汇总、分项报价、税率口径和报价附件清单，后续对接 Excel 模板。"
  },
  {
    icon: ShieldCheck,
    title: "废标联动",
    description: "与废标项检查共用商务条款抽取结果，降低漏响应、错响应和材料缺失风险。"
  }
];

const materialTemplates = ["报价汇总表", "分项报价表", "合同偏离表", "法定代表人授权书", "保函或保证金资料", "资格证明材料"];

export default function BusinessBidPage() {
  return (
    <AppShell active="/business-bid">
      <PageHeader description="商务标模块暂不开放生成能力，当前仅展示规划中的响应、报价和偏离表工作区。" title="商务标" />

      <section className="mb-6 overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-5 shadow-sm shadow-amber-100/60 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-lg shadow-amber-200">
              <Construction className="h-6 w-6" />
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Clock className="h-3.5 w-3.5" />
                开发中
              </div>
              <h2 className="text-2xl font-semibold text-slate-950">商务标能力正在排期建设</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                参考 OpenBidKit_Yibiao 的模块边界，当前优先完善招标解析、技术方案、知识库、废标项检查、查重和 Word 导出。商务标后续再接入商务响应矩阵、合同偏离表和报价辅助，不先做半成品生成。
              </p>
            </div>
          </div>
          <Button disabled>
            <Construction className="h-4 w-4" />
            暂未开放
          </Button>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="当前状态" trend="模块占位" value="开发中" />
        <StatCard label="优先级" trend="后续迭代" value="P2" />
        <StatCard label="计划能力" trend="商务标" value="4 项" />
        <StatCard label="材料模板" trend="待接入" value={String(materialTemplates.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>规划中的商务标工作流</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">先把业务边界放清楚，等核心解析和生成链路稳定后再接入真实接口。</p>
            </div>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {roadmap.map((item) => {
              const Icon = item.icon;
              return (
                <article className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm" key={item.title}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>后续材料清单</CardTitle>
            <FileSpreadsheet className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="space-y-3">
            {materialTemplates.map((item) => (
              <div className="flex items-center justify-between rounded-2xl bg-white/70 p-3 shadow-sm" key={item}>
                <span className="flex min-w-0 items-center gap-3">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm">{item}</span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">待接入</span>
              </div>
            ))}
            <div className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white shadow-lg shadow-slate-950/20">
              <Landmark className="mb-3 h-5 w-5 text-cyan-300" />
              商务标不再使用前端模拟结果。后续开发时会基于招标解析出的商务条款、废标条款和材料要求生成真实数据。
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
