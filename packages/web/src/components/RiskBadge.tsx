import type { RiskLevel } from "@flood/core";

const LEVEL_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; label: string }> =
  {
    low: {
      bg: "bg-green-50",
      text: "text-green-800",
      border: "border-green-300",
      label: "LOW RISK",
    },
    moderate: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      border: "border-yellow-400",
      label: "MODERATE RISK",
    },
    high: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      border: "border-orange-400",
      label: "HIGH RISK",
    },
    critical: {
      bg: "bg-red-50",
      text: "text-red-900",
      border: "border-red-500",
      label: "CRITICAL RISK",
    },
  };

interface Props {
  score: number;
  level: RiskLevel;
}

export function RiskBadge({ score, level }: Props) {
  const style = LEVEL_STYLES[level];

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl border-2 ${style.bg} ${style.border}`}
    >
      <span className={`text-5xl font-black tabular-nums ${style.text}`}>{score}</span>
      <span className="text-xs font-semibold text-gray-500 tracking-widest">/ 100</span>
      <span className={`text-sm font-bold tracking-wider ${style.text}`}>{style.label}</span>
    </div>
  );
}
