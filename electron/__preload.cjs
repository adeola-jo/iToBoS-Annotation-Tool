// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electron', {
//   selectDirectory: () => ipcRenderer.invoke('select-directory'),
//   readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
//   readFile: (path) => ipcRenderer.invoke('read-file', path),
//   readTextFile: (path) => ipcRenderer.invoke('read-text-file', path),
//   writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
// });



const { contextBridge, ipcRenderer } = require('electron');

// Log when preload script runs
console.log('Preload script is running');

contextBridge.exposeInMainWorld('electron', {
  ensureDir: (path) => ipcRenderer.invoke('ensureDir', path),
  
    selectDirectory: async () => {
        console.log('Calling selectDirectory from preload');
        try {
            const result = await ipcRenderer.invoke('select-directory');
            console.log('Select directory result:', result);
            return result;
        } catch (error) {
            console.error('Error in selectDirectory:', error);
            throw error;
        }
    },
    readDirectory: async (path) => {
        console.log('Calling readDirectory from preload:', path);
        try {
            const result = await ipcRenderer.invoke('read-directory', path);
            console.log('Read directory result:', result);
            return result;
        } catch (error) {
            console.error('Error in readDirectory:', error);
            throw error;
        }
    },
    readFile: async (path) => {
        console.log('Calling readFile from preload:', path);
        try {
            const result = await ipcRenderer.invoke('read-file', path);
            console.log('Read file result length:', result?.length);
            return result;
        } catch (error) {
            console.error('Error in readFile:', error);
            throw error;
        }
    },
    readTextFile: async (path) => {
        console.log('Calling readTextFile from preload:', path);
        try {
            const result = await ipcRenderer.invoke('read-text-file', path);
            console.log('Read text file result:', result);
            return result;
        } catch (error) {
            console.error('Error in readTextFile:', error);
            throw error;
        }
    },
    writeFile: async (path, content) => {
        console.log('Calling writeFile from preload:', path);
        try {
            const result = await ipcRenderer.invoke('write-file', path, content);
            console.log('Write file result:', result);
            return result;
        } catch (error) {
            console.error('Error in writeFile:', error);
            throw error;
        }
    }
});