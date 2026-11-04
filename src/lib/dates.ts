// microCMSの日時はUTCで返る。日本時間の「日付」として扱うためのもの。

export type Ymd = { y: number; m: number; d: number };

export function jstYmd(iso?: string): Ymd | null {
  if (!iso) return null;
  const t = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function todayJst(): Ymd {
  return jstYmd(new Date().toISOString())!;
}

export function toNum(x: Ymd): number {
  return x.y * 10000 + x.m * 100 + x.d;
}

const WD = "日月火水木金土";

export function fmt(x: Ymd): string {
  const wd = WD[new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay()];
  return `${x.y}/${x.m}/${x.d}（${wd}）`;
}

export function daysBetween(a: Ymd, b: Ymd): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

export type EntryState = "open" | "before" | "closed" | "none";

export function entryState(start: Ymd | null, end: Ymd | null, today: Ymd): EntryState {
  const t = toNum(today);
  if (end && t > toNum(end)) return "closed";
  if (start && t < toNum(start)) return "before";
  if (end) return "open";
  return "none";
}

export const ENTRY_LABEL: Record<EntryState, string> = {
  open: "受付中",
  before: "受付前",
  closed: "締切",
  none: "申込日程なし",
};
