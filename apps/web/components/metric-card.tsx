import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  accent,
  detail
}: {
  label: string;
  value: ReactNode;
  accent?: "glow" | "warning" | "signal";
  detail?: string;
}) {
  const borderClass =
    accent === "warning"
      ? "border-[rgba(255,143,92,0.35)]"
      : accent === "signal"
        ? "border-[rgba(139,184,255,0.35)]"
        : "border-[rgba(102,245,210,0.32)]";

  return (
    <div className={`panel rounded-3xl p-5 ${borderClass}`}>
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <div className="mt-3 font-[var(--font-heading)] text-4xl text-white">{value}</div>
      {detail ? <p className="mt-3 text-sm text-slate-400">{detail}</p> : null}
    </div>
  );
}
