import type { NextConfig } from "next";

// ロリポップ（静的ホスティング）に置くので、ビルド時にHTMLへ書き出す。
// microCMSのデータはビルド時に取得し、APIキーはブラウザへ出さない。
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
