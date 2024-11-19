// Calculate the total number of PCs across all branches
function calculateTotalPCs(data) {
    let total = 0;
    for (const subnet in data) {
        total += data[subnet].length;
    }
    return total;
}

// Calculate how many PCs are currently online
function calculateActivePCs(data) {
    let active = 0;
    for (const subnet in data) {
        active += data[subnet].filter(pc => pc.status === 'online').length;
    }
    return active;
}

// Calculate the average network latency (ping) across all devices
function calculateAverageLatency(data) {
    let totalLatency = 0;
    let count = 0;
    
    for (const subnet in data) {
        data[subnet].forEach(pc => {
            if (pc.ping) {
                // Convert ping string (e.g., "4.19 ms") to number
                const pingValue = parseFloat(pc.ping);
                if (!isNaN(pingValue)) {
                    totalLatency += pingValue;
                    count++;
                }
            }
        });
    }
    
    // Return 0 if no valid ping values found
    return count > 0 ? (totalLatency / count).toFixed(2) : 0;
}

// Check for devices with critical disk usage (above 80%)
function checkCriticalDiskActivity(data) {
    const criticalThreshold = 80;
    for (const branch in data) {
        for (const pc of data[branch]) {
            if (pc.disk_activity > criticalThreshold) {
                return {
                    hostname: pc.hostname,
                    value: pc.disk_activity,
                    branch: branch
                };
            }
        }
    }
    return {
        hostname: "No devices with critical disk activity",
        value: 0,
        branch: null
    };
}

// Function to check critical RAM usage and return {hostname, value}
function checkCriticalRAM(data) {
    const criticalThreshold = 80;
    for (const branch in data) {
        for (const pc of data[branch]) {
            if (pc.ram_usage > criticalThreshold) {
                return {
                    hostname: pc.hostname,
                    value: pc.ram_usage,
                    branch: branch
                };
            }
        }
    }
    return {
        hostname: "No devices with critical RAM usage",
        value: 0,
        branch: null
    };
}

// Function to check critical CPU usage and return {hostname, value}
function checkCriticalCPU(data) {
    const criticalThreshold = 80;
    for (const branch in data) {
        for (const pc of data[branch]) {
            if (pc.cpu_usage > criticalThreshold) {
                return {
                    hostname: pc.hostname,
                    value: pc.cpu_usage,
                    branch: branch
                };
            }
        }
    }
    return {
        hostname: "No devices with critical CPU usage",
        value: 0,
        branch: null
    };
}

// Function to update all metrics on the page
function updateMetrics(data) {
    // Update total PCs
    document.querySelector('.card-value-totalpc').textContent = calculateTotalPCs(data);
    
    // Update active PCs
    document.querySelector('.card-value-activepc').textContent = calculateActivePCs(data);
    
    // Update average latency
    document.querySelector('.card-value-ms').textContent = `${calculateAverageLatency(data)} MS`;
    
    // Update critical disk activity
    const criticalDisk = checkCriticalDiskActivity(data);
    const diskHostnameElement = document.querySelector('.critdisk-hostname');
    if (criticalDisk.branch) {
        diskHostnameElement.innerHTML = `<a href="/deviceinfo?branch=${encodeURIComponent(criticalDisk.branch)}&hostname=${encodeURIComponent(criticalDisk.hostname)}">${criticalDisk.hostname}</a>`;
    } else {
        diskHostnameElement.textContent = criticalDisk.hostname;
    }
    document.querySelector('.card-critdisk-value').textContent = `${criticalDisk.value}%`;
    
    // Update critical RAM usage
    const criticalRAM = checkCriticalRAM(data);
    const ramHostnameElement = document.querySelector('.critram-hostname');
    if (criticalRAM.branch) {
        ramHostnameElement.innerHTML = `<a href="/deviceinfo?branch=${encodeURIComponent(criticalRAM.branch)}&hostname=${encodeURIComponent(criticalRAM.hostname)}">${criticalRAM.hostname}</a>`;
    } else {
        ramHostnameElement.textContent = criticalRAM.hostname;
    }
    document.querySelector('.card-critram-value').textContent = `${criticalRAM.value}%`;
    
    // Update critical CPU usage
    const criticalCPU = checkCriticalCPU(data);
    const cpuHostnameElement = document.querySelector('.critcpu-hostname');
    if (criticalCPU.branch) {
        cpuHostnameElement.innerHTML = `<a href="/deviceinfo?branch=${encodeURIComponent(criticalCPU.branch)}&hostname=${encodeURIComponent(criticalCPU.hostname)}">${criticalCPU.hostname}</a>`;
    } else {
        cpuHostnameElement.textContent = criticalCPU.hostname;
    }
    document.querySelector('.card-critcpu-value').textContent = `${criticalCPU.value}%`;
}

// Update the socket connection and event listeners
const socket = io('http://localhost:5000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('fetch_pc_info');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Update this listener to match your server's data structure
socket.on('initial_pc_info', (data) => {
    console.log('Received subnet data:', data);
    try {
        updateMetrics(data);
    } catch (error) {
        console.error('Error updating metrics:', error);
    }
});

// Update the refresh button event listener
document.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('refreshButton');
    if (!refreshButton) {
        console.error('Refresh button not found!');
        return;
    }
    
    refreshButton.addEventListener('click', async () => {
        console.log('Refresh button clicked');
        // Disable the button and add spinning animation
        refreshButton.disabled = true;
        refreshButton.classList.add('refreshing');
        
        try {
            // Emit socket event to fetch new data
            socket.emit('fetch_pc_info');
            
            // Wait for the response
            const response = await new Promise((resolve, reject) => {
                socket.once('initial_pc_info', (data) => {
                    console.log('Received new subnet data:', data);
                    resolve(data);
                });
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    reject(new Error('Refresh timeout'));
                }, 10000);
            });
            
            // Update the metrics with new data
            updateMetrics(response);
            console.log('Metrics updated successfully');
            
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            // Re-enable the button and remove spinning animation
            setTimeout(() => {
                refreshButton.disabled = false;
                refreshButton.classList.remove('refreshing');
            }, 1000);
        }
    });
});

// Update interval remains the same
let updateInterval = setInterval(() => {
    if (socket.connected) {
        socket.emit('fetch_pc_info');
    }
}, 5000);

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', () => {
    clearInterval(updateInterval);
}); 