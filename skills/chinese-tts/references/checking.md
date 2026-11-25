# 用对照用例检查、念错了怎么查

原 SKILL.md 两节，2026-11-20 移来。脚本在 `scripts/check-tn.mjs`，用例在 `references/golden-cases.json`。

## 用对照用例检查

`references/golden-cases.json` 有 115 条整段用例和 24 条流式用例，都是原项目验收过的念法。`scripts/check-tn.mjs` 拿它们测你的实现：

```bash
node scripts/check-tn.mjs ./my-tn.mjs                  # 模块导出 normalize(text) 和（可选）createStream()
node scripts/check-tn.mjs ./my-tn.mjs --only 号码      # 只看某一组
```

- 比较时忽略空白和常见标点，只比念法。带 `note` 的用例是「参考」，只报出来不算失败。
- 新写 TN 时把它当验收线；改规则时跑一遍，防止改好一处、坏了另一处。
- 有争议的念法（比如「这台电脑 12999」会被当成号码）原项目是接受了的。你的产品想要别的念法，就改用例，并在用例旁写为什么。

## 念错了怎么查

分四类：念之前没写成念法；多音字是模型猜错；参考录音有问题；随机的（重抽一次就好）。

用当前声音和另外两个声音各念同一句：每个声音都在同一个字上错，就加念法替换表；只有一个声音怪，就换声音。每次把原文和转出来的念法一起记进日志（jsonl），回头查得到。
