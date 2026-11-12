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

  return (
    <Button
      disabled={
        !state?.selectedCount ||
        !!state.sendingCandidate ||
        state.sentCandidates.has(candidate.enrollment_key)
      }
      onClick={() => state?.onSend(candidate)}
    >
      {state?.sendingCandidate === candidate.enrollment_key
        ? 'Preparing…'
        : state?.sentCandidates.has(candidate.enrollment_key)
          ? 'Sent'
          : 'Send books'}
    </Button>
  )
}
