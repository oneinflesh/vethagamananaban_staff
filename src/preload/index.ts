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
  courseCandidate: (key: string) => ipcRenderer.invoke('course:candidate', key),
  courseCoordinator: (key: string) => ipcRenderer.invoke('course:coordinator', key),
  courseCoordinatorMembers: (key: string) => ipcRenderer.invoke('course:coordinator-members', key),
  courseUpdateCandidate: (key: string, data: unknown) =>
    ipcRenderer.invoke('course:update-candidate', key, data),
  courseUploadPhoto: (key: string, bytes: Uint8Array, name: string) =>
    ipcRenderer.invoke('course:upload-photo', key, bytes, name)
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
