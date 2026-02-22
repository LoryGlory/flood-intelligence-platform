import type { EvidenceItem, EvidenceType } from "@flood/core";

const TYPE_LABELS: Record<EvidenceType, string> = {
  gauge: "Gauge",
  forecast: "Forecast",
  assessment: "Assessment",
  historical: "Historical",
};

const TYPE_COLORS: Record<EvidenceType, string> = {
  gauge: "bg-blue-100 text-blue-700",
  forecast: "bg-violet-100 text-violet-700",
  assessment: "bg-slate-100 text-slate-600",
  historical: "bg-amber-100 text-amber-700",
};

interface Props {
  readonly items: EvidenceItem[];
}

function formatTs(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }) + " UTC"
    );
  } catch {
    return iso;
  }
}

export function EvidenceList({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-slate-400 italic text-sm">No evidence items available.</p>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={item.id} className="flex gap-3 text-sm">
          <span className="shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-mono text-xs font-bold mt-0.5">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[item.type]}`}
              >
                {TYPE_LABELS[item.type]}
              </span>
              <span className="text-xs text-slate-400 font-mono">{formatTs(item.timestamp)}</span>
            </div>
            <p className="text-slate-700 leading-snug">{item.citation}</p>
            <p className="text-xs text-slate-400 font-mono mt-1">Source: {item.source}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
