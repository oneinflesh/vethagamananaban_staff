import { authorizedGet, authorizedRequest } from '../auth/auth'

type Page<T> = { count: number; results: T[] }
type Address = { city?: string; state?: string }
type ParcelCoordinator = {
  coordinator_key: string
  number: number
  name: string
  phone: string
  district: string
  state: string
}
type CourseAllocation = {
  allocation_key: string
  enrollment_key: string
  bbs_number: string
  student_name: string
  student_phone: string
  student_district: string
  student_state: string
  book_name: string
  exam_title: string
  status: string
  tracking_number: string
  dispatched_at: string | null
  delivery_address: Address | null
  parcel_coordinator: ParcelCoordinator | null
}
type IdCardCandidate = {
  enrollment_key: string
  bbs_identifier: string
  full_name: string
  phone: string
  district: string
  state: string
  postal_delivery: Address | null
  id_card_dispatched_at: string | null
  id_card_tracking_number: string
  parcel_coordinator: ParcelCoordinator | null
}
type StoreOrder = {
  order_key: string
  order_number: string
  recipient_name: string
  phone: string
  city: string
  state: string
  book_names: string
  book_titles: string[]
  book_items?: { name: string; quantity: number }[]
  status: string
  tracking_number: string
  shipped_at: string | null
}

export type ShipmentRow = {
  key: string
  source: 'course' | 'store'
  reference: string
  recipient: string
  phone: string
  district: string
  state: string
  book_names: string
  books: string[]
  items: { name: string; quantity: number }[]
  status: string
  tracking_number: string
  shipped_at: string | null
  enrollment_key: string | null
  allocation_keys: string[]
  receivable_keys: string[]
  includes_id_card: boolean
  can_mark_received: boolean
  order_key: string | null
  members: {
    enrollment_key: string
    bbs_number: string
    name: string
    allocation_keys: string[]
    receivable_keys: string[]
    includes_id_card: boolean
  }[]
}

function addMember(
  parcel: ShipmentRow,
  candidate: { enrollment_key: string; bbs_number: string; name: string }
): ShipmentRow['members'][number] {
  let member = parcel.members.find((item) => item.enrollment_key === candidate.enrollment_key)
  if (!member) {
    member = { ...candidate, allocation_keys: [], receivable_keys: [], includes_id_card: false }
    parcel.members.push(member)
  }
  return member
}

async function readAll<T>(path: string): Promise<T[]> {
  const rows: T[] = []
  let page = 1
  while (true) {
    const separator = path.includes('?') ? '&' : '?'
    const response = await authorizedGet<Page<T>>(`${path}${separator}page=${page}&page_size=100`)
    rows.push(...response.results)
    if (rows.length >= response.count || response.results.length === 0) return rows
    page += 1
  }
}

