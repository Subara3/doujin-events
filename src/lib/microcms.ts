import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "microcms-js-sdk";
import type { Edition } from "@/types";

const FIELDS = [
  "id", "label", "startDate", "endDate", "hours", "prefecture", "venue", "pageUrl",
  "entryStart", "entryEnd", "entryNote", "circleFee", "admissionFee", "schedule",
  "event.id", "event.name", "event.kind", "event.officialUrl",
];

export type Source = "API" | "スナップショット";

// 静的書き出し（output: export）なので、ビルド時に取る。microCMSを更新したらビルドし直す。
export async function getEditions(): Promise<{ contents: Edition[]; source: Source }> {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  if (serviceDomain && apiKey) {
    const client = createClient({ serviceDomain, apiKey });
    const contents = await client.getAllContents<Edition>({
      endpoint: "editions",
      queries: { fields: FIELDS, depth: 1, orders: "startDate" },
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
