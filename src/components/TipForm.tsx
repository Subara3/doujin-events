"use client";

import { useState, type FormEvent } from "react";

// フッターの「お問い合わせ」を押したときだけ開くフォーム。送り先はサーバー側の tip.php（Discordへ転送）。
export default function TipForm() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    try {
      const res = await fetch("tip.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      setMessage(json.message ?? "");
      if (res.ok) {
        setState("done");
        form.reset();
      } else {
        setState("error");
      }
    } catch {
      setMessage("送れませんでした。時間をおいてもう一度お願いします");
      setState("error");
    }
  }

  return (
    <div className="contact">
      <button type="button" className="textlink" aria-expanded={open} onClick={() => setOpen(!open)}>
        お問い合わせ
      </button>
      {open && (
        <form onSubmit={onSubmit}>
          <label>
            内容（必須）
            <textarea name="memo" required maxLength={1000} rows={4} />
          </label>
          <label>
            URL
            <input name="url" type="url" maxLength={300} placeholder="https://" />
          </label>
          {/* ボット避け。人には見えない */}
          <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
          <button type="submit" disabled={state === "sending"}>
            {state === "sending" ? "送信中…" : "送信"}
          </button>
          {message && <p className={state === "error" ? "msg error" : "msg"}>{message}</p>}
        </form>
      )}
    </div>
  );
}
