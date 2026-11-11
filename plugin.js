// hermesstop — self-contained Hermes desktop plugin (Nous Research hackathon)
// Hitting the Stop button in the composer pops a little comic-style chat
// bubble from the button itself, shouting DAMNIT or one of the other words.
// 9 presets + 2 custom words, 3 bubble styles (comic / neon / minimal).
// Settings live on the /hermesstop options page — the titlebar stop-sign
// button toggles it open/closed. No audio, no assets, no network — one file.
import { Button, haptic, host, Input, PALETTE_AREA, ROUTES_AREA, TITLEBAR_AREAS, Tip, usePluginI18n } from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useState } from 'react'

const id = 'hermesstop'
const name = 'Hermes Stop Curses'

const PRESETS = ['DAMNIT!', 'GOD DAMN IT!', 'ARGH!', 'SON OF A…!', 'KIDDING ME?!', 'OH COME ON!', 'SERIOUSLY?!', 'NOT AGAIN!', 'FOR CRYING OUT LOUD!', 'I PITY THE FOOL!']

const STYLES = [
  { key: 'comic', label: 'Comic' },
  { key: 'neon', label: 'Neon' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'stamp', label: 'Stamp' },
  { key: 'pixel', label: 'Pixel' },
  { key: 'rect', label: 'Rect' },
]
const DEFAULT_STYLE = 'comic'

let bubble = null
let bubbleTimer = null

function storage (ctx) {
  return ctx.storage || { get: async () => undefined, set: async () => {}, remove: async () => {} }
}

async function pickWord (ctx) {
  try {
    const c1 = await storage(ctx).get('custom1')
    const c2 = await storage(ctx).get('custom2')
    const pool = PRESETS.concat([c1, c2].filter(Boolean))
    return pool[Math.floor(Math.random() * pool.length)]
  } catch (_) {
    return PRESETS[Math.floor(Math.random() * PRESETS.length)]
  }
}

async function pickStyle (ctx) {
  try {
    const s = await storage(ctx).get('style')
    return STYLES.some(x => x.key === s) ? s : DEFAULT_STYLE
  } catch (_) {
    return DEFAULT_STYLE
  }
}

