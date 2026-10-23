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
  courseAllCandidates: (country: string, mode: string, status: string, pending: boolean) =>
    ipcRenderer.invoke('course:all-candidates', country, mode, status, pending),
  courseCoordinators: (country: string) => ipcRenderer.invoke('course:coordinators', country),
  courseCoordinatorCount: (country: string) =>
    ipcRenderer.invoke('course:coordinator-count', country),
  courseRegistrationOptions: () => ipcRenderer.invoke('course:registration-options'),
  courseManualRegistration: (courseKey: string, data: unknown) =>
    ipcRenderer.invoke('course:manual-registration', courseKey, data),
  courseInitialDispatch: (key: string) => ipcRenderer.invoke('course:initial-dispatch', key),
  courseCandidateAction: (action: string, key: string, data: unknown) =>
    ipcRenderer.invoke('course:candidate-action', action, key, data),
  courseAllocationScore: (key: string, score: number | null) =>
    ipcRenderer.invoke('course:allocation-score', key, score),
  courseCandidate: (key: string) => ipcRenderer.invoke('course:candidate', key),
  courseCoordinator: (key: string) => ipcRenderer.invoke('course:coordinator', key),
  courseUpdateCoordinator: (key: string, data: unknown) =>
    ipcRenderer.invoke('course:update-coordinator', key, data),
  courseCoordinatorMembers: (key: string) => ipcRenderer.invoke('course:coordinator-members', key),
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
    ipcRenderer.invoke('course:monthly-ship', allocationKey, addressKey, trackingNumber)
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
