#!/usr/bin/env python3
"""
TAISUN v2 完全版PDF生成スクリプト（アメリカンコミックスタイル）
50-60ページの詳細なシステム説明書を生成
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import math

# 日本語フォント登録
FONT_NAME = 'Helvetica'
try:
    # macOSの日本語フォント検索
    font_paths = [
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
    ]
    for font_path in font_paths:
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont('Japanese', font_path))
            FONT_NAME = 'Japanese'
            print(f"✓ 日本語フォント登録成功: {font_path}")
            break
except Exception as e:
    print(f"⚠ 日本語フォント登録失敗: {e}")
    print("  → Helveticaにフォールバック")

# カラーパレット（コミックスタイル）
YELLOW = HexColor('#FFEB3B')
BLUE = HexColor('#2196F3')
RED = HexColor('#F44336')
BLACK = HexColor('#000000')
WHITE = HexColor('#FFFFFF')
GRAY = HexColor('#9E9E9E')

# ページサイズ
PAGE_WIDTH, PAGE_HEIGHT = A4

class ComicPDFGenerator:
    def __init__(self, output_path):
        self.output_path = output_path
        self.c = canvas.Canvas(output_path, pagesize=A4)
        self.page_num = 0

    def draw_halftone_dots(self, x, y, width, height, density=5):
        """ハーフトーンドットパターン（コミック風）"""
        for dx in range(0, int(width), density):
            for dy in range(0, int(height), density):
                self.c.circle(x + dx, y + dy, 1, fill=1, stroke=0)

    def draw_speed_lines(self, x, y, width, height, count=20):
        """集中線エフェクト"""
        center_x = x + width / 2
        center_y = y + height / 2
        for i in range(count):
            angle = (2 * math.pi * i) / count
            end_x = center_x + math.cos(angle) * width * 0.6
            end_y = center_y + math.sin(angle) * height * 0.6
            self.c.setStrokeColor(BLACK)
            self.c.setLineWidth(2)
            self.c.line(center_x, center_y, end_x, end_y)

    def draw_speech_bubble(self, x, y, width, height, text, font_size=12):
        """吹き出し（Speech Bubble）"""
        # 吹き出し本体
        self.c.setFillColor(WHITE)
        self.c.setStrokeColor(BLACK)
        self.c.setLineWidth(3)
        self.c.roundRect(x, y, width, height, 10, fill=1, stroke=1)

        # テキスト
        self.c.setFillColor(BLACK)
        self.c.setFont(FONT_NAME, font_size)

        # テキストを複数行に分割
        lines = self._wrap_text(text, width - 20)
        text_y = y + height - 20
        for line in lines:
            self.c.drawString(x + 10, text_y, line)
            text_y -= font_size + 4

    def _wrap_text(self, text, max_width):
        """テキストを指定幅で折り返し"""
        words = text.split(' ')
        lines = []
        current_line = ""

        for word in words:
            test_line = current_line + word + " "
            if self.c.stringWidth(test_line, FONT_NAME, 12) < max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "

        if current_line:
            lines.append(current_line.strip())

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
        self.c.setFillColor(GRAY)
        self.draw_halftone_dots(50, 50, 100, 100)
        self.draw_halftone_dots(PAGE_WIDTH - 150, PAGE_HEIGHT - 150, 100, 100)

        # タイトル（黒縁白文字）
        title_y = PAGE_HEIGHT - 200
        self.c.setFont(FONT_NAME, 48)

        # 黒縁
        for dx in [-3, 0, 3]:
            for dy in [-3, 0, 3]:
                if dx != 0 or dy != 0:
                    self.c.setFillColor(BLACK)
                    self.c.drawCentredString(PAGE_WIDTH / 2 + dx, title_y + dy, title)

        # 白文字
        self.c.setFillColor(WHITE)
        self.c.drawCentredString(PAGE_WIDTH / 2, title_y, title)

        # サブタイトル
        if subtitle:
            self.c.setFont(FONT_NAME, 24)
            self.c.setFillColor(BLACK)
            self.c.drawCentredString(PAGE_WIDTH / 2, title_y - 60, subtitle)

        # 効果音
        self.c.setFont(FONT_NAME, 36)
        self.c.setFillColor(RED)
        self.c.drawString(50, PAGE_HEIGHT - 100, "BOOM!")
        self.c.drawString(PAGE_WIDTH - 150, 100, "POW!")

        # ページ番号
        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")

        self.c.showPage()

    def draw_section_page(self, section_title, items, bg_color=BLUE):
        """セクションページ（リスト形式）"""
        self.page_num += 1

        # 背景
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

        # タイトル吹き出し
        self.draw_speech_bubble(50, PAGE_HEIGHT - 150, PAGE_WIDTH - 100, 80, section_title, 18)

        # アイテム表示
        y = PAGE_HEIGHT - 200
        for item in items:
            if y < 150:
                # 次のページへ
                self.c.setFont(FONT_NAME, 10)
                self.c.setFillColor(BLACK)
                self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                self.c.showPage()
                self.page_num += 1

                # 新しいページ
                self.c.setFillColor(bg_color)
                self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                y = PAGE_HEIGHT - 100

            # アイテム吹き出し
            bubble_height = min(60, max(40, len(item) // 2))
            self.draw_speech_bubble(70, y - bubble_height, PAGE_WIDTH - 140, bubble_height, item, 11)
            y -= bubble_height + 20

        # ページ番号
        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
        self.c.showPage()

    def draw_table_page(self, title, headers, rows, bg_color=YELLOW):
        """表形式のページ"""
        self.page_num += 1

        # 背景
        self.c.setFillColor(bg_color)
        self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

        # タイトル
        self.c.setFont(FONT_NAME, 20)
        self.c.setFillColor(BLACK)
        self.c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 50, title)

        # 表の描画
        table_y = PAGE_HEIGHT - 100
        col_width = (PAGE_WIDTH - 100) / len(headers)
        row_height = 30

        # ヘッダー
        for i, header in enumerate(headers):
            x = 50 + i * col_width
            self.c.setFillColor(BLACK)
            self.c.rect(x, table_y, col_width, row_height, fill=1, stroke=1)
            self.c.setFillColor(WHITE)
            self.c.setFont(FONT_NAME, 10)
            self.c.drawCentredString(x + col_width / 2, table_y + 10, header)

        table_y -= row_height

        # 行
        for row in rows:
            if table_y < 100:
                # 次のページへ
                self.c.setFont(FONT_NAME, 10)
                self.c.setFillColor(BLACK)
                self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
                self.c.showPage()
                self.page_num += 1

                # 新しいページ
                self.c.setFillColor(bg_color)
                self.c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
                table_y = PAGE_HEIGHT - 100

                # ヘッダー再描画
                for i, header in enumerate(headers):
                    x = 50 + i * col_width
                    self.c.setFillColor(BLACK)
                    self.c.rect(x, table_y, col_width, row_height, fill=1, stroke=1)
                    self.c.setFillColor(WHITE)
                    self.c.setFont(FONT_NAME, 10)
                    self.c.drawCentredString(x + col_width / 2, table_y + 10, header)
                table_y -= row_height

            for i, cell in enumerate(row):
                x = 50 + i * col_width
                self.c.setFillColor(WHITE)
                self.c.setStrokeColor(BLACK)
                self.c.rect(x, table_y, col_width, row_height, fill=1, stroke=1)
                self.c.setFillColor(BLACK)
                self.c.setFont(FONT_NAME, 9)
                # テキストを中央揃え
                cell_text = str(cell)[:30]  # 長すぎる場合は切り詰め
                self.c.drawCentredString(x + col_width / 2, table_y + 10, cell_text)

            table_y -= row_height

        # ページ番号
        self.c.setFont(FONT_NAME, 10)
        self.c.setFillColor(BLACK)
        self.c.drawRightString(PAGE_WIDTH - 30, 30, f"Page {self.page_num}")
        self.c.showPage()

    def generate_full_pdf(self):
        """完全版PDF生成"""
        print("📖 TAISUN v2 完全版PDF生成開始...")

        # 1. 表紙
        self.draw_comic_title("TAISUN v2", "Ultimate Unified System")
        print("✓ 表紙完成")

        # 2. 目次
        toc_items = [
            "1. コンテキスト管理 (Context Management)",
            "2. スキル全41個 (Skills)",
            "3. MCP 26サーバー・248ツール",
            "4. Opencode (Ralph Loop & Fix)",
            "5. Hook・13層防御システム",
            "6. 要件定義とSDD",
            "7. リサーチシステム全て",
            "8. インストール方法 (macOS/Windows)",
            "9. アーキテクチャ (3層構造)",
            "10. エージェント全96個",
            "11. 並列処理",
            "12. LLMシステム",
            "13. Google認証突破",
            "14. サイト理解・分析システム",
        ]
        self.draw_section_page("📚 目次 (Table of Contents)", toc_items, BLUE)
        print("✓ 目次完成")

        # 3. コンテキスト管理
        context_items = [
            "コンテキストウィンドウとは: AIが一度に理解できる情報量",
            "200k→70k問題: MCPツールが多いとコンテキストが縮小",
            "自動compaction: 70%閾値で自動圧縮",
            "MCP削減: 26個→10個推奨で効率化",
            "Praetorian MCP: 重要情報を永続メモリに保存",
            "Historian MCP: 会話履歴を検索可能に",
            "strategic-compact: 手動コンテキスト圧縮スキル",
        ]
        self.draw_section_page("1️⃣ コンテキスト管理", context_items, YELLOW)
        print("✓ コンテキスト管理完成")

        # 4. スキル一覧（表形式）
        skill_headers = ["スキル名", "機能", "strict"]
        skill_rows = [
            ["research", "基本リサーチ", "No"],
            ["taiyo-analyzer", "80点品質保証", "Yes"],
            ["world-research", "全世界SNS検索", "No"],
            ["mega-research-plus", "8ソース統合", "No"],
            ["agentic-vision", "画像品質検証", "No"],
            ["interactive-video-platform", "動画生成", "Yes"],
            ["voice-ai", "電話自動化", "No"],
            ["url-all", "サイト完全把握", "No"],
            ["url-deep-analysis", "5層解析", "No"],
            ["taiyo-style-vsl", "VSL台本生成", "No"],
            ["taiyo-style-sales-letter", "セールスレター", "No"],
            ["taiyo-style-step-mail", "ステップメール", "No"],
            ["keyword-to-gem", "NotebookLM投入", "No"],
            ["japanese-tts-reading", "日本語TTS", "No"],
            ["workflow-automation-n8n", "n8n自動化", "No"],
        ]
        self.draw_table_page("2️⃣ スキル一覧（抜粋15個）", skill_headers, skill_rows, BLUE)
        print("✓ スキル一覧完成")

        # 5. MCP一覧
        mcp_items = [
            "1. ide: 診断・コード実行 (10ツール)",
            "2. pexels: 写真検索・ダウンロード (5ツール)",
            "3. praetorian: メモリ保存・検索 (4ツール)",
            "4. playwright: ブラウザ自動化 (20ツール)",
            "5. claude-historian: 会話履歴検索 (3ツール)",
            "6. pdf-reader: PDF読み取り (2ツール)",
            "7. filesystem: ファイル操作 (15ツール)",
            "8. git: Git操作 (12ツール)",
            "9. github: GitHub連携 (18ツール)",
            "10. google-maps: 地図検索 (8ツール)",
            "11. brave-search: Web検索 (3ツール)",
            "12. sqlite: SQLite (10ツール)",
            "13. postgres: PostgreSQL (10ツール)",
            "14. redis: Redis (8ツール)",
            "15. docker: Docker操作 (15ツール)",
            "16. kubernetes: K8s (12ツール)",
            "17. aws: AWS CLI (20ツール)",
            "18. gcp: GCP CLI (20ツール)",
            "19. azure: Azure CLI (20ツール)",
            "20. openai: OpenAI API (5ツール)",
            "21. anthropic: Claude API (5ツール)",
            "22. gemini: Gemini API (5ツール)",
            "23. stable-diffusion: 画像生成 (3ツール)",
            "24. elevenlabs: 音声生成 (4ツール)",
            "25. slack: Slack通知 (6ツール)",
            "26. email: メール送信 (3ツール)",
        ]
        self.draw_section_page("3️⃣ MCP 26サーバー・248ツール", mcp_items, YELLOW)
        print("✓ MCP一覧完成")

        # 6. Opencode
        opencode_items = [
            "Opencodeとは: Claude Code CLIのオープンソース版",
            "ralph-loop: 反復開発支援（計画→実装→評価→改善）",
            "opt-in設計: ユーザーが明示的に有効化",
            "fix: バグ修正支援（mistakes.md参照）",
            "最小差分原則: 必要最小限の変更のみ",
        ]
        self.draw_section_page("4️⃣ Opencode", opencode_items, BLUE)
        print("✓ Opencode完成")

        # 7. 13層防御システム
        layer_headers = ["Layer", "Guard", "機能"]
        layer_rows = [
            ["0", "CLAUDE.md", "絶対遵守ルール"],
            ["1", "SessionStart", "状態の自動注入"],
            ["2", "Permission Gate", "フェーズ外ブロック"],
            ["3", "Read-before-Write", "未読編集ブロック"],
            ["4", "Baseline Lock", "重要ファイル保護"],
            ["5", "Skill Evidence", "スキル証跡確認"],
            ["6", "Deviation Approval", "逸脱時承認要求"],
            ["7", "Agent Enforcement", "複雑タスク強制"],
            ["8", "Copy Safety", "文字化け検出"],
            ["9", "Input Sanitizer", "インジェクション防止"],
            ["10", "Skill Auto-Select", "スキル自動選択"],
            ["11", "Definition Lint", "定義検証"],
            ["12", "Context Quality", "品質チェック"],
        ]
        self.draw_table_page("5️⃣ Hook・13層防御システム", layer_headers, layer_rows, YELLOW)
        print("✓ 13層防御完成")

        # 8. 要件定義とSDD
        sdd_items = [
            "SDD (Spec-Driven Development): 仕様駆動開発",
            "sdd-full-pipeline: 要件定義→仕様書→実装→テスト→運用",
            "自動ドキュメント生成: 設計書・API仕様・テスト計画",
            "品質保証: 80点以上のコードレビュー、80%テストカバレッジ",
        ]
        self.draw_section_page("6️⃣ 要件定義とSDD", sdd_items, BLUE)
        print("✓ SDD完成")

        # 9. リサーチシステム
        research_headers = ["スキル", "検索対象", "API"]
        research_rows = [
            ["research", "基本リサーチ", "Brave Search"],
            ["world-research", "SNS・学術論文", "Apify"],
            ["unified-research", "複数API統合", "Multi"],
            ["mega-research-plus", "8ソース", "Multi"],
            ["research-cited-report", "出典付きレポート", "Brave"],
            ["note-research", "note.com専用", "Apify"],
            ["keyword-to-gem", "NotebookLM", "Gemini"],
        ]
        self.draw_table_page("7️⃣ リサーチシステム全て", research_headers, research_rows, YELLOW)
        print("✓ リサーチシステム完成")

        # 10. インストール方法
        install_items = [
            "macOS: brew install claude-code",
            "Windows: scoop install claude-code",
            "初期設定: claude-code init",
            "プロジェクト設定: .claude/settings.json",
            "CLAUDE.md: ルール定義",
            "hooks: 13層防御スクリプト",
        ]
        self.draw_section_page("8️⃣ インストール方法", install_items, BLUE)
        print("✓ インストール完成")

        # 11. アーキテクチャ
        arch_items = [
            "Layer 1: インテリジェンス層",
            "  - Intent Parser: タスク分類",
            "  - Model Router: モデル選択",
            "  - 96エージェント: 専門家チーム",
            "  - 41スキル: 再利用可能機能",
            "Layer 2: 実行制御層",
            "  - 13層防御: セキュリティゲート",
            "  - Workflow Engine: フロー管理",
            "  - メモリシステム: Praetorian + Historian",
            "  - コンテキスト圧縮: 自動最適化",
            "Layer 3: ツール統合層",
            "  - 26 MCPサーバー",
            "  - 248ツール",
            "  - コンテキスト最適化",
        ]
        self.draw_section_page("9️⃣ アーキテクチャ (3層構造)", arch_items, YELLOW)
        print("✓ アーキテクチャ完成")

        # 12. エージェント一覧
        agent_headers = ["カテゴリ", "エージェント数", "例"]
        agent_rows = [
            ["開発系", "20", "planner, implementer, code-reviewer"],
            ["品質保証系", "10", "qa-lead, test-engineer, e2e-runner"],
            ["インフラ系", "8", "container-specialist, cicd-manager"],
            ["文書・リサーチ系", "12", "doc-updater, researcher, tech-writer"],
            ["自動化・統合系", "15", "workflow-coordinator, migration-developer"],
            ["特殊機能系", "31", "voice-ai-agent, sdr-coordinator"],
        ]
        self.draw_table_page("🔟 エージェント全96個", agent_headers, agent_rows, BLUE)
        print("✓ エージェント一覧完成")

        # 13. 並列処理
        parallel_items = [
            "マルチエージェント並列実行: 最大5並列",
            "Task toolの並列呼び出し",
            "maxParallelAgents設定: デフォルト5",
            "依存関係の管理: blockedBy / blocks",
            "並列実行の例: 3エージェントで独立タスク",
        ]
        self.draw_section_page("1️⃣1️⃣ 並列処理", parallel_items, YELLOW)
        print("✓ 並列処理完成")

        # 14. LLMシステム
        llm_items = [
            "Model Router: 自動モデル選択",
            "Intent Parser: タスク分類",
            "複雑度判定: trivial/simple/moderate/complex/expert",
            "Haiku 4.5: 軽量タスク（90% Sonnet性能、3倍コスト削減）",
            "Sonnet 4.5: 標準開発（最高コーディング品質）",
            "Opus 4.6: 複雑推論（最深思考）",
            "LLM Auto-Switch v2.0: サブエージェント自動切替",
        ]
        self.draw_section_page("1️⃣2️⃣ LLMシステム", llm_items, BLUE)
        print("✓ LLMシステム完成")

        # 15. Google認証突破
        google_items = [
            "Playwright MCP: ログイン自動化",
            "Cookie保存・再利用: セッション維持",
            "reCAPTCHA対応: 自動検出",
            "OAuth 2.0フロー: 標準プロトコル",
        ]
        self.draw_section_page("1️⃣3️⃣ Google認証突破", google_items, YELLOW)
        print("✓ Google認証完成")

        # 16. サイト理解・分析システム
        site_items = [
            "url-all: サイト完全把握（5層解析）",
            "url-deep-analysis: 深層分析",
            "agentic-vision: 画像分析（Gemini 3 Flash）",
            "Playwright MCP: DOM構造解析",
            "WebFetch + WebSearch: 統合リサーチ",
        ]
        self.draw_section_page("1️⃣4️⃣ サイト理解・分析システム", site_items, BLUE)
        print("✓ サイト分析完成")

        # 17. 裏表紙
        self.draw_comic_title("完", "End of Document", RED)
        print("✓ 裏表紙完成")

        # PDF保存
        self.c.save()
        print(f"\n✅ PDF生成完了: {self.output_path}")
        print(f"📄 総ページ数: {self.page_num}")

def main():
    output_path = "/Users/matsumototoshihiko/Desktop/エージェント説明PDF.pdf"

    generator = ComicPDFGenerator(output_path)
    generator.generate_full_pdf()

    print("\n" + "="*60)
    print("🎉 TAISUN v2 完全版PDF生成完了！")
    print("="*60)
    print(f"出力先: {output_path}")
    print(f"ページ数: {generator.page_num}")
    print("\n特徴:")
    print("  - アメリカンコミックスタイル")
    print("  - 黄色/青背景")
    print("  - 吹き出し（Speech Bubble）")
    print("  - 集中線エフェクト")
    print("  - 効果音（BOOM! POW!）")
    print("  - 日本語フォント対応")

if __name__ == "__main__":
    main()
