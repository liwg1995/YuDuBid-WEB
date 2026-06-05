import { BarChart3, FileStack, FolderKanban, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
}

export function StatCard({ label, value, trend }: StatCardProps) {
  const palettes = [
    { icon: FolderKanban, bg: "from-blue-500 to-sky-400", glow: "bg-blue-100 text-blue-600" },
    { icon: FileStack, bg: "from-teal-500 to-emerald-400", glow: "bg-teal-100 text-teal-600" },
    { icon: BarChart3, bg: "from-violet-500 to-indigo-400", glow: "bg-violet-100 text-violet-600" },
    { icon: ShieldCheck, bg: "from-rose-500 to-orange-400", glow: "bg-rose-100 text-rose-600" }
  ];
  const palette = palettes[Math.abs(label.length + value.length) % palettes.length];
  const Icon = palette.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative p-4">
        <div className={cn("absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-br opacity-[0.12]", palette.bg)} />
        <div className="flex items-center justify-between gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", palette.glow)}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-lg bg-white/70 px-2 py-1 text-xs text-slate-500">较昨日 ↑</span>
        </div>
        <span className="mt-4 block text-xs font-medium text-slate-500">{label}</span>
        <div className="mt-1 flex items-end justify-between gap-3">
          <strong className="text-3xl font-semibold text-slate-950">{value}</strong>
          <span className="text-xs text-slate-500">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
