# chinese-tts

> 念法在自己这一层转好，引擎只管发音。

让程序把中文（夹着英文、数字、链接、代码）念出来时，最常见的问题是数字念错：年份念成「两千零二十六」、电话号码念成「几亿」、链接被一个字母一个字母地念出来。这个 skill 管文本规范化（TN）和语音合成的工程部分，适合语音助手、AI 角色、有声读物、播报。

## 流程

```
模型的流式文字
  → ① 过滤：去掉装饰、emoji、列表符号；代码块、表格、链接换成一句话
  → ② 转念法：数字、时间、单位、符号、念法替换表（流式时扣住边界）
  → ③ 切句：第一段切到第一个逗号，之后超过 40 字在逗号处切
  → ④ 合成：只比念到的地方提前约 20 秒；打断时真的停掉推理
```

## 包含什么

| | |
|---|---|
| `references/rules.md` | 念法规则：年份、电话、验证码、单位、温度、百分比、范围、分数、网络用语 |
| `references/engines.md` | 本机引擎（Kokoro、Matcha、CosyVoice、Qwen3-TTS、sherpa-onnx、vLLM、WSL2）的选型，以及首句延迟、取消、缓存、显存的处理 |
| `references/golden-cases.json` | 139 条「原文 → 念法」对照用例 |
| `scripts/check-tn.mjs` | 拿你自己的 TN 实现跑这些用例 |
| `evals/` | 2 个测试用例：排查流式输出念错、写一个流式 TN |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s chinese-tts
```

## 来源

来自每天都在说话的 AI 桌宠 [Cirra](https://github.com/RedCarpG/cirra-deskpet)：Claude 流式回复，逐句交给本机 TTS 念出来。对照用例抽自它的测试；引擎的延迟和显存数据是在一台 8 GB 显存的电脑上量的。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
