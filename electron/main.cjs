const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const { randomUUID } = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const { extractTitlesFromFile } = require('./file-import.cjs')

const isDev = !app.isPackaged
const ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx'])
const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024
const UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1000

const attachmentDirectory = () => path.join(app.getPath('userData'), 'attachments')

function attachmentPath(id, extension) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !ATTACHMENT_EXTENSIONS.has(extension)) throw new Error('INVALID_ATTACHMENT')
  return path.join(attachmentDirectory(), `${id}${extension}`)
}

async function storeAttachment(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase()
  if (!ATTACHMENT_EXTENSIONS.has(extension)) throw new Error('UNSUPPORTED_FILE_TYPE')
  const stats = await fs.stat(sourcePath)
  if (!stats.isFile()) throw new Error('NOT_A_FILE')
  if (stats.size > MAX_ATTACHMENT_BYTES) throw new Error('FILE_TOO_LARGE')
  const id = randomUUID()
  await fs.mkdir(attachmentDirectory(), { recursive: true })
  await fs.copyFile(sourcePath, attachmentPath(id, extension))
  return { id, name: path.basename(sourcePath), extension }
}

function sendUpdateStatus(status, detail = {}) {
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('update:status', { status, ...detail }))
}

function initializeUpdater() {
  if (isDev) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'))
  autoUpdater.on('update-available', (info) => sendUpdateStatus('downloading', { version: info.version }))
  autoUpdater.on('update-not-available', () => sendUpdateStatus('current'))
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus('downloading', { percent: Math.round(progress.percent) }))
  autoUpdater.on('error', (error) => {
    console.error('Auto-update failed:', error)
    sendUpdateStatus('error')
  })
  autoUpdater.on('update-downloaded', async (info) => {
    sendUpdateStatus('ready', { version: info.version })
    const french = app.getLocale().toLowerCase().startsWith('fr')
    const result = await dialog.showMessageBox({
      type: 'info',
      title: french ? 'Mise à jour prête' : 'Update ready',
      message: french ? `MusiClass ${info.version} est prêt à être installé.` : `MusiClass ${info.version} is ready to install.`,
      detail: french ? 'L’application va redémarrer pour terminer la mise à jour.' : 'The application will restart to finish the update.',
      buttons: french ? ['Redémarrer maintenant', 'Plus tard'] : ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })
    if (result.response === 0) autoUpdater.quitAndInstall()
  })

  const check = () => autoUpdater.checkForUpdates().catch((error) => console.error('Update check failed:', error))
  setTimeout(check, 8000)
  const timer = setInterval(check, UPDATE_INTERVAL_MS)
  timer.unref()
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: '#07111f',
    title: 'MusiClass',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 14, y: 14 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.on('maximize', () => window.webContents.send('window:maximized', true))
  window.on('unmaximize', () => window.webContents.send('window:maximized', false))

  if (isDev) {
    window.loadURL('http://localhost:5173')
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
ipcMain.on('window:toggle-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) return
  window.isMaximized() ? window.unmaximize() : window.maximize()
})
ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())
ipcMain.handle('scores:import-file', async (_event, filePath) => {
  try { return { ok: true, ...(await extractTitlesFromFile(filePath)) } }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'IMPORT_FAILED' } }
})
ipcMain.handle('attachment:pick', async (event) => {
  const owner = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(owner, {
    properties: ['openFile'],
    filters: [{ name: 'PDF and Word', extensions: ['pdf', 'doc', 'docx'] }],
  })
  if (result.canceled || !result.filePaths[0]) return { ok: true, attachment: null }
  try { return { ok: true, attachment: await storeAttachment(result.filePaths[0]) } }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'ATTACHMENT_FAILED' } }
})
ipcMain.handle('attachment:store-file', async (_event, filePath) => {
  try { return { ok: true, attachment: await storeAttachment(filePath) } }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'ATTACHMENT_FAILED' } }
})
ipcMain.handle('attachment:open', async (_event, attachment) => {
  try {
    const error = await shell.openPath(attachmentPath(attachment.id, attachment.extension))
    return error ? { ok: false, error } : { ok: true }
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'OPEN_FAILED' } }
})
ipcMain.handle('attachment:remove', async (_event, attachment) => {
  try {
    await fs.rm(attachmentPath(attachment.id, attachment.extension), { force: true })
    return { ok: true }
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'REMOVE_FAILED' } }
})
ipcMain.on('update:install', () => autoUpdater.quitAndInstall())

app.whenReady().then(() => {
  createWindow()
  initializeUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
