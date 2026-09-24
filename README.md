# Mico mico nekochan games

サークルサイト https://mcmcnkcn.github.io/ 。 Node.js 22の標準機能で静的HTMLを生成する。 npm installは不要。

## 開発・公開

```sh
npm test
python -m http.server 4178 --bind 127.0.0.1 --directory dist
```

http://127.0.0.1:4178/ で確認する。 `npm test` はビルドも実行する。 ビルドのみなら `npm run build`。

`main` へのpushでGitHub Actionsが検証し、`dist/` をGitHub Pagesへ公開する。 `dist/` は毎回作り直すため、直接編集しない。

## 編集場所

- `src/`: サイトの実装。 ゲーム情報・リンク・OGP設定は `src/games.js`
- `assets/`: ロゴ・画像・フォント・OGP画像
- `games/mcmcnkcn/play/`: モチネコ本体の配信用ビルド。 更新時に上書きされるため手編集しない

サイト用フォントは文字を絞ったwoff2。 原稿を追加した場合は、文字の不足によるフォールバック表示を確認する。

GA4は本番サイトで利用者の許可後だけ読み込む。 `page_view` を手動送信しているため、GA管理画面の拡張計測はオフにする。

## モチネコ本体の更新

Actionsの `Update Demo` をmainから実行し、`ref` にゲームリポジトリのbranch・tag・SHAを指定する。 ビルド・検証・取り込み・公開まで自動で行う。
