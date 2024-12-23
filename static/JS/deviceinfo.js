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

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const hostname = urlParams.get('hostname');
const branchName = urlParams.get('branch');

// Update the back button href
document.querySelector('.back-button').parentElement.href = `/deviceoverview?branch=${encodeURIComponent(branchName)}`;

// Update the title
document.querySelector('.branch-hostname').textContent = `${hostname} in ${branchName}`;

function getChartColor(percentage) {
    if (percentage >= 80) {
        return '#ff4d4d';  // Red for critical usage
    } else if (percentage >= 50) {
        return '#ffd700';  // Bright yellow for high usage
    } else if (percentage >= 10) {
        return '#4169e1';  // Blue for moderate usage
    } else {
        return '#2ecc71';  // Green for low usage
    }
}

function updateChart(label, percentage, defaultColor) {
    const charts = document.querySelectorAll('.card');
    const chart = Array.from(charts).find(chart => 
        chart.querySelector('.card-label').textContent === label
    );
    
    if (chart) {
        const circle = chart.querySelector('.circle-chart__circle');
        const percentText = chart.querySelector('.circle-chart__percent');
        
        // Get color based on percentage
        const color = getChartColor(percentage);
        
        circle.style.stroke = color;
        circle.setAttribute('stroke-dasharray', `${percentage},100`);
        percentText.textContent = `${percentage}%`;
        
        // Optional: Change text color based on percentage too
        percentText.style.fill = color;
    }
}

function updateDeviceInfo(data) {
    // Update online status
    const statusElement = document.querySelector('.online-status');
    statusElement.textContent = data.status;
    statusElement.className = `online-status ${data.status.toUpperCase()}`;

    // Update info cards
    document.querySelector('.info-value').textContent = data.ip_address;
    document.querySelectorAll('.info-value')[1].textContent = data.anydesk_id || 'N/A';
    document.querySelectorAll('.info-value')[2].textContent = data.hostname;
    document.querySelectorAll('.info-value')[3].textContent = `${data.ping || 0}`;

    // Update system info cards
    if (data.system_info) {
        document.querySelector('.system-cpu').textContent = data.system_info.cpu_model;
        document.querySelector('.system-ram').textContent = data.system_info.total_ram;
        document.querySelector('.system-os').textContent = data.system_info.os_info;

        // Update storage devices information
        const storageContainer = document.querySelector('.storage-devices');
        storageContainer.innerHTML = ''; // Clear existing content

        data.system_info.storage_devices.forEach(device => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'storage-device';
            deviceElement.innerHTML = `
                <div class="storage-device-header">
                    <span class="device-name">${device.device}</span>
                    <span class="device-total">${device.total}GB Total</span>
                </div>
                <div class="storage-usage-bar">
                    <div class="usage-fill" style="width: ${device.percent}%;
                         background-color: ${getStorageColor(device.percent)}"></div>
                </div>
                <div class="storage-details">
                    <span class="used">${device.used}GB Used</span>
                    <span class="free">${device.free}GB Free</span>
                    <span class="percentage">${device.percent}%</span>
                </div>
            `;
            storageContainer.appendChild(deviceElement);
        });
    }

    // Update usage charts
    updateChart('CPU Usage:', data.cpu_usage || 0);
    updateChart('RAM Usage:', data.ram_usage || 0);
    updateChart('Disk Usage:', data.disk_activity || 0);

    // Update network speeds in KB/s
    if (data.network_usage) {
        const uploadSpeed = (data.network_usage.upload_speed * 1024).toFixed(2); // Convert MB/s to KB/s
        const downloadSpeed = (data.network_usage.download_speed * 1024).toFixed(2); // Convert MB/s to KB/s
        
        document.getElementById('network-upload').textContent = `${uploadSpeed} KB/s`;
        document.getElementById('network-download').textContent = `${downloadSpeed} KB/s`;
    }
}

function getStorageColor(percentage) {
    if (percentage >= 90) return '#ff4d4d';      // Red for critical
    if (percentage >= 75) return '#ffd700';      // Yellow for warning
    if (percentage >= 50) return '#4169e1';      // Blue for moderate
    return '#2ecc71';                            // Green for good
}

// Request initial device data when connected
socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('fetch_device_data', { hostname: hostname });
});

// Handle initial device data
socket.on('device_data', (data) => {
    console.log('Received device data:', data);
    updateDeviceInfo(data);
});

// Handle real-time updates
socket.on('device_pc_info', (data) => {
    if (data.hostname === hostname) {
        console.log('Received real-time update:', data);
        updateDeviceInfo(data);
    }
});

// Handle errors
socket.on('error', (error) => {
    console.error('Error:', error);
});

// Update the connect button click handler
document.querySelector('.connect-button').addEventListener('click', async (e) => {
    e.preventDefault();
    const button = e.target;
    const anydeskId = document.querySelectorAll('.info-value')[1].textContent.replace(/\s+/g, '');
    
    if (anydeskId && anydeskId !== 'N/A') {
        button.textContent = 'CONNECTING...';
        button.disabled = true;

        // Create an iframe to handle the anydesk protocol
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        try {
            // Try to launch AnyDesk
            iframe.src = `anydesk:${anydeskId}`;

            // Reset button after a delay
            setTimeout(() => {
                button.textContent = 'CONNECT';
                button.disabled = false;
                // Clean up the iframe
                document.body.removeChild(iframe);
            }, 2000);

        } catch (error) {
            console.error('Failed to launch AnyDesk:', error);
            button.textContent = 'FAILED';
            
            // Show download prompt only if there's an error
            if (confirm('AnyDesk doesn\'t seem to be installed. Would you like to download it?')) {
                window.open('https://anydesk.com/download', '_blank');
            }

            setTimeout(() => {
                button.textContent = 'CONNECT';
                button.disabled = false;
            }, 2000);

            // Clean up the iframe
            document.body.removeChild(iframe);
        }
    }
}); 