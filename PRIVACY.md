# KomeFlow Privacy Policy

Effective date: July 29, 2026

Languages: [English](#english) · [日本語](#日本語) · [한국어](#한국어) · [简体中文](#简体中文) · [繁體中文](#繁體中文)

## English

### Overview

KomeFlow is a browser extension that displays YouTube live chat and chat replay comments over videos. KomeFlow has no developer-operated server. It does not sell user data, use it for advertising, or transmit it to the developer or third parties.

### Data processed

KomeFlow processes the current YouTube video ID and chat content required to display the overlay. Display settings and the DVR consent flag are stored in `chrome.storage.local`.

The optional DVR time-shift feature is disabled by default. If a user explicitly enables it, KomeFlow stores the following in extension-scoped IndexedDB:

- YouTube video ID
- Chat message text
- YouTube message ID or an opaque locally generated fallback ID
- Whether the message is a Super Chat
- Playback position
- Reception timestamp

The extension does not intentionally collect account credentials, cookies, email addresses, or payment details.

### Purpose, retention, and deletion

This data is used only to display comments and replay locally collected comments at their original live-stream timing. The DVR buffer is limited to 50,000 records. Records older than six hours are deleted the next time the buffer is saved or loaded. Users can disable DVR and delete all buffered comments at any time from the extension popup.

### Sharing and transmission

KomeFlow does not transmit stored settings or DVR records to the developer or third parties. It communicates only between its own extension components and YouTube pages already opened by the user. YouTube’s own pages and live-chat frames remain subject to YouTube’s privacy policy.

### Permissions

- `storage`: saves display settings and the user’s DVR consent choice.
- Access to `youtube.com`: reads visible live-chat content and places the comment overlay on supported YouTube video pages.

KomeFlow does not execute remotely hosted code.

### Limited Use

KomeFlow’s use of information received from Google services adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide or improve KomeFlow’s disclosed single purpose.

### Changes and contact

Material changes to data handling will be disclosed before they take effect. Questions can be submitted through [GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues).

## 日本語

KomeFlowは、YouTubeのライブチャットおよびチャットリプレイを動画上に表示する拡張機能です。開発者が運営するサーバーはなく、ユーザーデータの販売、広告利用、開発者または第三者への送信は行いません。

表示設定とDVR同意状態は`chrome.storage.local`に保存されます。初期状態で無効なDVRタイムシフト機能を利用者が明示的に有効化した場合に限り、動画ID、チャット本文、メッセージIDまたは匿名化した代替ID、Super Chat判定、再生位置、受信時刻を拡張機能専用IndexedDBへ保存します。

保存件数は最大50,000件です。6時間を超えたデータは、次回の保存または読み込み時に削除されます。ポップアップからDVRを無効化し、保存済みコメントをすべて削除できます。認証情報、Cookie、メールアドレス、決済情報を意図的に収集することはありません。

権限は表示設定を保存する`storage`と、対応するYouTubeページ上でチャットを読み取りオーバーレイを表示するための`youtube.com`アクセスだけに使用します。リモートコードは実行しません。Googleサービスから受け取る情報の使用は、Limited Use要件を含むChromeウェブストアのユーザーデータポリシーに従います。

データ取扱いに重要な変更がある場合は、適用前に告知します。お問い合わせは[GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues)へお願いします。
## 한국어

KomeFlow는 YouTube 라이브 채팅과 채팅 다시보기를 동영상 위에 표시합니다. 개발자가 운영하는 서버가 없으며 사용자 데이터를 판매하거나 광고에 이용하거나 개발자 또는 제3자에게 전송하지 않습니다.

표시 설정과 DVR 동의 상태는 `chrome.storage.local`에 저장됩니다. 기본적으로 꺼져 있는 DVR 기능을 사용자가 명시적으로 활성화한 경우에만 동영상 ID, 채팅 내용, 메시지 ID 또는 불투명한 대체 ID, Super Chat 여부, 재생 위치와 수신 시각을 확장 프로그램 전용 IndexedDB에 저장합니다.

버퍼는 최대 50,000개이며 6시간이 지난 기록은 다음 저장 또는 불러오기 시 삭제됩니다. 팝업에서 DVR을 끄고 저장된 댓글을 모두 삭제할 수 있습니다. 계정 인증 정보, 쿠키, 이메일 주소 또는 결제 정보는 의도적으로 수집하지 않습니다. 원격 코드를 실행하지 않으며 Chrome 웹 스토어 사용자 데이터 정책과 Limited Use 요구사항을 준수합니다.

문의는 [GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues)를 이용해 주세요.

## 简体中文

KomeFlow 用于在视频上显示 YouTube 直播聊天和聊天回放。KomeFlow 没有开发者运营的服务器，不出售用户数据，不将其用于广告，也不会将数据发送给开发者或第三方。

显示设置和 DVR 同意状态保存在 `chrome.storage.local`。只有用户明确启用默认关闭的 DVR 功能后，扩展程序才会在专用 IndexedDB 中保存视频 ID、聊天文本、消息 ID 或不透明的备用 ID、Super Chat 状态、播放位置和接收时间。

缓冲区最多保存 50,000 条记录。超过六小时的记录会在下次保存或加载缓冲区时删除。用户可以在弹出窗口中关闭 DVR 并删除全部已保存评论。扩展程序不会故意收集登录凭据、Cookie、电子邮件地址或支付信息，不执行远程代码，并遵守 Chrome 网上应用店用户数据政策及 Limited Use 要求。

如有问题，请通过 [GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues) 联系。

## 繁體中文

KomeFlow 用於在影片上顯示 YouTube 直播聊天室與聊天室重播。KomeFlow 沒有由開發者營運的伺服器，不販售使用者資料、不將資料用於廣告，也不會將資料傳送給開發者或第三方。

顯示設定與 DVR 同意狀態會儲存在 `chrome.storage.local`。只有使用者明確啟用預設關閉的 DVR 功能後，擴充功能才會在專用 IndexedDB 中儲存影片 ID、聊天室文字、訊息 ID 或不透明的替代 ID、Super Chat 狀態、播放位置與接收時間。

緩衝區最多保存50,000筆記錄。超過六小時的記錄會在下次儲存或載入緩衝區時刪除。使用者可以在彈出視窗中關閉 DVR 並刪除全部已儲存留言。擴充功能不會刻意收集登入憑證、Cookie、電子郵件地址或付款資訊，不執行遠端程式碼，並遵守 Chrome 線上應用程式商店使用者資料政策及 Limited Use 要求。

如有問題，請透過 [GitHub Issues](https://github.com/ojoko/YouTubeChatLive/issues) 聯絡。
