# ai-assistant-tool-safety

> 模型能动手的地方，都要有人能管住。

模型会在不该用工具的时候用工具，会照着别人写的字去做事，也会把插件当成自己人。这个 skill 讲给 LLM 开工具时怎么定权限、怎么防提示词注入、怎么让插件安全，适用于聊天助手、桌宠、语音伴侣、客服机器人、插件宿主和自动化 agent。

## 包含什么

| | |
|---|---|
| `SKILL.md` | 六条规矩和一份检查清单。检查已有项目时，每条都写「有 / 没有 / 不适用」，并给出证据（文件:行号） |
| `references/claude-agent-sdk.md` | 把 Claude Agent SDK 嵌进自己的应用时必须改的默认值：`settingSources`、claude.ai 连接器、`allowedTools` 不经过 `canUseTool`、宿主的环境变量、常驻会话 |
| `references/plugins.md` | 插件拿到什么权限、怎么隔离、关掉时怎么全部收回 |
| `evals/` | 2 个测试用例：配置一个陪伴型 Agent SDK 应用、审查一个接 webhook 的助手 |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s ai-assistant-tool-safety
```

## 来源

来自 AI 桌宠 [Cirra](https://github.com/RedCarpG/cirra-deskpet)：它读系统通知、能改自己的设置、能装插件，每一条规矩都在那里实现过、测过。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
