# redcarpg-skills 维护指南

这个公开仓库维护可发布的自建 Agent Skills，也当作品集。仓库结构和安装方式见 [README](README.md)。孵化中的技能、跨项目经验、安装清单和本机环境配置由私有维护仓管理。

## 这个 repo 和别处的关系

| 地方 | 放什么 |
|---|---|
| 本 repo（`RedCarpG/redcarpg-skills`，公开） | 已完善、可公开的 skill。**是这些 skill 的源头**，改 skill 在这里改。 |
| `RedCarpG/redcarpg-skills-private`（私人） | lessons、全局 CLAUDE.md 和设置、孵化中的 skill（`skills/`）、`skills.lock.json`（自建和第三方 skill 各装哪个版本）、安装脚本 `scripts/bootstrap.mjs`。 |
| `~/.claude/skills/<name>`、`~/.codex/skills/<name>` | 安装出来的副本，由私人 repo 的 `scripts/bootstrap.mjs` 按 lock 安装。作者本机是 junction，指到本 repo 的主检出。不要直接改副本。 |
| `RedCarpG/ChroniQ` 的 `core/skill/mingli-chart-reading/` | mingli-chart-reading 的源头。本 repo 只放构建出来的副本，不在这里改。 |

## 开始前检查

- 读 `git show origin/main:AGENTS.md`，不读工作区里的副本。工作区可能落后，也可能有别的会话没提交的草稿。
- 跑 `gh pr list --state open`，看这件事是不是已经在某个开着的 PR 里。
- 跑 `git status --short --branch` 和 `git worktree list`，看主检出干不干净、有哪些 worktree 在用。

## 管理会话

- 管理会话留在主检出的 `main` 上，不开 worktree。要开分支的活派给子会话，子会话在自己的 worktree 里做。
- 主检出是正在用的安装源：本机 `~/.claude/skills` 和 `~/.codex/skills` 都 junction 到这里。改到一半的文件会直接被所有 agent 读到。
- 所以主检出里不留未提交的改动。PR 合并后，管理会话把主检出快进到 `origin/main`。

## 协作

- Codex 负责协调任务、检查两仓依赖、复核 diff 和验证结果，以及按用户授权推进集成和发布。Claude Code 和 GitHub Copilot 按任务简报实现或审查，各工具也可以接手已有任务。
- 任务简报或 PR 写明基线、允许改动的文件和验收条件。多人并行写入时，各任务使用独立分支和 worktree。涉及同一技能版本、manifest、打包脚本或发布清单的改动按顺序集成。
- 要审查的改动（见下面「日常流程」），改动方先开 draft PR，附变更范围、验证结果和待审重点。由另一方独立审查，例如 Claude Code 的改动由 Codex 审查，Codex 的改动由 Claude Code 或 GitHub Copilot 审查。审查意见留在 PR 或任务记录，标明受检提交。实质性改动后补审受影响的部分，检查通过后再准备合并。
- 交接写在对应 PR 或已有任务记录，包含分支与提交、验证命令及结果、依赖或冲突和下一步。集成前对比最新目标分支，并重跑受影响的检查。推送、合并和发版按用户授权执行。

## 日常流程

不是所有改动都要走 PR 和审查。按改动类型选流程：

| 改动类型 | 流程 |
|---|---|
| 只改一个 skill 的 `SKILL.md` 或 `references/` 里的措辞、例子、说明：skill 让 agent 做的事不变，不动脚本，manifest 最多加 patch 版本 | 直接提交到 `main`，推送后 CI 必须通过 |
| 改 skill 的行为或规则，或新加 skill | draft PR → 一个独立审查者 → 合并 |
| 改 `scripts/`、`.github/workflows/`、`.claude-plugin/`、`chatgpt/` | draft PR → 一个独立审查者 → CI 通过 → 合并 |

不管走哪条，改了 skill 都要按 semver 加 `manifest.json` 版本，并在「更新记录」加一行。

**让审查快一点**：GitHub Copilot 可以设成自动审查每个 PR（仓库 ruleset 里的「自动请求 Copilot 代码审查」，或 Copilot 的代码审查设置）。由用户在 GitHub 上打开，agent 不改仓库设置。打开后，draft PR 转成可审查时就有一份 Copilot 审查，独立审查者可以先看它。

## 技能维护

- 先读技能的「来源与维护」。在该技能的源头修改。公开自建技能的源头通常是 `skills/<name>/`。`mingli-chart-reading` 的源头是 ChroniQ 的 `core/skill/mingli-chart-reading/`，这里维护构建产物。
- 新增公开技能时，检查发布许可，移除本机路径、邮箱、密钥和私有材料。在「来源与维护」中写明新的源头。添加 `manifest.json`（初始版本 `1.0.0`）、技能目录的 `README.md`、根目录 README 条目和 `.claude-plugin/marketplace.json` 对应条目。公开版本可用后，在私有仓更新 `skills.lock.json` 的来源。
- 修改技能时，按 semver 更新 `manifest.json`，在「更新记录」写明日期、项目和改动。脚本按技能的验证步骤实测。做法或经验有变化时，按需更新私有仓对应的 `lessons/` 条目。发布标签格式为 `<name>-v<version>`。
- 演示素材使用原创或明确允许再分发的资源。第三方技能通过私有安装清单管理。
- 提交前运行 `node scripts/validate.mjs` 和 `git diff --check`。涉及打包时，用 `node scripts/package.mjs` 实际构建，检查 ZIP 中的 `SKILL.md` 和本次涉及的资源。若本地通过但 GitHub Actions 仍待运行，交接时注明。

## 不能进这个 repo 的东西

- 本机绝对路径（用户目录、项目盘符开头的路径）、邮箱、token。`validate.mjs` 会卡。
- 别人的模型、贴图、游戏提取的资源，以及用它们录的截图或 GIF。演示素材只用自己做的或许可明确允许再分发的。
- 第三方 skill。
