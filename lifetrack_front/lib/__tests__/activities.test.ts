import { formatDuration, getTodayDate, calculateStreak } from '@/lib/activities'

describe('Activity Utilities', () => {
  describe('formatDuration', () => {
    it('formats minutes correctly', () => {
      expect(formatDuration(0)).toBe('0m')
      expect(formatDuration(1)).toBe('1m')
      expect(formatDuration(59)).toBe('59m')
    })

    it('formats hours and minutes correctly', () => {
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(125)).toBe('2h 5m')
    })

    it('handles large durations', () => {
      expect(formatDuration(240)).toBe('4h')
      expect(formatDuration(1440)).toBe('24h')
    })
  })

  describe('getTodayDate', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const today = getTodayDate()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('returns current date', () => {
      const today = new Date()
      const expected = today.toISOString().split('T')[0]
      expect(getTodayDate()).toBe(expected)
    })
  })
})
