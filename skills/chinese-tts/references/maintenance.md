# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）和它的语音服务 cirra-voice，2026-10 至 2026-11。
  - 代码：`sidecar/src/tts/speech/`（`numbers.ts`、`units.ts`、`links.ts`、`filter.ts`、`overrides.ts`、`speech.test.ts`）、`sidecar/src/tts/splitter.ts`、`sidecar/src/tts/pronunciations.ts`。
  - 文档：`docs/speech.md`、`docs/speech-tn.md`（119 句三方对照）、`docs/tts.md`、`docs/voices.md`、`docs/voice-chat.md`、`docs/voice-chat-2.md`、`docs/voice-install.md`、`docs/perf-checkup.md`。
  - 经验：私人 repo 的 [`lessons/chinese-tts.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/chinese-tts.md)。
- **源头：** 开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/chinese-tts/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。`references/golden-cases.json` 是 2026-11-10 从 Cirra 的 `speech.test.ts` 用脚本抽出来的，两边不会自动同步。
- **怎么改：**
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `chinese-tts-v<版本>`），再重装本机副本。先看 `lessons/chinese-tts.md` 有没有新条目可以收进来。
  - Cirra 的 TN 规则有变化时，重新抽一次用例（抽的办法：读 `speech.test.ts` 里 `readNumbers` 那组和「流式」那组的 `[原文, 念法]`），并用 Cirra 编好的 `sidecar/dist/tts/` 接一个适配模块跑 `check-tn.mjs`，应该全过。
  - 引擎的数字（延迟、实时率、显存）是 2026-10 在一台 8 GB 显存、CPU 没有 VNNI 的电脑上量的，换了硬件要重新量。
- **更新记录：**
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，来源项目写成链接；内容不变。
  - 2026-11-10 · Cirra · 初版：流程和顺序、流式边界、规则速查和细则、念错排查、引擎工程；139 条对照用例和 `check-tn.mjs`（用 Cirra 的实现跑过，全过）；`evals/` 里两个测试提示。
