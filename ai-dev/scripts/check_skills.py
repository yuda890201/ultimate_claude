#!/usr/bin/env python3
"""ai-dev/skills/ のスキルが読み込める形であることを確かめる。

**壊れた SKILL.md はエラーにならず、黙って発動しなくなるだけである。**
気づく経路が無いので、ここで塞ぐ。

標準ライブラリだけで動く。

    python3 ai-dev/scripts/check_skills.py

失敗すると非ゼロで終わる（CI に置いてもよい）。
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
REFERENCED = re.compile(r"`((?:references|scripts|templates)/[\w./-]+)`")

MIN_DESCRIPTION = 40
MIN_BODY = 200


def parse(path):
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER.match(text)
    if match is None:
        return None, None
    fields = {}
    for line in match.group(1).splitlines():
        if ":" in line and not line.startswith((" ", "\t")):
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
    return fields, text[match.end():]


def main():
    if not SKILLS.is_dir():
        print(f"NG {SKILLS} が無い")
        return 1

    problems = []
    names = []
    for d in sorted(p for p in SKILLS.iterdir() if p.is_dir()):
        skill = d / "SKILL.md"
        if not skill.is_file():
            problems.append(f"{d.name}: SKILL.md が無い")
            continue
        fields, body = parse(skill)
        if fields is None:
            problems.append(f"{d.name}: frontmatter（先頭の --- ブロック）が無い")
            continue

        name = fields.get("name", "")
        if name != d.name:
            problems.append(
                f"{d.name}: name が {name!r}。ディレクトリ名と一致しないと "
                "/名前 で呼べない"
            )
        desc = fields.get("description", "")
        if not desc:
            problems.append(f"{d.name}: description が無い（自動発動しない）")
        elif len(desc) < MIN_DESCRIPTION:
            problems.append(
                f"{d.name}: description が {len(desc)} 文字。"
                "どんなときに使うかを具体的に書く"
            )
        if len(body.strip()) < MIN_BODY:
            problems.append(f"{d.name}: 本文が短すぎる")

        for rel in REFERENCED.findall(body):
            if not (d / rel).exists():
                problems.append(f"{d.name}: 案内先が無い {rel}")

        names.append(d.name)

    for line in problems:
        print("NG " + line)
    if problems:
        print(f"\n{len(problems)} 件の問題。")
        return 1
    print("OK " + ", ".join(names) + f"（{len(names)} 件）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
