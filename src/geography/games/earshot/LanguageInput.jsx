import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { searchLanguages, resolveLanguage, languageById } from '../../data/languages'
import { t } from '../../strings'

// Earshot's language picker: an ARIA combobox over the whole catalogue (not just
// the languages with clips, so the list never narrows the answer). Matches names,
// endonyms and aliases with accents folded; Enter takes the highlighted suggestion,
// an exact unambiguous name, or the only match.
export default function LanguageInput({ onGuess, guessed, disabled }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const listId = useId()
  const inputRef = useRef(null)
  const options = useMemo(() => searchLanguages(text, guessed), [text, guessed])

  // Desktop: ready to type. Phones: keep the keyboard down until asked for.
  useEffect(() => {
    if (!disabled && window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [disabled])

  const fail = (msg) => {
    setError(msg); setShake(true)
    setTimeout(() => setShake(false), 400)
  }
  const pick = () => {
    if (open && options[active]) return options[active]
    const exact = resolveLanguage(text)
    if (exact) return exact
    return options.length === 1 ? options[0] : null
  }
  const submit = (lang) => {
    if (!lang) return fail(options.length > 1 ? t('earshot.ambiguous', { q: text.trim() }) : t('earshot.unknown'))
    if (guessed.has(lang.id)) return fail(t('earshot.duplicate', { name: languageById(lang.id).name }))
    onGuess(lang.id)
    setText(''); setOpen(false); setError('')
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && options.length) { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % options.length) }
    else if (e.key === 'ArrowUp' && options.length) { e.preventDefault(); setOpen(true); setActive(a => (a - 1 + options.length) % options.length) }
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Enter') { e.preventDefault(); if (text.trim()) submit(pick()) }
  }

  const showList = open && options.length > 0 && !disabled
  return (
    <div className="relative w-full">
      {showList && (
        <ul id={listId} role="listbox" aria-label={t('earshot.suggestions')}
          className="absolute bottom-full mb-2 left-0 right-0 z-dropdown bg-surface border border-border-strong rounded-xl shadow-modal overflow-hidden py-1">
          {options.map((l, i) => (
            <li key={l.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); submit(l) }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between gap-3 h-11 px-3.5 cursor-pointer text-sm ${i === active ? 'bg-brand-tint text-primary' : 'text-secondary'}`}>
              <span className="font-semibold truncate">{l.name}</span>
              {l.end !== l.name && <span className="text-[0.78rem] text-muted truncate">{l.end}</span>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => e.preventDefault()} className={`flex gap-2 ${shake ? 'shake' : ''}`}>
        <label className="sr-only" htmlFor={`${listId}-in`}>{t('earshot.inputLabel')}</label>
        <input
          ref={inputRef}
          id={`${listId}-in`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${listId}-err` : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="go"
          disabled={disabled}
          value={text}
          placeholder={t('earshot.placeholder')}
          onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true); setError('') }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 h-input px-4 rounded-xl bg-surface border border-border-strong text-primary text-body-lg placeholder:text-faint focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] transition-colors"
        />
        <button
          type="button"
          disabled={disabled || !text.trim()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => submit(pick())}
          className="h-input px-5 rounded-xl bg-brand hover:bg-brand-hover disabled:bg-border disabled:text-faint text-white text-sm font-black tracking-[0.06em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
        >
          {t('earshot.guess')}
        </button>
      </form>
      <p id={`${listId}-err`} role="alert" className={`absolute bottom-full mb-2 inset-x-0 m-0 flex justify-center pointer-events-none ${error && !showList ? '' : 'sr-only'}`}>
        {error && <span className="bl-reveal px-3 py-1.5 rounded-lg bg-surface border border-danger/50 text-[0.75rem] font-semibold text-danger-bright shadow-modal">{error}</span>}
      </p>
    </div>
  )
}
