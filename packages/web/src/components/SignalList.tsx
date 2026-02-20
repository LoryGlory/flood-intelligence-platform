import type { RiskSignal, SignalSeverity } from "@flood/core";

const SEVERITY_STYLES: Record<
  SignalSeverity,
  { icon: string; bg: string; text: string; border: string }
> = {
  info: {
    icon: "ℹ",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  warning: {
    icon: "⚠",
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  critical: {
    icon: "🔴",
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-300",
  },
};

interface Props {
  signals: RiskSignal[];
}

export function SignalList({ signals }: Props) {
  if (signals.length === 0) {
    return <p className="text-gray-400 italic text-sm">No signals.</p>;
  }

  return (
    <ul className="space-y-2">
      {signals.map((signal) => {
        const style = SEVERITY_STYLES[signal.severity];
        return (
          <li
            key={signal.code}
            className={`flex gap-3 items-start p-3 rounded-lg border ${style.bg} ${style.border}`}
          >
            <span className="text-base leading-tight mt-0.5">{style.icon}</span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${style.text}`}>{signal.label}</p>
              <p className="text-sm text-gray-600 mt-0.5">{signal.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