const CSS = [
  '#hermesstop-bubble{position:fixed;z-index:2147483647;pointer-events:none;',
  'white-space:nowrap;transform-origin:bottom center;',
  'animation:hermesstop-in 160ms cubic-bezier(.2,1.6,.4,1) both}',
  '#hermesstop-bubble.hermesstop-out{animation:hermesstop-out 140ms ease-in both}',
  '#hermesstop-bubble::after{content:"";position:absolute;bottom:-14px;left:var(--tail-x,24px);',
  'border:7px solid transparent}',
  '#hermesstop-bubble::before{content:"";position:absolute;bottom:-8px;left:calc(var(--tail-x,24px) + 3px);',
  'border:5px solid transparent;z-index:1}',
  '#hermesstop-bubble.hermesstop-flip{transform-origin:top center}',
  '#hermesstop-bubble.hermesstop-flip::after{top:-14px;bottom:auto}',
  '#hermesstop-bubble.hermesstop-flip::before{top:-8px;bottom:auto}',
  '@keyframes hermesstop-in{0%{opacity:0;transform:scale(.5) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-2deg)}}',
  '@keyframes hermesstop-out{to{opacity:0;transform:scale(.8) rotate(-4deg)}}',
  // comic — classic white speech bubble, black outline, hard offset shadow
  '#hermesstop-bubble.hs-comic{background:#fff;color:#111;border:3px solid #111;border-radius:18px;',
  'padding:10px 18px;font:800 20px/1.2 \'Comic Sans MS\',\'Comic Neue\',\'Segoe UI\',sans-serif;',
  'text-transform:uppercase;letter-spacing:0.02em;box-shadow:3px 4px 0 #111}',
  '#hermesstop-bubble.hs-comic::after{border-top:12px solid #111}',
  '#hermesstop-bubble.hs-comic::before{border-top:9px solid #fff}',
  '#hermesstop-bubble.hs-comic.hermesstop-flip::after{border-bottom:12px solid #111;border-top-color:transparent}',
  '#hermesstop-bubble.hs-comic.hermesstop-flip::before{border-bottom:9px solid #fff;border-top-color:transparent}',
  // neon — dark panel, glowing green outline and text
  '#hermesstop-bubble.hs-neon{background:#0b0b12;color:#39ff14;border:2px solid #39ff14;border-radius:14px;',
  'padding:10px 20px;font:700 22px/1.2 \'Segoe UI\',system-ui,sans-serif;text-transform:uppercase;',
  'letter-spacing:0.12em;text-shadow:0 0 6px #39ff14,0 0 18px #39ff14;',
  'box-shadow:0 0 12px #39ff14,0 0 30px rgba(57,255,20,.5),inset 0 0 8px rgba(57,255,20,.35)}',
  '#hermesstop-bubble.hs-neon::after{border-top:12px solid #39ff14}',
  '#hermesstop-bubble.hs-neon::before{border-top:9px solid #0b0b12}',
  '#hermesstop-bubble.hs-neon.hermesstop-flip::after{border-bottom:12px solid #39ff14;border-top-color:transparent}',
  '#hermesstop-bubble.hs-neon.hermesstop-flip::before{border-bottom:9px solid #0b0b12;border-top-color:transparent}',
  // minimal — quiet neutral pill, thin border, soft shadow
  '#hermesstop-bubble.hs-minimal{background:#f4f4f5;color:#18181b;border:1px solid #d4d4d8;border-radius:999px;',
  'padding:6px 14px;font:500 14px/1.3 \'Segoe UI\',system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.12)}',
  '#hermesstop-bubble.hs-minimal::after{border-top:8px solid #d4d4d8}',
  '#hermesstop-bubble.hs-minimal::before{border-top:6px solid #f4f4f5}',
  '#hermesstop-bubble.hs-minimal.hermesstop-flip::after{border-bottom:8px solid #d4d4d8;border-top-color:transparent}',
  '#hermesstop-bubble.hs-minimal.hermesstop-flip::before{border-bottom:6px solid #f4f4f5;border-top-color:transparent}',
  // rect — clean rounded rectangle, tail
  '#hermesstop-bubble.hs-rect{background:#fff;color:#111;border:3px solid #111;border-radius:10px;',
  'padding:10px 18px;font:800 19px/1.2 "Segoe UI",system-ui,sans-serif;text-transform:uppercase;',
  'letter-spacing:0.02em;box-shadow:4px 4px 0 #111}',
  '#hermesstop-bubble.hs-rect::after{border-top:12px solid #111}',
  '#hermesstop-bubble.hs-rect::before{border-top:9px solid #fff}',
  '#hermesstop-bubble.hs-rect.hermesstop-flip::after{border-bottom:12px solid #111;border-top-color:transparent}',
  '#hermesstop-bubble.hs-rect.hermesstop-flip::before{border-bottom:9px solid #fff;border-top-color:transparent}',
  // stamp — tilted rubber stamp, no tail
  '#hermesstop-bubble.hs-stamp{background:#b91c1c;color:#fff;border:3px solid #7f1d1d;border-radius:8px;',
  'padding:8px 16px;font:800 15px/1.1 "Segoe UI",system-ui,sans-serif;text-transform:uppercase;',
  'letter-spacing:0.16em;box-shadow:inset 0 0 0 2px rgba(255,255,255,0.5),4px 4px 0 rgba(0,0,0,0.4);',
  'animation:hermesstop-in-stamp 160ms cubic-bezier(.2,1.6,.4,1) both}',
  '@keyframes hermesstop-in-stamp{0%{opacity:0;transform:scale(.5) rotate(-16deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}',
  '#hermesstop-bubble.hs-stamp.hermesstop-out{animation:hermesstop-out-stamp 140ms ease-in both}',
  '@keyframes hermesstop-out-stamp{to{opacity:0;transform:scale(.8) rotate(-4deg)}}',
  '#hermesstop-bubble.hs-stamp::after,#hermesstop-bubble.hs-stamp::before{display:none}',
  // pixel — retro handheld (game-boy palette), blocky tail
  '#hermesstop-bubble.hs-pixel{background:#9bbc0f;color:#0f380f;border:3px solid #0f380f;border-radius:0;',
  'padding:8px 14px;font:700 14px/1.2 "Courier New",ui-monospace,monospace;text-transform:uppercase;',
  'letter-spacing:0.14em;box-shadow:inset 0 0 0 2px rgba(255,255,255,0.35),5px 5px 0 0 #0f380f}',
  '#hermesstop-bubble.hs-pixel::after{border-top:12px solid #0f380f}',
  '#hermesstop-bubble.hs-pixel::before{border-top:9px solid #9bbc0f}',
  '#hermesstop-bubble.hs-pixel.hermesstop-flip::after{border-bottom:12px solid #0f380f;border-top-color:transparent}',
  '#hermesstop-bubble.hs-pixel.hermesstop-flip::before{border-bottom:9px solid #9bbc0f;border-top-color:transparent}',
].join('')

