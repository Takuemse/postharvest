import { AlertTriangle, Check, Clock } from "lucide-react";
import type { Urgency } from "../lib/types";

const STYLE = {
  URGENT: { label: "Sell now", cls: "bg-ripe text-white", Icon: AlertTriangle },
  ATTENTION: { label: "Sell soon", cls: "border border-ripe text-ripe", Icon: Clock },
  SAFE: { label: "Fresh", cls: "bg-field/10 text-field", Icon: Check },
} as const;

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const { label, cls, Icon } = STYLE[urgency];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}