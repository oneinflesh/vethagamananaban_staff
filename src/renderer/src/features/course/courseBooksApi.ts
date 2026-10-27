export type CourseBook = {
  vn_code: string
  name: string
  description: string
  category: string
  isbn: string
  price: string
  discount_price: string | null
  course_price_tn: string | null
  course_price_other: string | null
  primary_image: string
  weight_grams: number
  stock: number
  reserved_stock: number
  available_stock: number
  backordered_stock: number
  low_stock_threshold: number
  is_trending: boolean
  is_new_arrival: boolean
  is_active: boolean
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
  code: string
  name: string
  is_active: boolean
  available_countries: string[]
}

export type CourseBookEdition = {
  id: number
  exam: string
  language: string
  country: string
  catalog_book: string | null
  title: string
  description: string
  cover_image: string
}

export type CourseBooksData = {
  books: CourseBook[]
  exams: CourseBookExam[]
  languages: CourseBookLanguage[]
  editions: CourseBookEdition[]
}

export const getCourseBooks = (country: string): Promise<CourseBooksData> =>
  window.office.courseBooks(country)

export const updateCourseBook = (code: string, changes: unknown): Promise<unknown> =>
  window.office.courseBookUpdate(code, changes)

export const uploadCourseBookCover = (
  code: string,
  cover: { bytes: Uint8Array; name: string }
): Promise<unknown> => window.office.courseBookCover(code, cover)

export const adjustCourseBookStock = (
  code: string,
  stock: number,
  note: string
): Promise<unknown> => window.office.courseBookStock(code, stock, note)

export const saveCourseBookEdition = (
  id: number,
  title: string,
  description: string,
  cover: { bytes: Uint8Array; name: string } | null
): Promise<unknown> => window.office.courseBookEdition(id, title, description, cover)
