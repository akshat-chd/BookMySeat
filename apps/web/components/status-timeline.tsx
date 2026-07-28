"use client";

import type { SaleUiStatus } from "@flashdrop/shared";

const steps: SaleUiStatus[] = [
  "READY",
  "RESERVING",
  "RESERVED",
  "PROCESSING",
  "CONFIRMED"
];

export function StatusTimeline({ status }: { status: SaleUiStatus }) {
  const activeIndex = steps.indexOf(status);

  return (
    <div className="panel rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Order Flow</p>
          <h3 className="mt-2 font-[var(--font-heading)] text-xl">State Transitions</h3>
        </div>
        <span className="rounded-full border border-[var(--line)] px-3 py-1 font-[var(--font-mono)] text-xs text-slate-300">
          {status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {steps.map((step, index) => {
          const isActive = activeIndex >= index;
          return (
            <div
              key={step}
              className={`rounded-2xl border px-4 py-4 transition ${
                isActive
                  ? "border-[rgba(102,245,210,0.45)] bg-[rgba(102,245,210,0.08)]"
                  : "border-[var(--line)] bg-[rgba(255,255,255,0.02)]"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`status-dot ${isActive ? "bg-[#66f5d2] animate-pulseLine" : "bg-slate-700"}`}
                />
                <span className="font-[var(--font-mono)] text-xs text-slate-400">
                  0{index + 1}
                </span>
              </div>
              <p className="font-semibold text-white">{step}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
