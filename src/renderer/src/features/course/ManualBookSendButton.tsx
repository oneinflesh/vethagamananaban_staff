import { useContext } from 'react'
import { Button } from '@/components/ui/button'
import type { Candidate } from './courseApi'
import { ManualBookSendContext } from './manualBookSendContext'

export default function ManualBookSendButton({
  candidate
}: {
  candidate: Candidate
}): React.JSX.Element {
  const state = useContext(ManualBookSendContext)
  const alreadySent =
    !!state?.selectedSequences.size &&
    [...state.selectedSequences].every((sequence) =>
      candidate.unavailable_book_sequences?.includes(sequence)
    )

  return (
    <Button
      disabled={
        !state?.selectedCount ||
        state.selectedSequences.size !== state.selectedCount ||
        !!state.sendingCandidate ||
        alreadySent ||
        state.sentCandidates.has(candidate.enrollment_key)
      }
      onClick={() => state?.onSend(candidate)}
    >
      {state?.sendingCandidate === candidate.enrollment_key
        ? 'Preparing…'
        : alreadySent || state?.sentCandidates.has(candidate.enrollment_key)
          ? 'Sent'
          : 'Send books'}
    </Button>
  )
}
