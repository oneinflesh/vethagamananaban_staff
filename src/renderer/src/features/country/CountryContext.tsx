/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { createCourseCountry, getCourseCountries, type CourseCountry } from './countryApi'

const initialCountries: CourseCountry[] = [
  { code: 'IN', name: 'India' },
  { code: 'LK', name: 'Sri Lanka' }
]

type CountryContextValue = {
  country: string
  countries: CourseCountry[]
  setCountry: (country: string) => void
  addCountry: (code: string, name: string) => Promise<void>
}
const CountryContext = createContext<CountryContextValue | null>(null)
const storageKey = 'office:selected-country'

export function CountryProvider({
  children,
  enabled
}: {
  children: React.ReactNode
  enabled: boolean
}): React.JSX.Element {
  const [country, setSelectedCountry] = useState(() => localStorage.getItem(storageKey) || 'IN')
  const [countries, setCountries] = useState(initialCountries)

  useEffect(() => {
    if (!enabled) return
    let active = true
    getCourseCountries()
      .then((result) => {
        if (!active) return
        setCountries(result)
        const saved = localStorage.getItem(storageKey)
        if (!result.some((item) => item.code === saved)) {
          localStorage.setItem(storageKey, 'IN')
          setSelectedCountry('IN')
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [enabled])

  function setCountry(code: string): void {
    if (!countries.some((item) => item.code === code)) return
    localStorage.setItem(storageKey, code)
    setSelectedCountry(code)
  }

  async function addCountry(code: string, name: string): Promise<void> {
    const created = await createCourseCountry(code.trim().toUpperCase(), name.trim())
    setCountries((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
  }

  return (
    <CountryContext.Provider value={{ country, countries, setCountry, addCountry }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry(): CountryContextValue {
  const context = useContext(CountryContext)
  if (!context) throw new Error('CountryProvider is missing')
  return context
}
