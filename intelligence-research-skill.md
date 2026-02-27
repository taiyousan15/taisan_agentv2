---
name: intelligence-research
description: Global Intelligence System - 31ソースから金融・AI・開発・著名人発言・経済指標を並列収集しMarkdownレポート生成
argument-hint: "[--category ai_news|crypto|economics|finance|dev_tools|celebrity]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# intelligence-research - ワンコマンドグローバル情報収集

## 使い方

```
/intelligence-research
/intelligence-research --category ai_news
/intelligence-research --category crypto
/intelligence-research --category economics
/intelligence-research --category finance
/intelligence-research --category dev_tools
/intelligence-research --category celebrity
```

## 概要

Global Intelligence System（GIS）を使い、31ソースを並列収集してMarkdownレポートを生成するスキル。
Web検索不要・APIキー設定済みの場合は自動的に有料ソースも使用。

## カバレッジ

| カテゴリ | ソース数 | 内容 |
|---------|---------|------|
| AI・テックニュース | 7 | TechCrunch, The Verge, VentureBeat, MIT Tech Review, ITmedia AI, HN, Bloomberg Tech |
| 開発ツール | 5 | Dev.to, GitHub Trending, ZDNet Japan, Reddit r/programming, r/webdev |
| 金融 | 4 | Reuters Finance, MarketWatch, BBC Business, Reddit r/investing |
| 経済指標 | 11 | FRED 7系列（FF金利・CPI・失業率・GDP等）+ World Bank 4指標 |
| コミュニティ | 5 | HN Best Stories, Reddit r/MachineLearning, r/ClaudeAI, r/LocalLLaMA, r/singularity |
| X (Twitter) | 4 | 著名人13名 + AIトレンド + 監視50アカウント（英25+日25） |

## 自動実行フロー

```
[引数解析] → [GIS 並列収集] → [重複排除・スコアリング] → [レポート出力]
       ↓
  カテゴリ指定なし → 全カテゴリ収集
  --category xxx  → 該当カテゴリのみ
```

## 手順

### 1. プロジェクトパス確認

```
PROJECT_DIR=/Users/matsumototoshihiko/Desktop/開発2026/マーケティングツール革命
```

### 2. 引数解析

ARGUMENTSから `--category` を抽出する。
指定なしの場合は全カテゴリ収集。

### 3. コマンド実行

以下のBashコマンドをプロジェクトディレクトリで実行する:

```bash
cd "$PROJECT_DIR"
npx ts-node src/intelligence/index.ts
```

カテゴリ指定がある場合は環境変数で渡す:

```bash
cd "$PROJECT_DIR"
INTELLIGENCE_CATEGORY=ai_news npx ts-node src/intelligence/index.ts
```

### 4. 出力確認

実行後、以下のディレクトリにレポートが生成される:

```
research/runs/YYYYMMDD__intelligence/
├── intelligence-YYYY-MM-DDTHH-MM-SS.md   ← メインレポート（Markdown）
└── intelligence-YYYY-MM-DDTHH-MM-SS.json ← 生データ（JSON）
```

最新のレポートファイルを `Read` ツールで読み込み、ユーザーに要約を提示する。

### 5. レポート提示形式

```markdown
## 📊 Intelligence Report - YYYY-MM-DD HH:MM

### 📈 経済指標
- [指標名]: [値] [変化]

### 🤖 AI・開発ニュース（上位5件）
- [タイトル] - [ソース]

### 💰 金融・市場
- [タイトル] - [ソース]

### 👤 著名人発言
- [@ハンドル / 名前]: [発言概要]

### 🔗 全レポート
`research/runs/YYYYMMDD__intelligence/intelligence-*.md`
```

## 環境変数（.env）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| FRED_API_KEY | 推奨 | FRED経済指標7系列（無料・要登録） |
| NEWSAPI_KEY | 推奨 | NewsAPI.org（無料枠100req/day） |
| APIFY_TOKEN | オプション | X/Twitter収集（Freeプラン$5クレジット/月） |

APIキーが未設定の場合、該当ソースはスキップされ無料ソースのみで収集。

## 監視対象

### 著名人（WATCH_TARGETS 13名）
Warren Buffett, Elon Musk, Ray Dalio, Sam Altman, Dario Amodei,
Jensen Huang, Satya Nadella, Mark Zuckerberg, Jerome Powell,
Christine Lagarde, 植田和男, 石破茂

