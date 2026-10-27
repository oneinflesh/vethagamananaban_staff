export type CourseCountry = { code: string; name: string }

export const getCourseCountries = (): Promise<CourseCountry[]> => window.office.courseCountries()
export const createCourseCountry = (code: string, name: string): Promise<CourseCountry> =>
  window.office.courseCountryCreate(code, name)
