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
  const canUnsend = !!candidate.parcelled_manual_book_count || !!state?.sentCandidates.has(candidate.enrollment_key)

  return (
    <Button
      disabled={
        !!state?.sendingCandidate || (!canUnsend && (
          !state?.selectedCount ||
          state.selectedSequences.size !== state.selectedCount ||
          alreadySent ||
          state.sentCandidates.has(candidate.enrollment_key)
        ))
      }
      className={canUnsend ? 'course-manual-unsend-button' : undefined}
      onClick={() => canUnsend ? state?.onUnsend(candidate) : state?.onSend(candidate)}
    >
      {state?.sendingCandidate === candidate.enrollment_key
        ? 'Preparing…'
        : canUnsend ? 'Unsend books'
        : alreadySent || state?.sentCandidates.has(candidate.enrollment_key)
          ? 'Sent'
          : 'Send books'}
    </Button>
  )
}
