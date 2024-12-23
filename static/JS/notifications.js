// Initialize notifications
let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
let unreadNotifications = false;

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Add this function to handle adding new notifications
function addNotification(message, device, branch) {
    const notification = {
        id: Date.now(),
        message,
        timestamp: new Date().toISOString(),
        hostname: device.hostname,
        branch: branch || device.branch,
        unread: true
    };

    // Check if a similar notification was added in the last 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const isDuplicate = notifications.some(n => 
        n.message === notification.message && 
        n.hostname === notification.hostname &&
        new Date(n.timestamp).getTime() > fiveMinutesAgo
    );

    if (!isDuplicate) {
        notifications.unshift(notification);
        if (notifications.length > 50) notifications.pop(); // Keep last 50 notifications
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateNotificationDisplay();
    }
}

// Make addNotification available globally
window.addNotification = addNotification;

function updateNotificationDisplay() {
    const notificationList = document.getElementById('notificationList');
    const notificationDot = document.getElementById('notificationDot');
    
    if (!notificationList || !notificationDot) return; // Guard clause if elements don't exist
    
    notificationList.innerHTML = notifications.length ? '' : '<div class="no-notifications">No notifications</div>';
    
    unreadNotifications = notifications.some(n => n.unread);
    notificationDot.style.display = unreadNotifications ? 'block' : 'none';

    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification-item ${notification.unread ? 'unread' : ''}`;
        notificationElement.innerHTML = `
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatTimestamp(notification.timestamp)}</div>
        `;
        notificationElement.addEventListener('click', () => {
            window.location.href = `/deviceinfo?branch=${encodeURIComponent(notification.branch)}&hostname=${encodeURIComponent(notification.hostname)}`;
        });
        notificationList.appendChild(notificationElement);
    });
}

// Initialize notification handlers
document.addEventListener('DOMContentLoaded', () => {
    const notificationButton = document.getElementById('notificationButton');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const clearNotifications = document.getElementById('clearNotifications');

    if (!notificationButton || !notificationDropdown || !clearNotifications) return;

    notificationButton.addEventListener('click', () => {
        notificationDropdown.style.display = notificationDropdown.style.display === 'none' ? 'block' : 'none';
        if (notificationDropdown.style.display === 'block') {
            notifications.forEach(n => n.unread = false);
            localStorage.setItem('notifications', JSON.stringify(notifications));
            updateNotificationDisplay();
        }
    });

    clearNotifications.addEventListener('click', (e) => {
        e.stopPropagation();
        notifications = [];
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateNotificationDisplay();
        notificationDropdown.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
        if (!notificationDropdown.contains(e.target) && !notificationButton.contains(e.target)) {
            notificationDropdown.style.display = 'none';
        }
    });

    // Set initial display state
    notificationDropdown.style.display = 'none';
    updateNotificationDisplay();
}); 