# redcarpg-skills 维护指南

这个公开仓库是自建 Agent Skills 的发布目标，也当作品集。仓库结构和安装方式见 [README](README.md)。

skill 不在这里开发。开发、孵化、跨项目经验、安装清单和本机环境配置都在私有仓 `RedCarpG/redcarpg-skills-private`。共用的协作流程写在私有仓的 [AGENTS.md](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/AGENTS.md)，这里只写本仓自己的规则。

## 这个 repo 和别处的关系

| 地方 | 放什么 |
|---|---|
| `RedCarpG/redcarpg-skills-private`（私人） | **自建 skill 的开发源头**。lessons、全局 CLAUDE.md 和设置、`skills.lock.json`（自建和第三方 skill 各装哪个版本）、安装脚本 `scripts/bootstrap.mjs`、发布脚本 `scripts/release-public.mjs`。 |
| 本 repo（`RedCarpG/redcarpg-skills`，公开） | 每周发布的结果。skill 只通过发布 PR 进来，打 tag `<name>-v<version>`。 |
| `~/.claude/skills/<name>`、`~/.codex/skills/<name>` | 安装出来的副本，由私有仓的 `scripts/bootstrap.mjs` 按 lock 安装。不要直接改副本。 |
| `RedCarpG/ChroniQ` 的 `core/skill/mingli-chart-reading/` | mingli-chart-reading 的源头。构建产物和别的 skill 一样经发布进来，不在这里改。 |

## 开始前检查

- 读 `git show origin/main:AGENTS.md`，不读工作区里的副本。工作区可能落后，也可能有别的会话没提交的草稿。
- 跑 `gh pr list --state open`，看这件事是不是已经在某个开着的 PR 里。
- 跑 `git status --short --branch` 和 `git worktree list`，看主检出干不干净、有哪些 worktree 在用。

## 发布流程

| 改动 | 流程 |
|---|---|
| skill 内容（新增、改行为、改措辞，包括 mingli-chart-reading） | 在私有仓改。每周一次由私有仓的 `scripts/release-public.mjs` 生成 PR `release: YYYY-MM-DD` → 一个独立审查者（Codex 或 Copilot）→ CI 通过 → 合并 → 给版本变了的 skill 打 tag `<name>-v<version>` |
| 紧急修复 | 在私有仓修好，提前发一个发布 PR，流程同上 |
| 本仓自己的 `scripts/`、`.github/`、`.claude-plugin/`、`chatgpt/`、README | draft PR → 一个独立审查者 → CI 通过 → 合并 |

- 不在这里直接改 skill：下一次发布会覆盖掉。
- 改了 skill 照样要按 semver 加 `manifest.json` 版本，并在「更新记录」加一行，这一步在私有仓做。
- 发布由 skill 维护会话做（在 Claude 里就是管理会话）。对别的 agent 的改动有不同意见，在私有仓开带 `feedback` 标签的 issue。项目里的会话只用 skill，不改。

**让审查快一点**：GitHub Copilot 可以设成自动审查每个 PR（仓库 ruleset 里的「自动请求 Copilot 代码审查」，或 Copilot 的代码审查设置）。由用户在 GitHub 上打开，agent 不改仓库设置。

## 管理会话

- 管理会话留在主检出的 `main` 上，不开 worktree。要开分支的活派给子会话。
- 主检出里不留未提交的改动。PR 合并后，管理会话把主检出快进到 `origin/main`。
- 其余协作规则（分工、交接、审查）见私有仓的 [AGENTS.md](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/AGENTS.md)。

## 提交前检查

- 运行 `node scripts/validate.mjs` 和 `git diff --check`。
- 涉及打包时，用 `node scripts/package.mjs` 实际构建，检查 ZIP 中的 `SKILL.md` 和本次涉及的资源。
- 本地通过但 GitHub Actions 还在跑时，在 PR 里注明。

## 不能进这个 repo 的东西

- 本机绝对路径（用户目录、项目盘符开头的路径）、邮箱、token。`validate.mjs` 会卡。
- 别人的模型、贴图、游戏提取的资源，以及用它们录的截图或 GIF。演示素材只用自己做的或许可明确允许再分发的。
- 第三方 skill。
