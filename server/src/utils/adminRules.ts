// Who may be suspended. Pure, so it is easy to test.
export function suspensionBlocker(adminId: string, target: { id: string; role: string }): string | null {
  if (target.id === adminId) return "You cannot suspend your own account.";
  if (target.role === "ADMIN") return "Admin accounts cannot be suspended.";
  return null;
}