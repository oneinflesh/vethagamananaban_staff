type RecipientType = 'individual' | 'coordinator'
type DispatchHistory = {
  recipientType: RecipientType
  search: string
  selectedBooks: string[]
  starts: Record<RecipientType, number>
}

const history = new Map<string, DispatchHistory>()

export function getManualDispatchHistory(country: string): DispatchHistory {
  let saved = history.get(country)
  if (!saved) {
    saved = {
      recipientType: 'individual',
      search: '',
      selectedBooks: [],
      starts: { individual: 0, coordinator: 0 }
    }
    history.set(country, saved)
  }
  return saved
}
