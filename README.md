<div align="center">

# redcarpg-skills

**在真项目里踩过、量过的 Agent Skills。**

Field-tested agent skills for Claude Code, Cursor, Codex and other AI coding agents.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-9-orange?style=flat-square)](#skills)
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

### 前端

| Skill | 做什么 |
|---|---|
| [`frontend-verification`](./skills/frontend-verification) | 改完界面拿出证据：先用内置浏览器预览，覆盖不到时用无头 Chrome 截多个视口、深浅色、打印，或者读 DOM。收录了实测过的坑（375 宽被撑成 500、rAF 动画冻住、深色模式跟随系统）和一份核对清单 |
| [`animation-capture`](./skills/animation-capture) | 用假时钟把动画逐帧录下来，做成并排对比的 GIF，两次录制逐字节相同。适用于 CSS、WAAPI、rAF、canvas、three.js / VRM、PixiJS / Live2D |
| [`immersive-cultural-ui`](./skills/immersive-cultural-ui) | 东方古典或神秘学气质的沉浸式网页：夜空、金线、宣纸、竖排、书法批注、景深视差。提供带具体数值的风格配方、可复用代码和交付前检查清单 |

### 虚拟角色

| Skill | 做什么 |
|---|---|
| [`live2d-vrm-animation`](./skills/live2d-vrm-animation) | 让 Live2D 和 VRM 角色自然地动起来：程序层和动作片段的覆盖顺序、物理前叠加、VTube Studio 模型补齐、程序「带动层」、AI 生成动作的数据格式 |
| [`vrm-model-conversion`](./skills/vrm-model-conversion) | 在 Blender 后台把 FBX、PMX、glTF、.blend 转成 VRM 1.0：骨骼自动对应、表情烘焙、加弹簧骨和碰撞体、MToon。附参数化的 `vrm_kit.py` 和不需要 Blender 的检查脚本 |

### AI 应用

| Skill | 做什么 |
|---|---|
| [`ai-assistant-tool-safety`](./skills/ai-assistant-tool-safety) | 给 LLM 开工具时的权限设计、提示词注入防护、插件隔离，以及把 Claude Agent SDK 嵌进自己应用时必须改的默认值 |
| [`chinese-tts`](./skills/chinese-tts) | 中文 TTS 的文本规范化（数字、年份、电话、单位怎么念，流式边界怎么处理）和本机引擎工程。附 139 条对照用例和检查脚本 |
| [`tauri-sidecar-desktop`](./skills/tauri-sidecar-desktop) | Tauri 2 + Node sidecar 桌面应用：透明窗口的鼠标穿透、用架构测试卡住三方约定、NDJSON 通信、原子写入、sidecar 测试、插件宿主 |

### 领域

| Skill | 做什么 |
|---|---|
| [`mingli-chart-reading`](./skills/mingli-chart-reading) | 用自带的离线脚本排八字、紫微、西洋星盘、七政四余、黄历和天象，再照盘解读。构建自 ChroniQ 的 chroniq-core |

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
| `frontend-skills` | `frontend-verification`、`animation-capture`、`immersive-cultural-ui` |
| `avatar-skills` | `live2d-vrm-animation`、`vrm-model-conversion` |
| `ai-app-skills` | `ai-assistant-tool-safety`、`chinese-tts`、`tauri-sidecar-desktop` |
| `mingli-skills` | `mingli-chart-reading` |

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

[MIT](./LICENSE) © RedCarpG。`mingli-chart-reading/scripts/chart.mjs` 里打包的第三方库见它的 [THIRD_PARTY_NOTICES.md](./skills/mingli-chart-reading/THIRD_PARTY_NOTICES.md)。
