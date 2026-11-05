import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "microcms-js-sdk";
import type { Edition } from "@/types";

const FIELDS = [
  "id", "label", "startDate", "endDate", "hours", "prefecture", "venue", "pageUrl",
  "entryStart", "entryEnd", "entryNote", "circleFee", "admissionFee", "schedule",
  "event.id", "event.name", "event.kind", "event.officialUrl",
  "publishedAt", "event.publishedAt",
];

type Raw = Edition & { publishedAt?: string | null; event: (Edition["event"] & { publishedAt?: string | null }) | null };

export type Source = "API" | "スナップショット";

// 静的書き出し（output: export）なので、ビルド時に取る。microCMSを更新したらビルドし直す。
export async function getEditions(): Promise<{ contents: Edition[]; source: Source }> {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  if (serviceDomain && apiKey) {
    const client = createClient({ serviceDomain, apiKey });
    const raw = await client.getAllContents<Raw>({
      endpoint: "editions",
      queries: { fields: FIELDS, depth: 1, orders: "startDate" },
    });
    // このキーは「下書きコンテンツの全取得」も付いているので、一覧に下書きも入ってくる。
    // 一度も公開していない開催回と、イベントが公開されていない開催回は出さない。
    const contents: Edition[] = raw
      .filter((e) => e.publishedAt && e.event && e.event.publishedAt)
      .map(({ publishedAt: _p, event, ...rest }) => {
        const { publishedAt: _ep, ...ev } = event!;
        return { ...rest, event: ev };
      });
    return { contents, source: "API" };
  }

  // キーなしの試し表示用。MCPで取ったスナップショットを読む。本番ビルドでは使わない
  if (process.env.ALLOW_SNAPSHOT === "1") {
    const file = path.join(process.cwd(), "..", "site", "data", "editions.json");
    const data = JSON.parse(await readFile(file, "utf-8"));
    return { contents: data.contents as Edition[], source: "スナップショット" };
  }

  throw new Error("MICROCMS_SERVICE_DOMAIN と MICROCMS_API_KEY を .env.local に設定してください");
}
