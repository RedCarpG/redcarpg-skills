// 沉浸式界面的 React 版（immersive-cultural-ui skill）。配合 tianshu.css 使用，需要 React 18+。
// 来源：ChroniQ 的 TianshuAtmosphere.tsx、useParallax.ts、useSectionSnap.ts、useCasting.ts、CastLine.tsx、smoothUpdate.ts。
// 这些在 ChroniQ 线上用过；这里去掉了对它的设置、翻译和页面类名的依赖，视差改成读 data-depth。
// 不需要的部分直接删掉。
//
//   <Atmosphere realm="east" />          氛围层：星空、光雾、雾、光点、纸纹、颗粒、暗纱、烛光、流星；顺带启动视差
//   useParallax(on)                      景深视差（data-depth）
//   useSectionSnap(on)                   分段吸附
//   useCasting(key, layers, on)          逐层亮起；配 <CastLine>
//   useOncePerDay(key)                   仪式感的动画每天一次
//   smoothUpdate(kind, update)           View Transition 包装（flushSync）
//   hanNumber / hanDigits / hanTime      竖排用的汉字数字
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function seeded(seed: number) {
  let x = Math.max(1, Math.floor(seed) % 2147483647)
  return () => (x = (x * 16807) % 2147483647) / 2147483647
}

// ---------- 氛围层 ----------

type Realm = 'east' | 'west'

const MOTE_COLOURS: Record<Realm, string[]> = { east: ['#f2d6a8', '#e0503a', '#ebe3cf'], west: ['#ffffff', '#c8d6ff', '#ffe2bd'] }
const STAR_COLOURS: Record<Realm, string[]> = { east: ['#f4e6cc', '#f0d9b0', '#ffffff'], west: ['#ffffff', '#dfe6ff', '#ffe9c8'] }
/** 雾只留噪声浓的地方：东方暖灰，西方冷紫灰 */
const FOG_MATRIX: Record<Realm, string> = {
  east: '0 0 0 0 0.66  0 0 0 0 0.6  0 0 0 0 0.5  1.6 0 0 0 -0.62',
  west: '0 0 0 0 0.56  0 0 0 0 0.56  0 0 0 0 0.74  1.6 0 0 0 -0.64',
}

/**
 * 页面背后的夜色：星空（画一次）→ 光雾、雾、光点、宣纸纤维（东方）、颗粒 → 暗纱（CSS ::after）→ 烛光、流星。
 * 放在应用最外层，内容之前。全部 aria-hidden。顺带启动景深视差。
 */
export function Atmosphere({ realm, stars = true, fog = true, meteors = true }: { realm: Realm; stars?: boolean; fog?: boolean; meteors?: boolean }) {
  useParallax(true)
  const dots = useMemo(() => {
    const r = seeded(realm === 'east' ? 7 : 13)
    const colours = MOTE_COLOURS[realm]
    return Array.from({ length: realm === 'east' ? 110 : 150 }, (_, i) => ({
      key: i, cx: r() * 1200, cy: r() * 900, r: 0.4 + r() ** 5 * 2, fill: colours[Math.floor(r() * colours.length)], opacity: 0.15 + r() * 0.6, delay: r() * 9,
    }))
  }, [realm])
  const meteor = useMeteors(meteors)
  return (
    <>
      <div className="ts-sky" data-depth="-1" aria-hidden="true">
        {stars && <StarCanvas realm={realm} />}
      </div>
      <div className="ts-atmos" data-depth="-0.45" aria-hidden="true">
        <div className="ts-mist" />
        {fog && (
          // 雾在氛围层里面，深度 0.8 和外层的 -0.45 叠加：比星空近，反向错开
          <svg className="ts-fog" data-depth="0.8">
            <filter id="ts-fog" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0055" numOctaves={4} seed={11} />
              <feColorMatrix values={FOG_MATRIX[realm]} />
            </filter>
            <rect width="100%" height="100%" filter="url(#ts-fog)" />
          </svg>
        )}
        <svg className="ts-motes" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
          {dots.map((d) => (
            <circle key={d.key} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity={d.opacity} style={{ animationDelay: `${-d.delay}s` }} />
          ))}
        </svg>
        {realm === 'east' && (
          // 宣纸的长纤维：横向拉长的噪声，很淡，画一次
          <svg className="ts-paper">
            <filter id="ts-paper" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035 0.11" numOctaves={2} seed={4} />
              <feColorMatrix values="0 0 0 0 0.93  0 0 0 0 0.86  0 0 0 0 0.7  0 0 0 1.4 -0.78" />
            </filter>
            <rect width="100%" height="100%" filter="url(#ts-paper)" />
          </svg>
        )}
        <svg className="ts-grain">
          <filter id="ts-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={5} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#ts-grain)" />
        </svg>
      </div>
      <div className="ts-glow" aria-hidden="true" />
      {meteor && <i key={meteor.id} className="ts-meteor" aria-hidden="true" style={{ left: `${meteor.x}%`, top: `${meteor.y}%` }} />}
    </>
  )
}