export async function getShipments(country: string): Promise<ShipmentRow[]> {
  const params = new URLSearchParams({ country })
  const [allocations, idCards, storeOrders] = await Promise.all([
    readAll<CourseAllocation>(`staff/course-allocations/?${params}&shipped=true`),
    readAll<IdCardCandidate>(
      `staff/course-enrollments/?${params}&mode=OFFLINE&id_card_dispatched=true`
    ),
    readAll<StoreOrder>(`staff/orders/?${params}&status=SHIPPED`)
  ])
  const course = new Map<string, ShipmentRow>()
  for (const allocation of allocations) {
    if (!allocation.dispatched_at) continue
    const tracking = allocation.tracking_number?.trim() ?? ''
    const date = allocation.dispatched_at.slice(0, 10)
    const coordinator = allocation.parcel_coordinator
    const key = tracking
      ? coordinator
        ? `course:coordinator:${coordinator.coordinator_key}:${tracking}`
        : `course:${allocation.enrollment_key}:${date}:${tracking}`
      : `course:book:${allocation.allocation_key}`
    let parcel = course.get(key)
    if (!parcel) {
      parcel = {
        key,
        source: 'course',
        reference: coordinator ? `C-${coordinator.number}` : allocation.bbs_number,
        recipient: coordinator?.name || allocation.student_name,
        phone: coordinator?.phone || allocation.student_phone,
        district: coordinator?.district || allocation.delivery_address?.city || allocation.student_district,
        state: coordinator?.state || allocation.delivery_address?.state || allocation.student_state,
        book_names: '',
        books: [],
        items: [],
        status: allocation.status,
        tracking_number: tracking,
        shipped_at: allocation.dispatched_at,
        enrollment_key: allocation.enrollment_key,
        allocation_keys: [],
        receivable_keys: [],
        includes_id_card: false,
        can_mark_received: false,
        order_key: null,
        members: []
      }
      course.set(key, parcel)
    }
    if (parcel.shipped_at && allocation.dispatched_at < parcel.shipped_at)
      parcel.shipped_at = allocation.dispatched_at
    parcel.book_names = [parcel.book_names, allocation.book_name || allocation.exam_title]
      .filter(Boolean)
      .join(', ')
    parcel.books.push(allocation.book_name || allocation.exam_title)
    parcel.items.push({ name: `${allocation.bbs_number} ${allocation.student_name} — ${allocation.book_name || allocation.exam_title}`, quantity: 1 })
    parcel.allocation_keys.push(allocation.allocation_key)
    const member = addMember(parcel, {
      enrollment_key: allocation.enrollment_key,
      bbs_number: allocation.bbs_number,
      name: allocation.student_name
    })
    member.allocation_keys.push(allocation.allocation_key)
    if (allocation.status === 'SHIPPED') {
      parcel.can_mark_received = true
      parcel.receivable_keys.push(allocation.allocation_key)
      member.receivable_keys.push(allocation.allocation_key)
    }
    if (parcel.status !== allocation.status) parcel.status = 'MULTIPLE'
  }
  for (const candidate of idCards) {
    if (!candidate.id_card_dispatched_at) continue
    const tracking = candidate.id_card_tracking_number?.trim() ?? ''
    const date = candidate.id_card_dispatched_at.slice(0, 10)
    const coordinator = candidate.parcel_coordinator
    const groupKey = coordinator
      ? `course:coordinator:${coordinator.coordinator_key}:${tracking}`
      : `course:${candidate.enrollment_key}:${date}:${tracking}`
    let parcel = tracking ? course.get(groupKey) : undefined
    if (!parcel && tracking) {
      parcel = [...course.values()].find(
        (item) =>
          item.enrollment_key === candidate.enrollment_key &&
          item.tracking_number === tracking &&
          item.shipped_at &&
          Math.abs(
            new Date(item.shipped_at).getTime() -
              new Date(candidate.id_card_dispatched_at!).getTime()
          ) <
            24 * 60 * 60 * 1000
      )
    }
    if (!parcel) {
      const key = tracking ? groupKey : `course:id-card:${candidate.enrollment_key}`
      parcel = {
        key,
        source: 'course',
        reference: coordinator ? `C-${coordinator.number}` : candidate.bbs_identifier,
        recipient: coordinator?.name || candidate.full_name,
        phone: coordinator?.phone || candidate.phone,
        district: coordinator?.district || candidate.postal_delivery?.city || candidate.district,
        state: coordinator?.state || candidate.postal_delivery?.state || candidate.state,
        book_names: '',
        books: [],
        items: [],
        status: 'SHIPPED',
        tracking_number: tracking,
        shipped_at: candidate.id_card_dispatched_at,
        enrollment_key: candidate.enrollment_key,
        allocation_keys: [],
        receivable_keys: [],
        includes_id_card: false,
        can_mark_received: false,
        order_key: null,
        members: []
      }
      course.set(key, parcel)
    }
    if (parcel.shipped_at && candidate.id_card_dispatched_at < parcel.shipped_at)
      parcel.shipped_at = candidate.id_card_dispatched_at
    parcel.book_names = ['ID card', parcel.book_names].filter(Boolean).join(', ')
    parcel.books.unshift('ID card')
    parcel.items.push({ name: `${candidate.bbs_identifier} ${candidate.full_name} — ID card`, quantity: 1 })
    parcel.includes_id_card = true
    addMember(parcel, {
      enrollment_key: candidate.enrollment_key,
      bbs_number: candidate.bbs_identifier,
      name: candidate.full_name
    }).includes_id_card = true
  }
  const store: ShipmentRow[] = storeOrders.map((order) => ({
    key: `store:${order.order_key}`,
    source: 'store',
    reference: order.order_number,
    recipient: order.recipient_name,
    phone: order.phone,
    district: order.city,
    state: order.state,
    book_names: order.book_names,
    books: order.book_titles,
    items: order.book_items ?? order.book_titles.map((name) => ({ name, quantity: 1 })),
    status: order.status,
    tracking_number: order.tracking_number,
    shipped_at: order.shipped_at,
    enrollment_key: null,
    allocation_keys: [],
    receivable_keys: [],
    includes_id_card: false,
    can_mark_received: false,
    order_key: order.order_key,
    members: []
  }))
  return [...course.values(), ...store].sort((left, right) =>
    (right.shipped_at ?? '').localeCompare(left.shipped_at ?? '')
  )
}

export async function updateShipmentTracking(row: ShipmentRow, trackingNumber: string): Promise<void> {
  if (row.source === 'store') {
    await authorizedRequest(`staff/orders/${encodeURIComponent(row.order_key!)}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: trackingNumber })
    })
    return
  }
  for (const member of row.members) {
    await authorizedRequest(
      `staff/course-enrollments/${encodeURIComponent(member.enrollment_key)}/parcel-tracking/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracking_number: trackingNumber,
        allocation_keys: member.allocation_keys,
        include_id_card: member.includes_id_card
      })
    })
  }
}

export async function markCoursePaperReceived(row: ShipmentRow): Promise<void> {
  if (row.source !== 'course' || !row.can_mark_received) {
    throw new Error('This parcel has no shipped course book to update.')
  }
  for (const member of row.members.filter((item) => item.receivable_keys.length)) {
    await authorizedRequest(
      `staff/course-enrollments/${encodeURIComponent(member.enrollment_key)}/parcel-paper-received/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allocation_keys: member.receivable_keys })
    })
  }
}
