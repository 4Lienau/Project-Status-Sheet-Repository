export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function statusLabel(status: string): string {
  switch ((status || "").toLowerCase()) {
    case "completed": return "Completed";
    case "on_hold": return "On Hold";
    case "cancelled": return "Cancelled";
    case "draft": return "Draft";
    default: return "Active";
  }
}
