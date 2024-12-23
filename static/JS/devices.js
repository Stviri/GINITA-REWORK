// Initialize Socket.IO connection
const socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true
});

// Update the branch cards display with current data
function updateBranchCards(data) {
    // Get the container for branch cards
    const metricsContainer = document.querySelector('.metrics');
    metricsContainer.innerHTML = ''; 
    
    // Determine the correct URL for device overview
    const baseUrl = typeof deviceoverviewUrl !== 'undefined' ? deviceoverviewUrl : '/deviceoverview';
    
    // Create a card for each branch
    for (const [branchName, devices] of Object.entries(data)) {
        // Calculate number of devices in this branch
        const deviceCount = Array.isArray(devices) ? devices.length : 0;
        
        // Create branch card HTML
        const branchCard = `
            <a class="cardnav" href="${baseUrl}?branch=${encodeURIComponent(branchName)}">
                <div class="card">
                    <div class="card-content">
                        <div class="card-left">
                            <div class="card-label">${branchName}</div>
                            <div class="card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                            </div>
                        </div>
                        <span class="card-value">${deviceCount}</span>
                    </div>
                </div>
            </a>
        `;
        // Add the card to the container
        metricsContainer.innerHTML += branchCard;
    }
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server with transport:', socket.io.engine.transport.name);
    socket.emit('fetch_pc_info');
});

socket.on('initial_pc_info', (data) => {
    console.log('Received branch data:', data);
    updateBranchCards(data);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});