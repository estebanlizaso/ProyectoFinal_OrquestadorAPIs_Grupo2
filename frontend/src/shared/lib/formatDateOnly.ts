const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' })

export function formatDateOnly(value: string): string {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) {
    return value
  }

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const isSameDate =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)

  return isSameDate ? DATE_FORMATTER.format(date) : value
}
