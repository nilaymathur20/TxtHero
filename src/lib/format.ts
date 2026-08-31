export function countWords(text: string): number {
  // \p{M} covers combining marks, without which scripts like Devanagari split
  // on every matra and virama and inflate the count severalfold.
  const matches = text.match(/[\p{L}\p{M}\p{N}_'’-]+/gu)
  return matches ? matches.length : 0
}

export function countLines(text: string): number {
  if (text.length === 0) return 1
  let lines = 1
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') lines += 1
  }
  return lines
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Case-insensitive subsequence match, the fuzzy ranking used by Quick Open. */
export function fuzzyScore(query: string, target: string): number {
  if (query.length === 0) return 0
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  const direct = t.indexOf(q)
  if (direct !== -1) {
    // Strongly prefer matches at the start, then on a path/name boundary.
    const boundaryBonus = direct === 0 ? 400 : /[/_\-\s.]/.test(t[direct - 1]) ? 260 : 120
    return boundaryBonus - direct
  }

  let score = 0
  let queryIndex = 0
  let previous = -2
  for (let i = 0; i < t.length && queryIndex < q.length; i += 1) {
    if (t[i] === q[queryIndex]) {
      score += i === previous + 1 ? 12 : 6
      if (i === 0 || /[/_\-\s.]/.test(t[i - 1])) score += 18
      previous = i
      queryIndex += 1
    }
  }
  return queryIndex === q.length ? score - target.length / 20 : -1
}
