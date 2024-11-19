// Initialize Socket.IO connection with reconnection settings
const socket = io('http://localhost:5000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

// Extract branch name from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const branchName = urlParams.get('branch');

// Display branch name in the header
document.getElementById('branch.name').textContent = branchName || 'Unknown Branch';

// Load favorite devices from localStorage
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// Initialize global variables
let currentDevices = [];
const searchInput = document.getElementById('searchInput');

// Main function to update and display device cards
function updateDeviceCards(devices) {
    // Store current devices for later use
    currentDevices = devices;
    
    // Filter devices based on search input
    const searchTerm = searchInput.value.toLowerCase();
    const filteredDevices = devices.filter(device => 
        device.hostname.toLowerCase().includes(searchTerm)
    );
    
    // Sort devices - favorites appear first
    const sortedDevices = [...filteredDevices].sort((a, b) => {
        const aFavorite = favorites.includes(a.hostname);
        const bFavorite = favorites.includes(b.hostname);
        if (aFavorite && !bFavorite) return -1;
        if (!aFavorite && bFavorite) return 1;
        return 0;
    });

    // Clear existing cards
    const metricsContainer = document.querySelector('.metrics');
    metricsContainer.innerHTML = ''; 

    // Show "no results" message if no devices match search
    if (sortedDevices.length === 0) {
        metricsContainer.innerHTML = `
            <div class="no-results">
                No devices found matching "${searchTerm}"
            </div>
        `;
        return;
    }

    // Create and append device cards
    sortedDevices.forEach(device => {
        const isFavorite = favorites.includes(device.hostname);
        const deviceCard = `
            <a class="cardnav" data-hostname="${device.hostname}" href="${deviceinfoUrl}?branch=${encodeURIComponent(branchName)}&hostname=${encodeURIComponent(device.hostname)}">
                <div class="card">
                    <div class="card-content">
                        <div class="card-left">
                            <div class="card-label">${device.hostname}</div>
                            <div class="card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                            </div>
                            <span class="status ${device.status.toLowerCase() === 'online' ? 'online' : 'offline'}">
                                ${device.status}
                            </span>
                        </div>
                        <div class="button-container">
                            <div class="favorite-wrapper">
                                <button class="favorite-btn ${isFavorite ? 'favorite' : ''}" data-hostname="${device.hostname}">
                                    ★
                                </button>
                            </div>
                            <div class="connect-wrapper">
                                <button class="connect-btn" data-anydesk="${device.anydesk_id || ''}" 
                                        ${!device.anydesk_id ? 'disabled' : ''}>
                                    Connect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        `;
        metricsContainer.innerHTML += deviceCard;
    });

    // Add click handlers for favorite and connect buttons
    document.querySelectorAll('.connect-btn, .favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (btn.classList.contains('favorite-btn')) {
                // Handle favorite button click
                const hostname = btn.dataset.hostname;
                toggleFavorite(hostname);
                updateDeviceCards(currentDevices);
            } else if (btn.classList.contains('connect-btn')) {
                // Handle connect button click
                const anydeskId = btn.dataset.anydesk;
                if (anydeskId) {
                    btn.disabled = true;
                    try {
                        await launchAnydesk(anydeskId);
                    } catch (error) {
                        console.error('Failed to launch AnyDesk:', error);
                    }
                    // Re-enable button after delay
                    setTimeout(() => {
                        btn.disabled = false;
                    }, 2000);
                }
            }
        });
    });
}

// Toggle device favorite status
function toggleFavorite(hostname) {
    const index = favorites.indexOf(hostname);
    if (index === -1) {
        // Add to favorites
        favorites.push(hostname);
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
    }
    // Save updated favorites to localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Launch AnyDesk connection for a device
async function launchAnydesk(anydeskId) {
    let launched = false;
    
    try {
        // Use hidden iframe to launch AnyDesk
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.src = `anydesk:${anydeskId}`;
        
        // Clean up iframe after launch
        setTimeout(() => {
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }, 100);

        launched = true;
    } catch (e) {
        console.error('Failed to launch AnyDesk:', e);
    }
    
    return launched;
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('join_branch', branchName);
    socket.emit('fetch_pc_info');
});

socket.on('initial_pc_info', (data) => {
    console.log('Received branch data:', data);
    if (data[branchName]) {
        updateDeviceCards(data[branchName]);
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

// Update device list when searching
searchInput.addEventListener('input', (e) => {
    updateDeviceCards(currentDevices);
});

// Handle real-time status updates
socket.on('status_update', (data) => {
    console.log('Received status update:', data);
    const { hostname, status } = data;
    
    // Update device status in current devices array
    const device = currentDevices.find(d => d.hostname === hostname);
    if (device) {
        device.status = status;
        // Refresh the display
        updateDeviceCards(currentDevices);
    }
}); 