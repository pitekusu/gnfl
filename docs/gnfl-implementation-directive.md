---
title: CYCLE 6 実装指示書
aliases:
  - GNFL Implementation Directive
  - 再処理工程ゲーム 実装指示書
tags:
  - gnfl
  - game-development
  - codex
  - grok-build
  - typescript
  - react
  - phaser
  - rapier
  - web-worker
  - aws
  - route53
  - github-actions
status: approved
version: 2.0.0
created: 2026-07-27
updated: 2026-07-27
owner: pitekusu
related:
  - "[[ChatGPT-Design-Directive]]"
---

# GNFL 実装指示書

> [!abstract] この文書の目的
> 本文書は、Codex、Grok Buildその他のコーディングエージェントへ渡す、CYCLE 6の実装上位指示書である。個人開発として完成可能な規模を守り、工程ごとに小さく実装する。最初の完成対象は、係留済みの専用輸送船から架空の使用済燃料輸送容器を荷揚げし、陸上輸送車両の受台へ着座させ、工程評価とオンラインランキング登録を行うところまでとする。

アート、CG、UI外観、画像生成、SVG制作の指示は [[ChatGPT-Design-Directive]] を参照すること。

---

## 0. この版で確定した方針

本版は以前の過剰な構成を置き換える。次を確定事項とする。

- 個人開発であり、賞金競技や厳格なeスポーツを想定しない。
- オンラインランキングはカジュアルランキングとする。
- 複雑なチート対策、入力リプレイのサーバー再実行、物理状態ハッシュ検証は実装しない。
- AWSの主要な実行サービスはS3、CloudFront、API Gateway HTTP API、Lambda、DynamoDBの5つとする。
- ACM、Route 53、IAM、CloudWatch Logsは、証明書、DNS、CI認証、基本ログのための補助的なAWS機能として扱う。
- `pitekusu.dev`はAmazon Route 53 Domainsで登録済みである。権威DNSとして既存のRoute 53パブリックホストゾーンを使用していることをデプロイ前に確認し、重複ゾーンを作らない。
- 初期公開URLは `https://gnfl.pitekusu.dev/` とする。
- APIは同じCloudFront配下の `/api/*` へ統合する。
- APIは `POST /api/scores` と `GET /api/leaderboard` の2本とする。
- DynamoDBには、プレイヤー・工程・ルール版ごとの自己ベストだけを保存する。
- 物理シミュレーションは初期実装からWeb Workerへ隔離する。
- 物理更新は固定120 Hzとする。
- 完全決定性は要求しない。
- seed付き疑似乱数は、天候再現、デバッグ、将来拡張のために残す。
- 海や溶解槽を本格的な流体力学で解かない。ゲーム判定用の簡略モデルと視覚効果を分離する。
- Reactを必須とし、通常UIを担当させる。
- Phaserを描画、カメラ、パーティクル、音響、ゲーム内UIに使用する。
- Rapier 2Dを剛体、衝突、接触、吊荷挙動に使用する。
- GitHubを唯一の構成管理元とする。
- CI/CDはGitHub Actionsの `ci.yml` と `deploy.yml` の2本だけで構成する。
- GitHub ActionsからAWSへの認証はOIDCを使用し、長期アクセスキーを保存しない。
- 初期アートではGit LFSを必須にしない。
- 初期実装では正式CGより先に仮図形でゲーム性と物理を完成させる。

> [!warning] 旧版から削除したもの
> SQS、DLQ、Validator Lambda、リプレイ保存用S3、Lambda上でのRapier再実行、WAF、Cognito、Secrets Manager、複数環境、nightly試験、SBOM必須化、厳密なアートprovenance、全工程の先行実装は必須要件ではない。

---

## 1. エージェントに対する最優先命令

1. 本文書を最初から最後まで読み、初期スコープと非対象範囲を理解してから変更すること。
2. 最初の完成対象を「船からの荷揚げ完了まで」に固定すること。
3. 道路運搬、燃料受入れ、せん断、溶解、分離、精製、脱硝、ガラス固化、MOX燃料化を先回りして実装しないこと。
4. 将来拡張用の抽象化は、現在の荷揚げ実装を明確に簡単にする場合だけ導入すること。
5. ゲームの操作感を、AWS基盤や抽象化より優先すること。
6. 仮図形で荷揚げが遊べる状態になる前に、正式CGの大量生成や複雑な制作パイプラインを作らないこと。
7. React stateへ毎フレームの物理状態を流さないこと。
8. Rapier Worldをメインスレッドへ置かないこと。Rapierの所有者はSimulation Workerだけとする。
9. Rapierの内部オブジェクトをWorker外へ渡さないこと。
10. ゲーム判定に `Math.random()` を使用しないこと。
11. 残り時間、経過時間、イベントまでの秒数をプレイ画面へ表示しないこと。
12. 実在施設の正確な配置、警備設備、輸送経路、装置寸法、実運転条件を再現しないこと。
13. 数値はゲーム用単位または正規化値とし、現実の運転マニュアルに見える内容を作らないこと。
14. GitHubをコード、IaC、設計、ルール、アート指示、プロンプト履歴のSource of Truthとすること。
15. CI/CDはGitHub ActionsとGitHub OIDCで実装し、AWSアクセスキーをGitHub Secretsへ保存しないこと。
16. AWSコンソールの手作業は初回ブートストラップと調査に限定し、再現可能な設定はAWS CDKへ記述すること。
17. 各Pull Requestは一つの目的に絞り、テスト、型検査、ビルド、CDK synthが成功する状態で提出すること。
18. 未検証の機能を完成扱いにしないこと。
19. 不明点が実装を止めない場合は、本文書の優先順位に従って保守的な仮定を置き、その仮定をPR本文へ記録すること。
20. 過剰な抽象化、将来用の空インターフェース、不要なマイクロサービスを追加しないこと。

---

## 2. 企画概要

### 2.1 仮題

**GNFL**

コード、URL、リソース名で使用する安定識別子は `gnfl` または `GNFL` とする。

### 2.2 長期ビジョン

六ヶ所村の寒冷な沿岸工業地域と大規模な原子燃料サイクル施設をモチーフにした、架空の2D PC向けWebゲームを作る。

```text
専用船
  ↓
港湾荷役
  ↓
陸上輸送
  ↓
燃料受入れ・貯蔵
  ↓
せん断
  ↓
溶解・清澄
  ↓
分離・分配
  ├─ ウラン・プルトニウム系統 → 精製 → 脱硝 → MOX燃料化
  └─ 高レベル廃液系統         → ガラス固化
```

各工程で機械とパラメータを操作し、品質、安全余裕、設備健全性、操作効率を評価する。工程結果は後工程へ継承し、最終的にMOX燃料とガラス固化体の総合品質を評価する。

### 2.3 初期縦切り

開始時点で輸送船は岸壁に係留済みとする。

```text
船倉内の輸送容器
  ↓
吊具の位置合わせ
  ↓
ロック
  ↓
地切り
  ↓
船倉から吊り上げ
  ↓
岸壁側へ横行
  ↓
陸上輸送車両の受台へ降下
  ↓
着座確認
  ↓
工程評価
  ↓
自己ベスト更新・ランキング表示
```

船の航行と接岸は初期版では操作対象にしない。短い背景演出または静止した導入画面で十分である。

---

## 3. 初期スコープ

### 3.1 実装するもの

