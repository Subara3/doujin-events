// 公式ページの文字から、開催の中身にかかわる値（日付・時刻・料金・会場）だけを取り出す。
// ページ全体の文字を比べると、お知らせ欄やおすすめ欄が動くだけで「変わった」になるため、
// 「開催」「締切」「入場料」「会場」などの語のすぐあとにある値だけを見る。
const KEYS = [
  "開催日", "開催日時", "日時", "日程", "会期", "開催",
  "締切", "〆切", "締め切り", "受付期間", "申込期間", "申込締切", "申し込み", "申込", "募集期間",
  "入場料", "入場", "参加費", "出展料", "出店料", "サークル参加費", "スペース代", "参加料",
  "会場", "場所",
];
const NEAR = 60; // 語のあと、この文字数までを見る

const DATE = /(\d{4})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?|(\d{1,2})\s*月\s*(\d{1,2})\s*日|(?<![\d.])(\d{1,2})\/(\d{1,2})(?![\d/])/g;
const TIME = /(\d{1,2})[:：](\d{2})/g;
const YEN = /(予価)?\s*([\d,]+)\s*円/g;
const VENUE = /会場\s*[:：]\s*([^\s、。,，｜|（(＜<]{2,30})/g; // 「会場：〇〇」の形だけ。括弧の補足は外す

function norm(s) {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/：/g, ":");
}

function factsOf(text) {
  const t = norm(text);
  const out = new Set();
  const keyRe = new RegExp(KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  for (const m of t.matchAll(keyRe)) {
    const win = t.slice(m.index, m.index + m[0].length + NEAR);
    for (const d of win.matchAll(DATE)) {
      if (d[1]) out.add(`日付 ${d[1]}-${+d[2]}-${+d[3]}`);
      else if (d[4]) out.add(`日付 ${+d[4]}-${+d[5]}`);
      else out.add(`日付 ${+d[6]}-${+d[7]}`);
    }
    for (const h of win.matchAll(TIME)) out.add(`時刻 ${+h[1]}:${h[2]}`);
    for (const y of win.matchAll(YEN)) out.add(`料金 ${y[1] ? "予価" : ""}${y[2].replace(/,/g, "")}円`);
  }
  for (const v of t.matchAll(VENUE)) out.add(`会場 ${v[1]}`);
  return [...out].sort();
}

module.exports = { factsOf };
