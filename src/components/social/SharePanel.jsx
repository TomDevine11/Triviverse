// The share block. One primary action — "Share & challenge" — that sends the
// pasteable text (native share sheet on phones, clipboard on desktop), plus
// direct WhatsApp / Teams / image / link buttons. A live preview shows exactly
// what lands in the chat. If you haven't picked a name, an inline field offers
// it: a challenge from "Tom" converts better than one from nobody.
//
// Used by the finish card (game result), the hub (share my matchday) and the
// league page (invite) — `text` + `url` are all it needs.

import { useState } from 'react'
import { useI18n } from '../../i18n'
import { track } from '../../utils/analytics'
import { bump, checkBadges } from '../../social/badges'
import { nickname, setNickname } from '../../social/identity'
import { rename } from '../../social/api'

const btn = 'h-10 flex items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-border/40 hover:bg-border text-[0.7rem] font-bold text-secondary hover:text-primary transition-colors'

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor"><path d="M12 2.2A9.7 9.7 0 0 0 3.7 17l-1.3 4.8 4.9-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-3-.4-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.2.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1c0 1.2.9 2.4 1 2.6.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.6-.3Z" /></svg>
}
function TeamsIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor"><circle cx="17.5" cy="6.5" r="2.5" opacity=".7" /><path d="M15 10h5.5c.8 0 1.5.7 1.5 1.5V16a3.5 3.5 0 0 1-5.6 2.8" opacity=".7" /><rect x="2" y="6" width="12" height="12" rx="2" /><path d="M5 9.5h6M8 9.5V15" stroke="currentColor" strokeWidth="1.6" className="text-surface" /></svg>
}
function ImageIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
}
function LinkIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1-1" /></svg>
}
export function ShareIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export function NameField({ onSaved, compact = false, autoFocus = false }) {
  const { t } = useI18n()
  const [name, setName] = useState(nickname())
  const [saved, setSaved] = useState(false)
  const save = () => {
    const n = setNickname(name)
    setName(n)
    setSaved(true)
    rename()
    onSaved?.(n)
    setTimeout(() => setSaved(false), 1500)
  }
  return (
    <form className="w-full flex gap-2" onSubmit={e => { e.preventDefault(); save() }}>
      <input value={name} onChange={e => setName(e.target.value)} maxLength={20} autoFocus={autoFocus}
        placeholder={t('social.me.nicknamePh')} aria-label={t('social.me.nickname')}
        className={`flex-1 min-w-0 bg-board border border-border-strong rounded-lg px-3 text-body-lg sm:text-sm text-primary placeholder:text-faint focus:outline-none focus:border-brand ${compact ? 'h-9' : 'h-11'}`} />
      <button type="submit" className={`${btn} px-4 ${compact ? 'h-9' : 'h-11'}`}>{saved ? t('social.me.saved') : t('social.me.save')}</button>
    </form>
  )
}

// `imageCard` → the canvas "Fixture Card" PNG (utils/shareImage.js), optional.
// `inline` → the compact finish-card form: no preview, the primary button
// full width with a slim row of icon-only WhatsApp / Teams / image / link under it.
export default function SharePanel({ text, url, game = 'day', imageCard, primaryLabel, copiedLabel, askName = true, preview = true, inline = false }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(null)
  const [hasName, setHasName] = useState(!!nickname())
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const body = typeof text === 'function' ? text() : text

  const done = (method) => {
    track('share', { game, method })
    bump('shares')
    checkBadges()
  }
  const flash = (k) => { setCopied(k); setTimeout(() => setCopied(null), 2200) }

  const share = async () => {
    const msg = typeof text === 'function' ? text() : text
    if (canNative && window.matchMedia?.('(pointer: coarse)').matches) {
      try { await navigator.share({ text: msg }); done('native') } catch { /* cancelled */ }
      return
    }
    try { await navigator.clipboard.writeText(msg); flash('text'); done('copy_text') } catch { /* blocked */ }
  }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); flash('link'); done('copy_link') } catch { /* blocked */ }
  }
  const open = (href, method) => { window.open(href, '_blank', 'noopener'); done(method) }
  const image = async () => {
    const { renderShareCard } = await import('../../utils/shareImage')
    const blob = await renderShareCard(imageCard)
    if (!blob) return
    const file = new File([blob], `triviverse-${imageCard.gameId}-${imageCard.matchday}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: url }); done('image_native') } catch { /* cancelled */ }
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    done('image_download')
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {askName && !hasName && (
        <div className="w-full">
          <div className="text-[0.62rem] text-muted mb-1">{t('social.me.nicknameHelp')}</div>
          <NameField compact onSaved={n => setHasName(!!n)} />
        </div>
      )}
      {preview && !inline && (
        <pre aria-label={t('social.share.preview')}
          className="w-full max-h-32 overflow-hidden whitespace-pre-wrap break-words bg-board border border-border rounded-lg px-3 py-2 text-[0.66rem] leading-snug text-secondary font-sans">
          {body}
        </pre>
      )}
      <div className="contents">
        <button type="button" onClick={share}
          className={`w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-brand/60 bg-brand-tint hover:bg-brand/25 text-brand-bright hover:text-primary text-sm font-black tracking-[0.04em] transition-colors whitespace-nowrap`}>
          <ShareIcon /> {copied === 'text' ? (copiedLabel || t('social.share.copied')) : (primaryLabel || t('social.share.shareResult'))}
        </button>
        <div className={`grid gap-1.5 ${imageCard ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {[
            ['whatsapp', <WhatsAppIcon key="i" />, t('social.share.whatsapp'), () => open(`https://wa.me/?text=${encodeURIComponent(body)}`, 'whatsapp')],
            ['teams', <TeamsIcon key="i" />, t('social.share.teams'), () => open(`https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(body)}`, 'teams')],
            imageCard && ['image', <ImageIcon key="i" />, t('social.share.image'), image],
            ['link', <LinkIcon key="i" />, copied === 'link' ? '✓' : t('social.share.link'), copyLink],
          ].filter(Boolean).map(([k, icon, label, onClick]) => (
            <button key={k} type="button" onClick={onClick} className={`${btn} ${inline ? '!h-9' : ''}`}
              aria-label={inline ? label : undefined} title={inline ? label : undefined}>
              {inline && k === 'link' && copied === 'link' ? '✓' : icon}{!inline && label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
