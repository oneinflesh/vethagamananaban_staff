import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import SwipeToast from './SwipeToast'

type Notice = { id: number; message: string; type: 'success' | 'error' }
type Notify = { success: (message: string) => void; error: (message: string) => void }

const NotificationContext = createContext<Notify | null>(null)
let nextId = 0

export function NotificationProvider({
  children
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const [notices, setNotices] = useState<Notice[]>([])
  const add = useCallback((type: Notice['type'], message: string) => {
    setNotices((current) => [...current, { id: ++nextId, type, message }])
  }, [])
  const notify = useMemo(
    () => ({
      success: (message: string) => add('success', message),
      error: (message: string) => add('error', message)
    }),
    [add]
  )

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div className="notification-stack" aria-label="Notifications">
        {notices.map((notice) => (
          <SwipeToast
            key={notice.id}
            inline
            closeButton
            title={notice.type === 'success' ? 'Success' : 'Error'}
            description={notice.message}
            background={notice.type === 'success' ? '#18181b' : '#7f1d1d'}
            fuseColor={notice.type === 'success' ? '#22c55e' : '#f87171'}
            onClose={() => setNotices((current) => current.filter((item) => item.id !== notice.id))}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): Notify {
  const notify = useContext(NotificationContext)
  if (!notify) throw new Error('NotificationProvider is missing')
  return notify
}
