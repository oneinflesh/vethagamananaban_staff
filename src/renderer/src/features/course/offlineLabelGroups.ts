import type { Candidate, CoordinatorLink } from './courseApi'

function compareBbs(left: Candidate, right: Candidate): number {
  const leftNumber = Number(left.bbs_identifier?.match(/\d+$/)?.[0])
  const rightNumber = Number(right.bbs_identifier?.match(/\d+$/)?.[0])
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    if (leftNumber !== rightNumber) return leftNumber - rightNumber
  }
  return left.full_name.localeCompare(right.full_name)
}

export function splitOfflineLabels(candidates: Candidate[]): {
  individual: Candidate[]
  underCoordinator: Candidate[]
} {
  const groups = new Map<string, { coordinator: CoordinatorLink; members: Candidate[] }>()
  const candidatesByBbs = new Map(
    candidates
      .filter((candidate) => !candidate.coordinator)
      .map((candidate) => [candidate.bbs_identifier?.toUpperCase(), candidate])
  )

  candidates.forEach((candidate) => {
    const coordinator = candidate.coordinator
    if (!coordinator) return
    let group = groups.get(coordinator.coordinator_key)
    if (!group) {
      group = { coordinator, members: [] }
      groups.set(coordinator.coordinator_key, group)
    }
    group.members.push(candidate)
  })

  const coordinatorCandidates = new Set<string>()
  const underCoordinator = [...groups.values()]
    .sort((left, right) => left.coordinator.number - right.coordinator.number)
    .flatMap(({ coordinator, members }) => {
      const ownCandidate = coordinator.bbs_number
        ? candidatesByBbs.get(coordinator.bbs_number.toUpperCase())
        : undefined
      if (ownCandidate) coordinatorCandidates.add(ownCandidate.enrollment_key)
      return [...(ownCandidate ? [ownCandidate] : []), ...members.sort(compareBbs)]
    })

  return {
    individual: candidates
      .filter(
        (candidate) =>
          !candidate.coordinator && !coordinatorCandidates.has(candidate.enrollment_key)
      )
      .sort(compareBbs),
    underCoordinator
  }
}
