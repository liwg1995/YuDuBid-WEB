import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
}

export function PageHeader({ title, description, actionLabel = "新建项目" }: PageHeaderProps) {
  return (
    <header className="glass-panel mb-6 flex flex-col gap-4 rounded-2xl px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-950 md:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
          <input
            className="h-10 w-56 rounded-xl border border-white/70 bg-white/70 pl-9 pr-3 text-sm outline-none shadow-inner transition focus:ring-2 focus:ring-ring"
            placeholder="搜索项目、文件、知识库"
          />
        </div>
        <Button aria-label="通知" size="icon" variant="outline">
          <Bell className="h-4 w-4" />
        </Button>
        <Button>
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </header>
  );
}
