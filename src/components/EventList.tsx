"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Edition } from "@/types";
import {
  ENTRY_LABEL, daysBetween, entryState, fmt, jstYmd, todayJst, toNum, type EntryState, type Ymd,
} from "@/lib/dates";

// 種類ごとの色。public/img/blob-*.webp（scripts/watercolor.py で作った水彩のにじみ）と対応させている
const KIND_SLUG: Record<string, string> = {
  "COMITIA系": "comitia",
  "文学フリマ": "bunfree",
  "ZINE": "zine",
  "創作全般": "general",
};
const slugOf = (kind?: string) => (kind && KIND_SLUG[kind]) || "other";
const WD_SHORT = "日月火水木金土";
const wdOf = (d: Ymd) => WD_SHORT[new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()];

// 都道府県の並び：オンラインと東京都を先に、あとは北から（都道府県コード順）
const PREF_ORDER = [
  "オンライン", "東京都",
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];
const prefRank = (p: string) => (PREF_ORDER.indexOf(p) + 1) || 99;

type Row = { e: Edition; start: Ymd; end: Ymd | null; deadline: Ymd | null; state: EntryState };

// ビルド時の日付で状態を固定しないよう、受付中かどうか・あと何日かはブラウザで計算する。
export default function EventList({ editions, buildDate }: { editions: Edition[]; buildDate: Ymd }) {
  const [today, setToday] = useState<Ymd>(buildDate);
  const [pref, setPref] = useState("");
  const [kind, setKind] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => setToday(todayJst()), []);

  const rows: Row[] = useMemo(
    () =>
      editions
        .map((e) => {
          const start = jstYmd(e.startDate)!;
          const end = jstYmd(e.endDate);
          const deadline = jstYmd(e.entryEnd);
          return { e, start, end, deadline, state: entryState(jstYmd(e.entryStart), deadline, today) };
        })
        .filter((r) => toNum(r.end ?? r.start) >= toNum(today)),
    [editions, today],
  );

  const prefs = useMemo(
    () => [...new Set(rows.map((r) => r.e.prefecture[0]))].sort((a, b) => prefRank(a) - prefRank(b)),
    [rows],
  );
  // チップの並びは決めた順にする（出てきた順だと毎回変わる）
  const ORDER = Object.keys(KIND_SLUG);
  const kinds = useMemo(
    () =>
      [...new Set(rows.map((r) => r.e.event?.kind[0] ?? ""))]
        .filter(Boolean)
        .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)),
    [rows],
  );

  const shown = rows.filter(
    (r) =>
      (!pref || r.e.prefecture[0] === pref) &&
      (!kind || r.e.event?.kind[0] === kind) &&
      (!openOnly || r.state === "open"),
  );

  return (
    <>
      <div className="kinds" role="group" aria-label="種類で絞り込む">
        <button className="chip all" aria-pressed={kind === ""} onClick={() => setKind("")}>すべて</button>
        {kinds.map((k) => (
          <button key={k} className={`chip k-${slugOf(k)}`} aria-pressed={kind === k} onClick={() => setKind(kind === k ? "" : k)}>
            {k}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={view === "list"} onClick={() => setView("list")}>リスト</button>
          <button role="tab" aria-selected={view === "calendar"} onClick={() => setView("calendar")}>カレンダー</button>
        </div>
        <div className="filters">
          <select aria-label="都道府県" value={pref} onChange={(ev) => setPref(ev.target.value)}>
            <option value="">都道府県：すべて</option>
            {prefs.map((p) => <option key={p}>{p}</option>)}
          </select>
          <label className="check">
            <input type="checkbox" checked={openOnly} onChange={(ev) => setOpenOnly(ev.target.checked)} /> 申込受付中だけ
          </label>
          <span className="count">{shown.length}件</span>
        </div>
      </div>

      {shown.length === 0 && <p className="empty">当てはまる開催はありません。</p>}

      {view === "list" ? <ListView rows={shown} today={today} /> : <CalendarView rows={shown} today={today} />}

      <p className="ical"><a href="calendar.ics">カレンダーアプリに取り込む（iCal）</a>　開催日とサークル申込の締切が入ります</p>
    </>
  );
}

function ListView({ rows, today }: { rows: Row[]; today: Ymd }) {
  // 月ごとに見出しを付ける
  const groups: { key: string; label: string; rows: Row[] }[] = [];
  for (const r of rows) {
    const key = `${r.start.y}-${r.start.m}`;
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      g = { key, label: `${r.start.y}年${r.start.m}月`, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }
  return (
    <>
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="month">{g.label}</h2>
          {g.rows.map((r, i) => <Card key={r.e.id} r={r} today={today} i={i} />)}
        </section>
      ))}
    </>
  );
}

