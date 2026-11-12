# redcarpg-skills

RedCarpG 自己写的、在真项目里实测过的 agent skill。公开，也当作品集。

## 这个 repo 和别处的关系

| 地方 | 放什么 |
|---|---|
| 本 repo（`RedCarpG/redcarpg-skills`，公开） | 已完善、可公开的 skill。**是这些 skill 的源头**，改 skill 在这里改。 |
| `RedCarpG/redcarpg-skills-private`（私人） | lessons、全局 CLAUDE.md 和设置、孵化中的 skill（`skills/`）、`skills.lock.json`（自建和第三方 skill 各装哪个版本）。 |
| `~/.claude/skills/<name>` | 安装出来的副本。作者本机用 `scripts/sync-local.mjs` 同步（或 junction 指到这里）；别的机器按私人 repo 的 lock 安装。不要直接改副本。 |
| `RedCarpG/ChroniQ` 的 `core/skill/mingli-chart-reading/` | mingli-chart-reading 的源头。本 repo 只放构建出来的副本，不在这里改。 |

## 加一个 skill

1. 从私人 repo 的孵化区（或 `~/.claude/skills/`）复制进 `skills/<name>/`。
2. 改掉本机绝对路径；「来源与维护」的「源头」改成本 repo；私有项目写成 GitHub 链接。
3. 补 `manifest.json`（版本从 1.0.0 起）和给人看的 `README.md`。
4. `.claude-plugin/marketplace.json` 里放进合适的插件包；根 README 加一段。
5. `node scripts/validate.mjs` 通过。
6. 私人 repo 的 `skills.lock.json` 把来源改成本 repo。

## 改一个 skill

- 先读它的「来源与维护」。
- 改脚本要按那一节写的方法重新实测；改做法或坑，同步改私人 repo 里对应的 lessons 文件。
- `manifest.json` 版本按 semver 加；「更新记录」加一行：日期、哪个项目、改了什么。
- 发版：打 tag `<name>-v<version>`。

## 不能进这个 repo 的东西

- 本机绝对路径（用户目录、项目盘符开头的路径）、邮箱、token。`validate.mjs` 会卡。
- 别人的模型、贴图、游戏提取的资源，以及用它们录的截图或 GIF。演示素材只用自己做的或许可明确允许再分发的。
- 第三方 skill。