### X監視アカウント（X_WATCH_ACCOUNTS 340件）

**英語（170件）**:

AI Coding・開発者（30件）:
@karpathy, @levelsio, @simonw, @t3dotgg, @rowancheung,
@swyx, @jeremyphoward, @HamelHusain, @jxnlco, @DrJimFan,
@reach_vb, @mattshumer_, @hwchase17, @jerryjliu0, @gregkamradt,
@corbtt, @osanseviero, @danielvanstrien, @tunguz, @akshay_pachaar,
@AravSrinivas, @rohanpaul_ai, @aakashg0, @TheAIEdge, @_philschmid,
@mervenoyann, @yoheinakajima, @nutlope, @abidlabs, @heyBarsee

AI Research・科学者（25件）:
@ylecun, @AndrewYNg, @emollick, @fchollet, @_akhaliq,
@demishassabis, @jeffdean, @hardmaru, @AnimeshGarg, @OriolVinyals,
@NandoDF, @clefourrier, @srush_nlp, @GaryMarcus, @chiphuyen,
@rasbt, @eugeneyan, @omarsar0, @Miles_Brundage, @mmitchell_ai,
@JanelleCShane, @gwern, @bindureddy, @IntuitMachine, @jackclarkSF

AI Labs・製品（25件）:
@ollama, @AnthropicAI, @GoogleDeepMind, @huggingface, @mistralai,
@runwayml, @MetaAI, @xai, @perplexity_ai, @cursor_ai,
@replit, @LMSysOrg, @stabilityai, @databricks, @DeepLearningAI,
@LangChainAI, @llamaindex, @weights_biases, @ElevenLabsio, @groq,
@modal_labs, @OpenAI, @Gradio, @lightning_ai, @dair_ai

AI News・ビジネス（70件）:
@nathanbenaich, @importai, @EricTopol, @danielmiessler, @TheRundownAI,
@nonmayorpete, @ArtificialAnlys, @tldr_ai, @sama, @benedictevans,
@StanfordHAI, @pmarca, @garrytan, @MIT_CSAIL, @TechCrunch,
@naval, @balajis, @cdixon, @EMostaque, @GoogleAI,
@ThomWolf, @clementdelangue, @aidangomez, @punk6529, @noahgoldblum,
@lexfridman, @timnitGebru, @katecrawford, @drfeifei, @WojciechZaremba,
@RichardSocher, @azeem, @benthompson, @packyM, @saranormous,
@JeffClune, @MelMitchell47, @smerity, @NickCammarata, @sasha_luccioni,
@WillKnight, @venturebeat, @wired, @theverge, @FastCompany,
@jsteinhardt, @ESYudkowsky, @paulfchristiano, @rajiinio, @joelle_pineau,
@FerencHuszar, @EricJang, @businessinsider, @percyliang, @TristanHarris,
@MaxTegmark, @stuartjrussell, @BrianChristian, @pirroh, @ykilcher,
@hannawallach, @zacharylipton, @emilymbender, @mattturck, @aibreakfast,
@buccocapital, @ai2allen, @TheAITimeline, @aatishb, @kashthefuturist

Crypto・Web3（20件）:
@VitalikButerin, @rovercrc, @ScottMelker, @lookonchain, @CryptoKaleo,
@Cobie, @inversebrah, @DegenSpartan, @MustStopMurad, @mikealfred,
@woonomic, @100trillionUSD, @PositiveCrypto, @CryptoHayes, @DocumentingBTC,
@APompliano, @NickSzabo4, @adam3us, @giacomozucco, @stoolpresidente

**日本語（170件）**:

AI Coding・エンジニア（30件）:
@kinopee_ai, @muscle_coding, @fladdict, @yoshidashingo, @laiso,
@niw, @karaage0703, @rkimurag, @smly, @icoxfog417,
@peta_ok, @takahiroanno, @shu223, @shinyorke, @rkmt,
@tyfkda, @tenforward, @nabetanikoki, @taku_ishitoya, @tatsu_n_a,
@nobusue, @nwatanabe, @hishida_t, @tomomit, @tak_nkjm,
@tetunori, @yoheitomi, @machidakengo, @aiboom_jp, @zenntech_ai