- PCブラウザ向けの2D横視点ゲーム
- Reactによるタイトル、設定、ゲーム開始、リザルト、ランキング画面
- Phaserによるゲーム描画、カメラ、ゲーム内UI、エフェクト、音響
- Web Worker内のRapier 2D物理シミュレーション
- 固定120 Hz物理更新
- 係留済み船体の上下動と小さな傾斜
- ガントリークレーン、トロリー、巻上げ、吊具、輸送容器
- 吊荷の振り子挙動
- 船倉、岸壁、輸送車両受台との衝突判定
- 吊具位置合わせとロック判定
- 地切り、吊上げ、横行、巻下げ、着座
- 通常範囲の風と波
- プレイヤーの技量で対処できる突風と高波群
- 突風、高波の視覚・音響上の予兆
- 内部tickによる経過時間計測
- 残り時間と経過時間を表示しない評価方式
- 工程評価と総合スコア
- 匿名プレイヤーID
- カジュアルオンラインランキング
- プレイヤー・工程・ルール版ごとの自己ベスト保存
- `gnfl.pitekusu.dev`への公開
- GitHub ActionsによるCI/CD
- AWS CDKによるインフラ構築

### 3.2 初期版で実装しないもの

- 船の航行シミュレーション
- 接岸操作
- 道路運搬ゲーム
- 作業員管理
- 機械故障
- 停電
- センサー故障
- ワイヤー破断
- 放射性物質の漏えい
- 写実的な原子力事故
- 本格的な流体シミュレーション
- 入力リプレイのサーバー保存
- Lambdaによる物理再計算
- 厳格なチート検証
- ユーザーアカウント
- メールアドレス
- Cognito
- クラウドセーブ
- 複数端末でのプレイヤーID同期
- SQS、DLQ、非同期検証
- WAF
- 独立したステージング環境
- モバイル対応
- Quest、VRChat、Unity、Godot
- PWA、オフライン対応
- ゲームパッド対応
- 完全なキーコンフィグ
- オープニング動画とエンディング動画

### 3.3 正常運転の定義

初期版の通常運転には、自然環境の変化を含める。

含めるもの：

- 穏やかな通常波
- 通常範囲の風向変化
- 予兆のある突風
- 予兆のある高波群
- 船体上下動
- プレイヤー操作に起因する吊荷の振れ
- 操作に起因する接触、衝撃、設備負荷
- インターロックによる安全停止

含めないもの：

- 設備の故障
- 意図しない制御喪失
- 破断
- 火災
- 漏えい
- 放射線事故
- 人体被害

重大な操作ミスが起きても、初期版では設備破壊や事故映像を出さず、安全停止、工程中止、低評価、再試行で処理する。

---

## 4. 技術スタック

### 4.1 採用技術

| 領域           | 技術                      | 用途                                     |
| -------------- | ------------------------- | ---------------------------------------- |
| 言語           | TypeScript                | フロント、Worker、Lambda、CDKを統一      |
| UI             | React                     | タイトル、設定、リザルト、ランキング     |
| ゲーム描画     | Phaser 4                  | 2D描画、カメラ、パーティクル、ゲーム内UI |
| 物理           | Rapier 2D JavaScript/WASM | 剛体、衝突、接触、吊荷物理               |
| ビルド         | Vite                      | React、Phaser、Worker、WASMのバンドル    |
| API検証        | Zod                       | APIリクエストとレスポンスの実行時検証    |
| IaC            | AWS CDK v2                | AWSリソースのコード管理                  |
| AWS SDK        | AWS SDK for JavaScript v3 | LambdaからDynamoDBへアクセス             |
| 単体試験       | Vitest                    | スコア、乱数、イベント、API、Worker境界  |
| E2E            | Playwright Chromium       | 最小限のブラウザsmoke test               |
| パッケージ管理 | pnpm                      | 依存解決とlockfile固定                   |
| Lint           | ESLint flat config        | TypeScript、React、Nodeコードの静的検査  |
| Format         | Prettier                  | Markdown、JSON、YAML、TypeScriptの整形   |
| 構成管理       | GitHub                    | コード、設計、IaC、アート指示            |
| CI/CD          | GitHub Actions            | CI、AWSデプロイ                          |

### 4.2 バージョン方針

- プロジェクト初期化時点の安定版を採用する。
- Reactは現行安定版を採用する。
- Phaserは4系を採用する。
- Rapierは公式2D JavaScript/WASMパッケージを採用する。
- Node.jsは、採用時点でAWS LambdaとGitHub Actionsの双方が正式対応するLTSを採用する。
- `package.json`の`packageManager`と`pnpm-lock.yaml`で正確な版を固定する。
- `latest`、`*`、広すぎるバージョン範囲をコミットしない。
- バージョン更新はゲーム機能のPRと混ぜない。

### 4.3 TypeScript方針

最低限、次を有効にする。

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- `any`は原則禁止する。
- 外部入力は`unknown`として受け、Zodまたは明示的な型ガードで検証する。
- Workerメッセージは判別可能unionとする。
- ゲーム内の単位を型名または変数名で明確にする。
- 実在のSI単位を模倣する必要はない。

---

## 5. アプリケーション構成

### 5.1 全体構成

```text
React Application Shell
├─ TitleScreen
├─ SettingsScreen
├─ GameScreen
│  └─ Phaser Canvas
├─ ResultScreen
└─ LeaderboardScreen

Main Thread
├─ React
├─ Phaser
├─ Input Adapter
├─ Render Snapshot Buffer
└─ Ranking API Client

Simulation Worker
├─ Rapier World
├─ 120 Hz Fixed Step Loop
├─ Crane Control
├─ Ship Motion
├─ Weather Scheduler
├─ Stage State Machine
├─ Metrics Collector
└─ Score Result Builder
```

### 5.2 Reactの責務

Reactは次だけを担当する。

- 画面遷移
- タイトル
- 設定
- プレイヤー名入力
- ゲーム開始と終了
- リザルト表示
- ランキング表示
- ローディング表示
- API通信状態
- 音量、画面揺れ等の設定

Reactは次を担当しない。

- 吊荷位置の毎フレーム更新
- 物理演算
- 船体運動
- パーティクルの毎フレーム状態
- 計器針の毎フレーム状態
- Rapier Worldの保持

ゲーム中の高頻度状態はPhaserが直接保持し、Reactへは開始、完了、停止、エラーなどの低頻度イベントだけを通知する。

### 5.3 Phaserの責務

- Canvas生成
- 背景、船、クレーン、吊具、容器、車両の描画
- Worker snapshotからの表示位置更新
- snapshot間の補間
- カメラ
- 画面揺れ
- パーティクル
- 風筋、波しぶき、霧
- ワイヤーの線描画
- 計器針、ランプ、ガイド線
- 効果音と環境音の再生指示
- キーボードとマウス入力の収集

### 5.4 Simulation Workerの責務

- Rapier WASMの非同期初期化
- Rapier Worldの唯一の所有
- 1/120秒の固定タイムステップ
- クレーン、吊荷、船体、受台の物理状態
- 入力のtick境界適用
- 天候seedとイベントスケジュール
- 突風、高波のゲーム判定
- 工程状態機械
- 評価メトリクスの集計
- 工程完了判定
- 最終StageResultの生成

### 5.5 Worker生成

Viteのmodule workerとして生成する。

```ts
const worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), {
  type: "module",
});
```

RapierのWASM初期化が完了するまでゲームを開始してはならない。Workerは初期化完了後に`READY`を返す。

---

## 6. Worker通信プロトコル

### 6.1 Main ThreadからWorker

```ts
export type MainToWorkerMessage =
  | {
      type: "INIT";
      seed: string;
      config: SimulationConfig;
    }
  | {
      type: "INPUT";
      sequence: number;
      input: PlayerInput;
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | {
      type: "RESET";
      seed: string;
      config: SimulationConfig;
    }
  | { type: "DISPOSE" };
```

### 6.2 WorkerからMain Thread

