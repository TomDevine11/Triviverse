// Chrome bar for the social pages (/me, /leagues…) — same lockup as GameChrome,
// with the You / Leagues / World switch in the centre slot.

import { Link, NavLink } from 'react-router-dom'
import BrandMark from '../BrandMark'
import { useI18n } from '../../i18n'
import { UserIcon, TableIcon, GlobeIcon } from './bits'

const tab = ({ isActive }) => `flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-[0.66rem] font-black tracking-[0.12em] uppercase transition-colors ${isActive ? 'bg-brand-tint text-primary border border-brand/50' : 'text-muted hover:text-primary border border-transparent'}`

export default function SocialChrome() {
  const { t, lp } = useI18n()
  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <Link to={lp('/')} className="flex items-center gap-2 text-[0.62rem] sm:text-[0.7rem] font-black tracking-[0.12em] hover:opacity-80 transition-opacity">
        <BrandMark className="w-3.5 h-3.5 text-brand-bright" />
        <span className="text-primary">TRIVIVERSE</span>
        <span className="text-brand-bright hidden sm:inline">FOOTBALL</span>
      </Link>
      <nav className="flex items-center gap-1">
        <NavLink to={lp('/me')} className={tab} aria-label={t('social.nav.you')}><UserIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('social.nav.you')}</span></NavLink>
        <NavLink to={lp('/leagues')} className={tab} aria-label={t('social.nav.leagues')}><TableIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('social.nav.leagues')}</span></NavLink>
        <NavLink to={lp('/world')} className={tab} aria-label={t('social.nav.world')}><GlobeIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('social.nav.world')}</span></NavLink>
      </nav>
    </header>
  )
}