// Inject or refresh the stylesheet. A plugin reload does NOT remove the old
// <style> element, so a bubble shown under an older plugin version (e.g. one
// whose CSS lacked the neon/minimal rules) leaves a stale stylesheet behind.
// Always rewrite the CSS so the currently loaded version wins.
function ensureStyle () {
  try {
    let style = document.getElementById('hermesstop-style')
    if (!style) {
      style = document.createElement('style')
      style.id = 'hermesstop-style'
      document.head.appendChild(style)
    }
    if (style.textContent !== CSS) style.textContent = CSS
  } catch (_) {}
}

// Only one popup may be on screen at a time: drop every existing bubble (a
// stale listener or a duplicate plugin instance can leave one behind), then
// clear this instance's timer so nothing resurrects an old bubble later.
function clearBubbles () {
  try {
    const els = document.querySelectorAll('#hermesstop-bubble')
    for (let i = 0; i < els.length; i++) els[i].remove()
  } catch (_) {}
  bubble = null
  if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
}

// Comic-style chat bubble anchored above (or below) the stop button,
// with a tail pointing at it.
function showBubble (anchorRect, text, styleKey) {
  try {
    clearBubbles()
    ensureStyle()
    const el = document.createElement('div')
    el.id = 'hermesstop-bubble'
    el.className = 'hs-' + (STYLES.some(x => x.key === styleKey) ? styleKey : DEFAULT_STYLE)
    el.textContent = text
    document.body.appendChild(el)
    const vw = window.innerWidth, vh = window.innerHeight
    const w = el.offsetWidth, h = el.offsetHeight
    const cx = Math.min(Math.max(anchorRect.left + anchorRect.width / 2 - w / 2, 8), vw - w - 8)
    const above = anchorRect.top - h - 18
    let top
    if (above >= 8) {
      top = above
      el.style.setProperty('transform-origin', 'bottom center')
      // tail points down toward the button
    } else {
      top = Math.min(anchorRect.bottom + 18, vh - h - 8)
      el.classList.add('hermesstop-flip')
    }
    el.style.left = cx + 'px'
    el.style.top = top + 'px'
    positionTail(el, anchorRect)
    bubble = el
    bubbleTimer = setTimeout(() => {
      el.classList.add('hermesstop-out')
      setTimeout(() => { el.remove(); if (bubble === el) bubble = null }, 200)
    }, 1400)
  } catch (_) {}
}

// Point the tail at the button horizontally.
function positionTail (el, anchorRect) {
  try {
    const cx = el.offsetLeft + el.offsetWidth / 2
    const bx = anchorRect.left + anchorRect.width / 2
    const maxOff = el.offsetWidth / 2 - 26
    const off = Math.min(Math.max(bx - cx, -maxOff), maxOff)
    el.style.setProperty('--tail-x', (24 + off) + 'px')
  } catch (_) {}
}

// The composer's primary button is a submit button that becomes the Stop
// button mid-turn (aria-label="Stop", square glyph inside).
function isStopButton (btn) {
  if (!btn || btn.tagName !== 'BUTTON' || btn.disabled) return false
  const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase()
  if (label === 'stop' || label === 'stop turn') return true
  if (btn.getAttribute('type') === 'submit' && label === '') {
    return !!btn.querySelector('span[class*="size-2.5"][class*="rounded"]')
  }
  return false
}

function promptFor (label, current) {
  try {
    const v = window.prompt(label, current || '')
    return (v === null) ? null : v.trim().slice(0, 40)
  } catch (_) { return null }
}

function testRect () {
  const btn = document.querySelector('button[type="submit"]')
  return btn ? btn.getBoundingClientRect() : new DOMRect(window.innerWidth / 2 - 60, window.innerHeight - 120, 40, 40)
}

// ---- titlebar options button + options page ---------------------------------
// Muted-red stop sign (octagon) with a white options gear in the middle, in
// the titlebar right cluster. The fill is deliberately dark and the border
// soft so it stays quiet at rest; hover brightens it instead of it glowing
// all day. Click toggles the /hermesstop options page.
const STOP_OCTAGON = '5,0.5 11,0.5 15.5,5 15.5,11 11,15.5 5,15.5 0.5,11 0.5,5'
const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315]