```ts
export type WorkerToMainMessage =
  | { type: "READY"; protocolVersion: number }
  | {
      type: "SNAPSHOT";
      snapshot: RenderSnapshot;
    }
  | {
      type: "GAME_EVENT";
      event: GameEvent;
    }
  | {
      type: "COMPLETED";
      result: StageResult;
    }
  | {
      type: "SAFE_ABORT";
      result: StageResult;
    }
  | {
      type: "ERROR";
      code: string;
      message: string;
    };
```

### 6.3 PlayerInput

入力値は機器依存のキー名ではなく、正規化された操作量へ変換する。

```ts
export interface PlayerInput {
  trolleyAxis: number; // -1.0 .. 1.0
  hoistAxis: number; // -1.0 .. 1.0
  fineMode: boolean;
  lockPressed: boolean;
  emergencyStopPressed: boolean;
}
```

- Phaser側でキーボードとマウス操作を`PlayerInput`へ統合する。
- Workerは最後に受信した入力状態を保持し、次の物理tickから適用する。
- `lockPressed`等の単発操作はsequence番号で二重適用を防ぐ。

### 6.4 RenderSnapshot

snapshotには描画に必要な値だけを含める。

```ts
export interface RenderSnapshot {
  tick: number;
  generatedAtMs: number;
  stagePhase: StagePhase;
  entities: ReadonlyArray<RenderEntityState>;
  instruments: InstrumentState;
  weather: WeatherVisualState;
}
```

含めないもの：

- Rapier World
- RigidBodyインスタンス
- Colliderインスタンス
- 生のWASMメモリ
- 完全な接触グラフ
- 不要な履歴配列

### 6.5 snapshot頻度

- 物理演算は120 Hz固定とする。
- 初期実装ではsnapshotを60 Hzで送る。
- Phaserは前回と最新snapshotを補間し、ディスプレイの`requestAnimationFrame`で描画する。
- 実測で通信が問題なく、120 Hz snapshotが明確に改善する場合だけ設定値で120 Hzへ上げる。
- SharedArrayBufferは初期版で使用しない。
- Worker通信がボトルネックになった場合だけ、Transferableな`ArrayBuffer`を検討する。

### 6.6 Workerループ

- Workerのタイマーが正確に120回呼ばれることを前提にしない。
- `performance.now()`とaccumulatorを使う。
- 1 tickは`1 / 120`秒とする。
- 一時停止やタブ非表示の大きな時間差を一気に追いつかせない。
- 1ループの最大catch-up tick数を制限する。
- 上限を超える遅延が発生した場合はaccumulatorを再同期する。
- `document.visibilitychange`でメインスレッドから`PAUSE`を送る。

---

## 7. 物理モデル

### 7.1 基本方針

物理は現実の設備計算ではなく、操作感を作るゲーム物理とする。

- 実機の寸法、重量、ワイヤー特性を使用しない。
- 数値はゲーム用スケールとする。
- 見た目の画像寸法と物理コライダーを分離する。
- コライダーは単純な長方形、円、カプセル、凸形状の組合せとする。
- 画像の輪郭から自動生成した複雑なコライダーを使用しない。

### 7.2 物理オブジェクト

| 対象           | Rapier種別             | 説明                             |
| -------------- | ---------------------- | -------------------------------- |
| 岸壁           | Fixed                  | 静的な床、壁、受台周辺           |
| クレーン固定部 | 描画のみまたはFixed    | 可動しない構造物                 |
| トロリー基準点 | Kinematic              | レール方向にのみ移動             |
| 吊具           | Dynamic                | ケーブル力を受ける               |
| 輸送容器       | Dynamic                | ロック後は吊具と一体化           |
| 船体           | Kinematic              | seed付き波形から位置と傾斜を設定 |
| 船倉障害物     | 船体に追従するCollider | 船体運動と同じ変換を受ける       |
| 輸送車両受台   | Fixed                  | 初期工程では走行しない           |

### 7.3 ケーブルモデル

Rapierの複雑なロープチェーンを多数の剛体で構成しない。初期実装は、ゲーム用の張力のみを発生するスプリング・ダンパーケーブルを使用する。

- トロリー側に左右2点の吊点を置く。
- 吊具側に左右2点の取付点を置く。
- 各ケーブルは現在長、目標長、伸び、相対速度から張力を算出する。
- ケーブルは引張り方向だけに力を発生し、圧縮力を発生しない。
- 巻上げ・巻下げ操作で目標長を徐々に変更する。
- 張力はゲーム用上限でクランプする。
- 120 Hzで力を適用する。
- 数値爆発を避けるため、ばね定数、減衰、最大巻上げ速度を設定ファイル化する。

この方式により、吊荷の横振れ、急停止時の遅れ、巻上げ時の衝撃、突風の影響を制御しやすくする。

### 7.4 吊具ロック

ロック可能条件はゲーム用の許容範囲で判定する。

- 水平位置誤差
- 垂直位置誤差
- 吊具と容器の角度差
- 相対速度
- ロック操作の入力エッジ

ロック成立後は吊具と輸送容器を固定ジョイントまたは同等の安定した拘束で接続する。ロック解除は受台へ安定着座した後だけ許可する。

### 7.5 船体運動

船体は流体解析を行わず、複数の低周波曲線とイベント包絡線から上下動と傾斜を生成する。

```text
base heave curve
+ base pitch curve
+ high-wave event envelope
= ship transform
```

- 船体をDynamicにして海面粒子で浮かせない。
- 船体はKinematicとする。
- 船倉コライダーは船体に追従する。
- 船体運動はゲームプレイseedから再現可能にする。
- 波の見た目はPhaserの画像、頂点変形、パーティクル等で表現する。

### 7.6 接触と衝撃

次を記録する。

- 船倉壁との接触
- 岸壁との接触
- 受台との接触
- 最大接触衝撃
- 接触回数
- 着座時の垂直速度
- 着座時の水平速度
- 着座位置誤差
- 着座角度誤差

接触しただけで即ゲームオーバーにしない。軽微な接触は減点とし、非常に大きな衝撃や物理破綻時だけ安全中止とする。

### 7.7 インターロック

初期版では安全系が正常に動作する。

例：

- ロック未成立時の地切り制限
- 船倉縁より低い状態での高速横行制限
- 着座前のロック解除禁止
- 極端な張力での巻上げ停止
- 物理範囲外への逸脱時の安全停止

インターロック作動は事故ではなく、工程評価の減点対象とする。

---

## 8. 操作設計

### 8.1 キーボード

| 操作             | 初期キー       |
| ---------------- | -------------- |
| トロリー左       | `A` または `←` |
| トロリー右       | `D` または `→` |
| 巻上げ           | `W` または `↑` |
| 巻下げ           | `S` または `↓` |
| 微速運転         | `Shift`        |
| 吊具ロック・確認 | `Space`        |
| 非常停止         | `E`            |
| 一時停止         | `Esc`          |

### 8.2 マウス

- 画面内の横行レバー
- 巻上げレバー
- 微速ボタン
- ロックボタン
- 非常停止ボタン

キーボードとマウスは同じ`PlayerInput`へ変換する。マウス操作は見た目だけの別ロジックにしない。

### 8.3 微速運転

- 微速運転中は最大横行速度と巻上げ速度を下げる。
- 着座精度を上げるための主要な技量要素とする。
- 微速運転を使うこと自体は減点しない。

### 8.4 時間表示

プレイ中とリザルト画面に次を表示しない。

- 経過秒数
- 残り時間
- イベントまでのカウントダウン
- 内部tick

内部では`elapsedTicks`を記録し、操作効率の評価に使用する。結果画面では秒数ではなく「操作効率 A」等の評価だけを表示する。

---

## 9. 突風・高波イベント

### 9.1 基本原則

