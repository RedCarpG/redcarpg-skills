# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。

## 来源与维护

- **来源**：[Cirra](https://github.com/RedCarpG/cirra-deskpet)（桌面应用主线、插件仓库、语音服务三个仓库，2026-10 至 2026-11）与 [ChroniQ](https://github.com/RedCarpG/ChroniQ) 的多会话开发实践；Claude 与 Codex 对这份 skill 的三轮评审（评审记录未公开）；作者在 claude.ai 上的 `multi-session-dev` 早期草案（被本版替换）；作者经验库里的 `multi-session-pr-workflow` 一篇（私人仓库）。
- **源头**：开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/multi-session-dev/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。
- **怎么改**：
  - 在本仓库改，`node scripts/validate.mjs` 通过后提交；`manifest.json` 的版本按 semver 加，发版打 tag `multi-session-dev-v<版本>`，再重装各处副本。
  - 正文保持和工具无关：工具相关的写进 `references/tools.md`；项目专属的规则不进本 skill，写进那个项目的档案。
  - 改了做法或坑，同步改私人仓库里的 `multi-session-pr-workflow` 经验。
  - 改了 `scripts/init_project.py`，按六种情况重测：空目录；已有文件的目录连跑两次；只有脚本、没有模板；`docs/tasks` 是文件；`PLAN.md` 是目录；生成的文件里没有断链。
- **更新记录**：
  - 2026-11-17（Cirra）：1.3.1。`references/project-profile.md` 的 Cirra 例子：云端会话从常驻 `DEV-cloud` 改成一件事一条短分支、草稿 PR 进 `DEV`，写明撤掉的原因。
  - 2026-11-16（Cirra）：1.3.0。`references/tools.md` 加 DeepSeek Harness（DSH）一列和一节（指令文件、开会话、四种子代理、在 `cordis.patch.yml` 打开挑模型并给出分档、`create_worktree`、无云端会话）和「DSH 的实际经验」（workspace-write 下写 `.git` 要批准、用草稿目录改别的仓库）；表格加「项目 skill 放哪」一行，三种工具都填，并写跨工具放 skill 的做法；Codex 一节补上项目 skill 目录。
  - 2026-11-16（Cirra）：1.2.0。管理会话按任务选择模型和推理强度，补充 Codex 派工方式和开发会话简报字段。`references/tools.md` 的「云端会话」一行写明云端只加载 claude.ai 里启用的 skill 和仓库 `.claude/skills/`；Claude Code 部分加上桌面应用里挑模型和推理强度的限制（子会话开的时候只能同级或更便宜、`effort` 不高于管理会话，要更高就用 `set_session_model` / `set_session_effort` 升级、由用户确认；子代理按次给 `model`）和用户确认过的 Haiku / Sonnet / Opus / Fable 分档，来自私人仓库经验 `multi-session-pr-workflow` 第 23 条。
  - 2026-11-12（Cirra）：合并 claude.ai 草案与 Codex 的 `development-coordination` 试用稿；加入项目档案、两种合入配置、派工前四项检查、用户注意力上限、验收分档、结束报告第一句、管理会话守则、本地和云端分工、CI 成本。
  - 2026-11-12（Codex 复核后）：本地检查不能代替合并门禁，省 CI 前先核对门禁；审查子代理只给真正只读的工具；验收、同步、云端分支、快速检查都改由项目档案决定；交付确认后再清理 worktree；初始化脚本先校验再写入；CI 测量改用作业时间，加自托管 runner 的信任边界；PLAN 模板不再带断链。
  - 2026-11-12：1.0.0 收进 redcarpg-skills，「来源与维护」改为指向本仓库。
  - 2026-11-13（Cirra）：1.1.0。结束报告最后加「可记录的经验」，管理会话代记（守则第 8 条）；简报的写入边界后面跟一句「边界外的停下来说明」；pitfalls 加三条：云端子会话开场没挂齐仓库、作业一两秒就失败是额度问题、云端拿不到第三方文档。
