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
  enrolmentSummary: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('office:enrolment-summary', startDate, endDate)
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
