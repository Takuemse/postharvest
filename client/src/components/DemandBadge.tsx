import { AlertTriangle, Check, CircleDot, Minus, X } from "lucide-react";
import type { DemandState } from "../lib/types";

const STYLE = {
  OPEN: { label: "Looking", cls: "border border-field text-field", Icon: CircleDot },
  PARTLY_FULFILLED: { label: "Partly filled", cls: "border border-field text-field", Icon: CircleDot },
  FULFILLED: { label: "Filled", cls: "bg-field/10 text-field", Icon: Check },
  OVERDUE: { label: "Date passed", cls: "bg-ripe text-white", Icon: AlertTriangle },
  CLOSED: { label: "Closed", cls: "bg-line text-ink/70", Icon: Minus },
  CANCELLED: { label: "Cancelled", cls: "bg-line text-ink/70", Icon: X },
} as const;

export function DemandBadge({ state }: { state: DemandState }) {
  const { label, cls, Icon } = STYLE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}