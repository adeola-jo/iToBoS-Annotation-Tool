const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    // IMPORTANT: Always load from localhost in development
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('exitApp', () => {
    console.log('Exit app request received'); // Debug log
    app.quit(); // This will close the application
    if (mainWindow) {
        mainWindow.close(); // Close the window
    }
});

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

ipcMain.handle('read-directory', async (event, dirPath) => {
    try {
        console.log('Reading directory:', dirPath);
        const files = await fs.readdir(dirPath);
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png)$/i.test(file)
        );
        console.log('Found files:', imageFiles);
        return imageFiles;
    } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath);
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
});

// ipcMain.handle('read-text-file', async (event, filePath) => {
//     try {
//         const content = await fs.readFile(filePath, 'utf8');
//         return content;
//     } catch (error) {
//         console.error('Error reading text file:', error);
//         throw error;
//     }
// });

ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
        // Check if the file exists
        await fs.access(filePath); // This will throw if the file does not exist
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist, return null or an empty string
            console.warn(`File not found: ${filePath}`);
            return null; // or return ''; depending on your preference
        } else {
            console.error('Error reading text file:', error);
            throw error; // Rethrow other errors
        }
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content);
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        throw error;
    }
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


ipcMain.handle('delete-cleaned-labels', async (event, cleanedLabelsDir) => {
    try {
        await fs.rmdir(cleanedLabelsDir, { recursive: true }); // Delete the cleaned labels directory
        console.log('Cleaned labels directory deleted:', cleanedLabelsDir);
        await fs.mkdir(cleanedLabelsDir, { recursive: true });
    } catch (error) {
        console.error('Error deleting cleaned labels directory:', error);
        throw error; // Rethrow the error to handle it in the renderer process if needed
    }
});


