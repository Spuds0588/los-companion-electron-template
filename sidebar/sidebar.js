// --- UI Elements Reference ---
const els = {
    // Status indicators
    statusDot: document.getElementById('status-dot'),
    statusLabel: document.getElementById('status-label'),
    
    // Tab controls
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Context tab elements
    contextBanner: document.getElementById('context-banner'),
    loanCard: document.getElementById('loan-details-card'),
    ctxEntityId: document.getElementById('ctx-loan-id'),
    ctxSubdomain: document.getElementById('ctx-subdomain'),
    ctxTab: document.getElementById('ctx-tab'),
    btnSyncCrm: document.getElementById('btn-sync-crm'),
    btnStartVideo: document.getElementById('btn-start-video'),
    
    // User Info Card
    userCard: document.getElementById('user-info-card'),
    userList: document.getElementById('user-info-list'),
    
    // JSON viewer
    rawJson: document.getElementById('raw-json-data'),
    
    // Video tab elements
    videoPlaceholderText: document.getElementById('video-placeholder-text'),
    videoLaunchBtn: document.getElementById('video-launch-btn'),
    
    // CRM tab elements
    crmPlaceholderText: document.getElementById('crm-placeholder-text')
};

let currentContext = null;

// --- Tab Navigation Switcher ---
els.tabBtns.forEach(btn => {
    btn.onclick = () => {
        const target = btn.dataset.target;
        
        // Toggle active states on tabs
        els.tabBtns.forEach(b => b.classList.toggle('active', b === btn));
        
        // Toggle visibility on panels
        els.tabContents.forEach(panel => {
            panel.classList.toggle('active', panel.id === target);
        });
    };
});

// --- Dynamic UI Updater ---
async function updateUI(context) {
    currentContext = context;
    console.log('[Sidebar UI] Updating layout with context:', context);
    
    if (context && context.entityId) {
        // 1. Set connection headers to Active
        els.statusDot.className = 'pulse-dot active';
        els.statusLabel.textContent = 'Active Sync';
        
        // 2. Adjust visibility on cards
        els.contextBanner.classList.add('hidden');
        els.loanCard.classList.remove('hidden');
        
        // 3. Bind metadata properties
        els.ctxEntityId.textContent = context.entityId;
        els.ctxSubdomain.textContent = context.subdomain || '-';
        els.ctxTab.textContent = context.entityTab;
        
        // 4. Enable CRM integrations
        els.btnSyncCrm.disabled = false;
        els.crmPlaceholderText.textContent = `Connected to active record #${context.entityId}. Sync pipelines active.`;
        document.querySelector('.iframe-container-mock')?.classList.add('active');
        
        // 5. Contextual tab activation (Video room is only active during Borrower Information phase)
        const isBorrowerTab = context.entityTab && context.entityTab.toLowerCase().includes('borrower');
        if (isBorrowerTab) {
            els.btnStartVideo.disabled = false;
            els.videoLaunchBtn.disabled = false;
            els.videoPlaceholderText.innerHTML = `<span style="color: var(--color-accent); font-weight: 600;">Virtual room is ready to launch!</span> Connect with borrower on record #${context.entityId}`;
            els.videoLaunchBtn.textContent = 'Launch Video Hub';
        } else {
            els.btnStartVideo.disabled = true;
            els.videoLaunchBtn.disabled = true;
            els.videoPlaceholderText.textContent = 'Video room becomes active when viewing "Borrower Information"';
            els.videoLaunchBtn.textContent = 'Launch Video Hub (Disabled)';
        }
        
        // 6. Fetch isolated local storage credentials from the LOS partition
        try {
            const userData = await window.api.getLocalStorage();
            renderUserSession(userData);
            
            // Render full combined JSON telemetry payload
            els.rawJson.textContent = JSON.stringify({
                context,
                extractedSession: userData
            }, null, 2);
        } catch (e) {
            console.error('[Sidebar UI] Error retrieving localStorage variables:', e);
            els.rawJson.textContent = JSON.stringify(context, null, 2);
        }
        
    } else {
        // Reset to Disconnected idle state
        els.statusDot.className = 'pulse-dot idle';
        els.statusLabel.textContent = 'LOS Ready';
        
        els.contextBanner.classList.remove('hidden');
        els.loanCard.classList.add('hidden');
        els.userCard.classList.add('hidden');
        
        els.btnSyncCrm.disabled = true;
        els.btnStartVideo.disabled = true;
        els.videoLaunchBtn.disabled = true;
        els.videoPlaceholderText.textContent = 'Video room becomes active when viewing "Borrower Information"';
        els.crmPlaceholderText.textContent = 'Authenticate inside the LOS to activate CRM sync bridge';
        document.querySelector('.iframe-container-mock')?.classList.remove('active');
        
        els.rawJson.textContent = 'No active loan file loaded.';
    }
}

// Render local storage key-value details in a premium row-based layout
function renderUserSession(userData) {
    els.userList.innerHTML = '';
    
    if (!userData || Object.keys(userData).length === 0) {
        els.userCard.classList.add('hidden');
        return;
    }
    
    let hasKeys = false;
    
    Object.entries(userData).forEach(([key, value]) => {
        hasKeys = true;
        const row = document.createElement('div');
        row.className = 'info-row';
        
        const fieldName = document.createElement('span');
        fieldName.className = 'field-lbl';
        fieldName.textContent = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        const fieldVal = document.createElement('span');
        fieldVal.className = 'field-val';
        
        // Format display values nicely if they are objects
        if (typeof value === 'object' && value !== null) {
            fieldVal.textContent = value.name || value.email || value.username || JSON.stringify(value).substring(0, 20) + '...';
        } else {
            fieldVal.textContent = String(value);
        }
        
        row.appendChild(fieldName);
        row.appendChild(fieldVal);
        els.userList.appendChild(row);
    });
    
    if (hasKeys) {
        els.userCard.classList.remove('hidden');
    } else {
        els.userCard.classList.add('hidden');
    }
}

// --- Bind Button Clicks to Preload Secure Bridge ---
els.btnSyncCrm.onclick = () => {
    if (currentContext) window.api.actionClicked('sync-crm', currentContext);
};

els.btnStartVideo.onclick = () => {
    if (currentContext) window.api.actionClicked('start-video', currentContext);
};

els.videoLaunchBtn.onclick = () => {
    if (currentContext) window.api.actionClicked('start-video', currentContext);
};

// --- Bootstrapping Lifecycle ---
window.onload = async () => {
    try {
        // Query initial active frame state (if Electron app was loaded already on a loan page)
        const initialCtx = await window.api.getCurrentContext();
        updateUI(initialCtx);
    } catch (e) {
        console.error('[Sidebar UI] Failed to bootstrap initial state:', e);
        updateUI(null);
    }
    
    // Subscribe to incoming stream of router events
    window.api.onContextUpdated((newCtx) => {
        updateUI(newCtx);
    });
};
