import { authorizedGet, authorizedRequest } from '../auth/auth'

type Page<T> = { count: number; results: T[] }

async function readAll<T>(path: string): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; ; page += 1) {
    const response = await authorizedGet<Page<T>>(
      `${path}${path.includes('?') ? '&' : '?'}page=${page}&page_size=100`
    )
    rows.push(...response.results)
    if (rows.length >= response.count || response.results.length === 0) return rows
  }
}

export async function getCourseBooks(): Promise<unknown> {
  const courses = await readAll<{ course_key: string; is_active: boolean }>('staff/courses/')
  const course = courses.find((item) => item.is_active)
  if (!course) throw new Error('No active course is configured.')
  const [exams, languages, books, translations] = await Promise.all([
    readAll(`staff/course-exams/?course=${course.course_key}`),
    readAll(`staff/course-languages/?course=${course.course_key}`),
    readAll('staff/books/'),
    readAll('staff/course-exam-translations/')
  ])
  return { exams, languages, books, translations }
}

export function updateCourseBook(code: string, changes: unknown): Promise<unknown> {
  return authorizedRequest(`staff/books/${encodeURIComponent(code)}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  })
}

export function uploadCourseBookCover(
  code: string,
  cover: { bytes: Uint8Array; name: string }
): Promise<unknown> {
  const lower = cover.name.toLowerCase()
  const mimeType = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'
  const form = new FormData()
  form.append('image', new Blob([new Uint8Array(cover.bytes)], { type: mimeType }), cover.name)
  return authorizedRequest(`staff/books/${encodeURIComponent(code)}/cover/`, {
    method: 'POST',
    body: form
  })
}

export function adjustCourseBookStock(code: string, stock: number, note: string): Promise<unknown> {
  return authorizedRequest(`staff/books/${encodeURIComponent(code)}/adjust-stock/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_stock: stock, reason: 'ADMIN_ADJUSTMENT', note })
  })
}

export function saveCourseBookTranslation(
  id: number | null,
  examKey: string,
  languageKey: string,
  title: string,
  description: string,
  cover: { bytes: Uint8Array; name: string } | null
): Promise<unknown> {
  const form = new FormData()
  form.append('exam', examKey)
  form.append('language', languageKey)
  form.append('title', title)
  form.append('description', description)
  if (cover) {
    const lower = cover.name.toLowerCase()
    const mimeType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg'
    form.append(
      'cover_image',
      new Blob([new Uint8Array(cover.bytes)], { type: mimeType }),
      cover.name
    )
  }
  return authorizedRequest(
    id === null ? 'staff/course-exam-translations/' : `staff/course-exam-translations/${id}/`,
    { method: id === null ? 'POST' : 'PATCH', body: form }
  )
}
