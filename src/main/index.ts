import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { login, logout, restoreSession } from './features/auth/auth'
import { getEnrolmentSummary } from './features/dashboard/dashboard'
import {
  getCandidates,
  getAllCandidates,
  getCandidateCounts,
  getCoordinators,
  getCoordinatorCount,
  getRegistrationOptions,
  createManualRegistration,
  getInitialDispatch,
  candidateAction,
  updateAllocationScore,
  getCandidate,
  getCoordinator,
  updateCoordinator,
  getCoordinatorMembers,
  updateCandidate,
  uploadCandidatePhoto
} from './features/course/course'
import {
  getMonthlySummary,
  getMonthlyAllocations,
  openMonthlyDispatch,
  shipMonthlyAllocation
} from './features/course/monthlyDispatch'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/app.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  if (is.dev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        event.preventDefault()
        mainWindow.webContents.toggleDevTools()
      }
    })
  }

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle('office:ping', async () => {
    try {
      await fetch('https://api.bible2bible.com/api/v1/auth/staff/login/', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      return true
    } catch {
      return false
    }
  })
  ipcMain.handle('office:login', (_event, username: string, password: string, remember: boolean) =>
    login(username, password, remember)
  )
  ipcMain.handle('office:restore-session', () => restoreSession())
  ipcMain.handle('office:logout', () => logout())
  ipcMain.handle(
    'office:enrolment-summary',
    (_event, startDate: string, endDate: string, country: string) =>
      getEnrolmentSummary(startDate, endDate, country)
  )
  ipcMain.handle('course:candidates', (_event, country, page, mode, status, search) =>
    getCandidates(country, page, mode, status, search)
  )
  ipcMain.handle('course:candidate-counts', (_event, country) => getCandidateCounts(country))
  ipcMain.handle('course:all-candidates', (_event, country, mode, status, pending) =>
    getAllCandidates(country, mode, status, pending)
  )
  ipcMain.handle('course:coordinators', (_event, country) => getCoordinators(country))
  ipcMain.handle('course:coordinator-count', (_event, country) => getCoordinatorCount(country))
  ipcMain.handle('course:registration-options', () => getRegistrationOptions())
  ipcMain.handle('course:manual-registration', (_event, courseKey, data) =>
    createManualRegistration(courseKey, data)
  )
  ipcMain.handle('course:initial-dispatch', (_event, key) => getInitialDispatch(key))
  ipcMain.handle('course:candidate-action', (_event, action, key, data) =>
    candidateAction(action, key, data)
  )
  ipcMain.handle('course:allocation-score', (_event, key, score) =>
    updateAllocationScore(key, score)
  )
  ipcMain.handle('course:candidate', (_event, key) => getCandidate(key))
  ipcMain.handle('course:coordinator', (_event, key) => getCoordinator(key))
  ipcMain.handle('course:update-coordinator', (_event, key, data) => updateCoordinator(key, data))
  ipcMain.handle('course:coordinator-members', (_event, key) => getCoordinatorMembers(key))
  ipcMain.handle('course:update-candidate', (_event, key, data) => updateCandidate(key, data))
  ipcMain.handle('course:upload-photo', (_event, key, bytes, name) =>
    uploadCandidatePhoto(key, bytes, name)
  )
  ipcMain.handle('course:monthly-summary', (_event, examKey, country) =>
    getMonthlySummary(examKey, country)
  )
  ipcMain.handle('course:monthly-allocations', (_event, examKey, country) =>
    getMonthlyAllocations(examKey, country)
  )
  ipcMain.handle('course:monthly-open', (_event, examKey, country) =>
    openMonthlyDispatch(examKey, country)
  )
  ipcMain.handle('course:monthly-ship', (_event, allocationKey, addressKey, trackingNumber) =>
    shipMonthlyAllocation(allocationKey, addressKey, trackingNumber)
  )
  // Set app user model id for windows
  app.setAppUserModelId('com.vethagamananban.office')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils

  // IPC test
  ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
  ipcMain.on('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) window.unmaximize()
    else window?.maximize()
  })
  ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
