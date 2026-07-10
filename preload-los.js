const { ipcRenderer } = require('electron');
const LosConfig = require('./config.js');

let currentContext = LosConfig.parseContext(window.location.href);
let shadow = null;

// Initialize Shadow DOM wrapper to mount FABs isolated from host app styles
function setupShadowDOM() {
    if (document.getElementById('los-companion-root')) return;

    const rootWrapper = document.createElement('div');
    rootWrapper.id = 'los-companion-root';
    document.body.appendChild(rootWrapper);

    shadow = rootWrapper.attachShadow({ mode: 'open' });
    
    // Initial FAB render if context exists
    if (currentContext) {
        renderFABs(currentContext);
    }
}

// Render floating buttons declaratively based on configuration array and active tab
function renderFABs(context) {
    if (!shadow) return;
    shadow.innerHTML = ''; // Clear previous buttons
    if (!context || !context.entityId) return;

    LosConfig.customFABs.forEach(fab => {
        const regex = typeof fab.tabRegex === 'string' ? new RegExp(fab.tabRegex, 'i') : fab.tabRegex;
        if (!regex.test(context.entityTab || '')) return;

        const btn = document.createElement('button');
        btn.textContent = fab.label;
        
        // Base styling for modern, premium look with custom css injections
        btn.style.cssText = `
            position: fixed;
            z-index: 2147483647;
            padding: 12px 20px;
            border-radius: 30px;
            border: none;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            ${fab.css}
        `;
        
        // Hover/active state animations
        btn.onmouseover = () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
            btn.style.opacity = '0.95';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
            btn.style.opacity = '1';
        };

        btn.onclick = () => {
            ipcRenderer.send('ACTION_CLICKED', { buttonId: fab.id, context });
        };

        shadow.appendChild(btn);
    });
}

// Extract localStorage variables with "user" in key (session data)
function getUserData() {
    try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.toLowerCase().includes('user')) {
                try {
                    data[key] = JSON.parse(localStorage[key]);
                } catch {
                    data[key] = localStorage[key];
                }
            }
        }
        return data;
    } catch (e) {
        console.warn('[Preload LOS] Could not extract user details from localStorage', e);
        return {};
    }
}

// Emit presence heartbeat
function emitHeartbeat() {
    const state = document.visibilityState === 'visible' ? 'BEAT_ACTIVE' : 'BEAT_IDLE';
    console.log(`[Preload LOS] Emitting Heartbeat: ${state}`);
    ipcRenderer.send('PRESENCE_HEARTBEAT', {
        state,
        timestamp: Date.now(),
        context: currentContext,
        user: getUserData()
    });
}

// Wait for DOM to register setup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupShadowDOM);
} else {
    setupShadowDOM();
}

// Intercept localStorage mutations to capture user details instantly
try {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key && key.toLowerCase().includes('user')) {
            console.log(`[Preload LOS] Intercepted storage update for "${key}". Dispatching heartbeat.`);
            // Small timeout to allow state to settle
            setTimeout(emitHeartbeat, 100);
        }
    };
} catch (e) {
    console.warn('[Preload LOS] Could not intercept localStorage.setItem', e);
}

// Set up presence heartbeat engine
setInterval(emitHeartbeat, 30000);

// Listen to context notifications from Main process
ipcRenderer.on('LOS_CONTEXT_UPDATED', (event, context) => {
    currentContext = context;
    if (!shadow) {
        setupShadowDOM();
    } else {
        renderFABs(currentContext);
    }
});

ipcRenderer.on('FORCE_BEAT', () => {
    emitHeartbeat();
});

// Emits initial heartbeat on startup
if (document.readyState === 'complete') {
    emitHeartbeat();
} else {
    window.addEventListener('load', emitHeartbeat);
}
