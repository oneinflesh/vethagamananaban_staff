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
  const canUnsend = !!state?.selectedSequences.size && [...state.selectedSequences].some((sequence) =>
    candidate.parcelled_book_sequences?.includes(sequence)
  )

  return (
    <Button
      disabled={
        !!state?.sendingCandidate || (!canUnsend && (
          !state?.selectedCount ||
          state.selectedSequences.size !== state.selectedCount ||
          alreadySent
        ))
      }
      className={canUnsend ? 'course-manual-unsend-button' : undefined}
      onClick={() => canUnsend ? state?.onUnsend(candidate) : state?.onSend(candidate)}
    >
      {state?.sendingCandidate === candidate.enrollment_key
        ? 'Preparing…'
        : canUnsend ? 'Unsend books'
        : alreadySent
          ? 'Sent'
          : 'Send books'}
    </Button>
  )
}
