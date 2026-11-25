# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。下面提到的 §3、§4 指 2026-11-20 前的 SKILL.md 编号，现在分别在 `headless-chrome.md`、`fonts.md`。

## 来源与维护

- **来源：** [ChroniQ](https://github.com/RedCarpG/ChroniQ)（PWA，2026-11）里反复做截图验证的经验：lessons 文件 [`lessons/frontend-verification.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/frontend-verification.md)（私人 repo）；旧脚本 `appshot.sh`（路径写死，已改写为通用的 `scripts/shot.sh`）。§3 里的坑和 `shot.mjs` 是 2026-11-10 做这个 skill 时在 Chrome 157 / Windows 11 上逐项实测得到的。
- **源头：** 开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/frontend-verification/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。
- **怎么改：** 在 redcarpg-skills 里改，走 PR。改了脚本，用 `assets/probe.html` 重跑一遍（`shot.sh` 和 `shot.mjs` 各一次，看 `innerWidth`、配色、rAF 次数是否符合预期）；改了坑或做法，同步改 lessons 文件；`manifest.json` 版本加一，在下面加一行更新记录，`node scripts/validate.mjs` 通过后发版（tag `frontend-verification-v<版本>`），再重装本机副本。
- **更新记录：**
  - 2026-11-12：1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，脚本路径改成相对这个 skill 的目录；内容不变。
  - 2026-11-10，ChroniQ：并入两条新经验：字体不显示时按 `document.fonts` 状态分流（§4，来自 lessons/frontend-verification.md 第 3 条）；整页截图里 `animation-timeline: view()` 区块空白（§3，来自 lessons/immersive-web-design.md 第 16 条，两种办法都用样例页实测过）。
  - 2026-11-10，ChroniQ：初版。`shot.sh`（无头 Chrome，PNG/DOM/PDF）、`shot.mjs`（CDP，真实时间、精确视口）、`assets/raf-shim.js`、`assets/probe.html`。
