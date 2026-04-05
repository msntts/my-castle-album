# Ubiquitous Language — My Castle Album

このドキュメントはプロジェクト全体で使う共通言語を定義する。
コード（クラス名・変数名・関数名）、UI テキスト、会話すべてでこの用語を一貫して使うこと。

---

## コアエンティティ

### 城 / Castle
ユーザーが訪問したことのある日本の城。地図上にピンとして表示される。

| 属性 | 英語名 | 型 | 説明 |
|------|--------|----|------|
| 城ID | `castleId` | `string` (UUID) | 城を一意に識別するID |
| 城名 | `name` | `string` | 城の名前（例：「姫路城」） |
| 所在地 | `location` | `Location` | 緯度・経度 |
| 訪問日 | `visitedAt` | `Date` | 初回訪問日 |
| Google Place ID | `placeId` | `string \| undefined` | Google Maps の Place ID（検索経由で追加した場合） |

### 写真 / Photo
城に紐付くユーザーがアップロードした写真。

| 属性 | 英語名 | 型 | 説明 |
|------|--------|----|------|
| 写真ID | `photoId` | `string` (UUID) | 写真を一意に識別するID |
| 城ID | `castleId` | `string` | 紐付く城のID |
| データURL | `dataUrl` | `string` | Base64エンコードされた画像データ（localStorage用） |
| 撮影日 | `capturedAt` | `Date \| undefined` | 写真の撮影日（任意） |
| 説明 | `caption` | `string \| undefined` | 写真の説明（任意） |

---

## 値オブジェクト

### 所在地 / Location
城の地理的位置。

| 属性 | 英語名 | 型 |
|------|--------|----|
| 緯度 | `latitude` | `number` |
| 経度 | `longitude` | `number` |

---

## ドメインサービス・ユースケース

| 日本語 | 英語名 | 説明 |
|--------|--------|------|
| 城を登録する | `registerCastle` | 地図上に新しい城のピンを追加する |
| 城を取得する | `getCastle` / `listCastles` | 登録済みの城を取得する |
| 写真をアップロードする | `uploadPhoto` | 城に写真を追加する |
| 写真を取得する | `listPhotos` | 城に紐付く写真一覧を取得する |

---

## UI 用語

| 日本語 | 英語名 | 説明 |
|--------|--------|------|
| ピン | `pin` / `CastlePin` | 地図上の城マーカー |
| 城詳細 | `CastleDetail` | ピンをクリックして開く城情報・写真パネル |
| 閲覧モード | `ViewMode` | ピン・写真を閲覧するパブリックモード |
| 管理モード | `AdminMode` | 城・写真を追加・編集できるモード |
| アルバム | `album` | 城ごとの写真コレクション |

---

## 境界づけられたコンテキスト（Bounded Context）

```
[ 城コンテキスト ]       [ 写真コンテキスト ]
  Castle                   Photo
  Location                 dataUrl
  CastleRepository         PhotoRepository
         ↕                        ↕
  [ インフラ層: localStorage / AWS（将来） ]
```

現時点では単一フロントエンドアプリとして実装するが、
将来のバックエンド分離を見越してリポジトリインターフェースで境界を明確にする。
