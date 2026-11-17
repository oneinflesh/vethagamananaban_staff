import { useEffect, useState } from 'react'
import { useNotifications } from '../notifications/Notifications'
import { getStoreShippingRates, saveStoreShippingRate, type StoreShippingRate } from './storeApi'

export default function StoreShippingPage({ country }: { country: string }): React.JSX.Element {
  const notify = useNotifications()
  const [rates, setRates] = useState<StoreShippingRate[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let active = true
    getStoreShippingRates(country).then((result) => {
      if (!active) return
      setRates(result)
      setDrafts(Object.fromEntries(result.map((rate) => [`${rate.state}:${rate.method}`, rate.amount_per_kg])))
    }).catch((error) => { if (active) notify.error(error instanceof Error ? error.message : 'Could not load shipping rates') })
    return () => { active = false }
  }, [country, notify])

  async function save(rate: StoreShippingRate): Promise<void> {
    const key = `${rate.state}:${rate.method}`
    const value = drafts[key]?.trim() ?? ''
    if (value === rate.amount_per_kg || busy === key) return
    if (!value || !Number.isFinite(Number(value)) || Number(value) < 0) {
      notify.error('Enter a valid price per kg')
      return
    }
    setBusy(key)
    try {
      const updated = await saveStoreShippingRate({ ...rate, amount_per_kg: value })
      setRates((current) => current.map((item) => item.state === rate.state && item.method === rate.method ? updated : item))
      setDrafts((current) => ({ ...current, [key]: updated.amount_per_kg }))
      notify.success('Shipping rate saved')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save shipping rate')
    } finally { setBusy('') }
  }

  const visibleRates = rates.filter((rate) => rate.country === country)
  const states = [...new Set(visibleRates.map((rate) => rate.state))]
  return <div className="store-shipping">
    <div className="store-shipping-heading"><h2>{country === 'IN' ? 'India' : country === 'LK' ? 'Sri Lanka' : country} shipping</h2><span>Price per kg · rounded up to the next kg</span></div>
    <div className="store-shipping-grid store-shipping-grid--head"><strong>{country === 'IN' ? 'State' : 'Country'}</strong><strong>Courier · per kg</strong><strong>Post · per kg</strong></div>
    <div className="store-shipping-list">{states.map((state) => <div className="store-shipping-grid" key={state}>
      <strong>{state || 'Sri Lanka'}</strong>
      {(['COURIER', 'POST'] as const).map((method) => {
        const rate = visibleRates.find((item) => item.state === state && item.method === method)
        if (!rate) return <span key={method}>—</span>
        const key = `${state}:${method}`
        return <label key={method} className="store-shipping-input"><span>₹</span><input type="number" min="0" step="0.01" aria-label={`${state || country} ${method} per kg`} value={drafts[key] ?? ''} disabled={busy === key}
          onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
          onBlur={() => void save(rate)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
      })}
    </div>)}</div>
    {!visibleRates.length && <p>No shipping rates are configured for this country.</p>}
  </div>
}