ランダムイベントは運だけで結果を決めず、プレイヤーが予兆を読み、操作で損失を抑えられるものとする。

すべてのイベントは次の三段階を持つ。

```text
予兆
  ↓
本体
  ↓
減衰
```

### 9.2 seed付き疑似乱数

- 1プレイごとにクライアントでseedを生成する。
- `crypto.getRandomValues()`からseed文字列を作る。
- ゲーム判定用PRNGは32-bit整数演算中心の実装とする。
- 例としてxoshiro128系または同等の小さなPRNGを採用できる。
- PRNG実装には既知のtest vectorを用意する。
- `Math.random()`はゲーム判定に使わない。

乱数ストリームを分離する。

```text
gameplayRng
  突風、高波、イベント配置

cosmeticRng
  波しぶき、霧粒子、鳥、細かな画面演出
```

視覚効果を追加してもゲームイベント列が変わらないようにする。

### 9.3 完全決定性は要求しない

要求するもの：

- 同じビルドと同じseedで、イベントの種類、順序、概ね同じ強度を再現できること。
- バグ報告にseedを添付できること。
- PRNGとイベント生成に単体試験があること。

要求しないもの：

- 異なるブラウザ間の物理状態完全一致
- ブラウザとLambda間の完全一致
- Rapier snapshot hash
- 浮動小数点のbit単位一致
- 入力リプレイの公式検証

### 9.4 突風

予兆：

- 吹き流しの向きと角度の変化
- 海面上の風筋
- 風音の増加
- 張力計または横力表示の小さな変化

本体：

- 吊具と輸送容器へ横方向の外力を加える。
- 強度は包絡線で滑らかに増加、維持、減衰させる。
- 1フレームだけの衝撃力にしない。

対処：

- 横行を止める。
- 風上へ微速補正する。
- 吊荷の周期に合わせてトロリーを動かす。
- 障害物から距離を取る。

### 9.5 高波群

予兆：

- 遠景の波頭増加
- 係留索や船体音の変化
- 船体動揺計の変化
- 船と岸壁の相対位置変化

本体：

- 船体の上下動と小さな傾斜を数周期だけ増加させる。
- 単発の瞬間移動にしない。

対処：

- 船倉縁付近で操作を止める。
- クリアランスを確保する。
- 船体運動を見て巻上げを調整する。
- 高波の減衰後に横行を再開する。

### 9.6 公平性制約

初期版では次を守る。

- 1プレイに1～2イベントを基本とする。
- 最大強度の突風と最大強度の高波を同時に発生させない。
- 必ず予兆時間を設ける。
- ロック操作の瞬間に最大イベントを重ねない。
- 着座判定の最終許容範囲内で、回避不能な最大イベントを発生させない。
- イベント強度はすべて人間の操作で対処可能な範囲にする。
- seed差による有利不利はカジュアルランキングとして許容する。

将来、固定seedの週間チャレンジを追加できるが、初期版には含めない。

---

## 10. 工程状態機械

内部状態は次を基本とする。

```ts
export type StagePhase =
  | "READY"
  | "ALIGNING"
  | "LOCKED"
  | "LIFTING"
  | "CLEAR_OF_HOLD"
  | "TRAVERSING"
  | "LANDING"
  | "SEATED"
  | "COMPLETED"
  | "SAFE_ABORTED";
```

状態遷移例：

```text
READY
  ↓
ALIGNING
  ↓ lock success
LOCKED
  ↓ cable tension and lift
LIFTING
  ↓ cask clears hold threshold
CLEAR_OF_HOLD
  ↓ horizontal travel begins
TRAVERSING
  ↓ over transporter zone
LANDING
  ↓ stable seat detected
SEATED
  ↓ lock release and confirmation
COMPLETED
```

- 状態は演出の都合だけで変更しない。
- 物理条件を満たして遷移する。
- `COMPLETED`後は物理入力を停止する。
- `SAFE_ABORTED`は物理破綻、範囲逸脱、非常停止等に使用する。

---

## 11. 評価とスコア

### 11.1 評価原則

- 時間だけを競うゲームにしない。
- 丁寧な操作を高速操作より高く評価する。
- プレイ画面にタイマーを出さない。
- スコア計算は純粋関数としてクライアントとLambdaで共有する。
- Lambdaはクライアントが送った最終scoreを信用しない。
- Lambdaは送信されたmetricsからscoreを再計算する。
- metrics自体の高度な改ざんは防止しない。

### 11.2 収集メトリクス

```ts
export interface UnloadingMetrics {
  maximumSway: number;
  integratedSway: number;
  maximumCableLoad: number;
  highCableLoadTicks: number;
  maximumCaskAcceleration: number;
  collisionImpulse: number;
  collisionCount: number;
  landingPositionError: number;
  landingAngleError: number;
  landingVerticalSpeed: number;
  landingHorizontalSpeed: number;
  interlockCount: number;
  elapsedTicks: number;
}
```

すべてゲーム用単位であり、現実の設備単位を意味しない。

### 11.3 評価カテゴリ

| カテゴリ | 重み |
| -------- | ---: |
| 取扱品質 |  30% |
| 着座精度 |  25% |
| 振れ制御 |  20% |
| 設備負荷 |  15% |
| 操作効率 |  10% |

各カテゴリを0～100へ正規化し、重み付き合計を0～100,000の整数スコアへ変換する。

```text
overall =
  handlingQuality * 0.30
  + landingPrecision * 0.25
  + swayControl * 0.20
  + equipmentCare * 0.15
  + operationEfficiency * 0.10

score = round(clamp(overall, 0, 100) * 1000)
```

正規化閾値は`rulesetVersion`ごとの設定ファイルへ置く。閾値変更時は既存ランキングと混在させず、ルール版を上げる。

### 11.4 ランク

```text
S+  97以上
S   92以上
A   82以上
B   70以上
C   55以上
D   40以上
E   40未満
```

`SAFE_ABORTED`はスコア登録不可とする。

### 11.5 表示

表示するもの：

- 総合ランク
- 総合スコア
- 取扱品質
- 着座精度
- 振れ制御
- 設備負荷
- 操作効率の文字評価
- 自己ベスト更新有無

表示しないもの：

- 経過秒数
- 残り秒数
- 内部tick
- 生の物理パラメータ全部

---

## 12. プレイヤー識別

### 12.1 匿名ID

認証は導入しない。初回起動時にブラウザでUUIDを生成し、`localStorage`へ保存する。

```ts
const key = "gnfl.playerId";
const playerId = localStorage.getItem(key) ?? crypto.randomUUID();
localStorage.setItem(key, playerId);
```

自己ベストは正確には「そのブラウザプロファイルにおける自己ベスト」である。

許容する制約：

- 別PCでは別プレイヤーになる。
- 別ブラウザでは別プレイヤーになる。
- ストレージ削除でIDが変わる。
- ブラウザフィンガープリントは導入しない。

### 12.2 表示名

- 1～20文字
- Unicodeを許可する。
- 前後空白を除去する。
- NFKC正規化する。
- 制御文字を拒否する。
- HTMLを受け付けず、Reactの通常テキストとして表示する。
- メールアドレス、実名を要求しない。

表示名を変更しても、自己ベストを更新しない限り既存ランキング項目の表示名は変わらなくてよい。名前変更専用APIは作らない。

---

## 13. ランキングAPI

### 13.1 API一覧

```text
POST /api/scores
GET  /api/leaderboard
```

次は作らない。

```text
POST /api/runs/start
GET  /api/runs/{id}
POST /api/guest-sessions
GET  /api/health
```

### 13.2 POST /api/scores

リクエスト例：

