/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

export const countries = [
  ['IN', 'India'],
  ['LK', 'Sri Lanka'],
  ['MY', 'Malaysia'],
  ['SG', 'Singapore'],
  ['AE', 'United Arab Emirates'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['AU', 'Australia']
] as const

type CountryContextValue = { country: string; setCountry: (country: string) => void }
const CountryContext = createContext<CountryContextValue | null>(null)
const storageKey = 'office:selected-country'

export function CountryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [country, setSelectedCountry] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return countries.some(([code]) => code === saved) ? saved! : 'IN'
  })
  function setCountry(code: string): void {
    if (!countries.some(([value]) => value === code)) return
    localStorage.setItem(storageKey, code)
    setSelectedCountry(code)
  }
  return (
    <CountryContext.Provider value={{ country, setCountry }}>{children}</CountryContext.Provider>
  )
}

export function useCountry(): CountryContextValue {
  const context = useContext(CountryContext)
  if (!context) throw new Error('CountryProvider is missing')
  return context
}
