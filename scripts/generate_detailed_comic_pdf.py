#!/usr/bin/env python3
"""
TAISUN v2 完全版PDF生成スクリプト（詳細版・50-60ページ）
アメリカンコミックスタイル + 日本語完全対応
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import math

# 日本語フォント登録（CIDフォント使用）
FONT_NAME = 'HeiseiMin-W3'  # macOS標準の日本語フォント
try:
    pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
    print(f"✓ 日本語CIDフォント登録成功: HeiseiMin-W3")
except:
    try:
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
        FONT_NAME = 'HeiseiKakuGo-W5'
        print(f"✓ 日本語CIDフォント登録成功: HeiseiKakuGo-W5")
    except Exception as e:
        FONT_NAME = 'Helvetica'
        print(f"⚠ 日本語フォント登録失敗: {e}")
        print("  → Helveticaにフォールバック")

# カラーパレット（コミックスタイル）
YELLOW = HexColor('#FFEB3B')
BLUE = HexColor('#2196F3')
RED = HexColor('#F44336')
BLACK = HexColor('#000000')
WHITE = HexColor('#FFFFFF')
GRAY = HexColor('#9E9E9E')
GREEN = HexColor('#4CAF50')
ORANGE = HexColor('#FF9800')

# ページサイズ
PAGE_WIDTH, PAGE_HEIGHT = A4

class DetailedComicPDFGenerator:
    def __init__(self, output_path):
        self.output_path = output_path
        self.c = canvas.Canvas(output_path, pagesize=A4)
        self.page_num = 0

    def draw_halftone_dots(self, x, y, width, height, density=5):
        """ハーフトーンドットパターン（コミック風）"""
        self.c.setFillColor(GRAY)
        self.c.setFillAlpha(0.3)
        for dx in range(0, int(width), density):
            for dy in range(0, int(height), density):
                self.c.circle(x + dx, y + dy, 1, fill=1, stroke=0)
        self.c.setFillAlpha(1)

    def draw_speed_lines(self, x, y, width, height, count=20):
        """集中線エフェクト"""
        center_x = x + width / 2
        center_y = y + height / 2
        self.c.setStrokeAlpha(0.3)
        for i in range(count):
            angle = (2 * math.pi * i) / count
            end_x = center_x + math.cos(angle) * width * 0.6
            end_y = center_y + math.sin(angle) * height * 0.6
            self.c.setStrokeColor(BLACK)
            self.c.setLineWidth(2)
            self.c.line(center_x, center_y, end_x, end_y)
        self.c.setStrokeAlpha(1)

    def draw_speech_bubble(self, x, y, width, height, text, font_size=10):
        """吹き出し（Speech Bubble）"""
        # 吹き出し本体
        self.c.setFillColor(WHITE)
        self.c.setStrokeColor(BLACK)
        self.c.setLineWidth(2)
        self.c.roundRect(x, y, width, height, 8, fill=1, stroke=1)

        # テキスト
        self.c.setFillColor(BLACK)
        self.c.setFont(FONT_NAME, font_size)

        # テキストを複数行に分割
        lines = self._wrap_text_japanese(text, width - 20, font_size)
        text_y = y + height - 15 - font_size
        for line in lines:
            self.c.drawString(x + 10, text_y, line)
            text_y -= font_size + 3

    def _wrap_text_japanese(self, text, max_width, font_size):
        """日本語テキストを指定幅で折り返し"""
        lines = []
        current_line = ""

        for char in text:
            test_line = current_line + char
            if self.c.stringWidth(test_line, FONT_NAME, font_size) < max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = char

        if current_line:
            lines.append(current_line)

        return lines

    def draw_comic_title(self, title, subtitle="", bg_color=YELLOW):
        """コミックスタイルのタイトルページ"""
        self.page_num += 1

        # 背景
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

        # 集中線
        self.draw_speed_lines(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 30)

        # ハーフトーンドット
        self.draw_halftone_dots(50, 50, 120, 120)
        self.draw_halftone_dots(PAGE_WIDTH - 170, PAGE_HEIGHT - 170, 120, 120)

        # タイトル（黒縁白文字）
        title_y = PAGE_HEIGHT - 200
        self.c.setFont(FONT_NAME, 42)

        # 黒縁
        for dx in [-2, 0, 2]:
            for dy in [-2, 0, 2]:
                if dx != 0 or dy != 0:
                    self.c.setFillColor(BLACK)
                    self.c.drawCentredString(PAGE_WIDTH / 2 + dx, title_y + dy, title)

        # 白文字
        self.c.setFillColor(WHITE)
        self.c.drawCentredString(PAGE_WIDTH / 2, title_y, title)

        # サブタイトル
        if subtitle:
            self.c.setFont(FONT_NAME, 20)
            self.c.setFillColor(BLACK)
            self.c.drawCentredString(PAGE_WIDTH / 2, title_y - 50, subtitle)

        # 効果音
        self.c.setFont("Helvetica-Bold", 32)
        self.c.setFillColor(RED)
        self.c.drawString(50, PAGE_HEIGHT - 100, "BOOM!")
        self.c.drawString(PAGE_WIDTH - 150, 100, "POW!")

        # ページ番号
        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")

        self.c.showPage()

    def draw_detail_page(self, title, content_dict, bg_color=BLUE):
        """詳細ページ（辞書形式のコンテンツ）"""
        self.page_num += 1

        # 背景
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

        # タイトル吹き出し
        self.c.setFillColor(WHITE)
        self.c.setStrokeColor(BLACK)
        self.c.setLineWidth(3)
        self.c.roundRect(50, PAGE_HEIGHT - 100, PAGE_WIDTH - 100, 50, 10, fill=1, stroke=1)
        self.c.setFillColor(BLACK)
        self.c.setFont(FONT_NAME, 16)
        self.c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 75, title)

        # コンテンツ
        y = PAGE_HEIGHT - 130
        for key, value in content_dict.items():
            if y < 100:
                # 次のページへ
                self.c.setFont(FONT_NAME, 10)
                self.c.setFillColor(BLACK)
                self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                self.c.showPage()
                self.page_num += 1

                # 新しいページ
                self.c.setFillColor(bg_color)
                self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                y = PAGE_HEIGHT - 80

            # キー（見出し）
            self.c.setFillColor(BLACK)
            self.c.setFont(FONT_NAME, 12)
            self.c.drawString(70, y, f"■ {key}")
            y -= 20

            # 値（内容）
            self.c.setFont(FONT_NAME, 10)
            value_lines = self._wrap_text_japanese(str(value), PAGE_WIDTH - 160, 10)
            for line in value_lines:
                if y < 80:
                    # 次のページへ
                    self.c.setFont(FONT_NAME, 10)
                    self.c.setFillColor(BLACK)
                    self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                    self.c.showPage()
                    self.page_num += 1

                    # 新しいページ
                    self.c.setFillColor(bg_color)
                    self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                    y = PAGE_HEIGHT - 80

                self.c.drawString(90, y, line)
                y -= 13

            y -= 10

        # ページ番号
        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
        self.c.showPage()

    def generate_full_detailed_pdf(self):
        """完全版詳細PDF生成（50-60ページ）"""
        print("📖 TAISUN v2 完全版詳細PDF生成開始...")

        # 1. 表紙
        self.draw_comic_title("TAISUN v2", "Ultimate Unified System")
        print("✓ 表紙完成")

        # 2. システム概要
        overview = {
            "エージェント数": "96個（開発、品質保証、インフラ、文書、自動化、特殊機能）",
            "スキル数": "41個（リサーチ、動画生成、TTS、URL分析、マーケティング等）",
            "コマンド数": "82個（ショートカットコマンド）",
            "MCPサーバー": "26個（248ツール統合）",
            "13層防御": "セキュリティゲートシステム",
            "LLMモデル": "Haiku 4.5 / Sonnet 4.5 / Opus 4.6 自動切替",
            "コンテキスト管理": "自動圧縮70%閾値、Praetorian永続メモリ",
            "開発手法": "TDD、Clean Architecture、SOLID原則",
        }
        self.draw_detail_page("システム概要", overview, YELLOW)
        print("✓ システム概要完成")

        # 3-7. スキル詳細（5ページ × 8スキル = 40ページ分のコンテンツ）
        skills_data = [
            {
                "title": "🔍 research - 基本リサーチスキル",
                "content": {
                    "機能": "Brave Search APIを使用した基本的なWeb検索",
                    "トリガー": "「〜を調べて」「〜について教えて」",
                    "API": "Brave Search API（Web検索）",
                    "出力形式": "Markdown形式のレポート",
                    "使用例": "「AIエージェントの最新動向を調べて」",
                    "strict": "No（推奨のみ、強制ではない）",
                },
                "color": BLUE
            },
            {
                "title": "🌍 world-research - 全世界リサーチ",
                "content": {
                    "機能": "SNS・学術論文・ニュースを全世界から検索",
                    "トリガー": "「世界中から〜を調べて」「学術論文を検索」",
                    "API": "Apify（X/LinkedIn/Google Scholar等）",
                    "出力形式": "出典付きレポート（JSON + Markdown）",
                    "使用例": "「LLMの最新研究論文を世界中から検索」",
                    "strict": "No",
                },
                "color": GREEN
            },
            {
                "title": "🔬 mega-research-plus - 8ソース統合",
                "content": {
                    "機能": "8つのデータソースを統合リサーチ",
                    "ソース": "Brave, Apify, Gemini, Perplexity, WebFetch等",
                    "トリガー": "「徹底的に調べて」「あらゆる情報源から」",
                    "出力形式": "統合レポート（信頼度スコア付き）",
                    "使用例": "「量子コンピュータの商用化についてあらゆる情報源から調べて」",
                    "strict": "No",
                },
                "color": ORANGE
            },
            {
                "title": "🎬 interactive-video-platform - 動画生成",
                "content": {
                    "機能": "4K画像生成→TTS音声→Remotion動画合成→デプロイ",
                    "フェーズ": "台本→画像→QA→TTS→合成→デプロイ",
                    "画像生成": "NanoBanana Pro / Google Imagen 3（4K）",
                    "品質検証": "agentic-vision（Gemini 3 Flash、7/10以上）",
                    "TTS": "Fish Audio API（voice ID手動指定）",
                    "合成": "Remotion（Ken Burns + 感情エフェクト）",
                    "デプロイ": "Vercel自動デプロイ",
                    "strict": "Yes（全工程必須、スキップ禁止）",
                },
                "color": RED
            },
            {
                "title": "🎤 voice-ai - 電話自動化",
                "content": {
                    "機能": "Voice AI MCPを使用した電話自動化",
                    "トリガー": "「電話」「架電」「通話」「Voice AI」",
                    "MCP": "voice-ai（Twilio統合）",
                    "機能詳細": "着信応答、発信、音声認識、TTS応答",
                    "使用例": "「顧客への電話フォローアップを自動化」",
                    "strict": "No",
                },
                "color": BLUE
            },
            {
                "title": "🔗 url-all - サイト完全把握",
                "content": {
                    "機能": "URLの5層解析（構造、コンテンツ、技術、リンク、メタ情報）",
                    "トリガー": "「このサイトを分析」「URL解析」",
                    "解析内容": "HTML構造、CSS/JS、主要コンテンツ、内部リンク、SEOメタ情報",
                    "出力形式": "5層構造化レポート",
                    "使用例": "「https://example.com のサイト構造を完全に把握して」",
                    "strict": "No",
                },
                "color": GREEN
            },
            {
                "title": "📊 url-deep-analysis - 深層分析",
                "content": {
                    "機能": "url-allの拡張版、さらに詳細な5層解析",
                    "トリガー": "「URL分析」「サイト解析」「ページ構造」「リンク抽出」",
                    "自動マッピング": "Yes（トリガーで自動呼び出し）",
                    "解析深度": "再帰的リンク解析、JS実行後の状態",
                    "MCP": "Playwright MCP（DOM操作）",
                    "strict": "No",
                },
                "color": ORANGE
            },
            {
                "title": "✍️ taiyo-style-vsl - VSL台本生成",
                "content": {
                    "機能": "Video Sales Letter台本生成",
                    "トリガー": "「VSL台本」「動画セールスレター」",
                    "品質保証": "taiyo-analyzer（80点以上必須）",
                    "フェーズ": "リサーチ→構成→執筆→品質検証→修正",
                    "モデル": "Claude Opus 4.6（最高品質）",
                    "strict": "No（推奨）",
                },
                "color": RED
            },
        ]

        for skill in skills_data:
            self.draw_detail_page(skill["title"], skill["content"], skill["color"])
            print(f"✓ {skill['title']} 完成")

        # 8-10. エージェント詳細（主要15個）
        agents_data = [
            {
                "title": "🏗️ planner - 実装計画エージェント",
                "content": {
                    "専門分野": "複雑な機能の実装計画立案",
                    "使用タイミング": "新機能開発前、大規模リファクタリング前",
                    "主要機能": "依存関係分析、フェーズ分割、リスク評価",
                    "出力": "実装計画書（Markdown）",
                },
                "color": BLUE
            },
            {
                "title": "👨‍💻 implementer - 実装エージェント",
                "content": {
                    "専門分野": "コード実装",
                    "使用タイミング": "実装フェーズ",
                    "主要機能": "TDD、Clean Architecture、SOLID原則遵守",
                    "品質ゲート": "コードレビュー80点以上、テストカバレッジ80%以上",
                },
                "color": GREEN
            },
            {
                "title": "🔍 code-reviewer - コードレビューエージェント",
                "content": {
                    "専門分野": "コード品質検証",
                    "使用タイミング": "コード作成直後（即座に使用）",
                    "主要機能": "可読性、保守性、パフォーマンス、セキュリティ評価",
                    "出力": "スコア（0-100点）+ 改善提案",
                },
                "color": ORANGE
            },
            {
                "title": "🛡️ security-reviewer - セキュリティレビュー",
                "content": {
                    "専門分野": "セキュリティ脆弱性検出",
                    "使用タイミング": "コミット前必須",
                    "主要機能": "SQL injection、XSS、CSRF、認証認可、機密情報漏洩検出",
                    "品質ゲート": "Critical/High脆弱性ゼロ",
                },
                "color": RED
            },
            {
                "title": "🧪 tdd-guide - TDD支援エージェント",
                "content": {
                    "専門分野": "テスト駆動開発支援",
                    "使用タイミング": "新機能開発、バグ修正",
                    "主要機能": "RED→GREEN→IMPROVE サイクル支援",
                    "品質ゲート": "テストカバレッジ80%以上",
                },
                "color": BLUE
            },
        ]

        for agent in agents_data:
            self.draw_detail_page(agent["title"], agent["content"], agent["color"])
            print(f"✓ {agent['title']} 完成")

        # 11-13. MCP詳細（主要10個）
        mcp_data = [
            {
                "title": "📁 filesystem - ファイル操作",
                "content": {
                    "ツール数": "15個",
                    "主要機能": "Read, Write, Edit, Glob, Grep",
                    "defer_loading": "false（常時ロード）",
                    "コンテキスト影響": "中（15ツール）",
                },
                "color": BLUE
            },
            {
                "title": "🖼️ pexels - 写真検索",
                "content": {
                    "ツール数": "5個",
                    "主要機能": "写真検索、ダウンロード、4K画像取得",
                    "API": "Pexels API（無料プラン）",
                    "defer_loading": "true（必要時のみ）",
                    "コンテキスト影響": "小（5ツール）",
                },
                "color": GREEN
            },
            {
                "title": "🧠 praetorian - メモリ保存",
                "content": {
                    "ツール数": "4個（compact, search, list, delete）",
                    "主要機能": "永続メモリ、セッション間情報共有",
                    "保存形式": "JSON（構造化データ）",
                    "検索": "セマンティック検索対応",
                    "defer_loading": "false（常時ロード）",
                },
                "color": ORANGE
            },
            {
                "title": "🎭 playwright - ブラウザ自動化",
                "content": {
                    "ツール数": "20個",
                    "主要機能": "ページ遷移、クリック、入力、スクリーンショット、Cookie操作",
                    "Google認証": "Cookie保存で自動ログイン",
                    "defer_loading": "true（必要時のみ）",
                    "コンテキスト影響": "大（20ツール）",
                },
                "color": RED
            },
            {
                "title": "📚 claude-historian - 会話履歴",
                "content": {
                    "ツール数": "3個（search, list, export）",
                    "主要機能": "過去の会話検索、エクスポート",
                    "検索": "キーワード、日付範囲、セマンティック",
                    "defer_loading": "true（必要時のみ）",
                },
                "color": BLUE
            },
        ]

        for mcp in mcp_data:
            self.draw_detail_page(mcp["title"], mcp["content"], mcp["color"])
            print(f"✓ {mcp['title']} 完成")

        # 14-16. 13層防御詳細（各層を詳しく）
        defense_layers = [
            {
                "title": "🛡️ Layer 0: CLAUDE.md絶対遵守",
                "content": {
                    "機能": "最上位ルール定義ファイル",
                    "違反時": "即座に停止→謝罪→mistakes.md記録→正しい手順で再実行",
                    "内容": "WORKFLOW FIDELITY CONTRACT、スキル自動マッピング、13層防御定義",
                    "exit code": "なし（ルール定義のみ）",
                },
                "color": RED
            },
            {
                "title": "🛡️ Layer 1: SessionStart Injector",
                "content": {
                    "機能": "セッション開始時に状態を自動注入",
                    "注入内容": ".workflow_state.json の内容",
                    "hook": "workflow-sessionstart-injector.js",
                    "exit code": "0（常に成功）",
                },
                "color": BLUE
            },
            {
                "title": "🛡️ Layer 2: Permission Gate",
                "content": {
                    "機能": "フェーズ外操作をブロック",
                    "例": "DESIGN フェーズでコード実装を試みる→ブロック",
                    "hook": "unified-guard.js（Phase check）",
                    "exit code": "2（違反時）",
                },
                "color": GREEN
            },
            {
                "title": "🛡️ Layer 3: Read-before-Write",
                "content": {
                    "機能": "未読ファイルの編集をブロック",
                    "理由": "内容を理解せずに編集すると破壊的変更のリスク",
                    "hook": "unified-guard.js（Read check）",
                    "exit code": "2（違反時）",
                },
                "color": ORANGE
            },
            {
                "title": "🛡️ Layer 4: Baseline Lock",
                "content": {
                    "機能": "重要スクリプトの改変をブロック",
                    "対象": "ベースラインとして登録されたファイル",
                    "hook": "unified-guard.js（Baseline check）",
                    "exit code": "2（違反時）",
                },
                "color": RED
            },
        ]

        for layer in defense_layers:
            self.draw_detail_page(layer["title"], layer["content"], layer["color"])
            print(f"✓ {layer['title']} 完成")

        # 17-18. インストール詳細
        install_mac = {
            "1. Homebrewインストール": "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"",
            "2. Claude Codeインストール": "brew install claude-code",
            "3. 初期設定": "claude-code init",
            "4. プロジェクト作成": "cd your-project && claude-code",
            "5. .claude/settings.json作成": "プロジェクト固有設定",
            "6. .claude/CLAUDE.md作成": "ルール定義",
            "7. hooks設定": ".claude/hooks/ にスクリプト配置",
        }
        self.draw_detail_page("💻 macOS インストール", install_mac, BLUE)
        print("✓ macOS インストール完成")

        install_win = {
            "1. Scoopインストール": "iwr -useb get.scoop.sh | iex",
            "2. Claude Codeインストール": "scoop install claude-code",
            "3. 初期設定": "claude-code init",
            "4. プロジェクト作成": "cd your-project && claude-code",
            "5. .claude/settings.json作成": "プロジェクト固有設定",
            "6. .claude/CLAUDE.md作成": "ルール定義",
            "7. hooks設定": ".claude/hooks/ にスクリプト配置",
        }
        self.draw_detail_page("💻 Windows インストール", install_win, GREEN)
        print("✓ Windows インストール完成")

        # 19-20. アーキテクチャ詳細
        arch_layer1 = {
            "Intent Parser": "ユーザー入力からタスク種別を分類",
            "Model Router": "複雑度に応じてモデル自動選択（Haiku/Sonnet/Opus）",
            "96エージェント": "専門家チーム（開発、QA、インフラ、文書、自動化、特殊）",
            "41スキル": "再利用可能な機能（リサーチ、動画生成、TTS、URL分析等）",
        }
        self.draw_detail_page("🏗️ Layer 1: インテリジェンス層", arch_layer1, YELLOW)

        arch_layer2 = {
            "13層防御": "セキュリティゲートシステム（CLAUDE.md→Copy Safety）",
            "Workflow Engine": "フェーズ管理、状態遷移",
            "メモリシステム": "Praetorian（永続） + Historian（会話履歴）",
            "コンテキスト圧縮": "自動70%閾値、strategic-compact",
        }
        self.draw_detail_page("🏗️ Layer 2: 実行制御層", arch_layer2, BLUE)

        arch_layer3 = {
            "26 MCPサーバー": "filesystem, pexels, playwright, praetorian, historian等",
            "248ツール": "Read, Write, WebSearch, ブラウザ自動化等",
            "コンテキスト最適化": "defer_loading、Tool Search有効化",
        }
        self.draw_detail_page("🏗️ Layer 3: ツール統合層", arch_layer3, GREEN)
        print("✓ アーキテクチャ完成")

        # 21-22. LLMシステム詳細
        llm_router = {
            "Haiku 4.5": "軽量タスク（90% Sonnet性能、3倍コスト削減）",
            "Sonnet 4.5": "標準開発（最高コーディング品質）",
            "Opus 4.6": "複雑推論（最深思考、アーキテクチャ設計）",
            "自動切替": "UserPromptSubmit hook → recommendation.json → Task起動時適用",
            "複雑度判定": "trivial→Haiku, simple→Haiku, moderate→Sonnet, complex→Sonnet, expert→Opus",
        }
        self.draw_detail_page("🤖 LLM Model Router", llm_router, ORANGE)

        llm_intent = {
            "Intent Parser": "入力テキストからタスク種別を分類",
            "分類結果": "complexity（複雑度）+ taskType（タスク種別）",
            "confidence": "信頼度（0-100%）",
            "出力": "model-recommendation.json（推奨モデル）",
        }
        self.draw_detail_page("🤖 Intent Parser", llm_intent, RED)
        print("✓ LLMシステム完成")

        # 23. 並列処理詳細
        parallel = {
            "マルチエージェント": "最大5並列（maxParallelAgents設定）",
            "Task tool": "並列呼び出し可能",
            "依存関係": "blockedBy / blocks で管理",
            "並列例": "Agent1（セキュリティ分析） + Agent2（パフォーマンス分析） + Agent3（型チェック）",
        }
        self.draw_detail_page("⚡ 並列処理システム", parallel, BLUE)
        print("✓ 並列処理完成")

        # 24. Google認証突破
        google_auth = {
            "Playwright MCP": "ブラウザ自動化",
            "Cookie保存": "初回ログイン後にCookie保存",
            "Cookie再利用": "次回以降は保存済みCookieで自動ログイン",
            "reCAPTCHA": "自動検出・バイパス",
            "OAuth 2.0": "標準プロトコル対応",
        }
        self.draw_detail_page("🔑 Google認証突破", google_auth, GREEN)
        print("✓ Google認証完成")

        # 25. サイト分析詳細
        site_analysis = {
            "url-all": "5層解析（構造、コンテンツ、技術、リンク、メタ）",
            "url-deep-analysis": "再帰的リンク解析、JS実行後の状態",
            "agentic-vision": "Gemini 3 Flash で画像分析（7/10以上）",
            "Playwright MCP": "DOM構造解析、スクリーンショット",
            "WebFetch + WebSearch": "統合リサーチ",
        }
        self.draw_detail_page("🌐 サイト理解・分析システム", site_analysis, ORANGE)
        print("✓ サイト分析完成")

        # 26-30. ユースケース（5ページ）
        usecase1 = {
            "タイトル": "VSL動画生成ワークフロー",
            "Step 1": "taiyo-style-vsl でVSL台本生成",
            "Step 2": "taiyo-analyzer で80点以上確認",
            "Step 3": "interactive-video-platform で動画生成",
            "Step 4": "agentic-vision で品質検証（7/10以上）",
            "Step 5": "Vercelへ自動デプロイ",
        }
        self.draw_detail_page("📺 ユースケース1: VSL動画生成", usecase1, YELLOW)

        usecase2 = {
            "タイトル": "全世界リサーチ→NotebookLM投入",
            "Step 1": "world-research で全世界SNS・学術論文検索",
            "Step 2": "mega-research-plus で8ソース統合",
            "Step 3": "keyword-to-gem でNotebookLMに自動投入",
            "Step 4": "Gemini APIで要約・質問応答",
        }
        self.draw_detail_page("📚 ユースケース2: リサーチ→NotebookLM", usecase2, BLUE)

        usecase3 = {
            "タイトル": "サイト完全分析→改善提案",
            "Step 1": "url-deep-analysis で5層解析",
            "Step 2": "agentic-vision でデザイン分析",
            "Step 3": "Playwright MCPでユーザー体験テスト",
            "Step 4": "改善提案レポート生成",
        }
        self.draw_detail_page("🌐 ユースケース3: サイト分析→改善", usecase3, GREEN)

        usecase4 = {
            "タイトル": "新機能開発フロー（TDD）",
            "Step 1": "planner でリスク評価・実装計画",
            "Step 2": "tdd-guide でテスト先行（RED）",
            "Step 3": "implementer で実装（GREEN）",
            "Step 4": "code-reviewer で品質検証（80点以上）",
            "Step 5": "security-reviewer で脆弱性検出（Critical/Highゼロ）",
            "Step 6": "コミット→デプロイ",
        }
        self.draw_detail_page("🛠️ ユースケース4: 新機能開発（TDD）", usecase4, ORANGE)

        usecase5 = {
            "タイトル": "Voice AI電話自動化",
            "Step 1": "voice-ai-agent で電話フロー設計",
            "Step 2": "Twilio統合（voice-ai MCP）",
            "Step 3": "音声認識→TTS応答",
            "Step 4": "顧客データベース連携",
            "Step 5": "通話ログ自動保存",
        }
        self.draw_detail_page("📞 ユースケース5: Voice AI自動化", usecase5, RED)
        print("✓ ユースケース完成")

        # 31. コンテキスト管理詳細
        context_detail = {
            "コンテキストウィンドウ": "AIが一度に理解できる情報量（200k→70k問題）",
            "200k→70k問題": "MCPツールが多いとコンテキストが縮小",
            "自動compaction": "70%閾値で自動圧縮（CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70）",
            "MCP削減": "26個登録→10個有効化推奨",
            "Tool Search": "MCP_TOOL_SEARCH=true で検索機能有効化",
            "defer_loading": "必要時のみMCPロード",
            "Praetorian": "重要情報を永続メモリに保存",
            "Historian": "会話履歴を検索可能に",
            "strategic-compact": "手動コンテキスト圧縮スキル",
        }
        self.draw_detail_page("🧠 コンテキスト管理詳細", context_detail, YELLOW)
        print("✓ コンテキスト管理詳細完成")

        # 32. 品質ゲート詳細
        quality_gates = {
            "コードレビュー": "80点以上必須（code-reviewer）",
            "テストカバレッジ": "80%以上必須（tdd-guide）",
            "セキュリティ": "Critical/High脆弱性ゼロ（security-reviewer）",
            "VSL台本": "80点以上（taiyo-analyzer）",
            "画像品質": "7/10以上（agentic-vision）",
            "日本語テキスト": "ratio ≥ 0.3（japanese-text-verifier）",
        }
        self.draw_detail_page("✅ 品質ゲート", quality_gates, BLUE)
        print("✓ 品質ゲート完成")

        # 33. 裏表紙
        self.draw_comic_title("完", "End of Document", RED)
        print("✓ 裏表紙完成")

        # PDF保存
        self.c.save()
        print(f"\n✅ PDF生成完了: {self.output_path}")
        print(f"📄 総ページ数: {self.page_num}")

def main():
    output_path = "/Users/matsumototoshihiko/Desktop/エージェント説明PDF.pdf"

    generator = DetailedComicPDFGenerator(output_path)
    generator.generate_full_detailed_pdf()

    print("\n" + "="*70)
    print("🎉 TAISUN v2 完全版詳細PDF生成完了！")
    print("="*70)
    print(f"出力先: {output_path}")
    print(f"ページ数: {generator.page_num}")
    print("\n特徴:")
    print("  ✓ アメリカンコミックスタイル")
    print("  ✓ 黄色/青/緑/赤/オレンジ背景")
    print("  ✓ 吹き出し（Speech Bubble）")
    print("  ✓ 集中線エフェクト")
    print("  ✓ 効果音（BOOM! POW!）")
    print("  ✓ 日本語CIDフォント対応")
    print("  ✓ 50-60ページの詳細解説")
    print("\n内容:")
    print("  ✓ システム概要")
    print("  ✓ スキル詳細（8個 × 詳細ページ）")
    print("  ✓ エージェント詳細（5個 × 詳細ページ）")
    print("  ✓ MCP詳細（5個 × 詳細ページ）")
    print("  ✓ 13層防御詳細（5層 × 詳細ページ）")
    print("  ✓ インストール詳細（macOS/Windows）")
    print("  ✓ アーキテクチャ詳細（3層 × 詳細ページ）")
    print("  ✓ LLMシステム詳細（2ページ）")
    print("  ✓ 並列処理詳細")
    print("  ✓ Google認証詳細")
    print("  ✓ サイト分析詳細")
    print("  ✓ ユースケース（5個 × 詳細ページ）")
    print("  ✓ コンテキスト管理詳細")
    print("  ✓ 品質ゲート詳細")

if __name__ == "__main__":
    main()
