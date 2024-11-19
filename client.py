import socketio
import psutil
import platform
import socket
import time
import subprocess
import re
import logging
from datetime import datetime

# Set up logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Socket.IO client with reconnection settings
sio = socketio.Client(reconnection=True, reconnection_attempts=5, reconnection_delay=1, reconnection_delay_max=5)

# Global variables for tracking connection and device status
connected = False
last_connection_attempt = 0
CONNECTION_RETRY_DELAY = 5  # seconds

# Function to get the local IP address
def get_local_ip():
    try:
        # Create a temporary socket to determine the default route
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # Connect to Google DNS (doesn't send data)
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        logger.error(f"Error getting local IP: {e}")
        return "127.0.0.1"  # Fallback to localhost if error occurs

# Function to get AnyDesk ID using command line
def get_anydesk_id():
    try:
        # Run AnyDesk command to get client ID
        result = subprocess.run(['anydesk', '--get-id'], capture_output=True, text=True)
        # Extract numbers from the output
        anydesk_id = re.findall(r'\d+', result.stdout)
        return anydesk_id[0] if anydesk_id else None
    except Exception as e:
        logger.error(f"Error getting AnyDesk ID: {e}")
        return None

# Function to get system information and metrics
def get_system_info():
    try:
        # Get CPU usage
        cpu_usage = psutil.cpu_percent(interval=1)
        
        # Get memory usage
        memory = psutil.virtual_memory()
        ram_usage = memory.percent
        
        # Get disk usage for all partitions
        disk_usage = psutil.disk_usage('/').percent
        
        # Get hostname and IP address
        hostname = platform.node()
        ip_address = get_local_ip()
        
        # Get AnyDesk ID
        anydesk_id = get_anydesk_id()
        
        # Create system info dictionary
        system_info = {
            "hostname": hostname,
            "ip_address": ip_address,
            "cpu_usage": cpu_usage,
            "ram_usage": ram_usage,
            "disk_activity": disk_usage,
            "anydesk_id": anydesk_id,
            "status": "online",
            "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return system_info
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        return None

# Socket.IO event handlers
@sio.event
def connect():
    """Handle successful connection to server"""
    global connected
    connected = True
    logger.info("Connected to server")
    
    # Send initial system information
    system_info = get_system_info()
    if system_info:
        sio.emit('pc_info_response', system_info)
        # Register this client with its hostname
        sio.emit('client_connected', {'hostname': system_info['hostname']})

@sio.event
def disconnect():
    """Handle disconnection from server"""
    global connected
    connected = False
    logger.info("Disconnected from server")

@sio.event
def connect_error(error):
    """Handle connection errors"""
    global connected
    connected = False
    logger.error(f"Connection error: {error}")

@sio.on('ping_request')
def handle_ping_request():
    """Respond to server ping requests with updated system info"""
    system_info = get_system_info()
    if system_info:
        sio.emit('pc_info_response', system_info)
        sio.emit('ping_response')

# Main execution loop
def main():
    """Main function to maintain server connection and send updates"""
    global connected, last_connection_attempt
    
    server_url = 'http://localhost:5000'  # Server URL
    
    while True:
        try:
            # Attempt to connect if not connected
            if not connected and time.time() - last_connection_attempt > CONNECTION_RETRY_DELAY:
                try:
                    logger.info("Attempting to connect to server...")
                    sio.connect(server_url)
                    last_connection_attempt = time.time()
                except Exception as e:
                    logger.error(f"Failed to connect: {e}")
                    time.sleep(CONNECTION_RETRY_DELAY)
            
            # If connected, send periodic updates
            if connected:
                system_info = get_system_info()
                if system_info:
                    sio.emit('pc_info_response', system_info)
            
            # Wait before next update
            time.sleep(5)
            
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Client shutting down...")
        if connected:
            sio.disconnect()