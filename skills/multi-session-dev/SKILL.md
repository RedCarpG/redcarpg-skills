---
name: multi-session-dev
description: 用多个 AI 编码会话并行开发时的分工和交接：管理会话做决策和集成，开发会话各用分支和 worktree，子代理做短任务，云端会话在用户不在时推进；含派工前检查、任务简报、验收证据、结束报告。用户说「开子会话」「派个任务」「subagent 还是独立 session」「谁合并谁推送」时用。Parallel coding-agent sessions.
---

# Multi-Session Dev：几个 AI 会话一起开发

> **会话负责思考和执行，worktree 负责隔离，文件负责共享状态，Git 和 PR 负责交付和验收。**
> 会话随时可以重建；任务定义、接口契约、提交和测试证据必须不依赖任何一个会话的记忆而存在。

正文和具体工具无关；某个工具怎么开会话、派子代理、开 worktree，看 `references/tools.md`。

## 先读项目档案

每个项目要有一份**项目档案**（通常是 `CLAUDE.md` / `AGENTS.md` 里的一节）：分支流程、谁验收/合并/推送、worktree 怎么开、哪些资源只有一份、快速检查、验收分档、云端走哪条分支、哪些事只有用户能做。**项目规则优先于本 skill。** 没有就和用户按 `references/project-profile.md` 填一份；新项目用 `scripts/init_project.py <项目目录>` 拷入起步模板。

## 角色和谁来做

- **用户** 定方向、验收、做只有本人能做的事（登录、授权、付款、真机）。
- **管理会话** 拆任务、写简报、开开发会话、核对结果再告诉用户、协调契约和合入顺序、推送；不写成块的功能代码，不替别的会话越过权限确认。
- **开发会话** 每个任务一个，有自己的分支和 worktree；不改写入边界以外的文件。**云端会话** 同开发会话，但只碰得到远端和 CI。**子代理** 一次性调研、审查，审查者只报问题不改代码。
- 几次工具调用能完成的自己做；这一轮要结果的调研、审查给子代理；能独立交付、跨多轮的开新开发会话；用户不在、不需要真机的给云端。不要把流程建在多层子代理嵌套上。
- 合入有两种配置，档案里选一种：A. 开发会话提 PR、集成者合；B. 开发会话经用户验收后合入本地集成分支、管理会话统一推送。

## 硬规则

1. **派工前四项检查**，任一项不过就重新切分或串行：写入边界不重叠；共享契约、版本号、锁文件、入口文件只能一人改（改契约前先合对方最新的）；只有一份的运行资源（桌面实例、端口、数据目录）写明谁占用；等用户处理的事约 3 件时先汇总再派。
2. **简报**必须有：目标和验收条件、仓库/基线/写入边界、契约和环境、验收方式、需要用户亲手做的步骤（一开始一次问完）、谁验收合入推送。
3. 改了共享类型、接口或版本号，跑所有消费者的测试（含别的仓库）。
4. **按改动挑验收证据**：静态检查和测试 → 无头截图或录屏 → 真机 → 发布环境；能截图验收就不占桌面实例。结果写 `PASS` / `FAIL` / `未运行` / `不适用`。**本地结果不能代替项目的合并门禁。**
5. **结束报告第一句**固定：
   ```text
   <仓库>/<分支> @ <提交>｜<已合入 / 已推送 / 都没有>｜<在等谁、等什么；没有就写下一步>
   ```
   最后一节写「可记录的经验」，没有写「无」，由管理会话代记进经验库。
6. **子会话的报告不是证据**：管理会话告诉用户「完成」前先看 Git（提交、合入、worktree、PR）。推送前先同步远端；判断冲突先在临时 worktree 里真合一次。核对完已合入、worktree 已清理的线，把它的会话列进「可以归档」一次问用户（守则第 9 条）。
7. 接手顺序：项目指令 → 任务入口 → 最新交接 → Git 现场；不符时以 Git 为准。
8. **不要过度设计**：任务索引、交接文件、专门集成角色、编排器，等真出了问题再加。

## 什么情况读哪里

| 情况 | 读 |
|---|---|
| 档案、角色表、两种合入配置、谁来做、选模型和推理强度（原 §0–§2） | `references/roles.md` |
| 派工前检查、并行数量、简报字段、开发会话的七步、验收分档和 CI 不可用时（原 §3–§6） | `references/dispatch.md` |
| 结束报告、持久交接、接手顺序、记录放哪、管理会话九条守则（原 §7–§8） | `references/handoff.md` |
| 本地/云端/远程遥控怎么分、云端分支和常开集成 PR、新项目起步模板（原 §9–§10） | `references/local-and-cloud.md` |
| 简报、结束报告、交接、各会话开场指令的模板 | `references/templates.md` |
| 项目档案要回答的问题和例子 | `references/project-profile.md` |
| 私有仓库 CI 分钟数怎么省 | `references/ci-cost.md` |
| Claude Code、claude.ai、Codex、DSH 各自的做法，项目 skill 放哪 | `references/tools.md` |
| 实际出过的问题 | `references/pitfalls.md` |
| 完整来源、改法（`init_project.py` 六种情况重测）、更早的更新记录 | `references/maintenance.md` |

## 来源与维护

- **来源：** [Cirra](https://github.com/RedCarpG/cirra-deskpet)（三个仓库，2026-10 至 2026-11）与 [ChroniQ](https://github.com/RedCarpG/ChroniQ) 的多会话开发实践；Claude 与 Codex 三轮评审；作者经验库里的 `multi-session-pr-workflow`（私人仓库）。细节见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/multi-session-dev/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，不要直接改。
- **怎么改：** 正文保持和工具无关（工具相关写进 `references/tools.md`，项目专属写进项目档案）；改了做法同步 `multi-session-pr-workflow` 经验；改了 `scripts/init_project.py` 按 `references/maintenance.md` 的六种情况重测；发版时 `manifest.json` 按 semver 升；下面加一行更新记录。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-23（图像配方库）：`references/pitfalls.md` 加第 17 条：两个会话共用一个文件夹、都用 `git add -A` 提交，互相带走对方的半成品。同日补：同一文件两边都改时只暂存自己的段落。
  - 2026-11-22（Cirra）：1.4.0。管理会话守则加第 9 条「做完的会话提议归档」（为什么、什么时候不列、归档前看工作目录），硬规则第 6 条指过去；`references/tools.md` 的 Claude Code 一节加归档会话的做法。用户发现管理会话常常不主动归档做完的会话后提出。
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-17（Cirra）：1.3.1。project-profile 的 Cirra 例子改成云端一件事一条短分支。
  - 2026-11-16（Cirra）：1.3.0 加 DSH；1.2.0 按任务选模型和推理强度。
  - 2026-11-12 至 2026-11-13：合并草案和 Codex 试用稿、Codex 复核修订、1.0.0 收进 redcarpg-skills、1.1.0 加「可记录的经验」。
