import type { HeatmapCell, Summary } from '@/lib/api/stats'

export function compareBadShare(current: Summary, previous: Summary) {
  if (current.presenceMinutes <= 0 || previous.presenceMinutes <= 0) return null
  const currentShare = 100 * current.badMinutes / current.presenceMinutes
  const previousShare = 100 * previous.badMinutes / previous.presenceMinutes
  return { currentShare, previousShare, difference: currentShare - previousShare }
}

export function mostFrequentAlerts(summary: Summary) {
  const highest = Math.max(0, ...Object.values(summary.alerts))
  return {
    count: highest,
    types: Object.keys(summary.alerts).filter(type => highest > 0 && summary.alerts[type] === highest),
  }
}

export function lowestScoredHours(cells: HeatmapCell[]) {
  const scored = cells.filter(cell => cell.meanScore !== null)
  const lowest = Math.min(...scored.map(cell => cell.meanScore!))
  return { scored: scored.length, lowest, hours: scored.filter(cell => cell.meanScore === lowest) }
}
