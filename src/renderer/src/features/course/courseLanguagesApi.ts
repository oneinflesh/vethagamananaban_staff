export type CourseLanguage = {
  language_key: string
  code: string
  name: string
  is_active: boolean
  online_enabled: boolean
  offline_enabled: boolean
  available_countries: string[]
}

export type LanguagePage = { count: number; results: CourseLanguage[] }

export const getCourseLanguages = (courseKey: string): Promise<LanguagePage> =>
  window.office.courseLanguages(courseKey)
export const createCourseLanguage = (
  courseKey: string,
  code: string,
  name: string
): Promise<unknown> => window.office.courseLanguageCreate(courseKey, code, name)
export const updateLanguageCountries = (key: string, countries: string[]): Promise<unknown> =>
  window.office.courseLanguageCountries(key, countries)
export const updateLanguageAvailability = (
  key: string,
  online: boolean,
  offline: boolean
): Promise<unknown> => window.office.courseLanguageAvailability(key, online, offline)
