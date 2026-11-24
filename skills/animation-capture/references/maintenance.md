# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。

## 来源与维护

- **来源**：Cirra（桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）2026-11-10 做 3D 人物的带动层、胯和腿、头发甩动时，为了给用户看开关前后的对比而摸索出来的；当时的做法在那个仓库的 `docs/vrm-motion.md` §11–§12、`docs/vrm-spring-force.md` §8（「怎么验」）。经验记在私人 repo 的 [`lessons/animation-capture.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/animation-capture.md)（三维角色那部分也在 `lessons/threejs-vrm-animation.md`）。
- **源头**：开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/animation-capture/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。
- **怎么改**：
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `animation-capture-v<版本>`），再重装本机副本。
  - 改了脚本，在一个 CSS 页面、一个 Live2D 或 three.js 页面上各录一次，确认两个变体逐帧对得上；同一个变体录两次逐帧相同（用 Pillow 的 `ImageChops.difference` 比）。
  - 改了做法或坑，同步改 lessons 文件；测试用例在 `evals/`。
  - 下面加一行更新记录。
- **更新记录**：
  - 2026-11-12：1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，内容不变。
  - 2026-11-10，Cirra：初版。`record.mjs`（shim、hook 两种时钟）、`clock-shim.js`、`make_gif.py`。在网页（CSS 过渡、CSS 动画、WAAPI、rAF）、Live2D（Hiyori，物理开关）、three.js VRM（带动层开关）上实测过。
  - 2026-11-10，Cirra：测试时查出，页面加载时开始的 CSS / WAAPI 动画在假时钟接住前已按真实时间跑了几毫秒，两个变体差 16.6 ms；定时器触发的过渡要等这一步走完才被接住（50 ms 变 80 ms）。改成：第一次看到的动画从 0 算，每次跑完定时器、rAF 和每步开始时都看一遍。修后实测：50 ms 触发的 600 ms 过渡在 80 ms 时正好 8.0 px，两个变体第 0 帧相同。两个测试用例（网页缓动对比、弹球挤压变形）有、无 skill 都全过：这类任务模型本来会做，skill 省的是每次重写录制脚本的工夫，以及上面这些已经踩过的坑。
  - 2026-11-10，Cirra：录头发甩动（离心力、被拖着）的对比 GIF，Yumeka、千駄ヶ谷篠；三维角色用转盘（把人放进一个能转的 Group）和假时钟里的 `setInterval` 驱动，页面里不写录制代码。
  - 2026-11-10：按新的写法规矩，「维护」一节改成「来源与维护」。
  - 2026-11-10，Cirra：用户发现录 3D 时 Chrome 一直占很多 CPU。`record.mjs` 改成默认用显卡渲染（`--render gpu`；`--render cpu` 还是 SwiftShader），开头打出用的是哪个渲染器；Chrome 退出前删配置目录会 EPERM，现在删不掉就算了，不报错。实测：RTX 3060 Ti 上一帧着色器负载从 154 毫秒降到 8 毫秒；显卡渲染录两次，10 帧逐字节相同；显卡和软件渲染逐帧不同（边缘），不能混着比。
