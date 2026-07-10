const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API endpoints to the Sidebar UI renderer
contextBridge.exposeInMainWorld('api', {
    // Listen for live SPA navigation updates
    onContextUpdated: (callback) => {
        ipcRenderer.on('LOS_CONTEXT_UPDATED', (event, context) => {
            callback(context);
        });
    },

    // Fetch the current active context on startup
    getCurrentContext: () => {
        return ipcRenderer.invoke('GET_CURRENT_CONTEXT');
    },

    // Query active user session from the LOS partition's local storage
    getLocalStorage: () => {
        return ipcRenderer.invoke('GET_LOCAL_STORAGE');
    },

    // Trigger action workflows (such as CRM sync)
    actionClicked: (buttonId, context) => {
        ipcRenderer.send('ACTION_CLICKED', { buttonId, context });
    }
});
