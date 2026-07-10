const { app, BrowserWindow, WebContentsView, ipcMain, dialog } = require('electron');
const path = require('path');
const LosConfig = require('./config.js');

let win;
let losView;
let sidebarView;
let currentContext = null;

function createWindow() {
    // 1. Create empty base window
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'LOS Companion Desktop App',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Remove default menu for a clean look
    win.setMenuBarVisibility(false);

    // 2. Create LOS WebContentsView (LOS Webview Canvas)
    losView = new WebContentsView({
        webPreferences: {
            preload: path.join(__dirname, 'preload-los.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            // Separate partition to isolate cookies/authentication from native browser
            partition: 'persist:los-session'
        }
    });

    // 3. Create Sidebar WebContentsView (Companion App)
    sidebarView = new WebContentsView({
        webPreferences: {
            preload: path.join(__dirname, 'preload-sidebar.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    // 4. Mount views to the base window
    win.contentView.addChildView(losView);
    win.contentView.addChildView(sidebarView);

    // 5. Load URLs - Start on our premium Launcher UI
    losView.webContents.loadFile(path.join(__dirname, 'launchpad', 'launchpad.html'));
    sidebarView.webContents.loadFile(path.join(__dirname, 'sidebar', 'sidebar.html'));

    // 6. Establish layout bounds and listeners
    updateLayout();
    win.on('resize', updateLayout);
    win.on('maximize', updateLayout);
    win.on('unmaximize', updateLayout);

    // 7. Track SPA Navigation inside the LOS view
    const handleNavigation = (url) => {
        const context = LosConfig.parseContext(url);
        currentContext = context;
        console.log(`[Main Process] Navigation detected: ${url}`);
        console.log(`[Main Process] Active Context:`, context);

        // Notify both processes
        losView.webContents.send('LOS_CONTEXT_UPDATED', context);
        sidebarView.webContents.send('LOS_CONTEXT_UPDATED', context);
    };

    losView.webContents.on('did-navigate', (event, url) => {
        handleNavigation(url);
    });

    losView.webContents.on('did-navigate-in-page', (event, url) => {
        handleNavigation(url);
    });
}

// Sidebar positioning calculations
function updateLayout() {
    if (!win || !losView || !sidebarView) return;
    const [width, height] = win.getContentSize();
    const sidebarWidth = 320; // Premium spacing width

    if (LosConfig.sidebarPosition === 'left') {
        sidebarView.setBounds({ x: 0, y: 0, width: sidebarWidth, height: height });
        losView.setBounds({ x: sidebarWidth, y: 0, width: width - sidebarWidth, height: height });
    } else {
        losView.setBounds({ x: 0, y: 0, width: width - sidebarWidth, height: height });
        sidebarView.setBounds({ x: width - sidebarWidth, y: 0, width: sidebarWidth, height: height });
    }
}

// --- IPC Messaging Hub ---
ipcMain.handle('GET_CURRENT_CONTEXT', () => {
    return currentContext;
});

ipcMain.handle('GET_LOCAL_STORAGE', async () => {
    try {
        // Query localStorage within the isolated LOS frame, filtering keys containing "user"
        const localStorageData = await losView.webContents.executeJavaScript(`
            (() => {
                const data = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.toLowerCase().includes('user')) {
                        try {
                            data[key] = JSON.parse(localStorage[key]);
                        } catch {
                            data[key] = localStorage[key];
                        }
                    }
                }
                return data;
            })()
        `);
        return localStorageData;
    } catch (err) {
        console.error('[IPC Main] Failed to retrieve local storage:', err);
        return {};
    }
});

ipcMain.on('ACTION_CLICKED', (event, payload) => {
    console.log('[IPC Main] ACTION_CLICKED payload:', payload);
    dialog.showMessageBox(win, {
        type: 'info',
        title: 'Action Hook Triggered',
        message: `Custom Action ID: "${payload.buttonId}"\n\nContext:\n- Subdomain: ${payload.context?.subdomain}\n- Record ID: ${payload.context?.entityId}\n- Active Tab: ${payload.context?.entityTab}`,
        buttons: ['OK']
    });
});

ipcMain.on('PRESENCE_HEARTBEAT', (event, payload) => {
    console.log(`[Presence Engine] Heartbeat received (${payload.state}):`, {
        timestamp: new Date(payload.timestamp).toLocaleTimeString(),
        context: payload.context,
        userKeys: Object.keys(payload.user || {})
    });
});

// App lifecycle hooks
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
