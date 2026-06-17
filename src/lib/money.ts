// ============================================================
// Money — the string-kobo ↔ display-NGN seam. The backend serializes every
// amount as a BIGINT-safe string of minor units (kobo); the UI works in display
// NGN. Convert once, in the mappers; never do float math on money elsewhere.
// ============================================================

export function koboToNaira(amountMinor: string | number): number {
  return Number(BigInt(amountMinor)) / 100;
}

export function nairaToKobo(naira: number): string {
  return BigInt(Math.round(naira * 100)).toString();
}

export function fmtNGN(
  n: number | null | undefined,
  { decimals = 0 }: { decimals?: number } = {},
): string {
  if (n == null || isNaN(n)) return "—";
  return (
    "₦" +
    Number(n).toLocaleString("en-NG", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** Compact NGN for dense dashboards: ₦12.8B, ₦248.5M, ₦40k. */
export function fmtNGNCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `₦${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `₦${Math.round(n / 1e3)}k`;
  return fmtNGN(n);
}
