const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  // Previously this also called `mainWindow.loadFile(...)` right after —
  // `mainWindow` was never defined (the variable above is `win`), so this
  // threw a ReferenceError the moment the window opened, and the two calls
  // were contradictory anyway (a remote URL and a local file can't both be
  // the window's content). Loads the deployed web app, matching what's
  // actually hosted at swordnex-softwares.web.app today.
  win.loadURL('https://swordnex-softwares.web.app');
}

app.whenReady().then(createWindow);