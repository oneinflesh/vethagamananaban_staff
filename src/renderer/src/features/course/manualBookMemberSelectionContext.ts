import { createContext } from 'react'

type MemberSelection = {
  selected: Set<string>
  disabled: boolean
  toggle: (key: string) => void
}

export const ManualBookMemberSelectionContext = createContext<MemberSelection | null>(null)
