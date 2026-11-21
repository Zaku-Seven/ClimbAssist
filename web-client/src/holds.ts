export type Hold = {
  id: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

function isUnit(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isHold(value: unknown): value is Hold {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const hold = value as Record<string, unknown>
  return (
    typeof hold.id === 'string' &&
    typeof hold.color === 'string' &&
    isUnit(hold.x) &&
    isUnit(hold.y) &&
    isUnit(hold.width) &&
    isUnit(hold.height)
  )
}

export function parseHolds(value: unknown): Hold[] | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const body = value as Record<string, unknown>
  if (!Array.isArray(body.holds) || !body.holds.every(isHold)) {
    return null
  }
  return body.holds
}