```json
{
  "playerId": "7c154cba-3530-4bd7-bec7-28075d23374c",
  "displayName": "pitekusu",
  "stageId": "unloading",
  "rulesetVersion": "unloading-v1",
  "seed": "e42f0a81c9dd41a7",
  "metrics": {
    "maximumSway": 12.4,
    "integratedSway": 839.2,
    "maximumCableLoad": 71.8,
    "highCableLoadTicks": 120,
    "maximumCaskAcceleration": 8.1,
    "collisionImpulse": 0,
    "collisionCount": 0,
    "landingPositionError": 2.7,
    "landingAngleError": 1.2,
    "landingVerticalSpeed": 0.34,
    "landingHorizontalSpeed": 0.08,
    "interlockCount": 0,
    "elapsedTicks": 18342
  }
}
```

Lambdaの処理：

1. JSONサイズとContent-Typeを確認する。
2. Zodで全項目を検証する。
3. `stageId`と`rulesetVersion`をallowlistで確認する。
4. 数値が有限であり、ゲーム上の許容範囲内であることを確認する。
5. 異常に短い`elapsedTicks`や不可能な組合せを最低限拒否する。
6. 共有スコア関数でscoreとgradeを計算する。
7. DynamoDBへ条件付き更新する。
8. 新記録でなければ現在の自己ベストを取得する。
9. 結果を返す。

成功レスポンス例：

```json
{
  "updated": true,
  "submittedScore": 87320,
  "personalBest": 87320,
  "grade": "A"
}
```

自己ベスト未更新例：

```json
{
  "updated": false,
  "submittedScore": 84210,
  "personalBest": 87320,
  "grade": "A"
}
```

### 13.3 GET /api/leaderboard

```text
GET /api/leaderboard
  ?stageId=unloading
  &rulesetVersion=unloading-v1
  &limit=50
  &playerId=<optional UUID>
```

- `limit`は1～100。
- デフォルトは50。
- GSIを降順Queryする。
- プレイヤーIDが指定された場合は、自己ベスト項目も取得する。
- 自己ベストが取得件数内にあればrankを返す。
- 取得件数外ならrankは`null`でよい。

レスポンス例：

```json
{
  "entries": [
    {
      "rank": 1,
      "displayName": "player-a",
      "score": 92180,
      "grade": "S"
    }
  ],
  "personalBest": {
    "score": 87320,
    "grade": "A",
    "rank": 18
  }
}
```

### 13.4 カジュアル不正対策

実装する：

- クライアント送信scoreを受け付けない。
- metricsからLambdaで再計算する。
- Zod検証。
- stageとrulesetのallowlist。
- 数値範囲検査。
- 同一プレイヤーの低い記録による上書きを防ぐ。
- API Gatewayの軽いroute throttling。
- LambdaとDynamoDBの最小権限IAM。

実装しない：

- 暗号署名付きrun token。
- 入力ログ再生。
- 物理再計算。
- ブラウザ改造検知。
- 難読化をセキュリティ境界とすること。
- IP追跡。
- ブラウザフィンガープリント。
- 賞金競技水準の不正対策。

ランキング画面または利用説明に「カジュアルランキングであり、厳格な不正検証は行わない」旨を表示できるようにする。

---

## 14. DynamoDB設計

### 14.1 テーブル

テーブルは1つだけとする。

```text
Table: gnflScores
Billing mode: PAY_PER_REQUEST
Primary key: player_board_id (String)
GSI: LeaderboardIndex
  Partition key: board_id (String)
  Sort key: score (Number)
```

### 14.2 項目例

```json
{
  "player_board_id": "unloading#unloading-v1#7c154cba-3530-4bd7-bec7-28075d23374c",
  "board_id": "unloading#unloading-v1",
  "player_id": "7c154cba-3530-4bd7-bec7-28075d23374c",
  "display_name": "pitekusu",
  "stage_id": "unloading",
  "ruleset_version": "unloading-v1",
  "score": 87320,
  "grade": "A",
  "seed": "e42f0a81c9dd41a7",
  "metrics": {},
  "updated_at": "2026-07-27T12:00:00.000Z"
}
```

### 14.3 自己ベスト条件付き更新

```text
attribute_not_exists(score) OR score < :newScore
```

- `UpdateItem`を使用する。
- 条件成立時だけscore、grade、seed、metrics、display_name、updated_at、GSI属性を更新する。
- 条件不成立はサーバーエラーではなく、自己ベスト未更新として扱う。
- 条件不成立後に`GetItem`で既存自己ベストを取得する。
- 同時送信でも低い値が高い値を上書きしないことを単体試験する。

### 14.4 ランキングQuery

- `LeaderboardIndex`の`board_id`を等価条件でQueryする。
- `ScanIndexForward=false`でscore降順とする。
- 同点時の並び順は保証しない。
- GSIの反映は結果整合性であることを許容する。
- POST直後に一覧へ反映されない場合でも、POSTレスポンスの自己ベストを正として表示する。

### 14.5 保存しない情報

- メールアドレス
- パスワード
- 住所
- 本名
- IPアドレス
- User-Agent履歴
- 生のキー入力ログ
- リプレイ
- アクセストークン

---

## 15. AWS構成

### 15.1 主要5サービス

```text
Browser
  ↓
Amazon CloudFront
  ├─ default behavior → private Amazon S3
  └─ /api/* behavior → Amazon API Gateway HTTP API
                                ↓
                           AWS Lambda
                                ↓
                         Amazon DynamoDB
```

主要サービス：

1. Amazon S3
2. Amazon CloudFront
3. Amazon API Gateway HTTP API
4. AWS Lambda
5. Amazon DynamoDB

補助要素：

- AWS Certificate Manager
- Amazon Route 53
- IAM
- CloudWatch Logs
- GitHub OIDC Provider

### 15.2 リージョン

個人開発の初期構成を単純化するため、v0.1はすべて`us-east-1`へ配置する。

理由：

- CloudFront用ACM証明書は`us-east-1`に必要である。
- APIはゲーム中ではなく、ランキング表示と記録時にだけ使用する。
- ゲーム物理は完全にクライアント側で実行する。
- 単一リージョン・単一App Stackにできる。

将来APIレイテンシーが問題になった場合だけ、Lambda、API Gateway、DynamoDBを`ap-northeast-1`へ移し、証明書・CloudFront用のグローバルStackを分離する。初期版では行わない。

### 15.3 Route 53前提

- `pitekusu.dev`はAmazon Route 53 Domainsで登録済みである。
- デプロイ前に、`pitekusu.dev`の権威DNSが既存のRoute 53パブリックホストゾーンであることを確認する。
- 確認できた既存パブリックホストゾーンを使用する。
- 新しい`pitekusu.dev`ホストゾーンを自動作成しない。既存ゾーンを確認できない場合は、重複ゾーンを作らずHosted Zone IDの確認事項として報告する。
- ネームサーバーを変更しない。
- 既存の無関係なDNSレコードを変更しない。
- CDKは既存Hosted ZoneをlookupまたはID指定で参照する。
- 新規サブドメインは `gnfl.pitekusu.dev` とする。
- Route 53にA AliasとAAAA Aliasを作成し、CloudFront Distributionへ向ける。

### 15.4 ACM

- `gnfl.pitekusu.dev`用の公開証明書を`us-east-1`に作成する。
- Route 53 DNS validationを使用する。
- 証明書の更新はACM管理とする。
- ワイルドカード証明書を必須にしない。
- 既存の適切な証明書がある場合はARN importを選べるようにする。

### 15.5 S3

- 静的ゲーム本体を保存する。
- Static Website Hostingは使用しない。
- Block Public Accessを全面有効化する。
- CloudFront Origin Access Controlからだけ読めるようにする。
- SSE-S3を有効化する。
- バケット名を固定文字列へ依存しない。
- `index.html`は短いキャッシュまたは`no-cache`。
- ハッシュ付きJS、CSS、画像、音声、WASMは長期immutable cache。
- 初期版ではversioningを必須にしない。

