#!/bin/bash
set -euo pipefail

# Tier 1 Auto Implementation Script
# Context Optimization: T1.1, T1.2, T1.3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.json"
LOG_FILE="$PROJECT_ROOT/.claude/hooks/data/tier1-implementation.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize log
mkdir -p "$(dirname "$LOG_FILE")"
echo "=== Tier 1 Implementation Started: $(date) ===" > "$LOG_FILE"

# Counter variables
TOTAL_SKILLS=0
DESCRIPTION_UPDATED=0
DISABLE_MODEL_INVOCATION_ADDED=0
MCPS_DISABLED=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Context Optimization Tier 1 Auto Implementation            ║${NC}"
echo -e "${BLUE}║  Target: 20-32K tokens reduction                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

# ==============================================================================
# Task T1.1: Optimize skill descriptions (English + <50 chars)
# ==============================================================================
echo -e "${YELLOW}[T1.1]${NC} Optimizing skill descriptions..."

# Translation map (Japanese → English, <50 chars)
declare -A TRANSLATIONS=(
    ["太陽スタイル完全準拠のセールスレター作成"]="Taiyo-style sales letter with 176 patterns"
    ["太陽スタイル完全準拠のLP"]="Taiyo-style LP with 4.3x conversion boost"
    ["太陽スタイル完全準拠のVSL"]="Taiyo-style VSL script, 15-chapter structure"
    ["太陽スタイル完全準拠のステップメール"]="Taiyo-style step email with 6 edu elements"
    ["太陽スタイル完全準拠のヘッドライン"]="Taiyo-style headline for max CTR/open rate"
    ["太陽スタイル完全準拠のブレット"]="Taiyo-style bullet points, feature→benefit"
    ["太陽スタイル完全準拠の追伸"]="Taiyo-style P.S. for final conversion push"
    ["太陽スタイル分析・スコアリングエンジン"]="Taiyo analyzer: 176-pattern content scoring"
    ["既存コンテンツを太陽スタイルに変換"]="Rewrite content to Taiyo style for higher CVR"
    ["動画自動生成パイプライン"]="Video automation: download, transcribe, QA, CI/CD"
    ["Gemini 3 FlashのAgentic Vision機能"]="Agentic Vision: image/video analysis with Gemini"
    ["YouTubeサムネイル作成ガイド"]="YouTube thumbnail guide with NanoBanana Pro"
    ["複数のリサーチAPI"]="Unified research: Tavily/SerpAPI/Brave/NewsAPI"
    ["日本語テキストを音声に変換するTTS"]="Japanese TTS: text-to-speech with Fish Audio"
    ["Notion MCPを使って社内ナレッジ検索"]="Notion MCP: search/add/organize knowledge"
    ["X/Instagram/YouTube/noteのSNSマーケティング"]="SNS marketing: X/Instagram/YouTube/note 4KPI"
    ["12セクション全自動LP生成パイプライン"]="12-section LP auto-gen with local LLM + RAG"
    ["AI生成コードの帰属追跡・統計"]="Agent Trace: AI code attribution tracking"
    ["顧客期待を120%超える神対応"]="120% customer support with 6 edu elements"
    ["n8nで業務フローを設計・実装"]="Workflow automation with n8n orchestration"
    ["キーワード入力だけでSNS横断検索"]="Keyword→SNS search→NotebookLM→Gem pipeline"
    ["Udemyコースダウンローダー"]="Udemy course downloader: video/subtitle/assets"
    ["Docker MCPでコンテナ操作"]="Docker MCP: container ops via conversation"
    ["VSL・セミナー・個別相談のセールスシステム"]="Sales systems: VSL/seminar/consultation design"
    ["6つの検索API"]="Mega research: 6 search APIs integrated"
    ["GotenbergでPDF変換・帳票出力"]="PDF automation with Gotenberg (HTML/Office→PDF)"
    ["Instagram Shorts/YouTube Shorts"]="Shorts auto-gen: transcript→edit→deploy"
    ["2つの独立したAIエージェント"]="Dual AI review: Evaluator-Optimizer pattern"
    ["Prometheus+Grafana+Loki"]="Observability: Prometheus/Grafana/Loki/Alert"
    ["自律営業AIパイプライン"]="AI SDR: lead mgmt/scoring/multi-ch outreach"
    ["Validates skill structure"]="Skill validator: check Anthropic best practices"
    ["LPを太陽スタイル基準で分析"]="LP analyzer: Taiyo-style scoring, 4.3x CVR boost"
    ["Kindle本の執筆・構成設計"]="Kindle publishing: outline/TOC/chapter design"
    ["GPT-SoVITS v2による高品質音声"]="GPT-SoVITS v2: high-quality voice cloning TTS"
    ["note記事の作成・マーケティング"]="Note marketing: free/paid article strategy"
    ["面談申込率50%を実現"]="Mendan LP: 50% conversion, 4 proven templates"
    ["Comprehensive PDF processing"]="PDF processing: read/extract/text/metadata/images"
    ["LINEステップメッセージ"]="LINE marketing: step msg/rich menu/official acct"
    ["APIキー不要の統合リサーチ"]="Research (API-free): WebSearch/WebFetch built-in"
    ["8つの検索ソース"]="Mega research+: 8 sources (Tavily/SerpAPI/Brave+)"
    ["参考画像のデザインスタイルを維持"]="LP JSON gen: keep design, change text only"
    ["日給5000万円を生み出した太陽スタイル"]="Taiyo style: copywriting for 50M yen/day"
    ["セールスレター、ステップメール、VSL"]="Copywriting helper: sales letter/email/VSL/launch"
    ["ランディングページの設計・構成"]="LP design: opt-in/sales/manga LP templates"
    ["電話+会話AIオーケストレーション"]="Voice AI: phone + conversation (Twilio + OpenAI)"
    ["6つの教育要素"]="Education framework: 6 elements (purpose→action)"
    ["マルチチャネルメッセージ作成"]="Outreach composer: LINE/Email/SMS/Voice personalization"
    ["URL完全把握システム v3"]="URL analyzer v3: deep site understanding + tech stack"
    ["調査→論点整理→出典付きレポート"]="Research cited report: investigation→analysis→sources"
    ["リード評価・分類スキル"]="Lead scoring: 4D scoring for quality quantification"
    ["プロダクトローンチ動画の台本"]="Launch video: 3-part script (webinar/seminar)"
    ["SNS縦型動画向けテロップ"]="Telop: vertical video subtitles (Reels/TikTok/Shorts)"
    ["ローカルLLM"]="LP local gen: section-by-section with Ollama + RAG"
    ["PostgreSQL MCPでスキーマ確認"]="PostgreSQL MCP: schema check, read-only analysis"
    ["既存キャラクター画像を使用"]="Custom character: consistent marketing assets"
    ["Apify MCP経由でSNS"]="Apify research: SNS/search/EC structured data extraction"
    ["図解・インフォグラフィック"]="Diagram illustration: infographic with NanoBanana"
    ["SNS投稿パターン"]="SNS patterns: platform strategies, risk management"
    ["全世界SNS・学術論文"]="World research: SNS/papers/communities across globe"
    ["NanoBanana向けの高品質プロンプト"]="NanoBanana prompts: high-quality Gemini image gen"
    ["OpenCode反復開発支援"]="OpenCode Ralph Loop: iterative dev support (opt-in)"
    ["Trivyで依存関係/コンテナの脆弱性"]="Security scan Trivy: dependency/container vulns"
    ["アニメ動画・アニメ広告"]="Anime production: video/ad/character animation"
    ["APIキー不要のキーワード抽出"]="Keyword extractor (API-free): WebSearch built-in"
    ["note.comのリサーチツール"]="Note research: unofficial API + MCP + WebSearch"
    ["任意のURLを完全解析"]="URL deep analysis: 5-layer HTML/CSS/design/links"
    ["OpenCodeのバグ修正支援"]="OpenCode fix: mistakes.md ref, minimal diff"
    ["YouTubeチャンネルの動画を分析"]="YouTube channel summary: video analysis + summary"
    ["Appriseで通知チャネル"]="Unified notifications: Apprise (Email/Discord/Slack)"
    ["Marketing AI Factory向け9層"]="Gem research: 9-layer system for Marketing AI"
    ["Pandocでドキュメント変換"]="Doc convert Pandoc: md→docx/pptx automation"
    ["mega-researchと連携して"]="Keyword mega extractor: compound/longtail/niche/rising"
    ["OpenCode/OMOのセットアップ確認"]="OpenCode setup: CLI check, config recommendations"
    ["アニメ風イラスト付きの日本語スライド"]="Anime slide gen: Japanese slides with NanoBanana"
)