function StopSign () {
  return jsx('span', {
    className: 'inline-flex items-center justify-center transition hover:brightness-125',
    style: { width: '0.9375rem', height: '0.9375rem' },
    children: jsxs('svg', {
      viewBox: '0 0 16 16',
      width: '15',
      height: '15',
      'aria-hidden': 'true',
      children: [
        jsx('polygon', {
          key: 'octagon',
          points: STOP_OCTAGON,
          fill: '#a12626',
          stroke: 'rgba(255,255,255,0.7)',
          strokeWidth: '1',
          strokeLinejoin: 'round'
        }),
        jsx('circle', {
          key: 'gear-ring',
          cx: '8',
          cy: '8',
          r: '2.7',
          fill: 'none',
          stroke: '#fff',
          strokeWidth: '1.5'
        }),
        ...GEAR_TEETH.map(a => jsx('rect', {
          key: 'tooth-' + a,
          x: '7.4',
          y: '2.8',
          width: '1.2',
          height: '2.4',
          rx: '0.35',
          transform: 'rotate(' + a + ' 8 8)',
          fill: '#fff'
        }))
      ]
    })
  })
}

function TitlebarOptions() {
  const t = usePluginI18n(id)
  return jsx(Tip, {
    label: t('optionsTip'),
    children: jsx('button', {
      type: 'button',
      'aria-label': t('optionsTip'),
      className: 'inline-flex h-full items-center px-1.5',
      onClick: () => {
        haptic('tap')
        // Toggle: open the options page, or close it back to the chat
        // ('/' is the app's own return-to-chat route).
        const path = (window.location.hash || '').replace(/^#/, '').split('?')[0]
        host.navigate(path === '/hermesstop' ? '/' : '/hermesstop')
      },
      children: jsx(StopSign, {})
    })
  })
}

function HermesStopPage({ ctx }) {
  const t = usePluginI18n(id)
  const [prefs, setPrefs] = useState({ custom1: '', custom2: '', style: DEFAULT_STYLE })

  // Load saved settings once (await keeps this correct whether the host's
  // storage door is sync or async).
  useEffect(() => {
    let alive = true
    ;(async () => {
      const c1 = (await storage(ctx).get('custom1')) || ''
      const c2 = (await storage(ctx).get('custom2')) || ''
      const s = await storage(ctx).get('style')
      if (alive) {
        setPrefs({ custom1: c1, custom2: c2, style: STYLES.some(x => x.key === s) ? s : DEFAULT_STYLE })
      }
    })()
    return () => { alive = false }
  }, [ctx])

  // Persist a custom word on blur: trimmed, 40 chars max, empty clears the key
  // (remove, not set(undefined) — the latter would store the string "undefined").
  const saveWord = async (key, value) => {
    const v = value.trim().slice(0, 40)
    if (v) await storage(ctx).set(key, v)
    else await storage(ctx).remove(key)
  }
  const chooseStyle = async (key) => {
    if (!STYLES.some(x => x.key === key)) return
    setPrefs(p => ({ ...p, style: key }))
    await storage(ctx).set('style', key)
    haptic('tap')
    showBubble(testRect(), 'DAMNIT!', key)  // preview the style immediately
  }

  return jsxs('div', {
    className: 'flex h-full items-start justify-center overflow-auto p-6',
    children: [
      jsxs('div', {
        className: 'flex w-full max-w-xl flex-col gap-5 rounded-xl p-6',
        style: { background: 'var(--chrome-panel-bg, rgba(0,0,0,0.35))', border: '1px solid var(--ui-stroke-secondary)' },
        children: [
          jsxs('div', { className: 'flex flex-col gap-1', children: [
            jsx('div', { className: 'text-base font-semibold', children: t('title') }),
            jsx('div', { className: 'text-xs', style: { color: 'var(--ui-text-secondary)' }, children: t('subtitle') })
          ]}),
          jsxs('label', { className: 'flex flex-col gap-1.5 text-xs', children: [
            jsx('span', { className: 'font-medium', children: t('word1') }),
            jsx(Input, {
              value: prefs.custom1, maxLength: 40, placeholder: t('wordPlaceholder'),
              onChange: e => setPrefs(p => ({ ...p, custom1: e.target.value })),
              onBlur: () => saveWord('custom1', prefs.custom1)
            })
          ]}),
          jsxs('label', { className: 'flex flex-col gap-1.5 text-xs', children: [
            jsx('span', { className: 'font-medium', children: t('word2') }),
            jsx(Input, {
              value: prefs.custom2, maxLength: 40, placeholder: t('wordPlaceholder'),
              onChange: e => setPrefs(p => ({ ...p, custom2: e.target.value })),
              onBlur: () => saveWord('custom2', prefs.custom2)
            })
          ]}),
          jsxs('div', { className: 'flex flex-col gap-1.5 text-xs', children: [
            jsx('span', { className: 'font-medium', children: t('styleLabel') }),
            jsxs('div', { className: 'flex gap-2', children: [
              STYLES.map(s => jsx(Button, {
                key: s.key,
                size: 'sm',
                variant: prefs.style === s.key ? 'default' : 'outline',
                onClick: () => chooseStyle(s.key),
                children: s.label
              }))
            ]})
          ]}),
          jsx('div', { className: 'flex gap-2', children: [
            jsx(Button, {
              size: 'sm', variant: 'outline',
              onClick: () => { haptic('tap'); showBubble(testRect(), 'DAMNIT!', prefs.style) },
              children: t('test')
            })
          ]}),
          jsx('div', { className: 'text-xs', style: { color: 'var(--ui-text-secondary)' }, children: t('hint') })
        ]
      })
    ]
  })
}

export default {
  id,
  name,
  register (ctx) {
    ensureStyle()  // refresh the stylesheet on every load (a reload keeps the old <style> node)
    ctx.i18n?.register({
      en: {
        title: 'Hermes Stop Curses',
        subtitle: 'Sayings and bubble style for the Stop button shout.',
        word1: 'Custom word 1',
        word2: 'Custom word 2',
        wordPlaceholder: 'Leave blank to clear',
        styleLabel: 'Bubble style',
        test: 'Show a test bubble',
        hint: 'Custom words are picked alongside the 9 presets (40 chars max).',
        optionsTip: 'HermesStop options',
        nav: 'Stop Curses'
      }
    })

    let lastAt = 0
    const onClick = async (e) => {
      try {
        const btn = e.target && e.target.closest ? e.target.closest('button') : null
        if (!isStopButton(btn)) return
        const now = Date.now()
        if (now - lastAt < 250) return
        lastAt = now
        const text = await pickWord(ctx)
        const style = await pickStyle(ctx)
        showBubble(btn.getBoundingClientRect(), text, style)
      } catch (_) {}
    }
    document.addEventListener('click', onClick, { capture: true })

    const regs = []
    if (ctx.register) {
      if (PALETTE_AREA) {
        regs.push(ctx.register({
          id: id + '.test',
          area: PALETTE_AREA,
          data: { id: id + '.test', label: 'HermesStop: show a test bubble', keywords: 'hermesstop damnit bubble', run: async () => {
            showBubble(testRect(), 'DAMNIT!', await pickStyle(ctx))
          } },
        }))
        for (let i = 0; i < 2; i++) {
          const key = 'custom' + (i + 1)
          regs.push(ctx.register({
            id: id + '.set-' + key,
            area: PALETTE_AREA,
            data: {
              id: id + '.set-' + key,
              label: 'HermesStop: set custom word ' + (i + 1),
              keywords: 'hermesstop custom word damnit',
              run: async () => {
                const current = await storage(ctx).get(key)
                const v = promptFor('Custom word ' + (i + 1), current)
                if (v === null) return
                // remove (not set(undefined)) so clearing never stores a
                // literal "undefined" that the word picker would shout.
                if (v) await storage(ctx).set(key, v)
                else await storage(ctx).remove(key)
              },
            },
          }))
        }
        for (const s of STYLES) {
          regs.push(ctx.register({
            id: id + '.style-' + s.key,
            area: PALETTE_AREA,
            data: {
              id: id + '.style-' + s.key,
              label: 'HermesStop: bubble style: ' + s.label,
              keywords: 'hermesstop bubble style ' + s.key,
              run: async () => {
                await storage(ctx).set('style', s.key)
                showBubble(testRect(), 'DAMNIT!', s.key)
              },
            },
          }))
        }
        regs.push(ctx.register({
          id: id + '.open',
          area: PALETTE_AREA,
          data: { id: id + '.open', label: 'HermesStop: open options', keywords: 'hermesstop options settings', run: () => host.navigate('/hermesstop') }
        }))
      }

      // Titlebar "!" — opens the options page. Right cluster, immediately to
      // the right of the xsnow snowflake toggle (order 1 sorts after it).
      regs.push(ctx.register({
        id: id + '.titlebar-options', area: TITLEBAR_AREAS.right, order: 1,
        render: () => jsx(TitlebarOptions, {})
      }))

      // Options page (opened/closed by the titlebar "!" button)
      regs.push(ctx.register({
        id: id + '.page',
        area: ROUTES_AREA,
        data: { path: '/hermesstop' },
        render: () => jsx(HermesStopPage, { ctx })
      }))
    }

    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      clearBubbles()
      for (const r of regs) { try { r && r() } catch (_) {} }
    }
  },
}
