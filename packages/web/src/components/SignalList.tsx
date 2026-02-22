import type { RiskSignal, SignalSeverity } from "@flood/core";

// Heroicons (solid) inline SVGs — no emoji
function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CriticalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const SEVERITY_CONFIG: Record<
  SignalSeverity,
  {
    Icon: () => React.ReactElement;
    bg: string;
    text: string;
    border: string;
    iconColor: string;
  }
> = {
  info: {
    Icon: InfoIcon,
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    iconColor: "text-blue-500",
  },
  warning: {
    Icon: WarningIcon,
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-300",
    iconColor: "text-amber-500",
  },
  critical: {
    Icon: CriticalIcon,
    bg: "bg-red-50",
    text: "text-red-900",
    border: "border-red-300",
    iconColor: "text-red-500",
  },
};

interface Props {
  readonly signals: RiskSignal[];
}

export function SignalList({ signals }: Props) {
  if (signals.length === 0) {
    return <p className="text-slate-400 italic text-sm">No signals detected.</p>;
  }

  return (
    <ul className="space-y-2">
      {signals.map((signal) => {
        const { Icon, bg, text, border, iconColor } = SEVERITY_CONFIG[signal.severity];
        return (
          <li
            key={signal.code}
            className={`flex gap-3 items-start p-3.5 rounded-xl border ${bg} ${border}`}
          >
            <span className={`mt-0.5 ${iconColor}`}>
              <Icon />
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${text}`}>{signal.label}</p>
              <p className="text-sm text-slate-600 mt-0.5 leading-snug">{signal.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
