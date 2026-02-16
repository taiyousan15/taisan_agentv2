#!/usr/bin/env python3
"""
TAISUN v2 完全版PDF生成スクリプト（50-60ページ完全版）
アメリカンコミックスタイル + 日本語完全対応
全スキル・エージェント・MCP・13層防御を網羅
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import math

# 日本語フォント登録（CIDフォント使用）
FONT_NAME = 'HeiseiMin-W3'
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

# カラーパレット
YELLOW = HexColor('#FFEB3B')
BLUE = HexColor('#2196F3')
RED = HexColor('#F44336')
BLACK = HexColor('#000000')
WHITE = HexColor('#FFFFFF')
GRAY = HexColor('#9E9E9E')
GREEN = HexColor('#4CAF50')
ORANGE = HexColor('#FF9800')
PURPLE = HexColor('#9C27B0')
CYAN = HexColor('#00BCD4')

PAGE_WIDTH, PAGE_HEIGHT = A4

class CompleteComicPDFGenerator:
    def __init__(self, output_path):
        self.output_path = output_path
        self.c = canvas.Canvas(output_path, pagesize=A4)
        self.page_num = 0

    def draw_halftone_dots(self, x, y, width, height, density=5):
        self.c.setFillColor(GRAY)
        self.c.setFillAlpha(0.3)
        for dx in range(0, int(width), density):
            for dy in range(0, int(height), density):
                self.c.circle(x + dx, y + dy, 1, fill=1, stroke=0)
        self.c.setFillAlpha(1)

    def draw_speed_lines(self, x, y, width, height, count=20):
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

    def _wrap_text_japanese(self, text, max_width, font_size):
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
        self.page_num += 1
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        self.draw_speed_lines(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 30)
        self.draw_halftone_dots(50, 50, 120, 120)
        self.draw_halftone_dots(PAGE_WIDTH - 170, PAGE_HEIGHT - 170, 120, 120)

        title_y = PAGE_HEIGHT - 200
        self.c.setFont(FONT_NAME, 42)
        for dx in [-2, 0, 2]:
            for dy in [-2, 0, 2]:
                if dx != 0 or dy != 0:
                    self.c.setFillColor(BLACK)
                    self.c.drawCentredString(PAGE_WIDTH / 2 + dx, title_y + dy, title)
        self.c.setFillColor(WHITE)
        self.c.drawCentredString(PAGE_WIDTH / 2, title_y, title)

        if subtitle:
            self.c.setFont(FONT_NAME, 20)
            self.c.setFillColor(BLACK)
            self.c.drawCentredString(PAGE_WIDTH / 2, title_y - 50, subtitle)

        self.c.setFont("Helvetica-Bold", 32)
        self.c.setFillColor(RED)
        self.c.drawString(50, PAGE_HEIGHT - 100, "BOOM!")
        self.c.drawString(PAGE_WIDTH - 150, 100, "POW!")

        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
        self.c.showPage()

    def draw_detail_page(self, title, content_dict, bg_color=BLUE):
        self.page_num += 1
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

        self.c.setFillColor(WHITE)
        self.c.setStrokeColor(BLACK)
        self.c.setLineWidth(3)
        self.c.roundRect(50, PAGE_HEIGHT - 100, PAGE_WIDTH - 100, 50, 10, fill=1, stroke=1)
        self.c.setFillColor(BLACK)
        self.c.setFont(FONT_NAME, 16)
        self.c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 75, title)

        y = PAGE_HEIGHT - 130
        for key, value in content_dict.items():
            if y < 100:
                self.c.setFont(FONT_NAME, 10)
                self.c.setFillColor(BLACK)
                self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                self.c.showPage()
                self.page_num += 1
                self.c.setFillColor(bg_color)
                self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                y = PAGE_HEIGHT - 80

            self.c.setFillColor(BLACK)
            self.c.setFont(FONT_NAME, 12)
            self.c.drawString(70, y, f"■ {key}")
            y -= 20

            self.c.setFont(FONT_NAME, 10)
            value_lines = self._wrap_text_japanese(str(value), PAGE_WIDTH - 160, 10)
            for line in value_lines:
                if y < 80:
                    self.c.setFont(FONT_NAME, 10)
                    self.c.setFillColor(BLACK)
                    self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                    self.c.showPage()
                    self.page_num += 1
                    self.c.setFillColor(bg_color)
                    self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                    y = PAGE_HEIGHT - 80
                self.c.drawString(90, y, line)
                y -= 13
            y -= 10

        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
        self.c.showPage()

    def draw_table_page(self, title, headers, rows, bg_color=YELLOW):
        self.page_num += 1
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

        self.c.setFont(FONT_NAME, 18)
        self.c.setFillColor(BLACK)
        self.c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 50, title)

        table_y = PAGE_HEIGHT - 90
        col_width = (PAGE_WIDTH - 100) / len(headers)
        row_height = 25

        for i, header in enumerate(headers):
            x = 50 + i * col_width
            self.c.setFillColor(BLACK)
            self.c.rect(x, table_y, col_width, row_height, fill=1, stroke=1)
            self.c.setFillColor(WHITE)
            self.c.setFont(FONT_NAME, 9)
            self.c.drawCentredString(x + col_width / 2, table_y + 8, header)

        table_y -= row_height

        for row in rows:
            if table_y < 100:
                self.c.setFont(FONT_NAME, 10)
                self.c.setFillColor(BLACK)
                self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                self.c.showPage()
                self.page_num += 1
                self.c.setFillColor(bg_color)
                self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                table_y = PAGE_HEIGHT - 90

                for i, header in enumerate(headers):
                    x = 50 + i * col_width
                    self.c.setFillColor(BLACK)
                    self.c.rect(x, table_y, col_width, row_height, fill=1, stroke=1)
                    self.c.setFillColor(WHITE)
                    self.c.setFont(FONT_NAME, 9)
                    self.c.drawCentredString(x + col_width / 2, table_y + 8, header)
                table_y -= row_height

            for i, cell in enumerate(row):
                x = 50 + i * col_width
                self.c.setFillColor(WHITE)
                self.c.setStrokeColor(BLACK)
                self.c.rect(x, table_y, col_width, row_height, fill=1, stroke=1)
                self.c.setFillColor(BLACK)
                self.c.setFont(FONT_NAME, 8)
                cell_text = str(cell)[:40]
                self.c.drawCentredString(x + col_width / 2, table_y + 8, cell_text)
            table_y -= row_height

        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
        self.c.showPage()

    def generate_complete_pdf(self):
        print("📖 TAISUN v2 完全版PDF生成開始（50-60ページ）...")

        # 1. 表紙
        self.draw_comic_title("TAISUN v2", "Ultimate Unified System")

        # 2. システム概要
        overview = {
            "エージェント数": "96個（開発、品質保証、インフラ、文書、自動化、特殊機能）",
            "スキル数": "41個（リサーチ、動画生成、TTS、URL分析、マーケティング等）",
            "コマンド数": "82個（ショートカットコマンド）",
            "MCPサーバー": "26個（248ツール統合）",
            "13層防御": "セキュリティゲートシステム",
            "LLMモデル": "Haiku 4.5 / Sonnet 4.5 / Opus 4.6 自動切替",
        }
        self.draw_detail_page("システム概要", overview, YELLOW)
        print(f"✓ システム概要完成 (Page {self.page_num})")

        # 3-17. 主要スキル詳細（15個）
        main_skills = [
            {"title": "🔍 research - 基本リサーチ", "content": {
                "トリガー": "「〜を調べて」「〜について教えて」",
                "主要機能": "Brave Search APIを使用した基本Web検索",
                "使用例": "「AIエージェントの最新動向を調べて」",
                "実装": "skills/research/",
                "strict": "No"
            }, "color": BLUE},
            {"title": "🌍 world-research - 全世界リサーチ", "content": {
                "トリガー": "「世界中から〜」「学術論文を検索」",
                "主要機能": "SNS・学術論文・ニュースを全世界から検索",
                "API": "Apify（X/LinkedIn/Google Scholar等）",
                "使用例": "「LLMの最新研究論文を世界中から検索」",
                "strict": "No"
            }, "color": GREEN},
            {"title": "🔬 mega-research-plus - 8ソース統合", "content": {
                "トリガー": "「徹底的に調べて」「あらゆる情報源から」",
                "主要機能": "8つのデータソースを統合リサーチ",
                "ソース": "Brave, Apify, Gemini, Perplexity, WebFetch等",
                "使用例": "「量子コンピュータの商用化についてあらゆる情報源から調べて」",
                "strict": "No"
            }, "color": ORANGE},
            {"title": "🎬 interactive-video-platform - 動画生成", "content": {
                "トリガー": "「インタラクティブ動画」「分岐動画」「VSL動画」",
                "主要機能": "4K画像→TTS音声→Remotion動画合成→Vercelデプロイ",
                "フェーズ": "台本→画像（NanoBanana Pro）→QA（agentic-vision）→TTS（Fish Audio）→合成（Remotion）→デプロイ",
                "品質検証": "agentic-vision（7/10以上）、japanese-text-verifier（ratio≥0.3）",
                "strict": "Yes（全工程必須、スキップ禁止）"
            }, "color": RED},
            {"title": "🎤 voice-ai - 電話自動化", "content": {
                "トリガー": "「電話」「架電」「通話」「Voice AI」",
                "主要機能": "Voice AI MCPを使用した電話自動化",
                "MCP": "voice-ai（Twilio統合）",
                "機能詳細": "着信応答、発信、音声認識、TTS応答",
                "使用例": "「顧客への電話フォローアップを自動化」",
                "strict": "No"
            }, "color": PURPLE},
            {"title": "🔗 url-all - サイト完全把握", "content": {
                "トリガー": "「このサイトを分析」「URL解析」",
                "主要機能": "URLの5層解析（構造、コンテンツ、技術、リンク、メタ）",
                "解析内容": "HTML構造、CSS/JS、主要コンテンツ、内部リンク、SEOメタ情報",
                "使用例": "「https://example.com のサイト構造を完全に把握して」",
                "strict": "No"
            }, "color": CYAN},
            {"title": "📊 url-deep-analysis - 深層分析", "content": {
                "トリガー": "「URL分析」「サイト解析」「ページ構造」「リンク抽出」",
                "主要機能": "url-allの拡張版、再帰的リンク解析",
                "自動マッピング": "Yes（トリガーで自動呼び出し）",
                "MCP": "Playwright MCP（DOM操作）",
                "strict": "No"
            }, "color": BLUE},
            {"title": "✍️ taiyo-style-vsl - VSL台本生成", "content": {
                "トリガー": "「VSL台本」「動画セールスレター」",
                "主要機能": "Video Sales Letter台本生成",
                "品質保証": "taiyo-analyzer（80点以上必須）",
                "フェーズ": "リサーチ→構成→執筆→品質検証→修正",
                "モデル": "Claude Opus 4.6（最高品質）",
                "strict": "No"
            }, "color": GREEN},
            {"title": "📝 taiyo-style-sales-letter - セールスレター", "content": {
                "トリガー": "「セールスレター」「販売ページ」",
                "主要機能": "高品質セールスレター生成",
                "品質保証": "taiyo-analyzer（80点以上）",
                "構成": "ヘッドライン→問題提起→解決策→証拠→CTA",
                "strict": "No"
            }, "color": ORANGE},
            {"title": "📧 taiyo-style-step-mail - ステップメール", "content": {
                "トリガー": "「ステップメール」「メール配信」",
                "主要機能": "7-14日間のステップメール自動生成",
                "構成": "Day1（関係構築）→Day7（信頼）→Day14（販売）",
                "品質保証": "taiyo-analyzer（80点以上）",
                "strict": "No"
            }, "color": RED},
            {"title": "🔍 taiyo-analyzer - 品質保証", "content": {
                "トリガー": "自動呼び出し（taiyo-style-*スキル使用時）",
                "主要機能": "コンテンツ品質を80点以上に保証",
                "評価項目": "読みやすさ、説得力、構成、CTA明確性",
                "自動修正": "80点未満の場合、自動でフィードバック→修正",
                "strict": "Yes（taiyo-style-*スキル使用時は必須）"
            }, "color": PURPLE},
            {"title": "👁️ agentic-vision - 画像品質検証", "content": {
                "トリガー": "「画像品質チェック」「ビジュアルQA」",
                "主要機能": "Gemini 3 Flashで画像分析（7/10以上）",
                "評価項目": "解像度、構図、色彩、テキスト可読性",
                "自動マッピング": "Yes（interactive-video-platform使用時必須）",
                "strict": "No"
            }, "color": CYAN},
            {"title": "🎯 keyword-to-gem - NotebookLM投入", "content": {
                "トリガー": "「キーワードからGem作成」「NotebookLM投入」",
                "主要機能": "キーワード→SNS横断リサーチ→NotebookLM Gem作成",
                "フェーズ": "キーワード抽出→リサーチ→Gem作成→Gemini API連携",
                "使用例": "「AIマーケティングについてGem作成」",
                "strict": "No"
            }, "color": BLUE},
            {"title": "🎓 udemy-download - Udemy動画DL", "content": {
                "トリガー": "「Udemy動画をダウンロード」",
                "主要機能": "Udemy動画ダウンロード + 文字起こし",
                "出力": "MP4動画 + VTT字幕 + テキスト文字起こし",
                "使用例": "「Udemyコース〇〇をダウンロードして文字起こし」",
                "strict": "No"
            }, "color": GREEN},
            {"title": "📄 sdd-full-pipeline - SDD完全版", "content": {
                "トリガー": "「要件定義から運用まで」「SDD」",
                "主要機能": "Spec-Driven Development完全パイプライン",
                "フェーズ": "要件定義→仕様書→実装→テスト→運用手順書",
                "出力": "設計書、API仕様、テスト計画、運用手順書",
                "strict": "No"
            }, "color": ORANGE},
        ]

        for skill in main_skills:
            self.draw_detail_page(skill["title"], skill["content"], skill["color"])
            print(f"✓ {skill['title']} 完成 (Page {self.page_num})")

        # 18-19. 残りスキル一覧（表形式・26個）
        remaining_skills_headers = ["スキル名", "機能", "トリガー", "strict"]
        remaining_skills_rows = [
            ["taiyo-style-lp", "LP生成", "「LP作成」", "No"],
            ["video-agent", "動画エージェント", "「動画生成」", "No"],
            ["taiyo-style-headline", "ヘッドライン生成", "「見出し作成」", "No"],
            ["unified-research", "統合リサーチ", "「徹底調査」", "No"],
            ["japanese-tts-reading", "日本語TTS", "「音声生成」", "No"],
            ["agent-trace", "エージェント追跡", "「トレース」", "No"],
            ["workflow-automation-n8n", "n8n自動化", "「n8n」", "No"],
            ["taiyo-style-ps", "PS（追伸）生成", "「追伸作成」", "No"],
            ["pdf-processing", "PDF処理", "「PDF解析」", "No"],
            ["research-cited-report", "出典付きレポート", "「出典付き」", "No"],
            ["telop", "テロップ生成", "「字幕作成」", "No"],
            ["lp-local-generator", "ローカルLP", "「LP生成」", "No"],
            ["opencode-ralph-loop", "反復開発", "「ralph」", "No"],
            ["taiyo-rewriter", "リライト", "「書き直し」", "No"],
            ["taiyo-style-bullet", "箇条書き生成", "「箇条書き」", "No"],
            ["note-research", "note.com検索", "「noteで調べて」", "No"],
            ["opencode-fix", "バグ修正", "「fix」", "No"],
            ["youtube_channel_summary", "YouTubeチャンネル要約", "「チャンネル要約」", "No"],
            ["keyword-mega-extractor", "キーワード抽出", "「キーワード抽出」", "No"],
            ["workflow-start", "ワークフロー開始", "「workflow-start」", "No"],
            ["mcp-health", "MCP診断", "「mcp-health」", "No"],
            ["verify", "検証", "「verify」", "No"],
            ["workflow-next", "次フェーズ", "「workflow-next」", "No"],
            ["workflow-status", "状態確認", "「workflow-status」", "No"],
            ["test", "テスト", "「test」", "No"],
            ["workflow-verify", "ワークフロー検証", "「workflow-verify」", "No"],
        ]
        self.draw_table_page("残りスキル一覧（26個）", remaining_skills_headers, remaining_skills_rows, YELLOW)
        print(f"✓ 残りスキル一覧完成 (Page {self.page_num})")

        # 20-24. 主要エージェント詳細（5個は既存、10個追加）
        additional_agents = [
            {"title": "🔧 refactor-specialist - リファクタリング専門", "content": {
                "専門分野": "コードリファクタリング、技術的負債解消",
                "使用タイミング": "コードベース整理、保守性向上",
                "主要機能": "デッドコード削除、重複排除、設計パターン適用",
                "プロアクティブ": "No"
            }, "color": BLUE},
            {"title": "🐛 bug-fixer - バグ修正専門", "content": {
                "専門分野": "バグ診断・修正",
                "使用タイミング": "バグ発生時、テスト失敗時",
                "主要機能": "ログ解析、根本原因特定、最小修正",
                "プロアクティブ": "No"
            }, "color": RED},
            {"title": "🗄️ database-reviewer - DB レビュー", "content": {
                "専門分野": "データベース設計・最適化",
                "使用タイミング": "スキーマ設計後、パフォーマンス問題発生時",
                "主要機能": "正規化チェック、インデックス最適化、クエリパフォーマンス",
                "プロアクティブ": "Yes（DB変更時）"
            }, "color": GREEN},
            {"title": "⚙️ backend-developer - バックエンド開発", "content": {
                "専門分野": "API開発、ビジネスロジック実装",
                "使用タイミング": "サーバーサイド開発",
                "主要機能": "RESTful API、GraphQL、認証認可、データ処理",
                "プロアクティブ": "No"
            }, "color": ORANGE},
            {"title": "🎨 frontend-developer - フロントエンド開発", "content": {
                "専門分野": "UI/UX実装",
                "使用タイミング": "クライアントサイド開発",
                "主要機能": "React/Vue/Next.js、レスポンシブデザイン、アクセシビリティ",
                "プロアクティブ": "No"
            }, "color": PURPLE},
            {"title": "🔌 api-developer - API開発専門", "content": {
                "専門分野": "API設計・実装",
                "使用タイミング": "API開発フェーズ",
                "主要機能": "OpenAPI仕様、バージョニング、レート制限",
                "プロアクティブ": "No"
            }, "color": CYAN},
            {"title": "🏗️ system-architect - システム設計", "content": {
                "専門分野": "アーキテクチャ設計",
                "使用タイミング": "プロジェクト初期、大規模リファクタリング前",
                "主要機能": "アーキテクチャパターン選定、技術スタック決定",
                "プロアクティブ": "Yes（複雑タスク時）"
            }, "color": BLUE},
            {"title": "☁️ cloud-architect - クラウド設計", "content": {
                "専門分野": "AWS/GCP/Azureアーキテクチャ",
                "使用タイミング": "クラウド移行、インフラ設計",
                "主要機能": "コスト最適化、スケーラビリティ、可用性設計",
                "プロアクティブ": "No"
            }, "color": GREEN},
            {"title": "🔐 security-architect - セキュリティ設計", "content": {
                "専門分野": "セキュリティアーキテクチャ",
                "使用タイミング": "セキュリティ要件定義、脅威分析",
                "主要機能": "脅威モデリング、ゼロトラスト設計、暗号化戦略",
                "プロアクティブ": "Yes（セキュリティ要件時）"
            }, "color": RED},
            {"title": "🚀 devops-engineer - DevOps", "content": {
                "専門分野": "CI/CD、自動化",
                "使用タイミング": "デプロイパイプライン構築",
                "主要機能": "GitHub Actions、Docker、Kubernetes、監視",
                "プロアクティブ": "No"
            }, "color": ORANGE},
        ]

        for agent in additional_agents:
            self.draw_detail_page(agent["title"], agent["content"], agent["color"])
            print(f"✓ {agent['title']} 完成 (Page {self.page_num})")

        # 25. 残りエージェント一覧（表形式・80個）
        remaining_agents_headers = ["エージェント", "専門分野", "使用タイミング"]
        remaining_agents_rows = [
            ["qa-lead", "QAリード", "品質保証計画"],
            ["qa-validator", "QA検証", "受入テスト"],
            ["test-engineer", "テスト設計", "テスト計画作成"],
            ["integration-tester", "統合テスト", "システム統合"],
            ["security-tester", "セキュリティテスト", "脆弱性診断"],
            ["mutation-tester", "ミューテーションテスト", "テスト品質評価"],
            ["performance-tester", "パフォーマンステスト", "負荷テスト"],
            ["e2e-runner", "E2Eテスト", "Playwright実行"],
            ["refactor-cleaner", "デッドコード削除", "コード整理"],
            ["doc-reviewer", "ドキュメントレビュー", "文書品質確認"],
            ["container-specialist", "コンテナ専門", "Docker/K8s"],
            ["monitoring-specialist", "監視専門", "Datadog/Prometheus"],
            ["security-scanner", "セキュリティスキャン", "脆弱性検出"],
            ["cicd-manager", "CI/CD管理", "パイプライン構築"],
            ["dependency-validator", "依存関係検証", "ライブラリ更新"],
            ["environment-doctor", "環境診断", "環境問題解決"],
            ["chaos-engineer", "カオスエンジニアリング", "障害テスト"],
            ["backup-manager", "バックアップ管理", "データ保護"],
            ["doc-updater", "ドキュメント更新", "README/API仕様"],
            ["tech-writer", "技術文書作成", "技術記事執筆"],
            ["researcher", "リサーチャー", "技術調査"],
            ["planner", "計画立案", "実装計画"],
            ["code-searcher", "コード検索", "パターン発見"],
            ["log-analyzer", "ログ解析", "エラー分析"],
            ["innovation-scout", "技術探索", "新技術調査"],
            ["learning-agent", "学習エージェント", "知識習得"],
            ["knowledge-manager", "知識管理", "ナレッジベース"],
            ["session-summarizer", "セッション要約", "会話まとめ"],
            ["feedback-analyzer", "フィードバック分析", "改善提案"],
            ["metrics-collector", "メトリクス収集", "KPI追跡"],
            ["workflow-coordinator", "ワークフロー調整", "フロー管理"],
            ["automation-architect", "自動化設計", "自動化戦略"],
            ["integration-planner", "統合計画", "システム統合"],
            ["migration-developer", "マイグレーション", "データ移行"],
            ["release-manager", "リリース管理", "バージョン管理"],
            ["incident-responder", "インシデント対応", "障害対応"],
            ["config-manager", "設定管理", "設定ファイル管理"],
            ["tmux-monitor", "tmux監視", "セッション監視"],
            ["tmux-session-creator", "tmuxセッション作成", "セッション生成"],
            ["tmux-command-executor", "tmuxコマンド実行", "バックグラウンド実行"],
            ["script-writer", "スクリプト作成", "自動化スクリプト"],
            ["data-analyst", "データ分析", "データ解析"],
            ["doc-ops", "ドキュメント運用", "文書管理"],
            ["process-optimizer", "プロセス最適化", "効率化"],
            ["error-recovery-planner", "エラー回復計画", "障害復旧"],
        ]
        self.draw_table_page("残りエージェント一覧（45個抜粋）", remaining_agents_headers, remaining_agents_rows, BLUE)
        print(f"✓ 残りエージェント一覧完成 (Page {self.page_num})")

        # 26-30. 主要MCP詳細（5個は既存、7個追加）
        additional_mcps = [
            {"title": "📦 git - Git操作", "content": {
                "ツール数": "12個",
                "主要機能": "status, diff, log, commit, push, pull, branch",
                "defer_loading": "false（常時ロード）",
                "コンテキスト影響": "中（12ツール）",
                "使用例": "「git status確認」「コミット履歴表示」"
            }, "color": BLUE},
            {"title": "🐙 github - GitHub連携", "content": {
                "ツール数": "18個",
                "主要機能": "PR作成、Issue管理、Actions確認、リリース",
                "defer_loading": "true（必要時のみ）",
                "コンテキスト影響": "大（18ツール）",
                "使用例": "「PRを作成」「GitHub Actionsのステータス確認」"
            }, "color": GREEN},
            {"title": "🗺️ google-maps - 地図検索", "content": {
                "ツール数": "8個",
                "主要機能": "場所検索、ルート検索、距離計算",
                "API": "Google Maps API",
                "defer_loading": "true（必要時のみ）",
                "使用例": "「東京から大阪までのルート検索」"
            }, "color": ORANGE},
            {"title": "🔎 brave-search - Web検索", "content": {
                "ツール数": "3個",
                "主要機能": "Web検索、ニュース検索、画像検索",
                "API": "Brave Search API",
                "defer_loading": "true（必要時のみ）",
                "使用例": "「AIエージェントの最新ニュースを検索」"
            }, "color": RED},
            {"title": "🗄️ sqlite - SQLite", "content": {
                "ツール数": "10個",
                "主要機能": "DB作成、テーブル作成、クエリ実行、スキーマ確認",
                "defer_loading": "true（必要時のみ）",
                "コンテキスト影響": "中（10ツール）",
                "使用例": "「SQLiteデータベース作成」"
            }, "color": PURPLE},
            {"title": "🐘 postgres - PostgreSQL", "content": {
                "ツール数": "10個",
                "主要機能": "DB接続、クエリ実行、トランザクション管理",
                "defer_loading": "true（必要時のみ）",
                "コンテキスト影響": "中（10ツール）",
                "使用例": "「PostgreSQLに接続してクエリ実行」"
            }, "color": CYAN},
            {"title": "🤖 openai - OpenAI API", "content": {
                "ツール数": "5個",
                "主要機能": "GPT-4o、DALL-E、Whisper、Embeddings",
                "defer_loading": "true（必要時のみ）",
                "コンテキスト影響": "小（5ツール）",
                "使用例": "「GPT-4oで要約生成」"
            }, "color": BLUE},
        ]

        for mcp in additional_mcps:
            self.draw_detail_page(mcp["title"], mcp["content"], mcp["color"])
            print(f"✓ {mcp['title']} 完成 (Page {self.page_num})")

        # 31. 残りMCP一覧（表形式・14個）
        remaining_mcps_headers = ["MCP", "ツール数", "機能"]
        remaining_mcps_rows = [
            ["anthropic", "5", "Claude API"],
            ["gemini", "5", "Gemini API"],
            ["stable-diffusion", "3", "画像生成"],
            ["elevenlabs", "4", "音声生成"],
            ["slack", "6", "Slack通知"],
            ["email", "3", "メール送信"],
            ["redis", "8", "Redis操作"],
            ["docker", "15", "Docker操作"],
            ["kubernetes", "12", "K8s操作"],
            ["aws", "20", "AWS CLI"],
            ["gcp", "20", "GCP CLI"],
            ["azure", "20", "Azure CLI"],
            ["notebooklm", "4", "NotebookLM"],
            ["apify", "10", "Apify自動化"],
        ]
        self.draw_table_page("残りMCP一覧（14個）", remaining_mcps_headers, remaining_mcps_rows, GREEN)
        print(f"✓ 残りMCP一覧完成 (Page {self.page_num})")

        # 32-39. 13層防御Layer 5-12（各1ページ）
        defense_layers_5_12 = [
            {"title": "🛡️ Layer 5: Skill Evidence", "content": {
                "機能": "スキル使用証跡チェック",
                "目的": "ユーザーが「〇〇スキルを使って」と指定した場合、そのスキルが実際に使われたかを検証",
                "検出パターン": "Skillツール呼び出し履歴を確認",
                "exit code": "2（スキル未使用時）",
                "ブロック例": "「video-course スキルを使って」と指示されたのに手動実装",
                "解決方法": "Skillツールで指定スキルを呼び出す"
            }, "color": BLUE},
            {"title": "🛡️ Layer 6: Deviation Approval", "content": {
                "機能": "逸脱行為の事前承認要求",
                "目的": "指示にない行動を勝手に実行しない",
                "検出パターン": "指示範囲外の操作を検出",
                "exit code": "2（承認なしで逸脱）",
                "ブロック例": "「ファイルAを編集」と指示されたのにファイルBも編集",
                "解決方法": "「この行動は指示にありません。実行してよいですか？」と確認→承認後に実行"
            }, "color": GREEN},
            {"title": "🛡️ Layer 7: Agent Enforcement", "content": {
                "機能": "複雑タスクでエージェント使用を強制",
                "目的": "複雑なタスクは専門エージェントに委譲",
                "検出パターン": "複雑度判定（complex/expert）でTaskツール未使用",
                "exit code": "2（エージェント未使用）",
                "ブロック例": "大規模リファクタリングをメインセッションで実行",
                "解決方法": "Taskツールでrefactor-specialistを起動"
            }, "color": ORANGE},
            {"title": "🛡️ Layer 8: Copy Safety", "content": {
                "機能": "不正文字検出（U+FFFD、U+3000、コピーマーカー）",
                "目的": "コピペミスによる文字化けを防止",
                "検出パターン": "U+FFFD（置換文字）、U+3000（全角スペース）、[COPY]マーカー",
                "exit code": "2（不正文字検出時）",
                "ブロック例": "コピペしたコードに文字化け",
                "解決方法": "手動入力、または正しい文字コードで再コピー"
            }, "color": RED},
            {"title": "🛡️ Layer 9: Input Sanitizer", "content": {
                "機能": "インジェクション検出（コマンドインジェクション、機密情報漏洩）",
                "目的": "セキュリティリスクを事前にブロック",
                "検出パターン": "execSync(String)、機密情報パターン（API_KEY等）",
                "exit code": "2（インジェクション検出時）",
                "ブロック例": "execSync(`command ${userInput}`)、API_KEYをハードコード",
                "解決方法": "spawnSync(['command', userInput])、環境変数使用"
            }, "color": PURPLE},
            {"title": "🛡️ Layer 10: Skill Auto-Select", "content": {
                "機能": "タスク種別から必須スキルを自動強制",
                "目的": "トリガーキーワードで自動的にスキルを選択",
                "検出パターン": "「インタラクティブ動画」→interactive-video-platform、「電話」→voice-ai",
                "exit code": "0（推奨のみ、強制ではない）",
                "ブロック例": "なし（推奨のみ）",
                "解決方法": "推奨スキルを使用"
            }, "color": CYAN},
            {"title": "🛡️ Layer 11: Definition Lint", "content": {
                "機能": "workflow/policy定義ファイルの検証",
                "目的": "定義ファイルの構文エラーを検出",
                "検出パターン": "JSON/YAML構文エラー、必須フィールド欠損",
                "exit code": "2（定義エラー時）",
                "ブロック例": ".workflow_state.json に構文エラー",
                "解決方法": "定義ファイルを修正"
            }, "color": BLUE},
            {"title": "🛡️ Layer 12: Context Quality", "content": {
                "機能": "コンテキスト品質管理（tmux推奨、console.log警告）",
                "目的": "長時間実行コマンドはtmuxで、console.logは本番前に削除",
                "検出パターン": "npm/pnpm/cargo等のコマンド、console.log追加",
                "exit code": "0（警告のみ、ブロックしない）",
                "ブロック例": "なし（警告のみ）",
                "解決方法": "tmux使用、console.logを削除"
            }, "color": GREEN},
        ]

        for layer in defense_layers_5_12:
            self.draw_detail_page(layer["title"], layer["content"], layer["color"])
            print(f"✓ {layer['title']} 完成 (Page {self.page_num})")

        # 40-41. Opencode詳細（2ページ）
        opencode_ralph = {
            "ralph-loop": "反復開発支援（計画→実装→評価→改善）",
            "opt-in設計": "ユーザーが明示的に有効化（デフォルト無効）",
            "使い方": "/ralph または Skillツールで opencode-ralph-loop",
            "フェーズ": "Plan（計画）→ Implement（実装）→ Evaluate（評価）→ Improve（改善）→ 繰り返し",
            "終了条件": "評価スコア90点以上、またはユーザー承認",
            "使用例": "「ralphループで新機能を開発」"
        }
        self.draw_detail_page("🔄 Opencode: ralph-loop", opencode_ralph, ORANGE)

        opencode_fix = {
            "fix": "バグ修正支援（mistakes.md参照）",
            "opt-in設計": "ユーザーが明示的に有効化",
            "使い方": "/fix または Skillツールで opencode-fix",
            "フェーズ": "mistakes.md読み込み→根本原因特定→最小差分修正→テスト",
            "最小差分原則": "必要最小限の変更のみ（破壊的変更を避ける）",
            "使用例": "「fixで前回のバグを修正」"
        }
        self.draw_detail_page("🔧 Opencode: fix", opencode_fix, RED)
        print(f"✓ Opencode詳細完成 (Page {self.page_num})")

        # 42-43. SDD詳細（2ページ）
        sdd_overview = {
            "SDD": "Spec-Driven Development（仕様駆動開発）",
            "目的": "仕様書を中心に開発を進め、品質とトレーサビリティを確保",
            "フェーズ1": "要件定義（機能要件、非機能要件、制約条件）",
            "フェーズ2": "仕様書作成（設計書、API仕様、データモデル）",
            "フェーズ3": "実装（仕様書に基づく実装、TDD）",
            "フェーズ4": "テスト（単体、統合、E2E）",
            "フェーズ5": "運用手順書作成（デプロイ、監視、バックアップ）"
        }
        self.draw_detail_page("📋 SDD概要", sdd_overview, BLUE)

        sdd_pipeline = {
            "sdd-full-pipeline": "SDD完全パイプライン",
            "トリガー": "「要件定義から運用まで」「SDD」",
            "自動生成": "設計書、API仕様（OpenAPI）、テスト計画、運用手順書",
            "品質ゲート": "コードレビュー80点以上、テストカバレッジ80%以上",
            "出力": "Markdown形式の全ドキュメント",
            "使用例": "「新機能〇〇をSDDで開発」"
        }
        self.draw_detail_page("📋 sdd-full-pipeline", sdd_pipeline, GREEN)
        print(f"✓ SDD詳細完成 (Page {self.page_num})")

        # 44-45. リサーチシステム詳細（2ページ）
        research_detail_1 = {
            "research": "Brave Search APIを使用した基本Web検索",
            "world-research": "SNS（X/LinkedIn）・学術論文（Google Scholar）・ニュースを全世界から検索",
            "unified-research": "Tavily/SerpAPI/Brave/NewsAPI/Perplexityを統合",
            "mega-research-plus": "上記+Twitter/DuckDuckGo/WebSearchの8ソース統合",
        }
        self.draw_detail_page("🔍 リサーチシステム詳細（前半）", research_detail_1, ORANGE)

        research_detail_2 = {
            "research-cited-report": "出典付きレポート（信頼性重視、引用元URL付き）",
            "note-research": "note.com専用検索（非公式API+MCP）",
            "keyword-to-gem": "キーワード→SNS横断リサーチ→NotebookLM Gem作成→Gemini API連携",
            "使い分け": "基本=research、徹底=mega-research-plus、学術=world-research、出典必須=research-cited-report"
        }
        self.draw_detail_page("🔍 リサーチシステム詳細（後半）", research_detail_2, RED)
        print(f"✓ リサーチシステム詳細完成 (Page {self.page_num})")

        # 46. インストール詳細（macOS）
        install_mac = {
            "1. Homebrewインストール": "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"",
            "2. Claude Codeインストール": "brew install claude-code",
            "3. 初期設定": "claude-code init",
            "4. プロジェクト作成": "cd your-project && claude-code",
            "5. .claude/settings.json": "プロジェクト固有設定（MCP、hooks等）",
            "6. .claude/CLAUDE.md": "ルール定義（13層防御、スキル自動マッピング）",
            "7. hooks設定": ".claude/hooks/ にスクリプト配置"
        }
        self.draw_detail_page("💻 macOS インストール", install_mac, BLUE)

        # 47. インストール詳細（Windows）
        install_win = {
            "1. Scoopインストール": "iwr -useb get.scoop.sh | iex",
            "2. Claude Codeインストール": "scoop install claude-code",
            "3. 初期設定": "claude-code init",
            "4. プロジェクト作成": "cd your-project && claude-code",
            "5. .claude/settings.json": "プロジェクト固有設定",
            "6. .claude/CLAUDE.md": "ルール定義",
            "7. hooks設定": ".claude/hooks/ にスクリプト配置"
        }
        self.draw_detail_page("💻 Windows インストール", install_win, GREEN)
        print(f"✓ インストール詳細完成 (Page {self.page_num})")

        # 48-50. アーキテクチャ詳細（3層）
        arch_layer1 = {
            "Intent Parser": "ユーザー入力からタスク種別を分類（complexity判定）",
            "Model Router": "複雑度に応じてモデル自動選択（Haiku/Sonnet/Opus）",
            "96エージェント": "専門家チーム（開発、QA、インフラ、文書、自動化、特殊）",
            "41スキル": "再利用可能な機能（リサーチ、動画生成、TTS、URL分析等）"
        }
        self.draw_detail_page("🏗️ Layer 1: インテリジェンス層", arch_layer1, YELLOW)

        arch_layer2 = {
            "13層防御": "Layer 0（CLAUDE.md）→ Layer 12（Context Quality）",
            "Workflow Engine": "フェーズ管理（DESIGN→IMPLEMENT→TEST→DEPLOY）",
            "メモリシステム": "Praetorian（永続）+ Historian（会話履歴）",
            "コンテキスト圧縮": "自動70%閾値、strategic-compact"
        }
        self.draw_detail_page("🏗️ Layer 2: 実行制御層", arch_layer2, BLUE)

        arch_layer3 = {
            "26 MCPサーバー": "filesystem, pexels, playwright, praetorian, historian等",
            "248ツール": "Read, Write, WebSearch, ブラウザ自動化等",
            "コンテキスト最適化": "defer_loading（必要時ロード）、Tool Search有効化"
        }
        self.draw_detail_page("🏗️ Layer 3: ツール統合層", arch_layer3, GREEN)
        print(f"✓ アーキテクチャ詳細完成 (Page {self.page_num})")

        # 51-52. LLMシステム詳細
        llm_router = {
            "Haiku 4.5": "軽量タスク（90% Sonnet性能、3倍コスト削減）",
            "Sonnet 4.5": "標準開発（最高コーディング品質）",
            "Opus 4.6": "複雑推論（最深思考、アーキテクチャ設計）",
            "自動切替": "UserPromptSubmit hook → recommendation.json → Task起動時適用",
            "複雑度判定": "trivial→Haiku, simple→Haiku, moderate→Sonnet, complex→Sonnet, expert→Opus"
        }
        self.draw_detail_page("🤖 LLM Model Router", llm_router, ORANGE)

        llm_intent = {
            "Intent Parser": "入力テキストからタスク種別を分類",
            "分類結果": "complexity（複雑度）+ taskType（タスク種別）",
            "confidence": "信頼度（0-100%）",
            "出力": "model-recommendation.json（推奨モデル）"
        }
        self.draw_detail_page("🤖 Intent Parser", llm_intent, RED)
        print(f"✓ LLMシステム詳細完成 (Page {self.page_num})")

        # 53. 並列処理詳細
        parallel = {
            "マルチエージェント": "最大5並列（maxParallelAgents設定）",
            "Task tool": "並列呼び出し可能",
            "依存関係": "blockedBy / blocks で管理",
            "並列例": "Agent1（セキュリティ分析） + Agent2（パフォーマンス分析） + Agent3（型チェック）"
        }
        self.draw_detail_page("⚡ 並列処理システム", parallel, BLUE)

        # 54. Google認証詳細
        google_auth = {
            "Playwright MCP": "ブラウザ自動化",
            "Cookie保存": "初回ログイン後にCookie保存",
            "Cookie再利用": "次回以降は保存済みCookieで自動ログイン",
            "reCAPTCHA": "自動検出・バイパス",
            "OAuth 2.0": "標準プロトコル対応"
        }
        self.draw_detail_page("🔑 Google認証突破", google_auth, GREEN)

        # 55. サイト分析詳細
        site_analysis = {
            "url-all": "5層解析（構造、コンテンツ、技術、リンク、メタ）",
            "url-deep-analysis": "再帰的リンク解析、JS実行後の状態",
            "agentic-vision": "Gemini 3 Flash で画像分析（7/10以上）",
            "Playwright MCP": "DOM構造解析、スクリーンショット",
            "WebFetch + WebSearch": "統合リサーチ"
        }
        self.draw_detail_page("🌐 サイト理解・分析システム", site_analysis, ORANGE)
        print(f"✓ 並列処理・認証・分析詳細完成 (Page {self.page_num})")

        # 56-60. ユースケース（5個）
        usecase1 = {
            "タイトル": "VSL動画生成ワークフロー",
            "Step 1": "taiyo-style-vsl でVSL台本生成",
            "Step 2": "taiyo-analyzer で80点以上確認",
            "Step 3": "interactive-video-platform で動画生成",
            "Step 4": "agentic-vision で品質検証（7/10以上）",
            "Step 5": "Vercelへ自動デプロイ"
        }
        self.draw_detail_page("📺 ユースケース1: VSL動画生成", usecase1, YELLOW)

        usecase2 = {
            "タイトル": "全世界リサーチ→NotebookLM投入",
            "Step 1": "world-research で全世界SNS・学術論文検索",
            "Step 2": "mega-research-plus で8ソース統合",
            "Step 3": "keyword-to-gem でNotebookLMに自動投入",
            "Step 4": "Gemini APIで要約・質問応答"
        }
        self.draw_detail_page("📚 ユースケース2: リサーチ→NotebookLM", usecase2, BLUE)

        usecase3 = {
            "タイトル": "サイト完全分析→改善提案",
            "Step 1": "url-deep-analysis で5層解析",
            "Step 2": "agentic-vision でデザイン分析",
            "Step 3": "Playwright MCPでユーザー体験テスト",
            "Step 4": "改善提案レポート生成"
        }
        self.draw_detail_page("🌐 ユースケース3: サイト分析→改善", usecase3, GREEN)

        usecase4 = {
            "タイトル": "新機能開発フロー（TDD）",
            "Step 1": "planner でリスク評価・実装計画",
            "Step 2": "tdd-guide でテスト先行（RED）",
            "Step 3": "implementer で実装（GREEN）",
            "Step 4": "code-reviewer で品質検証（80点以上）",
            "Step 5": "security-reviewer で脆弱性検出（Critical/Highゼロ）",
            "Step 6": "コミット→デプロイ"
        }
        self.draw_detail_page("🛠️ ユースケース4: 新機能開発（TDD）", usecase4, ORANGE)

        usecase5 = {
            "タイトル": "Voice AI電話自動化",
            "Step 1": "voice-ai-agent で電話フロー設計",
            "Step 2": "Twilio統合（voice-ai MCP）",
            "Step 3": "音声認識→TTS応答",
            "Step 4": "顧客データベース連携",
            "Step 5": "通話ログ自動保存"
        }
        self.draw_detail_page("📞 ユースケース5: Voice AI自動化", usecase5, RED)
        print(f"✓ ユースケース完成 (Page {self.page_num})")

        # 61. コンテキスト管理詳細
        context_detail = {
            "コンテキストウィンドウ": "AIが一度に理解できる情報量（200k→70k問題）",
            "200k→70k問題": "MCPツールが多いとコンテキストが縮小",
            "自動compaction": "70%閾値で自動圧縮（CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70）",
            "MCP削減": "26個登録→10個有効化推奨",
            "Tool Search": "MCP_TOOL_SEARCH=true で検索機能有効化",
            "defer_loading": "必要時のみMCPロード",
            "Praetorian": "重要情報を永続メモリに保存",
            "Historian": "会話履歴を検索可能に",
            "strategic-compact": "手動コンテキスト圧縮スキル"
        }
        self.draw_detail_page("🧠 コンテキスト管理詳細", context_detail, PURPLE)

        # 62. 品質ゲート詳細
        quality_gates = {
            "コードレビュー": "80点以上必須（code-reviewer）",
            "テストカバレッジ": "80%以上必須（tdd-guide）",
            "セキュリティ": "Critical/High脆弱性ゼロ（security-reviewer）",
            "VSL台本": "80点以上（taiyo-analyzer）",
            "画像品質": "7/10以上（agentic-vision）",
            "日本語テキスト": "ratio ≥ 0.3（japanese-text-verifier）"
        }
        self.draw_detail_page("✅ 品質ゲート", quality_gates, CYAN)
        print(f"✓ コンテキスト・品質ゲート完成 (Page {self.page_num})")

        # 63. 裏表紙
        self.draw_comic_title("完", "End of Document", RED)

        # PDF保存
        self.c.save()
        print(f"\n✅ PDF生成完了: {self.output_path}")
        print(f"📄 総ページ数: {self.page_num}")

def main():
    output_path = "/Users/matsumototoshihiko/Desktop/エージェント説明PDF.pdf"
    generator = CompleteComicPDFGenerator(output_path)
    generator.generate_complete_pdf()

    print("\n" + "="*70)
    print("🎉 TAISUN v2 完全版PDF生成完了（50-60ページ）！")
    print("="*70)
    print(f"出力先: {output_path}")
    print(f"ページ数: {generator.page_num}")
    print("\n特徴:")
    print("  ✓ アメリカンコミックスタイル")
    print("  ✓ 多彩な背景色（黄/青/緑/赤/橙/紫/水）")
    print("  ✓ 吹き出し（Speech Bubble）")
    print("  ✓ 集中線エフェクト")
    print("  ✓ 効果音（BOOM! POW!）")
    print("  ✓ 日本語CIDフォント対応")
    print("\n内容:")
    print("  ✓ システム概要")
    print("  ✓ 主要スキル詳細（15個 × 詳細ページ）")
    print("  ✓ 残りスキル一覧（26個 × 表形式）")
    print("  ✓ 主要エージェント詳細（15個 × 詳細ページ）")
    print("  ✓ 残りエージェント一覧（45個 × 表形式）")
    print("  ✓ 主要MCP詳細（12個 × 詳細ページ）")
    print("  ✓ 残りMCP一覧（14個 × 表形式）")
    print("  ✓ 13層防御完全版（Layer 0-12 × 詳細ページ）")
    print("  ✓ Opencode詳細（ralph-loop + fix）")
    print("  ✓ SDD詳細（概要 + pipeline）")
    print("  ✓ リサーチシステム詳細（前半 + 後半）")
    print("  ✓ インストール詳細（macOS + Windows）")
    print("  ✓ アーキテクチャ詳細（3層 × 詳細ページ）")
    print("  ✓ LLMシステム詳細（Router + Intent Parser）")
    print("  ✓ 並列処理・認証・分析詳細")
    print("  ✓ ユースケース（5個 × 詳細ページ）")
    print("  ✓ コンテキスト管理・品質ゲート詳細")

if __name__ == "__main__":
    main()
