import { createContext } from 'react'
import type { Candidate } from './courseApi'

type ManualBookSendState = {
  selectedCount: number
  sendingCandidate: string | null
  sentCandidates: Set<string>
  onSend: (candidate: Candidate) => void
}

export const ManualBookSendContext = createContext<ManualBookSendState | null>(null)
