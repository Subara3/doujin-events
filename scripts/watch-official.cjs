// 公式サイトの変更を見張る。GitHub Actions で毎日動かす。
// 1. microCMS から公開中の開催回を取り、公式ページ（pageUrl）の一覧を作る
// 2. 各ページを取得して、本文の文字だけを取り出し、ハッシュを取る
// 3. 前回（data/official-hashes.json）と違えば Discord に知らせる
// 直すのは人とClaude（MCP）。ここでは知らせるだけにしている。
const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { createHash } = require("node:crypto");

const DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;
const KEY = process.env.MICROCMS_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL; // なければ通知せず結果を表示するだけ
const STATE = "data/official-hashes.json";

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  if (!DOMAIN || !KEY) throw new Error("MICROCMS_SERVICE_DOMAIN と MICROCMS_API_KEY が必要です");
  const url = `https://${DOMAIN}.microcms.io/api/v1/editions?limit=100&fields=id,label,pageUrl,startDate,endDate,event.name`;
  const res = await fetch(url, { headers: { "X-MICROCMS-API-KEY": KEY } });
  if (!res.ok) throw new Error(`microCMS ${res.status}`);
  const { contents } = await res.json();

  // 終わった開催は見張らない
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const pages = new Map(); // pageUrl -> 開催名の一覧
  for (const e of contents) {
    const last = new Date(new Date(e.endDate || e.startDate).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
    if (last < today) continue;
    const name = `${e.event ? e.event.name : ""} ${e.label}`;
    pages.set(e.pageUrl, [...(pages.get(e.pageUrl) || []), name]);
  }

  let prev = {};
  try { prev = JSON.parse(readFileSync(STATE, "utf8")); } catch { /* 初回 */ }
  const next = {};
  const changed = [];
  const failed = [];

  for (const [pageUrl, names] of pages) {
    try {
      const r = await fetch(pageUrl, { headers: { "User-Agent": "isshin-event-watcher (+https://events.subara3.com/)" } });
      if (!r.ok) throw new Error(String(r.status));
      const text = toText(await r.text());
      const hash = createHash("sha256").update(text).digest("hex");
      next[pageUrl] = { hash, checkedAt: today };
      if (prev[pageUrl] && prev[pageUrl].hash !== hash) changed.push({ pageUrl, names });
    } catch (err) {
      if (prev[pageUrl]) next[pageUrl] = prev[pageUrl];
      failed.push({ pageUrl, names, reason: String(err.message || err) });
    }
    await new Promise((s) => setTimeout(s, 1500)); // 相手のサイトに負担をかけないよう間を空ける
  }

  mkdirSync("data", { recursive: true });
  writeFileSync(STATE, JSON.stringify(next, null, 2) + "\n");

  const firstRun = Object.keys(prev).length === 0;
  console.log(`見張ったページ ${pages.size}件 / 変わった ${changed.length}件 / 取れなかった ${failed.length}件${firstRun ? "（初回なので記録だけ）" : ""}`);
  for (const c of changed) console.log("変更:", c.names.join("、"), c.pageUrl);
  for (const f of failed) console.log("失敗:", f.names.join("、"), f.pageUrl, f.reason);

  if (firstRun || !WEBHOOK || (changed.length === 0 && failed.length === 0)) return;

  const lines = ["【公式ページの変更】"];
  for (const c of changed) lines.push(`- ${c.names.join("、")}\n  <${c.pageUrl}>`);
  if (failed.length) {
    lines.push("【取得できなかったページ】");
    for (const f of failed) lines.push(`- ${f.names.join("、")}（${f.reason}）\n  <${f.pageUrl}>`);
  }
  lines.push("中身を確かめて、必要ならmicroCMSを直してください。");
  const content = lines.join("\n").slice(0, 1900);
  const d = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  if (!d.ok) throw new Error(`Discord ${d.status}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
