import { Check, CheckCheck, Clock, Package, X } from "lucide-react";
import type { OrderStatus } from "../lib/types";

const STYLE = {
  REQUESTED: { label: "Requested", cls: "border border-ripe text-ripe", Icon: Clock },
  CONFIRMED: { label: "Confirmed", cls: "border border-field text-field", Icon: Check },
  READY: { label: "Ready", cls: "border border-field text-field", Icon: Package },
  COMPLETED: { label: "Completed", cls: "bg-field text-paper", Icon: CheckCheck },
  CANCELLED: { label: "Cancelled", cls: "bg-line text-ink/70", Icon: X },
} as const;

export function OrderBadge({ status }: { status: OrderStatus }) {
  const { label, cls, Icon } = STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}