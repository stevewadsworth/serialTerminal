const { app, BrowserWindow , Menu, dialog } = require('electron');
const path = require('path');

// Live Reload
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
  awaitWriteFinish: true
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  let options = {
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  };

  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    let pos = focusedWindow.getPosition();
    options.x = pos[0] + 20;
    options.y = pos[1] + 20;
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow(options);

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Set up the Dock menu
  const dockMenu = Menu.buildFromTemplate([
    {
      label: 'New Window',
      click() { createWindow(); }
    }
  ])
  app.dock.setMenu(dockMenu)

  const isMac = process.platform === 'darwin'

  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        ...(isMac ? [
          {
            label: 'New Window',
            accelerator: 'Cmd+N',
            click() { createWindow(); }
          },
          { type: 'separator' },
          { role: 'close' }
        ] : [
          { role: 'quit' }
        ])
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'selectAll' },
          { type: 'separator' },
        ] : [
            { type: 'separator' },
            { role: 'selectAll' }
          ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'Toggle Local Echo',
          click() { console.log(BrowserWindow.getFocusedWindow()); dialog.showMessageBoxSync({type: "error", message:'Not yet implemented!'}); }
        },
        { type: 'separator' },
        {
          label: 'Disconect',
          click() { console.log(BrowserWindow.getFocusedWindow()); dialog.showMessageBoxSync({ type: "error", message: 'Not yet implemented!' }); }
        }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
            { role: 'close' }
          ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/stevewadsworth/serialTerminal')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)


  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
