# KomeFlow – Live Comment Overlay

KomeFlowは、YouTubeのライブチャットとチャットリプレイのコメントを動画の上に直接表示するChrome拡張機能です。コメントを右から左へ流すことも、画面上に固定表示することもできます。

> KomeFlowは独立して開発されたものであり、Google LLCおよびYouTubeとは提携しておらず、承認や後援も受けていません。

## 機能

- 流れる表示、左側固定、中央固定のコメント表示モード
- 表示数、文字サイズ、速度、表示範囲、縁取り、透明度の調整
- ライブ配信を開いている間に取得したコメントを巻き戻し位置に合わせて再表示する、任意のDVRタイムシフト同期
- 設定とDVRバッファは端末内にのみ保存
- 日本語、英語、韓国語、中国語（簡体字・繁体字）のUI
- YouTubeのSPA遷移と全画面表示に対応したオーバーレイ

## プライバシー

KomeFlowは開発者のサーバーを運用しておらず、ユーザーデータを販売したり、開発者や第三者へ送信したりすることはありません。

任意のDVR機能は、動画ID、チャット本文、メッセージID、スーパーチャットかどうか、再生位置、受信時刻を拡張機能専用のIndexedDBに保存します。初期状態では無効で、明示的な同意が必要です。保存件数の上限は50,000件で、6時間を過ぎた記録は次にバッファへアクセスしたときに削除されます。ポップアップからDVRを無効化し、保存したコメントを削除できます。

詳しくは[PRIVACY.md](PRIVACY.md)をご覧ください。

## ローカルへのインストール

1. `chrome://extensions/` を開きます。
2. **デベロッパー モード**をオンにします。
3. **パッケージ化されていない拡張機能を読み込む**を選びます。
4. このリポジトリのフォルダを選択します。
5. 拡張機能を再読み込みした後は、開いているYouTubeのタブも再読み込みしてください。

## 公開用パッケージの作成

次のコマンドを実行します。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package.ps1
```

ChromeウェブストアにアップロードするZIPは `release/` に出力されます。ストア掲載用の画像は `store-assets/` にあります。

## テスト

```powershell
node tests/lifecycle.test.cjs
```

## 対応ページ

- `https://www.youtube.com/*` で起動し、ホームや検索結果からのSPA遷移を検知します
- コメントの表示とチャットの取得は `https://www.youtube.com/watch*` と `https://www.youtube.com/live/*` でのみ行います
- これらのページが使用するYouTubeのライブチャットおよびチャットリプレイのフレーム

## サポート

不具合の報告や機能の要望は、リポジトリの[GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues)にお寄せください。

## ライセンス

Copyright © 2026 ojoko. All rights reserved. 事前の書面による許可なく、複製、改変、再配布、再販売、二次的著作物の作成を行うことを禁じます。詳しくは[LICENSE](LICENSE)をご覧ください。
