/* 沉浸式界面的通用脚本（immersive-cultural-ui skill）
   不依赖框架。经典脚本：用 script 标签的 src 引入 immersive.js，之后用 window.Immersive.*；单文件交付时整段内联。
   （不用 ES module：file:// 打开的页面加载不了 module 脚本。）
   注意：这个文件里任何地方（包括注释）都不能出现结束 script 的标签原文，否则内联后脚本会在那里被截断，而且不报错。
   每个 start* 返回一个停止函数。React 版见 react.tsx。
   来源：ChroniQ 的 useParallax.ts、useSectionSnap.ts、useCasting.ts、TianshuAtmosphere.tsx、smoothUpdate.ts、hanNumber.ts。

   startParallax   景深视差（data-depth）和烛光
   startSectionSnap 分段吸附
   cast            逐层亮起（data-stage、.cast-lN）和说明行
   oncePerDay      仪式感的动画每天一次
   startMeteors    偶尔一颗流星
   drawStars       星空画一次（canvas）
   drawMotes       光点（SVG）
   placeMark       滑动的指示（◆、光框）
   smoothUpdate    View Transition 包装
   hanNumber / hanDigits / hanTime  竖排用的汉字数字 */
;(function () {
  'use strict'

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const noop = () => {}

  /** 可复现的随机数：同一个 seed 每次画出同样的星空和光点 */
  function seeded(seed) {
    let x = Math.max(1, Math.floor(seed) % 2147483647)
    return () => (x = (x * 16807) % 2147483647) / 2147483647
  }

  /**
   * 景深视差：鼠标移动（或手机倾斜）时，标了 data-depth 的各层相对错开。
   * data-depth 是 reach 的倍数：负数逆着鼠标，正数顺着鼠标。嵌套的层位移会叠加。
   * 推荐：星空 -1，氛围层 -0.45，氛围层里的雾 0.8，主体 0.22。
   * 用 CSS translate 属性移动，不碰 transform，层自己的动画不受影响；追上目标就停，鼠标不动时零开销。
   */
  function startParallax({ selector = '[data-depth]', reach = 16, ease = 0.08, glow = '.ts-glow', tilt = true } = {}) {
    if (reducedMotion()) return noop
    let x = 0, y = 0, toX = 0, toY = 0, frame = 0
    const clamp = (n) => Math.max(-1, Math.min(1, n))
    const step = () => {
      x += (toX - x) * ease
      y += (toY - y) * ease
      document.querySelectorAll(selector).forEach((el) => {
        const d = parseFloat(el.dataset.depth) || 0
        el.style.translate = `${(x * d * reach).toFixed(2)}px ${(y * d * reach).toFixed(2)}px`
      })
      const g = glow && document.querySelector(glow)
      if (g) g.style.translate = `${(((x + 1) / 2) * innerWidth).toFixed(1)}px ${(((y + 1) / 2) * innerHeight).toFixed(1)}px`
      frame = Math.abs(toX - x) + Math.abs(toY - y) > 0.002 ? requestAnimationFrame(step) : 0
    }
    const aim = (nx, ny) => {
      toX = clamp(nx)
      toY = clamp(ny)
      if (!frame) frame = requestAnimationFrame(step)
    }
    // 只认鼠标：触屏的点按不该让画面跳一下
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      const g = glow && document.querySelector(glow)
      if (g) g.classList.add('on')
      aim((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)
    }
    const onLeave = () => {
      const g = glow && document.querySelector(glow)
      if (g) g.classList.remove('on')
    }
    // 手机倾斜：左右 gamma，前后 beta 相对第一次拿起时的角度。
    // iOS 13+ 要在用户点按时调用 DeviceOrientationEvent.requestPermission()，否则收不到，也无害
    let level = null
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return
      if (level === null) level = e.beta
      aim(e.gamma / 30, (e.beta - level) / 30)
    }
    addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    if (tilt) addEventListener('deviceorientation', onTilt)
    return () => {
      removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      removeEventListener('deviceorientation', onTilt)
      cancelAnimationFrame(frame)
      document.querySelectorAll(selector).forEach((el) => (el.style.translate = ''))
    }
  }

  /**
   * 分段吸附：页面停在离某个区块顶部 reach（视口高的比例）以内时，duration 毫秒缓缓滑过去；
   * 读到长区块中间不动；滑动途中一碰滚轮、触摸、指针或按键就放手。抽屉、弹窗里的区块不算。
   * 不用 CSS scroll-snap：它一下跳过去，还会把长区块读到一半的人拽走。
   */
  function startSectionSnap({ sections = 'main section[id]', exclude = 'dialog, [data-no-snap], .drawer', reach = 0.22, margin = 12, duration = 520 } = {}) {
    let frame = 0, gliding = false, idle = 0
    const ease = (t) => 1 - (1 - t) ** 3
    const stops = () => {
      const list = [0]
      document.querySelectorAll(sections).forEach((s) => {
        if (s.offsetParent === null || (exclude && s.closest(exclude))) return
        list.push(Math.round(s.getBoundingClientRect().top + scrollY - margin))
      })
      return list
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      gliding = false
    }
    const glide = (to) => {
      const from = scrollY
      if (Math.abs(to - from) < 2) return
      if (reducedMotion()) return scrollTo(0, to)
      const start = performance.now()
      gliding = true
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration)
        scrollTo(0, from + (to - from) * ease(t))
        frame = t < 1 ? requestAnimationFrame(step) : 0
        if (t >= 1) gliding = false
      }
      frame = requestAnimationFrame(step)
    }
    const settle = () => {
      if (gliding) return
      const y = scrollY
      const within = innerHeight * reach
      let near = null
      for (const s of stops()) if (Math.abs(s - y) <= within && (near === null || Math.abs(s - y) < Math.abs(near - y))) near = s
      if (near !== null) glide(near)
    }
    // 停下了：有 scrollend 就用它，没有就等滚动停 160ms
    const hasEnd = 'onscrollend' in window
    const onScroll = () => {
      if (gliding) return
      clearTimeout(idle)
      idle = setTimeout(settle, 160)
    }
    const onEnd = () => {
      clearTimeout(idle)
      settle()
    }
    const takeOver = () => gliding && stop()
    const kinds = ['wheel', 'touchstart', 'pointerdown', 'keydown']
    addEventListener(hasEnd ? 'scrollend' : 'scroll', hasEnd ? onEnd : onScroll, { passive: true })
    kinds.forEach((k) => addEventListener(k, takeOver, { passive: true }))
    return () => {
      stop()
      clearTimeout(idle)
      removeEventListener(hasEnd ? 'scrollend' : 'scroll', hasEnd ? onEnd : onScroll)
      kinds.forEach((k) => removeEventListener(k, takeOver))
    }
  }

  /**
   * 逐层亮起：root 的 data-stage 从 1 走到 layers，每层停 layerMs；还没到的层（.cast-lN）沉在暗里（tianshu.css ⑨）。
   * line 是说明行（<p class="ts-cast" aria-live="polite">）：写这一层是什么，带「跳过」；放完后是「重看」。
   * 减少动态效果时直接全部显示。用 setTimeout，不依赖 requestAnimationFrame。
   * 返回 { skip, again, stop }。
   */
  function cast(root, { layers, layerMs = 1100, captions = [], line = null, labels = { skip: '跳过', again: '重看' } } = {}) {
    const done = layers + 1
    let timers = []
    const button = (text, onClick) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = text
      b.addEventListener('click', onClick)
      return b
    }
    const clear = () => {
      timers.forEach(clearTimeout)
      timers = []
    }
    const render = (stage) => {
      if (stage < done) root.dataset.stage = String(stage)
      else delete root.dataset.stage
      if (!line) return
      line.textContent = ''
      if (stage < done) {
        const span = document.createElement('span')
        span.className = 'ts-cast-line'
        span.textContent = captions[stage - 1] || ''
        line.append(span, button(labels.skip, finish))
      } else if (captions.length && labels.again) {
        line.append(button(labels.again, start))
      }
    }
    const finish = () => {
      clear()
      render(done)
    }
    const start = () => {
      clear()
      if (reducedMotion()) return render(done)
      render(1)
      for (let i = 1; i <= layers; i++) timers.push(setTimeout(() => render(i + 1), i * layerMs))
    }
    start()
    return { skip: finish, again: start, stop: clear }
  }

  /** 本地日期 YYYY-MM-DD（不用 toISOString：那是 UTC，东八区早上八点前会算成前一天） */
  function localDay(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  /** 仪式感的动画每天一次：今天第一次调用返回 true（并记下），之后返回 false。localStorage 不能用时每次都 true */
  function oncePerDay(key, day = localDay()) {
    try {
      if (localStorage.getItem(key) === day) return false
      localStorage.setItem(key, day)
    } catch (e) {
      // 隐私模式等：每次都播
    }
    return true
  }

  /** 偶尔一颗流星：第一颗 6–12 秒后，之后每 30–60 秒；标签页隐藏时不放；减少动态效果时不启动 */
  function startMeteors({ container = document.body, first = [6000, 12000], every = [30000, 60000] } = {}) {
    if (reducedMotion()) return noop
    let timer = 0
    const between = ([a, b]) => a + Math.random() * (b - a)
    const next = (wait) => {
      timer = setTimeout(() => {
        if (!document.hidden) {
          const m = document.createElement('i')
          m.className = 'ts-meteor'
          m.setAttribute('aria-hidden', 'true')
          m.style.left = `${8 + Math.random() * 60}%`
          m.style.top = `${3 + Math.random() * 30}%`
          container.append(m)
          setTimeout(() => m.remove(), 1400)
        }
        next(between(every))
      }, wait)
    }
    next(between(first))
    return () => clearTimeout(timer)
  }

  /**
   * 星空画一次：canvas 铺满父元素，窗口尺寸变化时重画。星的大小按幂律分布（大多很小，少数亮星带光晕）。
   * 东方用暖白，西方用冷白。只画一次，之后只随视差移动，不逐帧重画。
   */
  function drawStars(canvas, { count = 420, seed = 7, colours = ['#f4e6cc', '#f0d9b0', '#ffffff'] } = {}) {
    const paint = () => {
      const dpr = Math.min(2, devicePixelRatio || 1)
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const r = seeded(seed)
      const n = Math.round(count * Math.min(1.6, (w * h) / (1440 * 900)))
      for (let i = 0; i < n; i++) {
        const x = r() * w, y = r() * h, size = 0.3 + r() ** 6 * 1.9, a = 0.25 + r() * 0.65
        ctx.globalAlpha = a
        ctx.fillStyle = colours[Math.floor(r() * colours.length)]
        if (size > 1.4) {
          ctx.shadowColor = ctx.fillStyle
          ctx.shadowBlur = 6
        } else ctx.shadowBlur = 0
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(paint, 150)
    }
    paint()
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }

  /** 光点：往 <svg class="ts-motes" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice"> 里放 n 个缓缓明灭的小圆 */
  function drawMotes(svg, { n = 110, seed = 7, colours = ['#f2d6a8', '#e0503a', '#ebe3cf'] } = {}) {
    const r = seeded(seed)
    const ns = 'http://www.w3.org/2000/svg'
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(ns, 'circle')
      c.setAttribute('cx', (r() * 1200).toFixed(1))
      c.setAttribute('cy', (r() * 900).toFixed(1))
      c.setAttribute('r', (0.4 + r() ** 5 * 2).toFixed(2))
      c.setAttribute('fill', colours[Math.floor(r() * colours.length)])
      c.setAttribute('opacity', (0.15 + r() * 0.6).toFixed(2))
      c.style.animationDelay = `${(-r() * 9).toFixed(2)}s`
      svg.append(c)
    }
  }

  /**
   * 滑动的指示：把 mark（.ts-mark，绝对定位在 container 里）移到 target 的位置，第一次不滑，之后滑过去。
   * at: 'left'（导航里页名前的 ◆）或 'cover'（盖住整个格子的光框）。
   * 窗口尺寸变化时、切页回来时再调一次。
   */
  function placeMark(mark, target, container, { at = 'left' } = {}) {
    if (!target) {
      mark.classList.remove('shown')
      return
    }
    const box = container.getBoundingClientRect()
    const t = target.getBoundingClientRect()
    const x = t.left - box.left + (at === 'left' ? -10 : 0)
    const y = t.top - box.top + (at === 'left' ? t.height / 2 : 0)
    if (at === 'cover') {
      mark.style.width = `${t.width}px`
      mark.style.height = `${t.height}px`
    }
    if (!mark.classList.contains('shown')) {
      mark.style.transition = 'none'
      mark.style.translate = `${x}px ${y}px`
      void mark.offsetWidth
      mark.style.transition = ''
      mark.classList.add('shown')
    } else mark.style.translate = `${x}px ${y}px`
  }

  /**
   * 在 View Transition 里更新页面，并在 <html data-vt> 上标出是哪一种（tianshu.css 据此决定怎么过渡）：
   * 'view' 简洁 ↔ 详细的交叉淡入淡出，'page' 换页。不支持或减少动态效果时直接更新。
   * 页面没在绘制（隐藏的标签页）时，300ms 内回调没跑就跳过过渡直接更新。
   */
  let vtLatest = 0
  function smoothUpdate(kind, update) {
    if (!document.startViewTransition || reducedMotion()) {
      update()
      return Promise.resolve()
    }
    const root = document.documentElement
    const id = ++vtLatest
    root.dataset.vt = kind
    let updated = false
    const run = () => {
      if (updated) return
      updated = true
      update()
    }
    const t = document.startViewTransition(run)
    setTimeout(() => {
      if (updated) return
      t.skipTransition()
      run()
    }, 300)
    return t.finished.catch(noop).finally(() => {
      if (id === vtLatest) delete root.dataset.vt
    })
  }

  /** 竖排用的汉字数字（阿拉伯数字竖排会躺倒）：4 → 四，12 → 十二，20 → 二十，23 → 二十三。0–99 */
  const DIGITS = '〇一二三四五六七八九'
  function hanNumber(n) {
    if (n < 10) return DIGITS[n]
    const tens = Math.floor(n / 10), ones = n % 10
    return `${tens > 1 ? DIGITS[tens] : ''}十${ones ? DIGITS[ones] : ''}`
  }
  /** 年份逐位写：2026 → 二〇二六 */
  function hanDigits(n) {
    return String(n).replace(/\d/g, (d) => DIGITS[+d])
  }
  /** 时刻：'15:02' → 十五时〇二分，'08:00' → 八时整 */
  function hanTime(hm) {
    const [h, m] = hm.split(':').map(Number)
    return `${hanNumber(h)}时${m === 0 ? '整' : `${m < 10 ? '〇' : ''}${hanNumber(m)}分`}`
  }

  window.Immersive = {
    reducedMotion, startParallax, startSectionSnap, cast, localDay, oncePerDay, startMeteors,
    drawStars, drawMotes, placeMark, smoothUpdate, hanNumber, hanDigits, hanTime,
  }
})()
