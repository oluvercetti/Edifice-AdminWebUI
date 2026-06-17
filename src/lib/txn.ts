// Money-movement type → badge colours (PRD: color-coded transaction feed).
export const TXN_TYPES: Record<string, { color: string; bg: string }> = {
  "Pay-in": { color: "#198754", bg: "#E6F3EC" },
  "Escrow hold": { color: "#1570EF", bg: "#E7F0FD" },
  Disbursement: { color: "#146C43", bg: "#E8F1EC" },
  Payout: { color: "#7A5AF8", bg: "#EFEBFE" },
  Refund: { color: "#5F6368", bg: "#EEF0F2" },
  Reversal: { color: "#D92D20", bg: "#FDECEA" },
  Adjustment: { color: "#5F6368", bg: "#EEF0F2" },
};

/** ISO timestamp → "12:04:31" (clock used across the monitoring feed). */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
}

/** ISO timestamp → "12 Jun, 14:22". */
export function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
