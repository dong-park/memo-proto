const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let currentFilePath = null; // Single-window app state

function setWindowTitle() {
  if (!mainWindow) return;
  const name = currentFilePath ? path.basename(currentFilePath) : 'Untitled';
  mainWindow.setTitle(`${name} — Plain Text`);
}

function createMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow && mainWindow.webContents.send('menu:new')
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow && mainWindow.webContents.send('menu:open')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow && mainWindow.webContents.send('menu:save')
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow && mainWindow.webContents.send('menu:saveAs')
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin'
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function handleOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text', extensions: ['txt', 'md', 'text', 'log'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePaths?.length) return null;
  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  currentFilePath = filePath;
  setWindowTitle();
  return { content, path: filePath };
}

async function handleSave(content) {
  if (!currentFilePath) {
    return handleSaveAs(content);
  }
  fs.writeFileSync(currentFilePath, content, 'utf8');
  setWindowTitle();
  return { path: currentFilePath };
}

async function handleSaveAs(content) {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: currentFilePath || 'Untitled.txt',
    filters: [
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, content, 'utf8');
  currentFilePath = filePath;
  setWindowTitle();
  return { path: filePath };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false, // Custom window controls; hide native buttons
    resizable: true,
  backgroundColor: '#000000',
  // No forced background; let the renderer decide
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || null;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    // Load built React app in production
    const distIndex = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(distIndex);
  }
  setWindowTitle();
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Forward window state to renderer
  const sendState = () => {
    if (!mainWindow) return;
    mainWindow.webContents.send('win:state', {
      maximized: mainWindow.isMaximized(),
      active: mainWindow.isFocused()
    });
  };
  mainWindow.on('maximize', sendState);
  mainWindow.on('unmaximize', sendState);
  mainWindow.on('focus', sendState);
  mainWindow.on('blur', sendState);
}

// IPC
ipcMain.handle('file:new', async () => {
  currentFilePath = null;
  setWindowTitle();
  return { content: '', path: null };
});

ipcMain.handle('file:open', async () => {
  try {
    return await handleOpen();
  } catch (e) {
    dialog.showErrorBox('Open Failed', String(e?.message || e));
    return null;
  }
});

ipcMain.handle('file:save', async (_evt, content) => {
  try {
    return await handleSave(content);
  } catch (e) {
    dialog.showErrorBox('Save Failed', String(e?.message || e));
    return null;
  }
});

ipcMain.handle('file:saveAs', async (_evt, content) => {
  try {
    return await handleSaveAs(content);
  } catch (e) {
    dialog.showErrorBox('Save As Failed', String(e?.message || e));
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Window control IPC
ipcMain.handle('win:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('win:maximizeOrRestore', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('win:close', () => {
  if (mainWindow) mainWindow.close();
});
// (duplicates removed)
