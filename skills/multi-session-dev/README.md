# multi-session-dev

> 几个 AI 会话一起开发一个项目，不互相踩脚，也不把你淹没在「等你回话」里。

用一个管理会话做决策和集成，每个任务一个开发会话，各有分支和 worktree；短的调研和审查交给子代理，你不在时交给云端会话。这个 skill 是写给 agent 看的操作手册：什么时候自己做、什么时候开新会话，派工前查什么，怎么验收，怎么交接，管理会话该守哪些规矩。和具体工具无关，Claude Code、claude.ai、Codex 都能用。

## 怎么用

新项目里只开**一个**会话，说「用 multi-session-dev 帮我把这个项目的协作方式定下来」。它会问你分支怎么走、谁合并谁推送、哪些资源只有一份、你什么时候在，把答案写成项目档案放进 `CLAUDE.md` 或 `AGENTS.md`。之后就在这个会话里提需求，由它拆任务、写简报、开开发会话（或者给你开场指令），核对结果再告诉你。

## 包含什么

| | |
|---|---|
| `SKILL.md` | 项目档案、角色和两种合入方式、谁来做、派工前的四项检查、任务简报、开发会话的步骤、验收分档、结束报告和交接、管理会话守则、本地和云端、新项目起步 |
| `references/templates.md` | 任务简报、结束报告、持久交接、各会话的开场指令 |
| `references/project-profile.md` | 项目档案要回答的问题，附一份填好的例子 |
| `references/tools.md` | Claude Code、claude.ai、Codex 各自怎么开会话、派子代理、开 worktree |
| `references/ci-cost.md` | 私有仓库的 CI 分钟数怎么省，以及不能碰的合并门禁 |
| `references/pitfalls.md` | 实际出过的 13 个问题和对应做法 |
| `scripts/init_project.py` | 把项目档案、任务和契约模板拷进新项目；先检查再写入，不覆盖已有文件 |

## 几条来自实践的做法

- **并行的上限是你的注意力，不是机器。** 等你验收、选择、亲手操作的事到 3 件左右，先汇总处理，再派新任务。
- **结束报告第一句固定写**「分支 @ 提交｜有没有合入推送｜在等谁」。管理会话收到的通知常被截断，这一句要能独立看懂。
- **子会话说做完了不算数**，管理会话先查 Git 再告诉你。
- **需要你亲手做的事（登录、许可、付款、密码）写进简报**，开发会话一开始就一次问完，不要做到一半才停。
- **能用截图或录屏验收的，就不占用桌面上那个只能开一个的程序。**
- **改了共享类型或接口，跑所有用到它的测试**，只跑「相关测试」会让 CI 红好几天。

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s multi-session-dev
```

或者在 Claude Code 里：`/plugin marketplace add RedCarpG/redcarpg-skills`，再 `/plugin install workflow-skills@redcarpg-skills`。

`init_project.py` 需要 Python 3.9+。

还没有 `evals/`：测试用例在后续版本补。

## 来源

来自 [Cirra](https://github.com/RedCarpG/cirra-deskpet) 和 [ChroniQ](https://github.com/RedCarpG/ChroniQ) 开发中同时开 4–6 个会话的经历，经过 Claude 和 Codex 三轮互相评审后合并成这一版。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