### 15.6 CloudFront

- Alternate domain nameに`gnfl.pitekusu.dev`を設定する。
- ACM証明書を関連付ける。
- IPv6を有効化する。
- Default root objectを`index.html`とする。
- S3 originにはOACを使用する。
- 圧縮を有効化する。
- SPA用に403/404を`/index.html`へフォールバックさせる。

Default behavior：

- Origin: S3
- Allowed methods: GET, HEAD, OPTIONS
- キャッシュ有効
- HTTPS redirect

`/api/*` behavior：

- Origin: API Gateway HTTP API execute-api endpoint
- Allowed methods: GET, HEAD, OPTIONS, POST
- キャッシュ無効
- Query stringを転送
- `Content-Type`等の必要なheaderを転送
- Viewerの`Host` headerはAPI Gatewayへ転送しない
- HTTPS only

### 15.7 API Gateway HTTP API

- `$default` stageまたはstage prefixのない構成とする。
- Lambda proxy integrationを使用する。
- ルートは2つだけとする。
- CORSは `https://gnfl.pitekusu.dev` を許可する。
- 直接execute-api URLからの呼出しを完全には防がない。
- 低いroute throttlingを設定する。
- API keys、usage plans、WAFは使用しない。

### 15.8 Lambda

- 関数は1つだけとする。
- HTTP methodとpathで小さなrouterを実装する。
- VPCへ入れない。
- メモリは256 MBを初期値とする。
- timeoutは5秒を初期値とする。
- DynamoDB対象テーブルへの必要最小限の権限だけを付与する。
- AWS SDK v3を使用する。
- ログは構造化JSONを基本とする。
- リクエスト本文、プレイヤー名、全metricsを常時ログへ出さない。
- CloudWatch Logsの保持期間は14日を目標とする。

### 15.9 DynamoDB

- On-Demandを使用する。
- 1テーブル、1 GSIとする。
- PITR、Streams、DAX、Global Tablesは初期版で使用しない。
- Removal Policyは`RETAIN`を基本とする。
- Deletion Protectionは初期版で必須にしない。

### 15.10 初期版で作らないAWSリソース

- EC2
- ECS
- EKS
- RDS
- Aurora
- OpenSearch
- NAT Gateway
- VPC
- SQS
- SNS
- Step Functions
- EventBridge Scheduler
- GameLift
- Cognito
- WAF
- Secrets Manager
- KMSカスタマー管理キー
- リプレイ用S3バケット

---

## 16. AWS CDK構成

### 16.1 Stack

ランタイムは1 Stackを基本とする。

```text
gnflAppStack (us-east-1)
├─ ACM Certificate
├─ existing Route53 Hosted Zone reference
├─ S3 Bucket
├─ DynamoDB Table + GSI
├─ Lambda Function
├─ API Gateway HTTP API
├─ CloudFront Distribution
└─ Route53 A/AAAA Alias Records
```

GitHub OIDCとデプロイRoleは、一度だけローカル認証で作る小さなbootstrap Stackへ分けてもよい。

```text
gnflCiBootstrapStack
├─ existing or new GitHub OIDC Provider reference
└─ GitHub Actions Deployment Role
```

CI bootstrap Stackはゲームの実行サービス数へ数えない。

### 16.2 CDK context

```json
{
  "siteDomain": "gnfl.pitekusu.dev",
  "hostedZoneName": "pitekusu.dev",
  "githubOwner": "pitekusu",
  "githubRepository": "gnfl",
  "deployRegion": "us-east-1"
}
```

リポジトリ名が異なる場合は実際の名前へ置換する。ドメインとHosted Zoneは勝手に変更しない。

### 16.3 Outputs

最低限、次をStack Outputsへ出す。

- SiteUrl
- SiteBucketName
- CloudFrontDistributionId
- ApiEndpoint
- ScoresTableName

GitHub ActionsはOutputまたはタグからバケット名とDistribution IDを取得する。

### 16.4 Removal Policy

- DynamoDB: RETAIN
- S3: RETAIN
- Route 53 Record: Stack管理
- CloudFront: DESTROY可能
- Lambda/API: DESTROY可能

誤ってデータを失わない一方、個人開発で削除不能な構成にしない。

---

## 17. GitHub運用

### 17.1 リポジトリ

推奨名：

```text
pitekusu/gnfl
```

GitHubへ保存するもの：

- TypeScriptソース
- Lambda
- CDK
- テスト
- 設計書
- ADRが必要な場合の判断記録
- ChatGPT向けプロンプト
- SVG
- 最適化済み画像
- 音声
- GitHub Actions

保存しないもの：

- AWS credential
- `.env`の秘密値
- ビルド成果物
- `node_modules`
- 個人用ブラウザセーブ
- 実在施設の非公開情報

### 17.2 ブランチ

- `main`を公開可能な基準ブランチとする。
- 機能は短命ブランチで作る。
- 原則としてPR経由でmainへ入れる。
- 個人開発のためCODEOWNERSや必須他者承認は導入しない。
- mainへのforce pushは禁止する。
- 大きな変更はPR本文へ目的、確認方法、未実装事項を書く。

### 17.3 コミット

- 一つの意図に絞る。
- 生成物だけの巨大コミットを避ける。
- 物理調整値変更は、理由と試遊結果をコミットまたはPRへ記録する。
- 依存更新とゲーム機能を混ぜない。
- `pnpm-lock.yaml`を必ずコミットする。

### 17.4 Git LFS

初期版では必須にしない。

- SVG、WebP、短い音声は通常Gitで管理する。
- 1ファイルが大きくなった場合や、元画像・音声が多数になった場合だけGit LFSを導入する。
- Git LFS導入をゲーム実装開始の前提条件にしない。

---

## 18. GitHub Actions

Workflowは2本だけとする。

### 18.1 `.github/workflows/ci.yml`

Trigger：

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

処理：

1. checkout
2. Node.jsセットアップ
3. pnpmセットアップ
4. `pnpm install --frozen-lockfile`
5. format check
6. lint
7. TypeScript typecheck
8. unit tests
9. Playwright Chromium smoke test
10. production build
11. CDK synth

単独WorkflowへCodeQL、SBOM、nightly test、fuzz testを追加しない。

### 18.2 `.github/workflows/deploy.yml`

Trigger：

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

必須permission：

```yaml
permissions:
  contents: read
  id-token: write
```

処理：

1. checkout
2. Node.jsとpnpmセットアップ
3. frozen install
4. testまたはCI相当の最低限再確認
5. Web production build
6. GitHub OIDCでAWS Roleを引受け
7. `cdk deploy --require-approval never`
8. `dist/`をS3へ同期
9. `index.html`へ短いCache-Controlを設定
10. ハッシュ付きassetへimmutable Cache-Controlを設定
11. CloudFront invalidation
12. `https://gnfl.pitekusu.dev/`のHTTP smoke test
13. `GET /api/leaderboard`のHTTP smoke test

初期版ではstaging、production reviewer、手動承認ゲートを作らない。

### 18.3 GitHub OIDC

- AWSアクセスキーをGitHub Secretsへ保存しない。
- trust policyを`pitekusu/gnfl`へ限定する。
- deploy対象branchを`main`へ限定する。
- deploy RoleはCDK、S3 sync、CloudFront invalidationに必要な権限だけを持つ。
- OIDC ProviderがAWSアカウントに既に存在する場合は再利用する。
- 初回だけローカルの管理者権限でCI bootstrap Stackをデプロイする。

---

## 19. テスト方針

### 19.1 残すテスト

PRNG：

