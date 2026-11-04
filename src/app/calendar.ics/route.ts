import { getEditions } from "@/lib/microcms";
import { jstYmd, type Ymd } from "@/lib/dates";

// 静的書き出しで calendar.ics というファイルになる。
export const dynamic = "force-static";

const ymd = (x: Ymd) => `${x.y}${String(x.m).padStart(2, "0")}${String(x.d).padStart(2, "0")}`;
const next = (x: Ymd): Ymd => {
  const t = new Date(Date.UTC(x.y, x.m - 1, x.d + 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

export async function GET() {
  const { contents } = await getEditions();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//isshin-event-watcher//JA",
    "X-WR-CALNAME:一次創作イベントウォッチャー", "X-WR-TIMEZONE:Asia/Tokyo",
  ];
  for (const e of contents) {
    if (!e.event) continue;
    const name = `${e.event.name} ${e.label}`;
    const start = jstYmd(e.startDate)!;
    const end = jstYmd(e.endDate) ?? start;
    lines.push(
      "BEGIN:VEVENT", `UID:${e.id}@isshin-event-watcher`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(next(end))}`,
      `SUMMARY:${esc(name)}`, `LOCATION:${esc(e.venue)}`, `URL:${e.pageUrl}`, "END:VEVENT",
    );
    const dl = jstYmd(e.entryEnd);
    if (dl) {
      lines.push(
        "BEGIN:VEVENT", `UID:${e.id}-entry@isshin-event-watcher`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(dl)}`, `DTEND;VALUE=DATE:${ymd(next(dl))}`,
        `SUMMARY:${esc(`〆 ${name} サークル申込締切`)}`, `DESCRIPTION:${esc(e.entryNote ?? "")}`,
        `URL:${e.pageUrl}`, "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
