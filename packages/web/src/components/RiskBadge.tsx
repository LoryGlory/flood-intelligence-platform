import type { RiskLevel } from "@flood/core";

const LEVEL_STYLES: Record<
  RiskLevel,
  { bg: string; text: string; border: string; ring: string; label: string; dot: string }
> = {
  low: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
    label: "LOW RISK",
  },
  moderate: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-400",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
    label: "MODERATE RISK",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-400",
    ring: "ring-orange-200",
    dot: "bg-orange-500",
    label: "HIGH RISK",
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-900",
    border: "border-red-500",
    ring: "ring-red-200",
    dot: "bg-red-500",
    label: "CRITICAL RISK",
  },
};

interface Props {
  readonly score: number;
  readonly level: RiskLevel;
}

export function RiskBadge({ score, level }: Props) {
  const style = LEVEL_STYLES[level];

  return (
    <div
      className={`inline-flex flex-col items-center gap-1.5 px-7 py-5 rounded-2xl border-2 ring-4 ${style.bg} ${style.border} ${style.ring}`}
    >
      <span className={`text-5xl font-black tabular-nums font-mono leading-none ${style.text}`}>
        {score}
      </span>
      <span className="text-xs font-medium text-slate-400 tracking-widest font-mono">/ 100</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className={`text-xs font-bold tracking-widest uppercase ${style.text}`}>
          {style.label}
        </span>
      </div>
    </div>
  );
}
