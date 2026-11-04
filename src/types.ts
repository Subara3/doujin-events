// microCMSの API スキーマ（events / editions）に合わせた型。
// fields で取る項目だけを書いている。

export type EventRef = {
  id: string;
  name: string;
  kind: string[];
  officialUrl: string;
};

export type Edition = {
  id: string;
  label: string;
  startDate: string;
  endDate?: string;
  hours?: string;
  prefecture: string[];
  venue: string;
  pageUrl: string;
  entryStart?: string;
  entryEnd?: string;
  entryNote?: string;
  circleFee?: string;
  admissionFee?: string;
  schedule: string[];
  // 参照先が非公開・削除だと null になる
  event: EventRef | null;
};