/** 星空画一次；窗口尺寸变化时重画 */
function StarCanvas({ realm }: { realm: Realm }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const colours = STAR_COLOURS[realm]
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const r = seeded(realm === 'east' ? 7 : 13)
      const n = Math.round(420 * Math.min(1.6, (w * h) / (1440 * 900)))
      for (let i = 0; i < n; i++) {
        const x = r() * w
        const y = r() * h
        const size = 0.3 + r() ** 6 * 1.9
        ctx.globalAlpha = 0.25 + r() * 0.65
        ctx.fillStyle = colours[Math.floor(r() * colours.length)]
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = size > 1.4 ? 6 : 0
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = window.setTimeout(paint, 150)
    }
    paint()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [realm])
  return <canvas ref={ref} />
}

/** 流星：第一颗 6–12 秒后，之后每 30–60 秒；标签页隐藏时不放；减少动态效果时没有 */
function useMeteors(on: boolean) {
  const [meteor, setMeteor] = useState<{ id: number; x: number; y: number } | null>(null)
  useEffect(() => {
    if (!on || reducedMotion()) return
    let timer = 0
    let clear = 0
    let id = 0
    const next = (first = false) => {
      timer = window.setTimeout(
        () => {
          if (!document.hidden) setMeteor({ id: ++id, x: 8 + Math.random() * 60, y: 3 + Math.random() * 30 })
          clear = window.setTimeout(() => setMeteor(null), 1400)
          next()
        },
        first ? 6000 + Math.random() * 6000 : 30000 + Math.random() * 30000,
      )
    }
    next(true)
    return () => {
      clearTimeout(timer)
      clearTimeout(clear)
    }
  }, [on])
  return meteor
}

// ---------- 景深视差 ----------

/**
 * 鼠标移动（或手机倾斜）时，标了 data-depth 的各层相对错开：负数逆着鼠标，正数顺着；数值是 reach 的倍数。
 * 推荐：星空 -1，氛围层 -0.45，雾 0.8（在氛围层里，叠加后约 +0.35），主体 0.22。
 * 用 CSS translate 属性，不碰 transform；缓动，追上就停；减少动态效果时不动。
 */
