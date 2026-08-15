import { useMemo } from 'react'
import { normalizeName } from '../../data/tictactoe'
import { refineSuggestions, searchRegistry } from '../../data/canonical/resolve.js'

// Searches the full canonical player registry (NOT the cell's valid answers — so
// the dropdown never gives the puzzle away). The registry IS the answerable
// universe, so it's the single source: no third-party API, no hand list, and no
// name-order/spelling duplicates. Returns up to 10 ranked {name, flag, id, …}
// suggestions, excluding already-used players. `isSearching` is kept for callers
// but is always false now that resolution is synchronous.
export function usePlayerSuggestions(input, active, usedNames) {
  const suggestions = useMemo(() => {
    if (!active) return []
    const norm = normalizeName(input)
    if (norm.length < 2) return []

    const merged = refineSuggestions(searchRegistry(input), usedNames)

    const rank = (name) => {
      const n = normalizeName(name)
      if (n === norm) return 0                                    // exact name / mononym
      if (n.startsWith(norm)) return 1
      if (n.split(' ').some(w => w.startsWith(norm))) return 2    // any word (incl. surname) prefix
      return 3
    }
    merged.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
    return merged.slice(0, 10)
  }, [input, active, usedNames])

  return { suggestions, isSearching: false }
}
