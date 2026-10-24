import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  ping: (): Promise<boolean> => ipcRenderer.invoke('office:ping'),
  login: (username: string, password: string, remember: boolean) =>
    ipcRenderer.invoke('office:login', username, password, remember),
  restoreSession: () => ipcRenderer.invoke('office:restore-session'),
  logout: () => ipcRenderer.invoke('office:logout'),
  enrolmentSummary: (startDate: string, endDate: string, country: string) =>
    ipcRenderer.invoke('office:enrolment-summary', startDate, endDate, country),
  courseCandidates: (country: string, page: number, mode: string, status: string, search: string) =>
    ipcRenderer.invoke('course:candidates', country, page, mode, status, search),
  courseCandidateCounts: (country: string) =>
    ipcRenderer.invoke('course:candidate-counts', country),
  courseBooks: () => ipcRenderer.invoke('course:books'),
  courseBookUpdate: (code: string, changes: unknown) =>
    ipcRenderer.invoke('course:book-update', code, changes),
  courseBookStock: (code: string, stock: number, note: string) =>
    ipcRenderer.invoke('course:book-stock', code, stock, note),
  courseBookTranslation: (
    id: number | null,
    exam: string,
    language: string,
    title: string,
    description: string,
    cover: { bytes: Uint8Array; name: string } | null
  ) => ipcRenderer.invoke('course:book-translation', id, exam, language, title, description, cover),
  shippingList: (country: string) => ipcRenderer.invoke('shipping:list', country),
  shippingTracking: (row: unknown, trackingNumber: string) =>
    ipcRenderer.invoke('shipping:tracking', row, trackingNumber),
  shippingOpenTracking: (trackingNumber: string) =>
    ipcRenderer.invoke('shipping:open-tracking', trackingNumber),
  shippingPaperReceived: (row: unknown) => ipcRenderer.invoke('shipping:paper-received', row),
  courseAllCandidates: (country: string, mode: string, status: string, pending: boolean) =>
    ipcRenderer.invoke('course:all-candidates', country, mode, status, pending),
  courseCoordinators: (country: string) => ipcRenderer.invoke('course:coordinators', country),
  courseCoordinatorCount: (country: string) =>
    ipcRenderer.invoke('course:coordinator-count', country),
  courseRegistrationOptions: () => ipcRenderer.invoke('course:registration-options'),
  courseManualRegistration: (courseKey: string, data: unknown) =>
    ipcRenderer.invoke('course:manual-registration', courseKey, data),
  courseInitialDispatch: (key: string) => ipcRenderer.invoke('course:initial-dispatch', key),
  courseOtherBookOptions: (key: string) => ipcRenderer.invoke('course:other-book-options', key),
  courseCandidateAction: (action: string, key: string, data: unknown) =>
    ipcRenderer.invoke('course:candidate-action', action, key, data),
  courseAllocationScore: (key: string, score: number | null) =>
    ipcRenderer.invoke('course:allocation-score', key, score),
  courseCandidate: (key: string) => ipcRenderer.invoke('course:candidate', key),
  courseCoordinator: (key: string) => ipcRenderer.invoke('course:coordinator', key),
  courseCreateCoordinator: (data: unknown) => ipcRenderer.invoke('course:create-coordinator', data),
  courseUpdateCoordinator: (key: string, data: unknown) =>
    ipcRenderer.invoke('course:update-coordinator', key, data),
  courseUploadCoordinatorPhoto: (key: string, bytes: Uint8Array, name: string) =>
    ipcRenderer.invoke('course:upload-coordinator-photo', key, bytes, name),
  courseCoordinatorMembers: (key: string) => ipcRenderer.invoke('course:coordinator-members', key),
  courseSetCoordinatorMembers: (key: string, keys: string[]) =>
    ipcRenderer.invoke('course:set-coordinator-members', key, keys),
  courseUpdateCandidate: (key: string, data: unknown) =>
    ipcRenderer.invoke('course:update-candidate', key, data),
  courseUploadPhoto: (key: string, bytes: Uint8Array, name: string) =>
    ipcRenderer.invoke('course:upload-photo', key, bytes, name),
  courseMonthlySummary: (examKey: string, country: string) =>
    ipcRenderer.invoke('course:monthly-summary', examKey, country),
  courseMonthlyAllocations: (examKey: string, country: string) =>
    ipcRenderer.invoke('course:monthly-allocations', examKey, country),
  courseMonthlyOpen: (examKey: string, country: string) =>
    ipcRenderer.invoke('course:monthly-open', examKey, country),
  courseMonthlyShip: (allocationKey: string, addressKey: string, trackingNumber: string) =>
    ipcRenderer.invoke('course:monthly-ship', allocationKey, addressKey, trackingNumber),
  courseMonthlyTracking: (allocationKey: string, trackingNumber: string) =>
    ipcRenderer.invoke('course:monthly-tracking', allocationKey, trackingNumber)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('office', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  // @ts-ignore (define in dts)
  window.office = api
}