export function useParallax(on: boolean, { reach = 16, ease = 0.08 } = {}) {
  useEffect(() => {
    if (!on || reducedMotion()) return
    let [x, y, toX, toY] = [0, 0, 0, 0]
    let frame = 0
    const clamp = (n: number) => Math.max(-1, Math.min(1, n))
    const step = () => {
      x += (toX - x) * ease
      y += (toY - y) * ease
      document.querySelectorAll<HTMLElement | SVGElement>('[data-depth]').forEach((el) => {
        const d = parseFloat(el.dataset.depth ?? '') || 0
        el.style.translate = `${(x * d * reach).toFixed(2)}px ${(y * d * reach).toFixed(2)}px`
      })
      // 烛光跟着鼠标，同一套缓动，所以稍稍落后
      const glow = document.querySelector<HTMLElement>('.ts-glow')
      if (glow) glow.style.translate = `${(((x + 1) / 2) * window.innerWidth).toFixed(1)}px ${(((y + 1) / 2) * window.innerHeight).toFixed(1)}px`
      frame = Math.abs(toX - x) + Math.abs(toY - y) > 0.002 ? requestAnimationFrame(step) : 0
    }
    const aim = (nx: number, ny: number) => {
      ;[toX, toY] = [clamp(nx), clamp(ny)]
      if (!frame) frame = requestAnimationFrame(step)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      document.querySelector('.ts-glow')?.classList.add('on')
      aim((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    const onLeave = () => document.querySelector('.ts-glow')?.classList.remove('on')
    // 手机倾斜（iOS 13+ 需要在点按时 requestPermission，否则收不到，也无害）
    let level: number | null = null
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      level ??= e.beta
      aim(e.gamma / 30, (e.beta - level) / 30)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('deviceorientation', onTilt)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
      document.querySelectorAll<HTMLElement | SVGElement>('[data-depth]').forEach((el) => (el.style.translate = ''))
    }
  }, [on, reach, ease])
}

// ---------- 分段吸附 ----------

/**
 * 页面停在离某个区块顶部 22% 视口高以内时，520ms 缓缓滑过去；读到长区块中间不动；
 * 一碰滚轮、触摸、指针或按键就放手。抽屉、弹窗里的区块不算。不用 CSS scroll-snap。
 * 区块要有 scroll-margin-top，和 margin 一致（tianshu.css 的 .ts-section 是 12px）。
 */
export function useSectionSnap(
  on: boolean,
  { sections = 'main section[id]', exclude = 'dialog, [data-no-snap], .drawer', reach = 0.22, margin = 12, duration = 520 } = {},
) {
  useEffect(() => {
    if (!on) return
    let frame = 0
    let gliding = false
    let idle = 0
    const ease = (t: number) => 1 - (1 - t) ** 3
    const stops = () => {
      const list = [0]
      document.querySelectorAll<HTMLElement>(sections).forEach((s) => {
        if (s.offsetParent === null || (exclude && s.closest(exclude))) return
        list.push(Math.round(s.getBoundingClientRect().top + window.scrollY - margin))
      })
      return list
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      gliding = false
    }
    const glide = (to: number) => {
      const from = window.scrollY
      if (Math.abs(to - from) < 2) return
      if (reducedMotion()) return window.scrollTo(0, to)
      const start = performance.now()
      gliding = true
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        window.scrollTo(0, from + (to - from) * ease(t))
        frame = t < 1 ? requestAnimationFrame(step) : 0
        if (t >= 1) gliding = false
      }
      frame = requestAnimationFrame(step)
    }
    const settle = () => {
      if (gliding) return
      const y = window.scrollY
      const within = window.innerHeight * reach
      const near = stops().reduce<number | null>((best, s) => (Math.abs(s - y) <= within && (best === null || Math.abs(s - y) < Math.abs(best - y)) ? s : best), null)
      if (near !== null) glide(near)
    }
    const onScroll = () => {
      if (gliding) return
      clearTimeout(idle)
      idle = window.setTimeout(settle, 160)
    }
    const onEnd = () => {
      clearTimeout(idle)
      settle()
    }
    const hasEnd = 'onscrollend' in window
    window.addEventListener(hasEnd ? 'scrollend' : 'scroll', hasEnd ? onEnd : onScroll, { passive: true })
    const takeOver = () => gliding && stop()
    const kinds = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    for (const k of kinds) window.addEventListener(k, takeOver, { passive: true })
    return () => {
      stop()
      clearTimeout(idle)
      window.removeEventListener(hasEnd ? 'scrollend' : 'scroll', hasEnd ? onEnd : onScroll)
      for (const k of kinds) window.removeEventListener(k, takeOver)
    }
  }, [on, sections, exclude, reach, margin, duration])
}

// ---------- 逐层亮起 ----------

/** 每层单独停多久，ms */
const LAYER_MS = 1100

/**
 * 一幕第一次出现时逐层亮起。返回当前到了第几层（1…layers，全部亮起后是 layers + 1）。
 * 用法：<div data-stage={cast.stageAttr}> 里的元素标 .cast-l1 … .cast-l5（tianshu.css ⑨）。
 * key 换了就重播；但上一次在 1.5 秒内（用户在一步步翻数据）不重播，直接显示。
 * on 为 false（例如「详细」）或减少动态效果时直接全部显示。
 */
export function useCasting(key: string, layers: number, on = true) {
  const done = layers + 1
  const [stage, setStage] = useState(() => (on && !reducedMotion() ? 1 : done))
  const [round, setRound] = useState(0)
  const last = useRef({ key: '', at: -Infinity })
  useEffect(() => {
    const now = performance.now()
    const quick = last.current.key !== key && now - last.current.at < 1500
    last.current = { key, at: now }
    if (!on || quick || reducedMotion()) return setStage(done)
    setStage(1)
    const timers = Array.from({ length: layers }, (_, i) => window.setTimeout(() => setStage(i + 2), (i + 1) * LAYER_MS))
    return () => timers.forEach(clearTimeout)
  }, [key, round, on, layers, done])
  return {
    stage,
    casting: stage < done,
    /** 给根元素的 data-stage：亮起过程中是层号，结束后不设 */
    stageAttr: stage < done ? stage : undefined,
    skip: () => setStage(done),
    again: () => setRound((r) => r + 1),
  }
}

/** 主体下的一行：这一层是什么，「跳过」；放完后「重看」 */
export function CastLine({
  cast,
  captions,
  skipLabel = '跳过',
  againLabel = '重看',
}: {
  cast: ReturnType<typeof useCasting>
  captions: string[]
  skipLabel?: string
  againLabel?: string
}) {
  return (
    <p className="ts-cast" aria-live="polite">
      {cast.casting ? (
        <>
          <span key={cast.stage} className="ts-cast-line">
            {captions[cast.stage - 1]}
          </span>
          <button type="button" onClick={cast.skip}>
            {skipLabel}
          </button>
        </>
      ) : (
        <button type="button" onClick={cast.again}>
          {againLabel}
        </button>
      )}
    </p>
  )
}

// ---------- 每天一次 ----------

/** 本地日期 YYYY-MM-DD（不用 toISOString：那是 UTC） */
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 仪式感的动画（盖印）每天只播一次：今天第一次挂载时为 true。localStorage 不能用时每次都 true */
export function useOncePerDay(key: string, day = localDay()) {
  const [first] = useState(() => {
    try {
      if (localStorage.getItem(key) === day) return false
      localStorage.setItem(key, day)
    } catch {
      // 隐私模式等：每次都播
    }
    return true
  })
  return first
}

// ---------- View Transition ----------

let vtLatest = 0

/**
 * 在 View Transition 里更新 state，并在 <html data-vt> 上标出是哪一种（tianshu.css：'view' 交叉淡入淡出，'page' 换页）。
 * 不支持或减少动态效果时直接更新；页面没在绘制时 300ms 后跳过过渡直接更新。
 */
export function smoothUpdate(kind: string, update: () => void) {
  if (!document.startViewTransition || reducedMotion()) {
    update()
    return
  }
  const root = document.documentElement
  const id = ++vtLatest
  root.dataset.vt = kind
  let updated = false
  const transition = document.startViewTransition(() => {
    if (updated) return
    updated = true
    flushSync(update)
  })
  setTimeout(() => {
    if (updated) return
    updated = true
    transition.skipTransition()
    update()
  }, 300)
  transition.finished.finally(() => {
    if (id === vtLatest) delete root.dataset.vt
  })
}

// ---------- 汉字数字 ----------

const DIGITS = '〇一二三四五六七八九'

/** 竖排里数字写成汉字（阿拉伯数字竖排会躺倒）：4 → 四，12 → 十二，23 → 二十三。0–99 */
export function hanNumber(n: number): string {
  if (n < 10) return DIGITS[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${tens > 1 ? DIGITS[tens] : ''}十${ones ? DIGITS[ones] : ''}`
}

/** 年份逐位写：2026 → 二〇二六 */
export const hanDigits = (n: number) => String(n).replace(/\d/g, (d) => DIGITS[+d])

/** 时刻：'15:02' → 十五时〇二分，'08:00' → 八时整 */
export function hanTime(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  return `${hanNumber(h)}时${m === 0 ? '整' : `${m < 10 ? '〇' : ''}${hanNumber(m)}分`}`
}