- 既知seedから既知の先頭値が得られる。
- gameplayRngとcosmeticRngが分離される。

天候イベント：

- 同じseedで同じイベント列が得られる。
- 強度が許容範囲内である。
- 予兆時間が必ず存在する。
- 最大突風と最大高波が同時に生成されない。
- 対処不能なイベント配置を生成しない。

スコア：

- 理想値で高得点となる。
- 接触、振れ、着座誤差で減点される。
- `elapsedTicks`は操作効率にだけ影響する。
- 同じmetricsからクライアントとLambda共有関数が同じscoreを返す。

Worker：

- INIT後にREADYを返す。
- INPUTがtick境界で反映される。
- PAUSE中はtickが進まない。
- RESETでseedと状態が初期化される。
- 完了時にCOMPLETEDを返す。

API：

- 不正スキーマを400で拒否する。
- クライアントscoreを受け付けない。
- 高い記録で自己ベストを更新する。
- 低い記録で自己ベストを更新しない。
- leaderboardを降順で返す。

CDK：

- `cdk synth`が成功する。
- 追加のCDK snapshot testは初期版で必須にしない。

Playwright：

- トップページが開く。
- WorkerがREADYになる。
- Game Screenへ遷移できる。
- Ranking Screenへ遷移できる。
- APIはroute interceptionで固定レスポンスを返してよい。

### 19.2 実装しないテスト

- ブラウザとNodeの物理完全一致
- Rapier snapshot hash
- 長時間soak test
- nightly fuzz test
- 複数ブラウザの完全マトリクス
- visual regression必須化
- 本格的な負荷試験
- Lambda上の物理再現試験

### 19.3 試遊

ゲーム性は自動テストだけで完成判定しない。最低限、次を人間が試遊する。

- 急停止で振れが増える。
- 微速運転で着座しやすくなる。
- 突風の予兆を見て対処できる。
- 高波の予兆を見て待つ判断ができる。
- ゆっくりすぎるだけでは最高点にならない。
- 速さだけを優先すると品質が落ちる。
- 失敗理由が画面上の動きと計器から理解できる。

---

## 20. リポジトリ構成

