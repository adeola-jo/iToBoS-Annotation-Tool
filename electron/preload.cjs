const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('electron', {
    exitApp: () => ipcRenderer.send('exitApp'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    readTextFile: (path) => ipcRenderer.invoke('read-text-file', path),
    writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
    ensureDir: (path) => ipcRenderer.invoke('ensureDir', path),
    deleteCleanedLabels: (path) => ipcRenderer.invoke('delete-cleaned-labels', path),
    path: {
        join: (...args) => path.join(...args),
        sep: path.sep,
        dirname: (p) => path.dirname(p)
    }
});