AI Research・モデル（25件）:
@hillbig, @keitowebai, @masahirochaen, @matsuo_yuji, @yoheikikuta,
@sotetsuk, @joisino, @kenkov, @shibata_ryo, @tkng,
@llm_jp, @MizukiTokimatsu, @tmurata, @hayataka, @kubo_y,
@hiro_narazaki, @Hiroki_Kotake, @dennybritz, @deeplearning_jp, @tanakan64,
@gajyumaru, @jjj_bot, @yukihira_t, @kdnakt, @hiro0218

AI Labs・日本企業（25件）:
@elyza_jp, @cyberagent_ai, @PFN_inc, @rinna_co_ltd, @SakanaAI,
@NTTRD, @abeja_inc, @Stockmark_jp, @Fujitsu_AI, @hitachi_rd,
@KDDI_Research, @neoaiinc, @tieriv_inc, @DataRobotJapan, @MathWorks_jp,
@NTT_BX, @softbank_tech, @rakuten_ai, @yahoo_jp_dl, @DeNA_AI,
@AlisAlgo, @CyberAgent, @mtmk_ai, @AI_Shift, @ntt_data_ai

AI News・インフルエンサー（70件）:
@ainichi_jp, @ai_trend_jp, @Codeium_JP, @deeplearning_ai_jp, @tekitousensei,
@gijyutsusyo, @naokin_aibox, @ai_for_jp, @claude_jp, @chatgpt_jp_info,
@ai_weekly_jp, @techcrunch_jp, @itmedia_ai, @impress_ai_news, @mynavi_tech_jp,
@nikkei_tech, @zdnet_jp, @itmedia_news, @ascii_tech, @gihyo_jp,
@qiita_official, @zenn_dev, @dev_to_jp, @connpass, @hatena_dev,
@wired_jp, @businessinsider_jp, @forbesjapan, @gigazine, @nikkeibp,
@nhk_digital, @appbank, @pc_watch_impress, @4gamer_net, @toyo_keizai,
@diamond_online, @president_online, @hayashiyus, @kajikent, @AI_Hakase_JP,
@tech_sasanqua, @chatgpt_life_jp, @genai_jp, @ai_booster_jp, @digital_shift_jp,
@softbankgroup, @NEC_PR, @fujitsu_official, @toshiba_digital, @sony_group,
@LINE_Corp, @zozo_tech, @paypay_corp, @nttdocomo, @SBG_official,
@nikkei_xtech, @CNET_Japan, @engadget_japan, @nii_official, @aist_official,
@riken_pr, @itmedia_enterprise, @watch_impress, @ai_innovation_jp, @meti_meti_jp,
@rakuten_tech, @yahoo_japan, @mercari_jp, @DeNApx, @CyberAgentInc

Crypto・仮想通貨（20件）:
@IHayato, @Kazmax_83, @shingen_crypto, @CryptoYoishi, @btc_kanazawa,
@mitsumizawa_c, @coinpost_jp, @cointelegraph_jp, @coinjinja_jp, @GMO_coinPlus,
@bitflyer_pr, @Zaif_jp, @DMMbitcoin, @bitpoint_jp, @saison_crypto,
@coincheck_pr, @bitbank_jp, @tabitabi_crypto, @nishida_jpbt, @crypto_papa_jp

## FRED 経済指標系列

| ID | 指標 | 単位 |
|----|------|------|
| FEDFUNDS | Fed Funds Rate | % |
| CPIAUCSL | CPI（全都市） | Index |
| UNRATE | 失業率 | % |
| GDP | 米国GDP | Billions USD |
| T10Y2Y | 10Y-2Y スプレッド | % |
| DFF | Effective FF Rate | % |
| DEXJPUS | USD/JPY | JPY per USD |

## エラー時の対処

- **ts-node が見つからない**: `npm install` を実行
- **APIキーエラー**: `.env` ファイルを確認し、キーが正しく設定されているか確認
- **Apify 401**: APIFY_TOKEN の先頭スペースを確認（`cat -A .env | grep APIFY`）
- **タイムアウト**: 個別ソースのエラーはスキップされ収集継続

## ソース追加方法

新しいRSSソースを追加:
```
src/intelligence/collectors/rss-collector.ts の RSS_SOURCES 配列に追加
```

新しいXアカウントを追加:
```
src/intelligence/types/index.ts の X_WATCH_ACCOUNTS 配列に追加
```
