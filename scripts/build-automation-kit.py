#!/usr/bin/env python3
"""Build a workshop kit ZIP: extracts .gs code blocks from the 9 guides
plus PDF workbook and a kit README, writes to
resources/automation/automation-9-kit.zip.

Usage: python3 scripts/build-automation-kit.py
"""
from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from automation_meta import AUTHOR, CARDS, COURSE_TITLE, SITE_NAME  # noqa: E402

AUTO_DIR = ROOT / "resources" / "automation"
ZIP_PATH = AUTO_DIR / "automation-9-kit.zip"
WORKBOOK_PDF = AUTO_DIR / "automation-9-workbook.pdf"

CODE_FENCE = re.compile(r"```javascript\n(.*?)\n```", re.DOTALL)


def extract_gs_blocks(md_text: str) -> list[str]:
    """Return all ```javascript fenced blocks from a markdown document."""
    return CODE_FENCE.findall(md_text)


def build_kit_readme() -> str:
    listing = "\n".join(
        f"- `{i}-{slug.split('/')[-1]}.gs` — {meta['title']} (난이도 {meta['level']}, "
        f"예상 {meta['time']})"
        for i, (slug, meta) in enumerate(CARDS.items(), 1)
    )
    return f"""# {COURSE_TITLE} — 자료 키트

워크숍·강의·자체 학습용 한 번에 받는 패키지입니다. 모든 파일은 무료이며 자기 조직 적용을 위해 자유롭게 수정·사용할 수 있습니다.

## 포함 내용

### code/ — 9개 Apps Script 코드 (`.gs`)
{listing}

### docs/
- `automation-9-workbook.pdf` — 9선 통합 워크북 (인쇄·이북 친화)
- `README.md` — 본 파일

## 빠르게 시작하는 법

1. 가장 자주 잃는 시간을 1개 고른다 (`code/`의 첫 번째 `.gs` 또는 워크북의 추천 3선 중)
2. 해당 파일을 Google Apps Script 편집기에 붙여넣고 스크립트 속성에 API 키만 등록
3. 트리거를 1회 실행해 권한을 부여하고 운영 시작
4. 1주일 운영 결과를 본 뒤 두 번째 자동화로 확장

상세 셋업 가이드는 워크북 PDF의 각 챕터 또는 온라인:
- 자료 허브: https://www.nedabah.org/auto
- 용어집: https://www.nedabah.org/resources/automation/glossary.html

## 안전·윤리 기본선

- 익명 설문·VOC 분석에서 **식별 정보(이름·이메일·부서)를 AI에 전송하지 않는다**
- 자동 응답·자동 발송은 **사람 검토 단계**를 한 번 이상 둔다
- API 키는 코드에 직접 쓰지 않고 **Apps Script 스크립트 속성**에 저장한다
- 외부 발송 자동화는 **되돌릴 수 없는 행위**임을 인지한다

## 라이선스

본 자료는 강의 수강자 및 자기 조직 적용을 위해 자유롭게 사용·수정할 수 있습니다. 외부 강의·교재 재배포 시 출처 표기를 부탁드립니다.

— {AUTHOR} · {SITE_NAME} · nedabah.way@gmail.com
"""


def main() -> None:
    if not WORKBOOK_PDF.exists():
        print(f"WARN: {WORKBOOK_PDF.relative_to(ROOT)} not found. "
              "Run build-automation-pdf.py first; ZIP will be built without the PDF.")

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for i, (slug, meta) in enumerate(CARDS.items(), 1):
            md_path = AUTO_DIR / f"{slug}.md"
            blocks = extract_gs_blocks(md_path.read_text(encoding="utf-8"))
            # base is the file slug without the "NN-" prefix, e.g. "meeting-notes-to-actions"
            base = re.sub(r"^\d+-", "", slug.split("/")[-1])
            for j, block in enumerate(blocks, 1):
                suffix = "" if j == 1 else f"-helper-{j}"
                fname = f"code/{i:02d}-{meta['tag'].lower()}-{base}{suffix}.gs"
                header = (
                    f"// {meta['tag']} · {meta['title']}\n"
                    f"// 난이도 {meta['level']} · 예상 {meta['time']} · 전제: {meta['prereq']}\n"
                    f"// 출처: https://www.nedabah.org/resources/automation/{slug}.html\n"
                    "// Apps Script 편집기에 붙여넣은 뒤 스크립트 속성에 PROPS 항목을 등록하세요.\n\n"
                )
                zf.writestr(fname, header + block)
        zf.writestr("docs/README.md", build_kit_readme())
        if WORKBOOK_PDF.exists():
            zf.write(WORKBOOK_PDF, "docs/automation-9-workbook.pdf")
        zf.writestr(
            "docs/원본-마크다운.txt",
            "각 가이드의 원본 마크다운은 GitHub 리포지토리에서 확인할 수 있습니다.\n"
            "https://github.com/bebeggogo-byte/nedabahway-site/tree/main/resources/automation\n",
        )

    size_kb = ZIP_PATH.stat().st_size // 1024
    print(f"WROTE {ZIP_PATH.relative_to(ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    main()
