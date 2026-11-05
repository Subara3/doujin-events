import EventList from "@/components/EventList";
import TipForm from "@/components/TipForm";
import { getEditions } from "@/lib/microcms";
import { todayJst } from "@/lib/dates";

export default async function Home() {
  const { contents, source } = await getEditions();
  const buildDate = todayJst();
  const editions = contents.filter((e) => e.event); // 参照先が非公開のものは出さない

  return (
    <>
      <header className="hero">
        <div className="hero-in">
          <p className="hero-kicker">同人誌即売会の日程と申込締切</p>
          <h1>一次創作イベント<br />ウォッチャー</h1>
          <p className="lead">
            一次創作（オリジナル作品）の同人誌即売会の、これからの開催とサークル申込の締切をまとめています。必ず各イベントの公式サイトで確かめてください。
          </p>
        </div>
      </header>
      <main>
        <EventList editions={editions} buildDate={buildDate} />
      </main>
      <footer>
        <TipForm />
        <p>最終更新 {buildDate.y}-{String(buildDate.m).padStart(2, "0")}-{String(buildDate.d).padStart(2, "0")}（データ: {source}）。内容は公式の発表から作っています。変更があれば公式が優先です。</p>
      </footer>
    </>
  );
}
