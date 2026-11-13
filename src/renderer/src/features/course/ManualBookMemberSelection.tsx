import { useContext } from 'react'
import { ManualBookMemberSelectionContext } from './manualBookMemberSelectionContext'

export default function ManualBookMemberCheckbox({ memberKey, bbsNumber }: {
  memberKey: string
  bbsNumber: string
}): React.JSX.Element {
  const selection = useContext(ManualBookMemberSelectionContext)
  return <input type="checkbox" aria-label={`Select ${bbsNumber}`}
    checked={selection?.selected.has(memberKey) ?? false}
    disabled={selection?.disabled ?? true}
    onChange={() => selection?.toggle(memberKey)} />
}
