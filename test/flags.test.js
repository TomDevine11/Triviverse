import { describe, it, expect } from 'vitest'
import { getFlagFromNationality } from '../src/utils/flags.js'

// Guards the nationality→flag coverage work (Transfermarkt naming variants,
// historical states, and the genuinely-unknown fallback). See src/utils/flags.js.
describe('nationality → flag coverage', () => {
  it('resolves Transfermarkt naming variants + historical states', () => {
    expect(getFlagFromNationality('Bosnia-Herzegovina')).toBe('🇧🇦')
    expect(getFlagFromNationality('Korea, South')).toBe('🇰🇷')
    expect(getFlagFromNationality('West Germany')).toBe('🇩🇪')
  })
  it('falls back to a globe only for genuinely unknown values', () => {
    expect(getFlagFromNationality('N/A')).toBe('🌍')
    expect(getFlagFromNationality('')).toBe('🌍')
  })
  it('covers common footballing nations (no unexpected globe)', () => {
    for (const n of ['England', 'Brazil', 'Spain', 'France', 'Germany', 'Argentina', 'Belarus', 'Cyprus', 'Senegal', 'Japan'])
      expect(getFlagFromNationality(n), n).not.toBe('🌍')
  })
})
