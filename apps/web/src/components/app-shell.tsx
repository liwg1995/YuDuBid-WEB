"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  FileDown,
  FileSearch,
  FolderKanban,
  Layers3,
  Library,
  Menu,
  Settings,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems: Array<{
  href: Route;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = [
  { href: "/", icon: FolderKanban, label: "项目工作台" },
  { href: "/tender-analysis", icon: FileSearch, label: "招标文件解析" },
  { href: "/technical-plan", icon: Layers3, label: "技术标生成" },
  { href: "/business-bid", icon: BriefcaseBusiness, label: "商务标" },
  { href: "/knowledge-base", icon: Library, label: "企业知识库" },
  { href: "/risk-check", icon: ShieldAlert, label: "废标项检查" },
  { href: "/duplicate-check", icon: ClipboardCheck, label: "标书查重" },
  { href: "/export", icon: FileDown, label: "Word 导出" },
  { href: "/settings", icon: Settings, label: "系统设置" }
];

interface AppShellProps {
  active: Route;
  children: React.ReactNode;
}

function BrandLogo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-2xl bg-white/95 shadow-inner ring-1 ring-white/30",
        size === "md" ? "h-11 w-11" : "h-9 w-9 rounded-xl"
      )}
    >
      <img alt="禹都投标AI助手 Logo" className="h-full w-full object-cover" src="/images/yudubid-icon.png" />
    </div>
  );
}

export function AppShell({ active, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <div className="mb-7 flex items-center gap-3 px-2">
        <BrandLogo />
        <div>
          <strong className="block text-sm">禹都投标AI助手</strong>
          <span className="text-xs text-blue-100/80">YuDu_Bidkit</span>
        </div>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            className={cn(
              "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-blue-100/80 transition-all hover:bg-white/10 hover:text-white",
              active === item.href && "bg-white/20 text-white shadow-lg shadow-blue-950/20 ring-1 ring-white/20 hover:bg-white/20"
            )}
            href={item.href}
            key={item.href}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-4 shadow-inner backdrop-blur">
        <div className="mb-3 text-sm font-medium">私有化部署</div>
        <p className="text-xs leading-5 text-blue-100/80">
          支持 Docker Compose、本地存储或 MinIO，模型接口由企业自行配置。
        </p>
      </div>
    </>
  );

  return (
    <main className="page-grid">
      <aside className="hidden min-h-screen bg-gradient-to-b from-blue-950 via-blue-800 to-blue-600 px-4 py-5 text-white shadow-2xl shadow-blue-950/20 lg:block">
        {nav}
      </aside>
      <section className="min-w-0 px-4 py-4 md:px-7 md:py-6">
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-blue-950 px-4 py-3 text-white shadow-lg shadow-blue-950/15 lg:hidden">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <div>
              <strong className="block text-sm">禹都投标AI助手</strong>
              <span className="text-xs text-blue-100/80">YuDu_Bidkit</span>
            </div>
          </div>
          <button
            aria-label="打开导航"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="关闭导航"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-72 bg-gradient-to-b from-blue-950 via-blue-800 to-blue-600 px-4 py-5 text-white shadow-2xl">
            {nav}
          </aside>
        </div>
      )}
    </main>
  );
}
