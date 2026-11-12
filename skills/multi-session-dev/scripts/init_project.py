#!/usr/bin/env python3
"""把 multi-session-dev 的起步模板拷进目标项目目录。

用法:
    python init_project.py <项目目录>

先检查再写入：模板包不完整，或者目标里有路径和模板冲突（例如该是目录的地方是个文件），
就列出问题、什么都不写，返回 1。已存在的同名普通文件不覆盖，只提示跳过，可以重复运行。
跨平台（Windows / macOS / Linux）。

PROJECT.md 是仓库指令文件的骨架：按你用的工具改名为 CLAUDE.md 或 AGENTS.md；
项目里已经有 CLAUDE.md 或 AGENTS.md 时，把它的「项目档案」一节并进去，再删掉 PROJECT.md。
"""

import shutil
import sys
from pathlib import Path, PurePosixPath

TEMPLATES = Path(__file__).resolve().parent.parent / "assets" / "templates"
REQUIRED = (
    "PROJECT.md",
    "PLAN.md",
    "docs/tasks/TASK-000-template.md",
    "docs/contracts/CONTRACT-000-template.md",
)
INSTRUCTION_FILES = ("CLAUDE.md", "AGENTS.md")


def check(target: Path) -> list[str]:
    """写入前检查。返回问题列表，空表示可以写。"""
    problems = []
    for rel in REQUIRED:
        src = TEMPLATES / PurePosixPath(rel)
        if not src.is_file():
            problems.append(f"模板包缺文件：{src}")
    if problems:
        return problems

    for rel in REQUIRED:
        dst = target / PurePosixPath(rel)
        # 每一级父路径要么不存在，要么是目录
        for parent in reversed(dst.relative_to(target).parents):
            p = target / parent
            if p != target and p.exists() and not p.is_dir():
                problems.append(f"路径冲突：{p} 是文件，这里需要一个目录")
        if dst.exists() and not dst.is_file():
            problems.append(f"路径冲突：{dst} 已存在但不是普通文件")
    return sorted(set(problems))


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1

    target = Path(sys.argv[1]).resolve()
    if not target.is_dir():
        print(f"目标目录不存在: {target}")
        return 1

    problems = check(target)
    if problems:
        print("没有写入任何文件，先解决这些问题：")
        for p in problems:
            print(f"  - {p}")
        return 1

    created, skipped = [], []
    for rel in REQUIRED:
        src = TEMPLATES / PurePosixPath(rel)
        dst = target / PurePosixPath(rel)
        if dst.exists():
            skipped.append(rel)
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        created.append(rel)

    for rel in created:
        print(f"创建  {rel}")
    for rel in skipped:
        print(f"跳过  {rel}（已存在）")
    print(f"\n完成：新建 {len(created)} 个，跳过 {len(skipped)} 个。")

    existing = [name for name in INSTRUCTION_FILES if (target / name).exists()]
    if "PROJECT.md" in created:
        if existing:
            print(f"项目里已有 {', '.join(existing)}：把 PROJECT.md 的「项目档案」一节并进去，再删掉 PROJECT.md。")
        else:
            print("下一步：把 PROJECT.md 改名为 CLAUDE.md 或 AGENTS.md，填写项目档案和模块边界。")
    if "PLAN.md" in created:
        print("PLAN.md 可选：任务不多时可以删掉。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
