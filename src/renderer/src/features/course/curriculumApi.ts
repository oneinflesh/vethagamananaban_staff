export type CurriculumContent = {
  content_key: string
  language_name: string
  language_code: string
  title: string
  description: string
  question_count: number
  is_ready: boolean
}

export type CurriculumContentPage = { count: number; results: CurriculumContent[] }

export const getCurrentCurriculumContent = (examKey: string): Promise<CurriculumContentPage> =>
  window.office.courseCurriculumContent(examKey)
export const setCurrentCurriculumBook = (courseKey: string, sequence: number): Promise<unknown> =>
  window.office.courseCurriculumActivate(courseKey, sequence)
export const setCourseBookActive = (examKey: string, active: boolean): Promise<unknown> =>
  window.office.courseCurriculumBookActive(examKey, active)
