<div align="center">

# redcarpg-skills

**在真项目里踩过、量过的 Agent Skills。**

Field-tested agent skills for Claude Code, Cursor, Codex and other AI coding agents.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-2-orange?style=flat-square)](#skills)
[![Spec](https://img.shields.io/badge/spec-SKILL.md-black?style=flat-square)](https://agentskills.io)

</div>

---

这里的每个 skill 都来自我自己在做的项目：一个命理历法 PWA（[ChroniQ](https://github.com/RedCarpG/ChroniQ)）和一个 AI 桌宠（[Cirra](https://github.com/RedCarpG/cirra-deskpet)）。开发过程中踩了坑、量了数、找到了可靠的做法，就整理成 skill。

所以它们有几个共同点：

- **每条规则都有出处。** 哪个项目、哪次改动、量出来的数字是多少，写在每个 skill 末尾的「来源与维护」里。
- **带脚本，不只带建议。** 能自动化的检查都做成了能直接跑的脚本。
- **带测试用例。** `evals/` 里是用来检验 skill 是否真的有用的任务和评分标准。

<a id="skills"></a>

## Skills

### [`frontend-verification`](./skills/frontend-verification)

改完界面拿出证据：先用内置浏览器预览，覆盖不到时用无头 Chrome 截多个视口、深浅色、打印效果，或者读 DOM。收录了无头 Chrome 里实测过的坑（375 宽被撑成 500、rAF 动画冻住、深色模式跟随系统等），以及一份核对清单。

[README](./skills/frontend-verification/README.md) · [SKILL.md](./skills/frontend-verification/SKILL.md)

### [`animation-capture`](./skills/animation-capture)

用假时钟把动画逐帧录下来，做成并排对比的 GIF，两次录制逐字节相同。适用于 CSS、WAAPI、rAF、canvas、three.js / VRM、PixiJS / Live2D。

[README](./skills/animation-capture/README.md) · [SKILL.md](./skills/animation-capture/SKILL.md)

## 安装

### `skills` CLI（任何 agent）

```bash
# 全部
npx skills add RedCarpG/redcarpg-skills
# 只装一个
npx skills add RedCarpG/redcarpg-skills -s frontend-verification
# 钉在某个发布版本
npx skills add RedCarpG/redcarpg-skills/tree/frontend-verification-v1.0.0/skills/frontend-verification
```

### Claude Code 插件市场

```bash
/plugin marketplace add RedCarpG/redcarpg-skills
/plugin install frontend-skills@redcarpg-skills
```

| 插件包 | 包含 |
|---|---|
| `frontend-skills` | `frontend-verification`、`animation-capture` |

### 手动

把 `skills/<name>/` 整个文件夹复制到 agent 扫描的目录：Claude Code 是 `~/.claude/skills/`（所有项目可用）或项目里的 `.claude/skills/`。

## 仓库结构

```text
skills/<name>/
├── SKILL.md        给 agent 读：什么时候用、怎么做；末尾是「来源与维护」
├── README.md       给人读
├── manifest.json   版本号、简介
├── scripts/        能直接跑的脚本
├── references/     agent 按需读的长文档
├── assets/         模板、探针页
└── evals/          测试用例和评分标准
```

`node scripts/validate.mjs` 检查每个 skill 的 frontmatter、manifest、插件包，并扫描本机路径和密钥。CI 在每个 PR 上都会跑这个检查。

## License

[MIT](./LICENSE) © RedCarpG
