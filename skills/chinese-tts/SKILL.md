---
name: chinese-tts
description: 让程序念中文（夹英文、数字、链接）时的文本规范化和 TTS 工程：年份、电话、单位、范围怎么念，流式时扣住数字边界，本机引擎（Kokoro、CosyVoice、sherpa-onnx）的首句延迟、取消、缓存。附 139 条对照用例和检查脚本。用户抱怨「数字念错」「链接被逐字念」时用。Chinese TTS text normalization.
---

# 中文语音合成：文本规范化和工程

来自一个天天在说话的 AI 桌宠：Claude 流式回复，逐句交给本机 TTS 念出来。规则都有测试，数字都是量过的。

一句话原则：**念法在自己这层转好，引擎只管发音。** 交给引擎的话，换一个引擎念法就变；整个换成现成的 TN 库，也有几处会变差。现成库（wetext、PaddleSpeech）拿来对照、补规则。

## 流程

```
模型的流式文字
  → ① 过滤：去掉装饰、emoji、列表符号；代码块、表格、链接换成一句话
  → ② 转念法：数字、时间、单位、符号、念法替换表（流式时扣住边界）
  → ③ 切句：第一段切到第一个逗号，之后超过 40 字在逗号处切
  → ④ 合成：只比念到的地方提前约 20 秒；打断时真的停掉推理
```

## 硬规则

1. **先转念法，再切句。** 反过来实测出错：`14:30` 被冒号切开、链接被切成两半逐字念、`3~5` 的 `~` 被去掉念成「三十五」。半角 `:` 只在后面跟空白时才当逗号。
2. **流式要扣住边界：** 数字后面再等 2 个字才放出去（「工作了26年」不能念成「二六年」）；单位隔着空格也要能认；转下一段时带上上一段末尾几个汉字；最多扣 200 字（代码块、表格 4000 字）。
3. **每条测试按「逐字喂」和「整段喂」各跑一遍，结果要一样。**
4. 新写或改 TN 规则，跑对照用例当验收线：
   ```bash
   node scripts/check-tn.mjs ./my-tn.mjs              # 模块导出 normalize(text) 和（可选）createStream()
   node scripts/check-tn.mjs ./my-tn.mjs --only 号码  # 只看某一组
   ```
5. 念错时先分类（没写成念法 / 多音字猜错 / 参考录音问题 / 随机），用三个声音念同一句判断该加替换表还是换声音；原文和念法一起记日志。
6. 取消要真的停掉推理（vLLM 断开就 `abort_request`）；有的引擎会静默跳过英文，依赖升级前重新验证。

## 什么情况读哪里

| 情况 | 读 |
|---|---|
| 流程每步的细节、先切句会出的三个错、流式扣边界的规则 | `references/pipeline.md` |
| 某类念法：年份/年数、号码/五位数、网络用语、单位前的 2、单位、范围百分比、时间日期分数、符号、聊天回复专用、念法替换表 | `references/rules.md`（开头是速查表） |
| 用对照用例检查（忽略标点、`note` 用例、有争议的念法怎么改）、念错了怎么查 | `references/checking.md` |
| 对照用例本身（115 条整段、24 条流式） | `references/golden-cases.json` |
| 引擎选型（CPU/GPU）、首句延迟、取消、缓存、后备音源和就绪、生成新声音、语音输入和插话、安装 | `references/engines.md`（开头是要点） |
| 完整来源（代码和文档文件）、重新抽用例的办法、更早的更新记录 | `references/maintenance.md` |

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）和语音服务 cirra-voice，2026-10 至 2026-11，`sidecar/src/tts/` 和 `docs/speech*.md`、`docs/tts.md` 等；经验在私人 repo 的 [`lessons/chinese-tts.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/chinese-tts.md)。完整文件列表见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/chinese-tts/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，不要直接改。`references/golden-cases.json` 是从 Cirra 的 `speech.test.ts` 抽出来的，两边不自动同步。
- **怎么改：** 先看 lessons 有没有新条目；Cirra 的 TN 规则变了就重新抽用例并用它编好的实现跑 `check-tn.mjs`，应全过（办法见 `references/maintenance.md`）；引擎数字换了硬件要重新量；发版时 `manifest.json` 升版本；下面加一行更新记录。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。
  - 2026-11-10 · Cirra · 初版：流程、流式边界、规则、念错排查、引擎；139 条对照用例和 `check-tn.mjs`。