for skill_file in "$SKILLS_DIR"/*/skill.md; do
    if [[ ! -f "$skill_file" ]]; then
        continue
    fi

    TOTAL_SKILLS=$((TOTAL_SKILLS + 1))

    # Extract current description
    CURRENT_DESC=$(grep -m1 "^description:" "$skill_file" | sed 's/^description: *//' || echo "")

    if [[ -z "$CURRENT_DESC" ]]; then
        continue
    fi

    # Check if already English and short
    CHAR_COUNT=${#CURRENT_DESC}
    if [[ $CHAR_COUNT -le 50 ]] && [[ "$CURRENT_DESC" =~ ^[a-zA-Z0-9[:space:][:punct:]]+$ ]]; then
        # Already optimized
        continue
    fi

    # Find matching translation
    NEW_DESC=""
    for JP_KEY in "${!TRANSLATIONS[@]}"; do
        if [[ "$CURRENT_DESC" == *"$JP_KEY"* ]]; then
            NEW_DESC="${TRANSLATIONS[$JP_KEY]}"
            break
        fi
    done

    # If no match, create generic English short description
    if [[ -z "$NEW_DESC" ]]; then
        # Extract first meaningful words and shorten
        NEW_DESC=$(echo "$CURRENT_DESC" | head -c 50)
        if [[ ${#CURRENT_DESC} -gt 50 ]]; then
            NEW_DESC="${NEW_DESC}..."
        fi
    fi

    # Update description in skill.md
    if [[ -n "$NEW_DESC" ]] && [[ "$NEW_DESC" != "$CURRENT_DESC" ]]; then
        sed -i '' "s|^description:.*|description: $NEW_DESC|" "$skill_file"
        DESCRIPTION_UPDATED=$((DESCRIPTION_UPDATED + 1))
        echo "  ✓ $(basename "$(dirname "$skill_file")"): $CHAR_COUNT → ${#NEW_DESC} chars" | tee -a "$LOG_FILE"
    fi
done

echo -e "${GREEN}  ✓ Updated $DESCRIPTION_UPDATED/$TOTAL_SKILLS skill descriptions${NC}"
echo

# ==============================================================================
# Task T1.2: Add disable-model-invocation to manual-invocation skills
# ==============================================================================
echo -e "${YELLOW}[T1.2]${NC} Adding disable-model-invocation to manual skills..."

# List of manual-invocation skills (skills with --- header, user-invoked)
for skill_file in "$SKILLS_DIR"/*/skill.md; do
    if [[ ! -f "$skill_file" ]]; then
        continue
    fi

    # Check if already has disable-model-invocation
    if grep -q "^disable-model-invocation:" "$skill_file"; then
        continue
    fi

    # Check if skill has --- (markdown frontmatter) or is user-invocable
    if grep -q "^---$" "$skill_file"; then
        # Add disable-model-invocation: true after description
        if grep -q "^description:" "$skill_file"; then
            sed -i '' '/^description:/a\
disable-model-invocation: true
' "$skill_file"
            DISABLE_MODEL_INVOCATION_ADDED=$((DISABLE_MODEL_INVOCATION_ADDED + 1))
            echo "  ✓ $(basename "$(dirname "$skill_file")")" | tee -a "$LOG_FILE"
        fi
    fi
done

echo -e "${GREEN}  ✓ Added disable-model-invocation to $DISABLE_MODEL_INVOCATION_ADDED skills${NC}"
echo

# ==============================================================================
# Task T1.3: Configure disabledMcpServers in settings.json
# ==============================================================================
echo -e "${YELLOW}[T1.3]${NC} Configuring disabledMcpServers..."

if [[ ! -f "$SETTINGS_FILE" ]]; then
    echo "{}" > "$SETTINGS_FILE"
fi

# Add disabledMcpServers array (pexels, pixabay, puppeteer, browser-use, playwright)
DISABLED_MCPS='["pexels", "pixabay", "puppeteer", "browser-use", "playwright"]'

if ! grep -q '"disabledMcpServers"' "$SETTINGS_FILE"; then
    # Add new field
    jq ". + {\"disabledMcpServers\": $DISABLED_MCPS}" "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    MCPS_DISABLED=5
    echo "  ✓ Disabled 5 MCPs: pexels, pixabay, puppeteer, browser-use, playwright" | tee -a "$LOG_FILE"
else
    echo "  ℹ disabledMcpServers already configured"
fi

echo -e "${GREEN}  ✓ MCP configuration updated${NC}"
echo

# ==============================================================================
# Summary
# ==============================================================================
echo
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Implementation Summary                                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "  📊 Total skills processed:        ${BLUE}$TOTAL_SKILLS${NC}"
echo -e "  ✏️  Descriptions updated:          ${GREEN}$DESCRIPTION_UPDATED${NC}"
echo -e "  🚫 disable-model-invocation added: ${GREEN}$DISABLE_MODEL_INVOCATION_ADDED${NC}"
echo -e "  📡 MCPs disabled:                  ${GREEN}$MCPS_DISABLED${NC}"
echo
echo -e "  📝 Log file: ${BLUE}$LOG_FILE${NC}"
echo

# Estimated token reduction
ESTIMATED_REDUCTION=$((DESCRIPTION_UPDATED * 100 + DISABLE_MODEL_INVOCATION_ADDED * 150 + MCPS_DISABLED * 500))
echo -e "  ${GREEN}✓ Estimated token reduction: ~${ESTIMATED_REDUCTION} tokens${NC}"
echo

echo "=== Tier 1 Implementation Completed: $(date) ===" >> "$LOG_FILE"
echo "Description updates: $DESCRIPTION_UPDATED" >> "$LOG_FILE"
echo "disable-model-invocation added: $DISABLE_MODEL_INVOCATION_ADDED" >> "$LOG_FILE"
echo "MCPs disabled: $MCPS_DISABLED" >> "$LOG_FILE"
echo "Estimated reduction: $ESTIMATED_REDUCTION tokens" >> "$LOG_FILE"

exit 0
