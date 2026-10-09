export type OrderStatus = "REQUESTED" | "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED";
export type Side = "FARMER" | "BUYER";
export type OrderAction = "confirm" | "decline" | "cancel" | "ready" | "complete";

export function allowedActions(status: OrderStatus, viewer: Side, initiatedBy: Side): OrderAction[] {
  switch (status) {
    case "REQUESTED":
      return viewer === initiatedBy ? ["cancel"] : ["confirm", "decline"];
    case "CONFIRMED":
      return viewer === "FARMER" ? ["ready", "cancel"] : ["cancel"];
    case "READY":
      return viewer === "BUYER" ? ["complete", "cancel"] : ["cancel"];
    default:
      return [];
  }
}

// Phone numbers appear only once both sides have committed.
export const contactVisible = (s: OrderStatus) => s === "CONFIRMED" || s === "READY" || s === "COMPLETED";
// Only these states hold reserved stock.
export const holdsStock = (s: OrderStatus) => s === "CONFIRMED" || s === "READY";