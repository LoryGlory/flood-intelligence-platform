interface Props {
  notice: string;
}

export function SafetyBanner({ notice }: Props) {
  return (
    <div
      role="alert"
      className="flex gap-3 items-start p-4 rounded-xl border-2 border-amber-400 bg-amber-50"
    >
      <span className="text-xl leading-tight">⚠️</span>
      <p className="text-sm text-amber-900 leading-relaxed">{notice}</p>
    </div>
  );
}
