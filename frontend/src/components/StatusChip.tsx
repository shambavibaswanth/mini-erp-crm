const CLASS_MAP: Record<string, string> = {
  DRAFT: "chip-draft",
  CONFIRMED: "chip-confirmed",
  CANCELLED: "chip-cancelled",
  LEAD: "chip-lead",
  ACTIVE: "chip-active",
  INACTIVE: "chip-inactive",
};

export function StatusChip({ status }: { status: string }) {
  const cls = CLASS_MAP[status] || "chip-draft";
  return <span className={`chip ${cls}`}>{status.toLowerCase()}</span>;
}

export function LowStockChip() {
  return <span className="chip chip-low">low stock</span>;
}
