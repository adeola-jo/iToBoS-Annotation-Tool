const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Enable these to allow communication
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    // Load the Vite development server URL
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();

    // Log when the window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded successfully');
    });
}

app.whenReady().then(() => {
    createWindow();
    
    // Log that app is ready
    console.log('Electron app is ready');
});


ipcMain.handle('ensureDir', async (event, dirPath) => {
  try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
  } catch (error) {
      console.error('Error ensuring directory exists:', error);
      throw error;
  }
});

// Modify the existing directory selection handler
ipcMain.handle('select-directory', async () => {
  try {
      const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          title: 'Select Dataset Directory'
      });
      
      if (!result.canceled) {
          // Create cleaned_labels directory if it doesn't exist
          const cleanedLabelsPath = path.join(result.filePaths[0], 'cleaned_labels');
          await fs.mkdir(cleanedLabelsPath, { recursive: true });
      }
      
      return result;
  } catch (error) {
      console.error('Error in select-directory:', error);
      throw error;
  }
});

// Directory selection handler
// ipcMain.handle('select-directory', async () => {
//     console.log('Select directory handler called');
//     try {
//         const result = await dialog.showOpenDialog(mainWindow, {
//             properties: ['openDirectory'],
//             title: 'Select Dataset Directory'
//         });
//         console.log('Directory selected:', result);
//         return result;
//     } catch (error) {
//         console.error('Error in select-directory:', error);
//         throw error;
//     }
// });


ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
      const files = await fs.readdir(dirPath);
      return files.filter(file => 
          /\.(jpg|jpeg|png)$/i.test(file)
      );
  } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
  }
});

// Handle file reading
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        console.log('Reading file:', filePath);
        const content = await fs.readFile(filePath);
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
});

// Handle text file reading
ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
        console.log('Reading text file:', filePath);
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error('Error reading text file:', error);
        throw error;
    }
});

// Handle file writing
ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        console.log('Writing file:', filePath);
        await fs.writeFile(filePath, content);
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        throw error;
    }
});