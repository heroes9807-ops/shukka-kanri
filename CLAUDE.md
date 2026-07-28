# 商品回収スケジュール管理アプリ - 引き継ぎメモ

## プロジェクト概要
商品回収のスケジュール作成・管理を行うWebアプリ（将来的にデスクトップアプリ化）。
初めてのソフト開発。Phase 1〜5のロードマップで段階的に進行中。

- プロジェクトパス: `/Users/hiroosasaki/shukka-kanri`
- スタック: React + TypeScript（Vite）、UI: Stitches（Phase 2で導入予定）
- 将来: Google Maps API（Phase 3）、Tauri/Electron（Phase 5）

## 全体ロードマップ
1. [完了] Phase 1: データ構造・設計の策定
2. [進行中] Phase 2: 基本UIコンポーネント実装（Stitches使用）
3. [未着手] Phase 3: Google Maps API & ルート最適化ロジック
4. [未着手] Phase 4: スマホGoogleマップ連携（方式B）& CSV出力
5. [未着手] Phase 5: デスクトップアプリ化（Tauri/Electron）

## Phase 1で確定した設計方針（要件ヒアリング結果）
- 回収先の指定時間: **時間範囲**で管理（`timeWindowStart` / `timeWindowEnd`、"HH:mm"形式）
- 荷物量: **自由入力テキスト**で管理（`cargoNote`。個数・重量ではなくメモ的記載）
- 運用期間: **単日のみ**（複数日保存の仕組みは持たない。`DailySchedule.date`は保存時のみ付与）
- 割り振り: 1つの回収先の担当ドライバーは**1人**（`assignedDriverId`は単一ID、分割不可）
- 回収先: 1人あたり約5件、ドライバー2〜3人（合計10〜15件程度）

## 型定義（Phase 1成果物）
`types.ts` に以下を定義済み：
- `CollectionPoint`（回収先: 住所、時間範囲、荷物メモ、緯度経度、割当ドライバーID、訪問順）
- `Driver`（ドライバー: 名前、出発地/帰着地の住所・緯度経度）
- `DailySchedule`（1日分: 日付、ドライバー配列、回収先配列、ルート結果配列）
- `RouteResult`（Phase 3で生成: ドライバーごとの最適化済み訪問順、距離、所要時間、ナビURL）
- `ScreenView`（"list" | "assign" | "timeline" | "map" の4画面切り替え用）

※ 実際のコード内容は `/mnt/user-data/outputs/types.ts` を参照（このメモと同時に共有済み）。
プロジェクト作成後は `src/types.ts` としてこの内容をそのまま配置する想定。

## 画面構成案（Phase 1成果物）
1. **回収先リスト登録・編集画面**（list）: 一覧テーブル＋新規追加フォーム
2. **ドライバー配車管理画面**（assign）: 未割当一覧 ⇄ ドライバー別カラムへの割当（自動割当ボタンはPhase 3で実装）
3. **タイムライン/スケジュール表示画面**（timeline）: ドライバーごとの時間軸バー表示、時間外警告
4. **ルート地図表示画面**（map）: Phase 3以降で本格実装。現時点はプレースホルダー画面のみ

## 現在の環境状態（Phase 2着手時点）
- Node.js: `v26.0.0` インストール済み（確認済み）
- Viteプロジェクト作成コマンド実行済み:
  ```
  npm create vite@latest shukka-kanri -- --template react-ts
  ```
- 選択したオプション: Linter = **ESLint**、Install with npm and start now = **Yes**
- 作成先: `/Users/hiroosasaki/shukka-kanri`
- 依存パッケージのインストールが進行中だった（`npm install`実行中、完了確認は未報告）

## 次にやるべきこと（Phase 2再開時）
1. `npm install` が完了し `npm run dev` でVite初期画面が表示されることを確認
2. `src/types.ts` に上記の型定義（`types.ts`の内容）を配置
3. `@stitches/react` をインストール
4. 回収先リスト登録・編集画面（画面①）から実装開始

## 開発者について（重要な作業スタイル）
- プログラミング完全初心者。専門用語を使う場合は、操作手順を画面操作レベルで具体的に説明すること
- コマンドは1行ずつ、コピペ可能な形で提示すること
- エラー画面が出た場合は、その文字列をそのまま貼ってもらい対応する運用

## 【重要】既存プロジェクトの発見について（未解決の分岐点）

このチャットでPhase 1から新規に環境構築（`~/shukka-kanri`にVite+React+TSでプロジェクト作成）を進めていたところ、
`mdfind`によるMac全体検索で、以下の**別の場所に既存プロジェクトのビルド成果物**が見つかった。

- `/Users/hiroosasaki/Claude/shukka-kanri/src-tauri/target/release/bundle/dmg/shukka-kanri_0.1.0_aarch64.dmg`
- 同ディレクトリに `.dmg.zip` も存在
- デスクトップにも `shukka-kanri_0.1.0_aarch64.dmg.zip` が置かれている
- `~/Library/WebKit/com.hiroosasaki.shukkakanri`（アプリを一度起動した形跡あり）

`src-tauri`ディレクトリの存在から、**Tauriによるデスクトップアプリ化（ロードマップのPhase 5相当）まで
一度完了している可能性が高い**。ただし、これがこのユーザーの意図した完成形と一致するか、
中身がロードマップの要件（回収先リスト、配車、ルート最適化、方式Bのナビ連携、CSV出力等）を
満たしているかは未確認。

**この件はユーザーとの間でまだ結論が出ていない未解決事項。** ゼロから作り直すべきか、
既存の `/Users/hiroosasaki/Claude/shukka-kanri` を土台にするべきかは、Claude Code側で
最初に必ず確認すること。

### Claude Codeが最初にやるべきこと
1. `/Users/hiroosasaki/Claude/shukka-kanri` の中身を確認する
   - `package.json` の内容（依存関係、スクリプト）
   - `src/` 配下の実装状況（画面・コンポーネントの有無）
   - `src-tauri/` の設定内容
   - このロードマップ（Phase 1〜5）のうち、どこまで実装されているか
2. 確認結果をユーザーに日本語・非エンジニア向けの分かりやすい言葉で報告する
3. 「このプロジェクトを土台に続ける」か「新規に作り直す」かをユーザーに確認してから作業を進める
   （ユーザーに無断でどちらかに決めて進めないこと）
4. なお `~/shukka-kanri`（このチャットで新規作成した方。空のVite雛形のみで、
   まだ`types.ts`も未配置）は、比較のため残しておいて構わないが、
   `/Users/hiroosasaki/Claude/shukka-kanri` と混同しないよう注意すること
