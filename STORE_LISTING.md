# Chromeウェブストア掲載文

## ダッシュボードの入力項目

各項目は日本語訳を上に、ダッシュボードへ英語で入力する場合の原文を「英語原文」として下に記載しています。

**カテゴリ：** ユーザー補助 または ツール

**単一用途**

> YouTubeのライブチャットとチャットリプレイのコメントを、設定可能なオーバーレイとして動画上に表示します。端末内に保存する任意のDVRタイムシフト同期を含みます。

英語原文: Display YouTube live chat and chat replay comments as configurable on-video overlays, including optional locally stored DVR time-shift synchronization.

**権限が必要な理由 — storage**

> ユーザーの表示設定と、DVRに対する明示的な同意の状態を保存します。任意のDVRコメント記録は、拡張機能専用のIndexedDBに別途保存します。

英語原文: Stores the user’s visual preferences and explicit DVR consent choice. Optional DVR comment records are stored separately in extension-scoped IndexedDB.

**権限が必要な理由 — youtube.com**

> YouTubeのチャットフレーム内のライブチャットを読み取り、対応する視聴ページとライブページでユーザーに見えるコメントのオーバーレイを描画するために必要です。

英語原文: Required to read live-chat content in YouTube’s chat frames and render the user-visible comment overlay on supported watch and live pages.

**リモートコード**

> いいえ。KomeFlowはリモートコードをダウンロードも実行もしません。

英語原文: No. KomeFlow does not download or execute remote code.

**データの開示**

- ウェブサイトのコンテンツ：オーバーレイに必要なYouTubeの動画IDとライブチャットの本文。
- ユーザー生成コンテンツ：YouTubeのライブチャットから処理するチャット本文とメッセージID。
- 端末内への保存のみ：任意のDVR記録は、明示的にオプトインした後にのみ保存。
- 販売、広告利用、開発者によるアクセス、第三者への転送は行わない。
- 保存期間：DVR記録は最大50,000件。6時間を過ぎた記録は、次にバッファへアクセスしたときに削除。

英語原文:

- Website content: YouTube video IDs and live-chat message text required for the overlay.
- User-generated content: chat text and message identifiers processed from YouTube live chat.
- Local storage only: optional DVR records are stored only after explicit opt-in.
- No sale, advertising use, developer access, or third-party transfer.
- Retention: maximum 50,000 DVR records; records older than six hours are deleted on the next buffer access.

**プライバシーポリシーのURL（このリポジトリをプッシュした後）**

> https://github.com/ojoko/YouTubeChatLive/blob/master/PRIVACY.md

**ホームページ**

> https://github.com/ojoko/YouTubeChatLive

**サポート**

> https://github.com/ojoko/YouTubeChatLive/issues

## 各言語の掲載文

以下はストアの各言語の掲載欄にそのまま入力する文面のため、各言語のまま記載しています。

## English

### Short description

Overlay YouTube live chat and replay comments on videos with flowing or fixed modes and optional local DVR synchronization.

### Detailed description

Bring live chat onto the video with KomeFlow.

Choose a right-to-left flowing overlay, a left-fixed stream, or a centered fixed display. Adjust the number of comments, font size, speed, display area, outline, and opacity from a compact popup.

Optional DVR time-shift sync can replay comments collected while a live stream is open at the moment they originally appeared. DVR storage is disabled by default and requires explicit consent. Data is kept locally for up to six hours and is never sent to the developer or third parties.

Supported interface languages: English, Japanese, Korean, Simplified Chinese, and Traditional Chinese.

KomeFlow is independently developed and is not affiliated with, endorsed by, or sponsored by Google LLC or YouTube.

## 日本語

### 短い説明

YouTubeのライブチャットやチャットリプレイを、流れる／固定表示のコメントとして動画上に重ねる拡張機能です。

### 詳細説明

KomeFlowは、YouTubeのライブチャットを動画上へ直接表示します。

右から左へ流す弾幕表示、左側固定、中央固定から選択でき、表示数、文字サイズ、速度、表示範囲、縁取り、透明度を調整できます。

任意のDVRタイムシフト同期を有効にすると、ライブ配信を開いている間に取得したコメントを、巻き戻し再生のタイミングに合わせて再表示できます。DVR保存は初期状態で無効であり、明示的な同意後にのみ有効になります。データは最大6時間端末内に保存され、開発者や第三者へ送信されません。

日本語、英語、韓国語、中国語（簡体字・繁体字）に対応しています。

KomeFlowは独立開発の拡張機能であり、Google LLCまたはYouTubeの公式製品ではありません。

## 한국어

### 짧은 설명

YouTube 라이브 채팅과 채팅 다시보기 댓글을 흐르거나 고정된 오버레이로 동영상 위에 표시합니다.

### 자세한 설명

KomeFlow는 YouTube 라이브 채팅을 동영상 위에 직접 표시합니다. 오른쪽에서 왼쪽으로 흐르는 모드, 왼쪽 고정, 중앙 고정을 선택하고 댓글 수, 글자 크기, 속도, 표시 영역, 외곽선과 불투명도를 조절할 수 있습니다.

선택 사항인 DVR 타임시프트 동기화는 라이브 방송을 열어 둔 동안 수집된 댓글을 원래 나타난 재생 시점에 다시 표시합니다. DVR 저장은 기본적으로 꺼져 있으며 명시적인 동의 후에만 활성화됩니다. 데이터는 기기에 최대 6시간 보관되며 개발자나 제3자에게 전송되지 않습니다.

KomeFlow는 독립적으로 개발되었으며 Google LLC 또는 YouTube의 공식 제품이 아닙니다.

## 简体中文

### 简短说明

将 YouTube 直播聊天和聊天回放以滚动或固定评论浮层显示在视频上。

### 详细说明

KomeFlow 可将 YouTube 直播聊天直接显示在视频画面上。支持从右向左滚动、左侧固定和画面中央固定，并可调整评论数量、字体大小、速度、显示区域、描边和不透明度。

可选的 DVR 时移同步功能可以按照原始播放时间，重新显示在直播打开期间收集的评论。DVR 默认关闭，只有在用户明确同意后才会启用。数据仅在设备本地保存最多六小时，不会发送给开发者或第三方。

KomeFlow 为独立开发，并非 Google LLC 或 YouTube 的官方产品。

## 繁體中文

### 簡短說明

將 YouTube 直播聊天室與聊天室重播以捲動或固定留言浮層顯示在影片上。

### 詳細說明

KomeFlow 可將 YouTube 直播聊天室直接顯示在影片畫面上。支援從右向左捲動、左側固定與畫面中央固定，並可調整留言數量、字型大小、速度、顯示範圍、描邊與不透明度。

選用的 DVR 時移同步功能可依照原始播放時間，重新顯示在直播開啟期間收集的留言。DVR 預設關閉，只有在使用者明確同意後才會啟用。資料僅在裝置本機保存最多六小時，不會傳送給開發者或第三方。

KomeFlow 為獨立開發，並非 Google LLC 或 YouTube 的官方產品。
