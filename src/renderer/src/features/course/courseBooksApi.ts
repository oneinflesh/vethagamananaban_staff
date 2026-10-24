export type CourseBook = {
  vn_code: string
  isbn: string
  course_price_tn: string | null
  course_price_other: string | null
  weight_grams: number
  stock: number
  reserved_stock: number
  available_stock: number
}

export type CourseBookExam = {
  exam_key: string
  sequence: number
  title: string
  catalog_book: string
  catalog_book_name: string
}

export type CourseBookLanguage = {
  language_key: string
  name: string
  is_active: boolean
}

export type CourseBookTranslation = {
  id: number
  exam: string
  language: string
  title: string
  description: string
  cover_image: string
}

export type CourseBooksData = {
  books: CourseBook[]
  exams: CourseBookExam[]
  languages: CourseBookLanguage[]
  translations: CourseBookTranslation[]
}

export const getCourseBooks = (): Promise<CourseBooksData> => window.office.courseBooks()

export const updateCourseBook = (code: string, changes: unknown): Promise<unknown> =>
  window.office.courseBookUpdate(code, changes)

export const adjustCourseBookStock = (
  code: string,
  stock: number,
  note: string
): Promise<unknown> => window.office.courseBookStock(code, stock, note)

export const saveCourseBookTranslation = (
  id: number | null,
  exam: string,
  language: string,
  title: string,
  description: string,
  cover: { bytes: Uint8Array; name: string } | null
): Promise<unknown> =>
  window.office.courseBookTranslation(id, exam, language, title, description, cover)
