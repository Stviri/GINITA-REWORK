// Initialize Socket.IO connection with reconnection settings
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

// Add these functions to handle filtering
let activeFilters = new Set();

function initializeFilters() {
    const filterButton = document.getElementById('filterButton');
    const filterDropdown = document.getElementById('filterDropdown');
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');

    // Set initial state
    filterDropdown.style.display = 'none';

    // Add click event listener to the document
    document.addEventListener('click', (e) => {
        // Check if the click is outside both the filter button and dropdown
        const isClickInsideDropdown = filterDropdown.contains(e.target);
        const isClickOnButton = filterButton.contains(e.target);

        if (!isClickInsideDropdown && !isClickOnButton) {
            filterDropdown.style.display = 'none';
        }
    });

    filterButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the document click handler from firing
        filterDropdown.style.display = filterDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Prevent clicks inside the dropdown from closing it
    filterDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    applyFilters.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
        activeFilters.clear();
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                activeFilters.add(checkbox.dataset.filter);
            }
        });

        updateActiveFiltersDisplay();
        filterDropdown.style.display = 'none';
        updateDeviceCards(currentDevices);
    });

    clearFilters.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        activeFilters.clear();
        updateActiveFiltersDisplay();
        updateDeviceCards(currentDevices);
    });
}

function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    const filterCount = document.getElementById('activeFiltersCount');
    
    activeFiltersContainer.innerHTML = '';
    
    if (activeFilters.size > 0) {
        filterCount.textContent = activeFilters.size;
        filterCount.style.display = 'inline-block';
        
        activeFilters.forEach(filter => {
            const filterElement = document.createElement('div');
            filterElement.className = 'active-filter';
            filterElement.innerHTML = `
                ${getFilterLabel(filter)}
                <button onclick="removeFilter('${filter}')">&times;</button>
            `;
            activeFiltersContainer.appendChild(filterElement);
        });
    } else {
        filterCount.style.display = 'none';
    }
}

function getFilterLabel(filter) {
    const labels = {
        'cpu': 'CPU Usage',
        'ram': 'RAM Usage',
        'network_download': 'Network Download',
        'network_upload': 'Network Upload',
        'disk_activity': 'Disk Usage',
        'ping': 'Ping',
        'disk_space': 'Disk Space'
    };
    return labels[filter] || filter;
}

function removeFilter(filter) {
    activeFilters.delete(filter);
    const checkbox = document.querySelector(`input[data-filter="${filter}"]`);
    if (checkbox) checkbox.checked = false;
    updateActiveFiltersDisplay();
    updateDeviceCards(currentDevices);
}

function getActiveFilters() {
    return Array.from(activeFilters);
}

