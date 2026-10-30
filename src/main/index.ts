import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { login, logout, restoreSession } from './features/auth/auth'
import { getEnrolmentSummary } from './features/dashboard/dashboard'
import { getCourseCountries, createCourseCountry } from './features/country/country'
import { getWholeResults, saveWholeResults } from './features/course/wholeResults'
import {
  getCourseLanguages,
  createCourseLanguage,
  updateLanguageCountries,
  updateLanguageAvailability
} from './features/course/courseLanguages'
import {
  getCourseBooks,
  updateCourseBook,
  uploadCourseBookCover,
  adjustCourseBookStock,
  saveCourseBookEdition
} from './features/course/courseBooks'
import {
  getShipmentPage,
  updateShipmentTracking,
  markCoursePaperReceived
} from './features/shipping/shipping'
import {
  getCandidates,
  getPaymentBalances,
  getPaymentHistory,
  getCandidateFilterOptions,
  getAllCandidates,
  getCandidateCounts,
  getCoordinators,
  getCoordinatorPage,
  getCoordinatorFilterOptions,
  getCoordinatorCount,
  getRegistrationOptions,
  getCurrentCurriculumContent,
  setCurrentCurriculumBook,
  setCourseBookActive,
  createManualRegistration,
  getInitialDispatch,
  getOtherBookOptions,
  candidateAction,
  updateAllocationScore,
  getCandidate,
  getCoordinator,
  createCoordinator,
  updateCoordinator,
  updateCoordinatorStatus,
  updateCoordinatorMemberStatus,
  uploadCoordinatorPhoto,
  getCoordinatorMembers,
  getCoordinatorMemberPage,
  getCoordinatorCandidateOptions,
  updateCoordinatorMembers,
  setCoordinatorMembers,
  updateCandidate,
  setCandidateCoordinator,
  uploadCandidatePhoto
} from './features/course/course'
import {
  getMonthlyPage,
  openMonthlyDispatch,
  shipMonthlyAllocation,
  saveMonthlyTracking
} from './features/course/monthlyDispatch'
import { getCoordinatorWalletMembers, distributeCoordinatorWallet } from './features/course/coordinatorPayments'

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
        signal: AbortSignal.timeout(10000)
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
  ipcMain.handle('course:candidates', (_event, country, page, mode, status, search, filters) =>
    getCandidates(country, page, mode, status, search, filters)
  )
  ipcMain.handle('course:payment-balances', (_event, country, page, search) =>
    getPaymentBalances(country, page, search)
  )
  ipcMain.handle('course:payment-history', (_event, key, page) =>
    getPaymentHistory(key, page)
  )
  ipcMain.handle('course:candidate-filter-options', (_event, country, mode, status, state) =>
    getCandidateFilterOptions(country, mode, status, state)
  )
  ipcMain.handle('course:candidate-counts', (_event, country) => getCandidateCounts(country))
  ipcMain.handle('course:books', (_event, country) => getCourseBooks(country))
  ipcMain.handle('course:book-update', (_event, code, changes) => updateCourseBook(code, changes))
  ipcMain.handle('course:book-cover', (_event, code, cover) => uploadCourseBookCover(code, cover))
  ipcMain.handle('course:book-stock', (_event, code, stock, note) =>
    adjustCourseBookStock(code, stock, note)
  )
  ipcMain.handle('course:book-edition', (_event, id, title, description, cover) =>
    saveCourseBookEdition(id, title, description, cover)
  )
  ipcMain.handle('shipping:list', (_event, country, page, filters) =>
    getShipmentPage(country, page, filters)
  )
  ipcMain.handle('shipping:tracking', (_event, row, trackingNumber) =>
    updateShipmentTracking(row, trackingNumber)
  )
  ipcMain.handle('shipping:open-tracking', (_event, trackingNumber: string) => {
    const number = trackingNumber?.trim()
    if (!number || number.length > 100) throw new Error('A valid tracking ID is required')
    return shell.openExternal(
      `https://trackcourier.io/track-and-trace/professional-courier/${encodeURIComponent(number)}`
    )
  })
  ipcMain.handle('shipping:paper-received', (_event, row) => markCoursePaperReceived(row))
  ipcMain.handle('course:all-candidates', (_event, country, mode, status, pending, filters) =>
    getAllCandidates(country, mode, status, pending, filters)
  )
  ipcMain.handle('course:coordinators', (_event, country, filters) =>
    getCoordinators(country, filters)
  )
  ipcMain.handle('course:coordinator-page', (_event, country, page, filters) =>
    getCoordinatorPage(country, page, filters)
  )
  ipcMain.handle('course:coordinator-filter-options', (_event, country, state) =>
    getCoordinatorFilterOptions(country, state)
  )
  ipcMain.handle('course:coordinator-count', (_event, country) => getCoordinatorCount(country))
  ipcMain.handle('course:registration-options', () => getRegistrationOptions())
  ipcMain.handle('country:list', () => getCourseCountries())
  ipcMain.handle('country:create', (_event, code, name) => createCourseCountry(code, name))
  ipcMain.handle('course:curriculum-content', (_event, examKey) =>
    getCurrentCurriculumContent(examKey)
  )
  ipcMain.handle('course:curriculum-activate', (_event, courseKey, sequence, country) =>
    setCurrentCurriculumBook(courseKey, sequence, country)
  )
  ipcMain.handle('course:curriculum-book-active', (_event, examKey, active) =>
    setCourseBookActive(examKey, active)
  )
  ipcMain.handle('course:languages', (_event, courseKey) => getCourseLanguages(courseKey))
  ipcMain.handle('course:language-create', (_event, courseKey, code, name) =>
    createCourseLanguage(courseKey, code, name)
  )
  ipcMain.handle('course:language-countries', (_event, key, countries) =>
    updateLanguageCountries(key, countries)
  )
  ipcMain.handle('course:language-availability', (_event, key, online, offline) =>
    updateLanguageAvailability(key, online, offline)
  )
  ipcMain.handle(
    'course:whole-results',
    (_event, courseKey, country, page, search, state, district) =>
      getWholeResults(courseKey, country, page, search, state, district)
  )
  ipcMain.handle('course:save-whole-results', (_event, changes) => saveWholeResults(changes))
  ipcMain.handle('course:manual-registration', (_event, courseKey, data) =>
    createManualRegistration(courseKey, data)
  )
  ipcMain.handle('course:initial-dispatch', (_event, key) => getInitialDispatch(key))
  ipcMain.handle('course:other-book-options', (_event, key) => getOtherBookOptions(key))
  ipcMain.handle('course:candidate-action', (_event, action, key, data) =>
    candidateAction(action, key, data)
  )
  ipcMain.handle('course:allocation-score', (_event, key, score) =>
    updateAllocationScore(key, score)
  )
  ipcMain.handle('course:candidate', (_event, key) => getCandidate(key))
  ipcMain.handle('course:coordinator', (_event, key) => getCoordinator(key))
  ipcMain.handle('course:create-coordinator', (_event, data) => createCoordinator(data))
  ipcMain.handle('course:update-coordinator', (_event, key, data) => updateCoordinator(key, data))
  ipcMain.handle('course:update-coordinator-status', (_event, key, status, keys) =>
    updateCoordinatorStatus(key, status, keys)
  )
  ipcMain.handle('course:update-coordinator-member-status', (_event, key, status, keys) =>
    updateCoordinatorMemberStatus(key, status, keys)
  )
  ipcMain.handle('course:upload-coordinator-photo', (_event, key, bytes, name) =>
    uploadCoordinatorPhoto(key, bytes, name)
  )
  ipcMain.handle('course:coordinator-members', (_event, key) => getCoordinatorMembers(key))
  ipcMain.handle('course:coordinator-wallet-members', (_event, key) => getCoordinatorWalletMembers(key))
  ipcMain.handle('course:coordinator-wallet-distribution', (_event, key, data) => distributeCoordinatorWallet(key, data))
  ipcMain.handle('course:coordinator-member-page', (_event, key, page, search, restoreOnly) =>
    getCoordinatorMemberPage(key, page, search, restoreOnly)
  )
  ipcMain.handle('course:coordinator-candidate-options', (_event, key, search, page) =>
    getCoordinatorCandidateOptions(key, search, page)
  )
  ipcMain.handle('course:coordinator-update-members', (_event, key, additions, removals) =>
    updateCoordinatorMembers(key, additions, removals)
  )
  ipcMain.handle('course:set-coordinator-members', (_event, key, keys) =>
    setCoordinatorMembers(key, keys)
  )
  ipcMain.handle('course:update-candidate', (_event, key, data) => updateCandidate(key, data))
  ipcMain.handle('course:set-candidate-coordinator', (_event, key, coordinatorKey) =>
    setCandidateCoordinator(key, coordinatorKey)
  )
  ipcMain.handle('course:upload-photo', (_event, key, bytes, name) =>
    uploadCandidatePhoto(key, bytes, name)
  )
  ipcMain.handle('course:monthly-page', (_event, examKey, country, page, filters) =>
    getMonthlyPage(examKey, country, page, filters)
  )
  ipcMain.handle('course:monthly-open', (_event, examKey, country) =>
    openMonthlyDispatch(examKey, country)
  )
  ipcMain.handle('course:monthly-ship', (_event, allocationKey, addressKey, trackingNumber) =>
    shipMonthlyAllocation(allocationKey, addressKey, trackingNumber)
  )
  ipcMain.handle('course:monthly-tracking', (_event, allocationKey, trackingNumber) =>
    saveMonthlyTracking(allocationKey, trackingNumber)
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