```text
gnfl/
├─ src/
│  ├─ app/
│  │  ├─ screens/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  └─ settings/
│  ├─ game/
│  │  ├─ phaser/
│  │  ├─ worker/
│  │  ├─ simulation/
│  │  ├─ unloading/
│  │  ├─ input/
│  │  └─ protocol/
│  ├─ api/
│  └─ main.tsx
├─ shared/
│  ├─ contracts/
│  ├─ scoring/
│  ├─ rulesets/
│  └─ validation/
├─ lambda/
│  ├─ handler.ts
│  ├─ routes/
│  ├─ repository/
│  └─ response.ts
├─ infra/
│  ├─ app.ts
│  ├─ gnfl-app-stack.ts
│  └─ gnfl-ci-bootstrap-stack.ts
├─ public/
│  └─ assets/
│     └─ unloading/
├─ art/
│  ├─ reference/
│  ├─ source/
│  ├─ prompts.md
│  └─ asset-notes.md
├─ docs/
│  ├─ gnfl-implementation-directive.md
│  ├─ gnfl-ChatGPT-Design-Directive.md
│  └─ decisions/
├─ tests/
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ deploy.yml
├─ cdk.json
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

多数のworkspace packageへ分割しない。共有が必要なスコア式、契約、ルールだけを`shared/`へ置く。

---

## 21. アセット境界

実装側の境界だけを定める。詳細はデザイン指示書を参照する。

- 背景と雰囲気の基準画像はChatGPTで作る。
- 物理的に動く船、クレーン、トロリー、吊具、輸送容器、受台はCodex等がSVGで作る。
- ワイヤー、ガイド線、計器針、風筋、波しぶきはPhaserで描画する。
- UI文字はReactまたはPhaserで描画する。
- 画像へ文字や数値を焼き込まない。
- 物理コライダーと画像輪郭を直接結び付けない。
- 仮図形版が遊べるまで正式アセット置換を開始しない。

---

## 22. 性能目標

対象はハイスペックPCの現行デスクトップブラウザとする。

- 物理更新：固定120 Hz
- 表示：ディスプレイの`requestAnimationFrame`
- 目標描画：60 fps以上、120 Hzディスプレイで滑らかな補間
- Worker snapshot：初期60 Hz
- 物理Body数：必要最小限
- 大量の粒子流体を使用しない
- 初回ロードで全将来工程assetを読み込まない
- 荷揚げ工程assetだけをロードする
- API障害時でもローカルのリザルト表示は失わない

性能不足が発生した場合の優先順位：

1. cosmetic particle数を下げる。
2. snapshot payloadを小さくする。
3. snapshot頻度を調整する。
4. colliderを単純化する。
5. Worker通信をTransferableへ変更する。
6. 物理120 Hzを変更する判断は最後に行い、ユーザー承認を得る。

---

## 23. エラー処理

### 23.1 Worker初期化失敗

- React上に明確なエラーを表示する。
- 再読込みボタンを表示する。
- Worker未初期化のままゲームを開始しない。

### 23.2 API失敗

- ゲーム結果はローカルに表示する。
- 「ランキングへの送信に失敗しました」と表示する。
- 自動で無限再送しない。
- プレイヤーが1回だけ再送できるUIを用意してよい。
- API失敗をゲーム失敗扱いにしない。

### 23.3 物理安全中止

- NaN、範囲外座標、極端な速度を検出する。
- Workerは`SAFE_ABORT`を返す。
- 事故表現ではなく安全停止画面へ移る。
- seedと簡単なエラーコードを表示し、バグ報告に使えるようにする。

---

## 24. 実装順序

### Phase 0: リポジトリ基盤

- GitHubリポジトリ
- pnpm
- Vite
- React
- Phaser空Scene
- TypeScript strict
- Vitest
- Playwright最小構成
- CDK空App
- CI Workflow

完了条件：

- React画面内にPhaser Canvasが表示される。
- CIが成功する。

### Phase 1: Worker基盤

- module Worker
- protocol型
- Rapier WASM初期化
- 120 Hz fixed step
- READY、SNAPSHOT、PAUSE、RESET
- snapshot補間

完了条件：

- Worker内の単純な剛体がPhaser上で滑らかに動く。
- Reactへ毎フレームstateを流していない。

### Phase 2: 仮図形クレーン

- 岸壁
- 船体
- トロリー
- 吊具
- 輸送容器
- 受台
- ケーブル力
- 横行、巻上げ、微速

完了条件：

- 吊荷が振れる。
- 急停止で振れが増える。
- 微速で位置合わせできる。

### Phase 3: 荷揚げ工程

- ロック
- 地切り
- 船倉クリア
- 横行
- 着座
- 状態機械
- インターロック
- 安全中止

完了条件：

- 仮図形だけで一連の工程を完了できる。

### Phase 4: 天候

- seed付きPRNG
- 通常波
- 突風
- 高波群
- 予兆
- 公平性制約

完了条件：

- プレイヤーが予兆を見て対処できる。
- 回避不能イベントがない。

### Phase 5: 評価

- metrics collector
- shared scoring
- rank
- result screen
- タイマー非表示

完了条件：

- 丁寧な操作が高得点になる。
- 同じmetricsでクライアントとLambdaのscoreが一致する。

### Phase 6: AWSランキング

- DynamoDB
- Lambda
- HTTP API
- POST score
- GET leaderboard
- 自己ベスト条件付き更新
- API unit test

完了条件：

- 高いscoreだけが自己ベストを更新する。
- Top rankingが取得できる。

### Phase 7: 独自ドメインとCD

- Route 53 hosted zone lookup
- ACM
- S3 OAC
- CloudFront
- `/api/*` behavior
- A/AAAA alias
- GitHub OIDC
- deploy.yml

完了条件：

- `https://gnfl.pitekusu.dev/`でゲームが開く。
- 同一ドメインの`/api/*`が動く。

### Phase 8: アート置換

- ChatGPTの背景
- Codex SVG
- Phaser effect
- UI仕上げ
- 音響

完了条件：

- 物理コライダーを変更せずに仮図形を正式表示へ置換できる。

### Phase 9: 試遊調整

- ケーブル
- 加減速
- 微速
- 天候強度
- 着座許容範囲
- スコア閾値

完了条件：

- 複数seedで理不尽さがない。
- 一連の操作がゲームとして成立する。

---

## 25. 推奨PR分割

1. `chore: bootstrap React Phaser TypeScript application`
2. `ci: add focused validation workflow`
3. `feat: add simulation worker protocol and fixed step loop`
4. `feat: render worker snapshots in Phaser`
5. `feat: add crane and suspended load greybox physics`
6. `feat: add keyboard and mouse crane controls`
7. `feat: add locking and unloading stage state machine`
8. `feat: add seeded gust and high-wave events`
9. `feat: add unloading metrics and scoring`
10. `feat: add result and leaderboard React screens`
11. `feat: add casual score API and personal-best table`
12. `infra: add S3 CloudFront HTTP API Lambda DynamoDB stack`
13. `infra: add Route 53 domain and ACM certificate`
14. `cd: deploy gnfl.pitekusu.dev through GitHub OIDC`
15. `art: replace greybox visuals with approved assets`
16. `tune: balance unloading physics weather and scoring`

各PRをさらに意味のある小さなコミットへ分けてよい。一つのPRで全Phaseを実装しない。

---

## 26. Definition of Done: 荷揚げv0.1

次をすべて満たすまで完成扱いにしない。

### ゲーム

- [ ] Reactから荷揚げ工程を開始できる。
- [ ] Phaser Canvasが表示される。
- [ ] Rapier WorldがWorker内だけに存在する。
- [ ] 物理が固定120 Hzで更新される。
- [ ] トロリーを左右に操作できる。
- [ ] 巻上げ、巻下げができる。
- [ ] 微速運転ができる。
- [ ] 吊具を位置合わせしてロックできる。
- [ ] 輸送容器が振り子運動する。
- [ ] 船体が通常波で上下・傾斜する。
- [ ] 突風に予兆がある。
- [ ] 高波群に予兆がある。
- [ ] 突風と高波を操作で対処できる。
- [ ] 船倉から容器を取り出せる。
- [ ] 岸壁側へ移動できる。
- [ ] 受台へ着座できる。
- [ ] 重大な物理異常時に安全中止できる。
- [ ] 残り時間と経過時間が表示されない。
- [ ] 工程評価とscoreが表示される。

### ランキング

- [ ] 匿名playerIdがlocalStorageへ保存される。
- [ ] 表示名を入力できる。
- [ ] POST `/api/scores`が動く。
- [ ] GET `/api/leaderboard`が動く。
- [ ] Lambdaがmetricsからscoreを再計算する。
- [ ] 低い記録が自己ベストを上書きしない。
- [ ] 高い記録だけが自己ベストを更新する。
- [ ] Top rankingがscore降順で表示される。
- [ ] API失敗時もローカルリザルトを表示できる。

### AWS

- [ ] S3が非公開である。
- [ ] CloudFront OACからS3を読める。
- [ ] `/api/*`がHTTP APIへ到達する。
- [ ] Lambdaが1関数である。
- [ ] DynamoDBが1テーブル、1 GSIである。
- [ ] `pitekusu.dev`の既存Hosted Zoneを使っている。
- [ ] 新しい重複Hosted Zoneを作っていない。
- [ ] `gnfl.pitekusu.dev`のA/AAAA aliasがCloudFrontを指す。
- [ ] ACM証明書が有効である。
- [ ] HTTPSで公開される。

### GitHubとCI/CD

- [ ] GitHubがSource of Truthである。
- [ ] `ci.yml`が成功する。
- [ ] `deploy.yml`が成功する。
- [ ] GitHub OIDCを使用している。
- [ ] 長期AWSアクセスキーがGitHub Secretsに存在しない。
- [ ] mainへのpushで公開環境へ反映できる。
- [ ] smoke testが公開URLを確認する。

### デザイン

- [ ] 実在施設を一対一で再現していない。
- [ ] ロゴを無断使用していない。
- [ ] 可動物が独立したassetである。
- [ ] 画像へ文字や数値を焼き込んでいない。
- [ ] コライダーと表示assetが分離されている。
- [ ] 詳細はデザイン指示書の受入条件を満たす。

---

## 27. 将来工程への拡張規則

荷揚げv0.1が完成するまで、以下を実装しない。

### 道路運搬

将来はRapierを再利用するが、フル車両シミュレーターにしない。

- 車体剛体
- 簡略サスペンション
- 輸送容器の揺れ
- 加減速
- カーブ横荷重
- 路面段差

エンジントルク、ディファレンシャル、タイヤ熱等は不要。

### 工程液

本格CFDを作らない。

ゲーム判定：

- 液位
- 循環強度
- 混合均一度
- 泡立ち
- 圧力
- 溶解進行度
- 残渣量

視覚：

- シェーダー
- パーティクル
- マスク
- テクスチャスクロール
- 物体の回転、縮小

### ランキング

各工程は`stageId`と`rulesetVersion`を分け、同じDynamoDBテーブルとGSIを再利用する。工程ごとにテーブルやLambdaを増やさない。

---

## 28. 明示的な禁止事項

- 実在施設の詳細図を作ること。
- 公開されていない警備情報を収集すること。
- 実運転に使える薬品濃度、流量、温度、圧力、臨界管理値をゲームへ入れること。
- Reactへ120 HzでsetStateすること。
- メインスレッドにRapier Worldを置くこと。
- `Math.random()`をゲームイベントへ使用すること。
- Worker移行を後回しにすること。
- 本格流体を先に作ること。
- SQSや別Validatorを先回りして作ること。
- WAF、Cognito、RDSを理由なく追加すること。
- 使われない抽象interfaceを大量に作ること。
- 画像輪郭から複雑なコライダーを自動生成すること。
- タイマーを画面へ表示すること。
- クライアント送信scoreをそのまま保存すること。
- 低い記録で自己ベストを上書きすること。
- `pitekusu.dev`の重複Hosted Zoneを作ること。
- AWS長期アクセスキーをGitHubへ保存すること。

---

## 29. 参考にする公式資料

実装時は、採用時点の最新公式ドキュメントを確認すること。

- React documentation
- Phaser documentation
- Rapier JavaScript getting started and collider documentation
- Vite Web Worker documentation
- MDN Web Workers and structured clone documentation
- AWS CloudFront Developer Guide
- AWS CloudFront Origin Access Control documentation
- AWS Route 53 alias record documentation
- AWS Certificate Manager documentation
- API Gateway HTTP API and Lambda proxy integration documentation
- DynamoDB condition expression and GSI documentation
- AWS CDK v2 API reference
- GitHub Actions OpenID Connect documentation

第三者ブログだけを根拠にAWS権限、CloudFront、Route 53、GitHub OIDCを実装しないこと。

---

## 30. 最終原則

このプロジェクトの成功条件は、豪華なAWS構成でも、精密な物理学でもない。

> 船倉から輸送容器を吊り上げ、風と波を読みながら振れを抑え、受台へ丁寧に置く操作が、仮図形でも少し面白いこと。

それが確認できてからCG、ランキング、将来工程を積み上げること。個人開発で完遂できる単純さを守り、複雑さは実測された問題を解決する場合だけ追加すること。