function Card({ r: { e, start, end, deadline, state }, today, i }: { r: Row; today: Ymd; i: number }) {
  const days = daysBetween(today, start);
  const sched = e.schedule[0] ?? "予定どおり";
  const left = deadline ? daysBetween(today, deadline) : null;
  const slug = slugOf(e.event?.kind[0]);
  return (
    <article className={`card k-${slug}`} style={{ "--i": Math.min(i, 8) } as CSSProperties}>
      <div className="day" aria-hidden="true">
        <span className="day-m">{start.m}月</span>
        <span className="day-d">{start.d}</span>
        <span className="day-w">{wdOf(start)}{end && ` 〜 ${end.m !== start.m ? `${end.m}/` : ""}${end.d}`}</span>
      </div>
      <div className="body">
        <div className="when">
          <span className="date">{fmt(start)}{end && ` 〜 ${fmt(end)}`}</span>
          <span className="days">{days > 0 ? `あと${days}日` : "今日"}</span>
        </div>
        <h3>
          <a href={e.pageUrl} rel="noopener">{e.event?.name} <span className="label">{e.label}</span></a>
          {sched !== "予定どおり" && <span className="badge warn">{sched}</span>}
        </h3>
        <p className="place">{e.prefecture[0]}　{e.venue}{e.hours && `　${e.hours}`}</p>
        <p className="meta">
          <span className={`badge ${state}`}>{ENTRY_LABEL[state]}</span>
          {state === "open" && left !== null && <span className="left">締切まであと{left}日</span>}
          <span className="kind">{e.event?.kind[0]}</span>
        </p>
        <dl>
          {deadline ? (
            <><dt>サークル申込締切</dt><dd>{fmt(deadline)}{e.entryNote && ` ／ ${e.entryNote}`}</dd></>
          ) : e.entryNote ? (
            <><dt>サークル申込</dt><dd>{e.entryNote}</dd></>
          ) : null}
          {e.circleFee && <><dt>参加費</dt><dd>{e.circleFee}</dd></>}
          {e.admissionFee && <><dt>一般入場</dt><dd>{e.admissionFee}</dd></>}
        </dl>
      </div>
    </article>
  );
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const LANES = 4; // 1週に重ねて出せる段の数。高さを固定するため上限を決めておく

type Seg = { r: Row; kind: "event" | "deadline"; col: number; span: number; contL: boolean; contR: boolean; lane: number };

function CalendarView({ rows, today }: { rows: Row[]; today: Ymd }) {
  const [ym, setYm] = useState({ y: today.y, m: today.m });
  const lead = new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();

  // 6段×7列のマスに通し番号を振る（0〜41）。月の1日は lead 番目
  const idxOf = (d: Ymd) => lead + daysBetween({ y: ym.y, m: ym.m, d: 1 }, d);
  const monthFirst = lead;
  const monthLast = lead + daysInMonth - 1;

  // 開催（期間あり）と締切を、マスの範囲 [from, to] にする
  const items: { r: Row; kind: "event" | "deadline"; from: number; to: number; realFrom: number; realTo: number }[] = [];
  for (const r of rows) {
    const a = idxOf(r.start), b = idxOf(r.end ?? r.start);
    if (b >= monthFirst && a <= monthLast) {
      items.push({ r, kind: "event", from: Math.max(a, monthFirst), to: Math.min(b, monthLast), realFrom: a, realTo: b });
    }
    if (r.deadline && toNum(r.deadline) >= toNum(today)) {
      const c = idxOf(r.deadline);
      if (c >= monthFirst && c <= monthLast) items.push({ r, kind: "deadline", from: c, to: c, realFrom: c, realTo: c });
    }
  }

  // 週ごとに切り分けて、重ならない段（lane）に並べる。長いものから先に置く
  const weeks: { segs: Seg[]; hidden: number[] }[] = [];
  for (let w = 0; w < 6; w++) {
    const ws = w * 7, we = ws + 6;
    const parts = items
      .filter((it) => it.to >= ws && it.from <= we)
      .map((it) => {
        const from = Math.max(it.from, ws), to = Math.min(it.to, we);
        return { it, from, to };
      })
      .sort((x, y) => x.from - y.from || (y.to - y.from) - (x.to - x.from));
    const laneEnd: number[] = [];
    const segs: Seg[] = [];
    const hidden = Array(7).fill(0);
    for (const { it, from, to } of parts) {
      let lane = laneEnd.findIndex((end) => end < from);
      if (lane === -1) lane = laneEnd.length;
      if (lane >= LANES) {
        for (let c = from; c <= to; c++) hidden[c - ws]++;
        continue;
      }
      laneEnd[lane] = to;
      segs.push({
        r: it.r, kind: it.kind, col: from - ws, span: to - from + 1, lane,
        contL: from > it.realFrom, contR: to < it.realTo,
      });
    }
    weeks.push({ segs, hidden });
  }

  const move = (delta: number) => {
    const t = new Date(Date.UTC(ym.y, ym.m - 1 + delta, 1));
    setYm({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 });
  };

  return (
    <section className="cal">
      <div className="cal-head">
        <button onClick={() => move(-1)} aria-label="前の月">‹</button>
        <h2>{ym.y}年{ym.m}月</h2>
        <button onClick={() => move(1)} aria-label="次の月">›</button>
      </div>
      <div className="cal-wds">
        {WD.map((w, i) => <div key={w} className={`cal-wd ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>{w}</div>)}
      </div>
      {weeks.map(({ segs, hidden }, w) => (
        <div className="cal-week" key={w}>
          {Array.from({ length: 7 }, (_, c) => {
            const day = w * 7 + c - lead + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            const isToday = inMonth && ym.y === today.y && ym.m === today.m && day === today.d;
            return (
              <div key={c} className={`cal-day${inMonth ? "" : " blank"}${isToday ? " today" : ""}`} style={{ gridColumn: c + 1 }}>
                {inMonth && <span className="cal-d">{day}</span>}
                {hidden[c] > 0 && <span className="cal-more">他{hidden[c]}件</span>}
              </div>
            );
          })}
          {segs.map((s, j) => (
            <a
              key={j}
              href={s.r.e.pageUrl}
              rel="noopener"
              title={`${s.r.e.event?.name} ${s.r.e.label}`}
              className={`cal-bar ${s.kind}${s.kind === "event" ? ` k-${slugOf(s.r.e.event?.kind[0])}` : ""}${s.contL ? " contL" : ""}${s.contR ? " contR" : ""}`}
              style={{ gridColumn: `${s.col + 1} / span ${s.span}`, gridRow: s.lane + 2 }}
            >
              {s.kind === "deadline" ? "〆 " : ""}{s.r.e.event?.name} {s.r.e.label}
            </a>
          ))}
        </div>
      ))}
      <p className="cal-legend"><span className="cal-bar event k-comitia">開催（種類ごとの色）</span><span className="cal-bar deadline">〆 サークル申込締切</span></p>
    </section>
  );
}
