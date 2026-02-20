import type { EvidenceItem, EvidenceType } from "@flood/core";

const TYPE_LABELS: Record<EvidenceType, string> = {
  gauge: "Gauge",
  forecast: "Forecast",
  assessment: "Assessment",
  historical: "Historical",
};

const TYPE_COLORS: Record<EvidenceType, string> = {
  gauge: "bg-blue-100 text-blue-700",
  forecast: "bg-purple-100 text-purple-700",
  assessment: "bg-gray-100 text-gray-700",
  historical: "bg-amber-100 text-amber-700",
};

interface Props {
  items: EvidenceItem[];
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
    return <p className="text-gray-400 italic text-sm">No evidence items available.</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.id} className="flex gap-3 text-sm">
          <span className="shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-mono text-xs font-bold">
            {i + 1}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_COLORS[item.type]}`}
              >
                {TYPE_LABELS[item.type]}
              </span>
              <span className="text-xs text-gray-400">{formatTs(item.timestamp)}</span>
            </div>
            <p className="text-gray-700 leading-snug">{item.citation}</p>
            <p className="text-xs text-gray-400 mt-0.5">Source: {item.source}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