// Main function to update and display device cards
function updateDeviceCards(devices) {
    const metricsContainer = document.querySelector('.metrics');
    metricsContainer.innerHTML = '';

    if (!devices || devices.length === 0) {
        metricsContainer.innerHTML = '<p class="no-devices">No devices found</p>';
        return;
    }

    // Get search term
    const searchTerm = searchInput.value.toLowerCase();

    // Filter devices based on search
    let filteredDevices = devices.filter(device => 
        device.hostname.toLowerCase().includes(searchTerm)
    );

    // If there are active filters, show only the top device for each filter
    if (activeFilters.size > 0) {
        const topDevices = new Set();

        activeFilters.forEach(filter => {
            // Sort devices based on the current filter
            const sorted = [...filteredDevices].sort((a, b) => {
                switch(filter) {
                    case 'cpu':
                        return b.cpu_usage - a.cpu_usage;
                    case 'ram':
                        return b.ram_usage - a.ram_usage;
                    case 'network_download':
                        return (b.network_usage?.download_speed || 0) - (a.network_usage?.download_speed || 0);
                    case 'network_upload':
                        return (b.network_usage?.upload_speed || 0) - (a.network_usage?.upload_speed || 0);
                    case 'disk_usage':
                        return b.disk_activity - a.disk_activity;
                    case 'ping':
                        return parseFloat(b.ping) - parseFloat(a.ping);
                    case 'disk_space':
                        const aTotalUsed = a.system_info?.storage_devices?.reduce((acc, dev) => acc + dev.used, 0) || 0;
                        const bTotalUsed = b.system_info?.storage_devices?.reduce((acc, dev) => acc + dev.used, 0) || 0;
                        return bTotalUsed - aTotalUsed;
                    default:
                        return 0;
                }
            });
            
            // Add the top device for this filter
            if (sorted.length > 0) {
                topDevices.add(sorted[0]);
            }
        });

        filteredDevices = Array.from(topDevices);
    }

    // Sort by favorites
    filteredDevices.sort((a, b) => {
        const aFavorite = favorites.includes(a.hostname);
        const bFavorite = favorites.includes(b.hostname);
        if (aFavorite && !bFavorite) return -1;
        if (!aFavorite && bFavorite) return 1;
        return 0;
    });

    // Create cards for filtered devices
    filteredDevices.forEach(device => {
        const isFavorite = favorites.includes(device.hostname);
        const filterInfo = Array.from(activeFilters).map(filter => {
            let value = '';
            switch(filter) {
                case 'cpu':
                    value = `CPU Usage: ${device.cpu_usage}%`;
                    break;
                case 'ram':
                    value = `RAM Usage: ${device.ram_usage}%`;
                    break;
                case 'network_download':
                    value = `Download: ${formatNetworkSpeed(device.network_usage?.download_speed || 0)}`;
                    break;
                case 'network_upload':
                    value = `Upload: ${formatNetworkSpeed(device.network_usage?.upload_speed || 0)}`;
                    break;
                case 'disk_activity':
                    value = `Disk Usage: ${device.disk_activity}%`;
                    break;
                case 'ping':
                    value = `Ping: ${device.ping}`;
                    break;
                case 'disk_space':
                    const totalUsed = device.system_info?.storage_devices?.reduce((acc, dev) => acc + dev.used, 0) || 0;
                    value = `Used Space: ${totalUsed.toFixed(2)}GB`;
                    break;
            }
            return `<div class="filter-value">${value}</div>`;
        }).join('');

        const deviceCard = `
            <a class="cardnav" data-hostname="${device.hostname}" href="${deviceinfoUrl}?branch=${encodeURIComponent(branchName)}&hostname=${encodeURIComponent(device.hostname)}">
                <div class="card">
                    <div class="card-content">
                        <div class="card-left">
                            <div class="card-label">${device.hostname}</div>
                            <div class="filter-values">${filterInfo}</div>
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
                const hostname = btn.dataset.hostname;
                toggleFavorite(hostname);
                updateDeviceCards(currentDevices);
            } else if (btn.classList.contains('connect-btn')) {
                const anydeskId = btn.dataset.anydesk;
                if (anydeskId) {
                    btn.disabled = true;
                    try {
                        await launchAnydesk(anydeskId);
                    } catch (error) {
                        console.error('Failed to launch AnyDesk:', error);
                    }
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
        currentDevices = data[branchName];
        sortDevices();
        updateDeviceCards(currentDevices);
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

function sortDevices() {
    if (activeFilters.size === 0) return;

    currentDevices.sort((a, b) => {
        for (const filter of activeFilters) {
            let comparison = 0;
            switch(filter) {
                case 'cpu':
                    comparison = b.cpu_usage - a.cpu_usage;
                    break;
                case 'ram':
                    comparison = b.ram_usage - a.ram_usage;
                    break;
                case 'network_download':
                    comparison = (b.network_usage?.download_speed || 0) - (a.network_usage?.download_speed || 0);
                    break;
                case 'network_upload':
                    comparison = (b.network_usage?.upload_speed || 0) - (a.network_usage?.upload_speed || 0);
                    break;
                case 'disk_usage':
                    comparison = b.disk_activity - a.disk_activity;
                    break;
                case 'ping':
                    comparison = parseFloat(b.ping) - parseFloat(a.ping);
                    break;
                case 'disk_space':
                    const aTotalUsed = a.system_info?.storage_devices?.reduce((acc, dev) => acc + dev.used, 0) || 0;
                    const bTotalUsed = b.system_info?.storage_devices?.reduce((acc, dev) => acc + dev.used, 0) || 0;
                    comparison = bTotalUsed - aTotalUsed;
                    break;
            }
            if (comparison !== 0) return comparison;
        }
        return 0;
    });
}

// Initialize filters when the page loads
document.addEventListener('DOMContentLoaded', initializeFilters); 

function formatNetworkSpeed(speedInMBps) {
    return `${(speedInMBps * 1024).toFixed(2)} KB/s`;
}

// Update where filter values are displayed
function getFilterValueDisplay(filter, value) {
    if (filter === 'network_download' || filter === 'network_upload') {
        return formatNetworkSpeed(value);
    }
    return `${value}${filter.includes('usage') ? '%' : ''}`;
} 