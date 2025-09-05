const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  newFile: () => ipcRenderer.invoke('file:new'),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (content) => ipcRenderer.invoke('file:save', content),
  saveFileAs: (content) => ipcRenderer.invoke('file:saveAs', content),
  onMenu: (handler) => {
    const channels = ['menu:new', 'menu:open', 'menu:save', 'menu:saveAs'];
    channels.forEach((ch) => {
      ipcRenderer.on(ch, () => handler(ch));
    });
    return () => channels.forEach((ch) => ipcRenderer.removeAllListeners(ch));
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke('win:minimize'),
    maximizeOrRestore: () => ipcRenderer.invoke('win:maximizeOrRestore'),
    close: () => ipcRenderer.invoke('win:close'),
    onState: (handler) => {
      const ch = 'win:state';
      ipcRenderer.on(ch, (_e, state) => handler(state));
      return () => ipcRenderer.removeAllListeners(ch);
    }
  }
});
