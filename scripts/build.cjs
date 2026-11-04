// microCMSの最新データでビルドするためのスクリプト。
// 前回ビルドのキャッシュ（.next）が残っていると、microCMSで足した開催が反映されなかったため、毎回消してからビルドする。
// .mjs にすると、日本語を含むパスで Node が落ちたので CommonJS にしている。
const { spawnSync } = require("node:child_process");

// fs.rmSync で .next を消すと Node が落ちた（Windows）ので、OSのコマンドで消す
if (process.platform === "win32") spawnSync("cmd", ["/c", "if exist .next rmdir /s /q .next"], { stdio: "ignore" });
else spawnSync("rm", ["-rf", ".next"], { stdio: "ignore" });
const r = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { encoding: "utf8" });
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
if (r.error) console.error(r.error);
process.exit(r.status === null ? 1 : r.status);