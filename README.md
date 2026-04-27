# mcmcnkcn.github.io

## demo更新

`/demo` は `mcmcnkcn` リポジトリの `build:demo` 出力を取り込んで更新する
サイト本体の公開は GitHub Pages の GitHub Actions deploy workflow で行う

### 前提

- GitHub App を作成し、`mcmcnkcn` リポジトリへ install する
- App の repository permission は `Contents: Read-only` だけ付与する
- `mcmcnkcn.github.io` の Actions secrets に次を登録する
  - `MCMCNKCN_APP_ID`
  - `MCMCNKCN_APP_PRIVATE_KEY`

### 実行方法

1. `mcmcnkcn.github.io` の Actions から `Update Demo` を手動実行する
2. `ref` に `mcmcnkcn` 側の branch / tag / sha を指定する
3. workflow が `mcmcnkcn` を checkout して `npm ci` / `npm run build:demo` を実行する
4. `source/dist/mcmcnkcn/browser` の中身で `/demo` を全置換して push する

### 補足

- `/demo` 直下への手編集は次回更新時に上書きされる
- demo の配信知識は `mcmcnkcn.github.io` 側にだけ置き、本家 `mcmcnkcn` には deploy 手順を持ち込まない
