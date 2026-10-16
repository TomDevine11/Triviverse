import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { searchCountries, resolveCountry } from '../data/countries'
import { Flag } from './ui'
import { t } from '../strings'

// The shared country picker: an ARIA combobox over every country in the dataset.
// Rejects unknown names and anything in `blocked` ({ code → message }), so each
// game decides what a repeat or an off-limits country means.
export default function CountryInput({ onGuess, guessed, blocked = {}, disabled, placeholder = t('borderline.placeholder') }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const listId = useId()
  const inputRef = useRef(null)
  const options = useMemo(() => searchCountries(text, guessed), [text, guessed])

  // Desktop: ready to type. Phones: don't throw the keyboard over the silhouette.
  useEffect(() => {
    if (!disabled && window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [disabled])

  const fail = (msg) => {
    setError(msg); setShake(true)
    setTimeout(() => setShake(false), 400)
  }
  const submit = (country) => {
    if (!country) return fail(t('borderline.unknown'))
    if (blocked[country.code]) return fail(blocked[country.code])
    if (guessed.has(country.code)) return fail(t('borderline.duplicate', { name: country.name }))
    onGuess(country.code)
    setText(''); setOpen(false); setError('')
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && options.length) { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % options.length) }
    else if (e.key === 'ArrowUp' && options.length) { e.preventDefault(); setOpen(true); setActive(a => (a - 1 + options.length) % options.length) }
    else if (e.key === 'Escape') { setOpen(false) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const exact = resolveCountry(text)
      submit(open && options[active] ? options[active] : exact || (options.length === 1 ? options[0] : null))
    }
  }

  const showList = open && options.length > 0 && !disabled
  return (
    <div className="relative w-full">
      {showList && (
        <ul id={listId} role="listbox" aria-label={t('borderline.suggestions')}
          className="absolute bottom-full mb-2 left-0 right-0 z-dropdown bg-surface border border-border-strong rounded-xl shadow-modal overflow-hidden py-1">
          {options.map((c, i) => (
            <li key={c.code} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); submit(c) }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-2.5 h-11 px-3 cursor-pointer text-sm ${i === active ? 'bg-brand-tint text-primary' : 'text-secondary'}`}>
              <Flag code={c.code} />
              <span className="font-semibold truncate">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => { e.preventDefault() }} className={`flex gap-2 ${shake ? 'shake' : ''}`}>
        <label className="sr-only" htmlFor={`${listId}-in`}>{t('borderline.inputLabel')}</label>
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
          spellCheck="false"
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true); setError('') }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 h-input px-4 rounded-xl bg-surface border border-border-strong text-primary text-body-lg placeholder:text-faint focus:outline-none focus-visible:border-brand-bright focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors"
        />
        <button
          type="button"
          disabled={disabled || !text.trim()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => submit(open && options[active] ? options[active] : resolveCountry(text) || (options.length === 1 ? options[0] : null))}
          className="h-input px-5 rounded-xl bg-brand hover:bg-brand-hover disabled:bg-border disabled:text-faint text-white text-sm font-black tracking-[0.06em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
        >
          {t('borderline.guess')}
        </button>
      </form>
      {/* Above the input so it can't fall below the fold on short phones. */}
      <p id={`${listId}-err`} role="alert" className={`absolute bottom-full mb-2 inset-x-0 m-0 flex justify-center pointer-events-none ${error && !showList ? '' : 'sr-only'}`}>
        {error && <span className="bl-reveal px-3 py-1.5 rounded-lg bg-surface border border-danger/50 text-[0.75rem] font-semibold text-danger-bright shadow-modal">{error}</span>}
      </p>
    </div>
  )
}

