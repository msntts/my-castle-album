# Ubiquitous Language — My Castle Album

このドキュメントはプロジェクト全体で使う共通言語を定義する。
コード（クラス名・変数名・関数名）、UI テキスト、会話すべてでこの用語を一貫して使うこと。

---

## コアエンティティ

### 城 / Castle（集約ルート）
ユーザーが訪問したことのある日本の城。地図上にピンとして表示される。
`Photo[]` を集約内に持つ。

| 属性 | 英語名 | 型 | 説明 |
|------|--------|----|------|
| 城ID | `castleId` | `CastleId` (string) | 城を一意に識別するID |
| 城名 | `name` | `string` | 城の名前（例：「姫路城」） |
| 所在地 | `location` | `Location` | 緯度・経度 |
| 写真一覧 | `photos` | `Photo[]` | この城に紐付く写真メタデータ |

### 写真 / Photo（Castle集約内）
城に紐付くユーザーがアップロードした写真のメタデータ。
**画像データ（バイナリ・URL）は持たない。** 画像はインフラ層の `ImageStorage` が管理する。

| 属性 | 英語名 | 型 | 説明 |
|------|--------|----|------|
| 写真ID | `photoId` | `PhotoId` (string) | 写真を一意に識別するID |
| 城ID | `castleId` | `CastleId` | 紐付く城のID |
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

## インフラインターフェース（ドメインが定義、インフラが実装）

### ImageStorage
画像データの保存・取得を抽象化するインターフェース。
ドメインは「画像への参照が取れる」という事実だけを知る。実装はlocalStorage（Base64）でもS3でも差し替え可能。

| メソッド | シグネチャ | 説明 |
|---------|-----------|------|
| 保存 | `save(photoId, file)` | 画像ファイルを保存する |
| URL取得 | `getUrl(photoId)` | 画像の表示用URLを返す（Base64 data URL または S3 URL） |
| 削除 | `delete(photoId)` | 画像を削除する |

---

## リポジトリ（ドメインが定義、インフラが実装）

### CastleRepository
Castle集約の永続化を担う唯一のリポジトリ。Photoは Castle を通じて管理される。

| メソッド | 説明 |
|---------|------|
| `findAll()` | 全城一覧（photos含む） |
| `findById(castleId)` | 城IDで1件取得（photos含む） |
| `save(castle)` | 城を保存（新規・更新） |
| `delete(castleId)` | 城を削除 |

---

## ビュー（表示用データ）

### PhotoView
表示時に `Photo`（メタデータ）と `ImageStorage.getUrl()` を組み合わせて作る読み取り専用の構造。ドメインモデルではない。

| 属性 | 説明 |
|------|------|
| `photo` | `Photo`（メタデータ） |
| `imageUrl` | `ImageStorage.getUrl()` の戻り値 |

---

## UI 用語

| 日本語 | 英語名 | 説明 |
|--------|--------|------|
| ピン | `CastlePin` | 地図上の城マーカー |
| 城詳細 | `CastleDetail` | ピンをクリックして開く城情報・写真パネル |
| 閲覧モード | `ViewMode` | ピン・写真を閲覧するパブリックモード |
| 管理モード | `AdminMode` | 城・写真を追加できるモード |
| アルバム | `album` | 城ごとの写真コレクション |

---

## 境界づけられたコンテキスト（Bounded Context）

```
[ 城コンテキスト（Castle集約） ]
  Castle
    └── photos: Photo[]   ← メタデータのみ
  Location
  CastleRepository

[ 画像コンテキスト（インフラ） ]
  ImageStorage
    ← LocalStorageImageStorage（Base64）
    ← S3ImageStorage（将来）
```

Castle集約がメタデータを持ち、画像データはImageStorageが管理する。
ビュー層でこの2つを結合してPhotoViewを生成する。
