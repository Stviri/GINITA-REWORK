import psutil
import socket
import platform
from socketio import Client
import os
import time
import threading

sio = Client()
start_time = None
should_run = True  # Flag to control the background thread
ping_event = threading.Event()
ping_time = 0

def get_anydesk_id():
    anydesk_config_path = os.path.join(os.getenv("PROGRAMDATA"), "AnyDesk", "service.conf")
    
    if os.path.exists(anydesk_config_path):
        with open(anydesk_config_path, "r") as file:
            for line in file:
                if line.startswith("ad.telemetry.last_cid="):
                    return line.split("=")[1].strip()
    return "Not Found"

def calculate_ping():
    global ping_time, start_time
    try:
        ping_event.clear()
        start_time = time.time()
        # Send ping request and wait for response
        sio.emit('ping_request')
        # Wait for ping response with timeout
        if ping_event.wait(timeout=1.0):  # 1 second timeout
            return f"{ping_time:.2f} ms"
        return "0 ms"
    except Exception as e:
        print(f"Error calculating ping: {e}")
        return "0 ms"

def get_network_usage():
    try:
        # Get initial network stats
        net_io_before = psutil.net_io_counters()
        time.sleep(1)  # Wait 1 second to calculate rate
        net_io_after = psutil.net_io_counters()
        
        # Calculate bytes sent/received per second
        bytes_sent = net_io_after.bytes_sent - net_io_before.bytes_sent
        bytes_recv = net_io_after.bytes_recv - net_io_before.bytes_recv
        
        # Convert to MB/s
        upload_speed = round(bytes_sent / 1024 / 1024, 2)  # MB/s
        download_speed = round(bytes_recv / 1024 / 1024, 2)  # MB/s
        
        return {
            "upload_speed": upload_speed,
            "download_speed": download_speed,
            "total_sent": round(net_io_after.bytes_sent / 1024 / 1024, 2),  # Total MB sent
            "total_received": round(net_io_after.bytes_recv / 1024 / 1024, 2)  # Total MB received
        }
    except Exception as e:
        print(f"Error getting network usage: {e}")
        return {
            "upload_speed": 0,
            "download_speed": 0,
            "total_sent": 0,
            "total_received": 0
        }

def get_system_info():
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    
    # Get CPU information
    cpu_info = platform.processor()
    try:
        import cpuinfo
        cpu_detailed = cpuinfo.get_cpu_info()
        cpu_model = cpu_detailed['brand_raw']
    except:
        cpu_model = cpu_info
    
    # Get RAM information (in GB)
    total_ram = round(psutil.virtual_memory().total / (1024**3), 2)
    
    # Get all storage devices information
    storage_devices = []
    try:
        partitions = psutil.disk_partitions(all=False)
        for partition in partitions:
            try:
                if partition.fstype:  # Check if it's a real storage device
                    usage = psutil.disk_usage(partition.mountpoint)
                    storage_devices.append({
                        'device': partition.device,
                        'mountpoint': partition.mountpoint,
                        'fstype': partition.fstype,
                        'total': round(usage.total / (1024**3), 2),  # Total size in GB
                        'used': round(usage.used / (1024**3), 2),    # Used space in GB
                        'free': round(usage.free / (1024**3), 2),    # Free space in GB
                        'percent': usage.percent                      # Usage percentage
                    })
            except Exception as e:
                print(f"Error getting info for partition {partition.device}: {e}")
                continue
    except Exception as e:
        print(f"Error getting storage devices: {e}")
        storage_devices = [{
            'device': '/',
            'total': round(psutil.disk_usage('/').total / (1024**3), 2),
            'used': round(psutil.disk_usage('/').used / (1024**3), 2),
            'free': round(psutil.disk_usage('/').free / (1024**3), 2),
            'percent': psutil.disk_usage('/').percent
        }]
    
    # Get detailed OS information for Windows
    if platform.system() == 'Windows':
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
            product_name = winreg.QueryValueEx(key, "ProductName")[0]
            
            # Get DisplayVersion for Windows 11 detection
            try:
                display_version = winreg.QueryValueEx(key, "DisplayVersion")[0]
                current_build = winreg.QueryValueEx(key, "CurrentBuild")[0]
                
                # Check if it's Windows 11 (Build number 22000 or higher)
                if int(current_build) >= 22000:
                    product_name = product_name.replace("10", "11")
                
                os_info = f"{product_name} ({display_version})"
            except:
                os_info = product_name
            
            winreg.CloseKey(key)
        except Exception as e:
            print(f"Error getting Windows version: {e}")
            os_info = f"{platform.system()} {platform.release()}"
    else:
        os_info = f"{platform.system()} {platform.release()}"
    
    # Get existing metrics
    cpu_usage = psutil.cpu_percent(interval=1)
    ram_usage = psutil.virtual_memory().percent
    disk_space_usage = psutil.disk_usage('/').percent
    available_disk_space = psutil.disk_usage('/').free
    
    disk_io_before = psutil.disk_io_counters()
    time.sleep(1)
    disk_io_after = psutil.disk_io_counters()
    
    read_diff = disk_io_after.read_count - disk_io_before.read_count
    write_diff = disk_io_after.write_count - disk_io_before.write_count
    total_operations = read_diff + write_diff
    
    disk_activity_percentage = min((total_operations / 100), 100)

    anydesk_id = get_anydesk_id()
    
    # Calculate ping
    ping = calculate_ping()
    
    # Add network info to the return dictionary
    network_info = get_network_usage()
    
    return {
        "hostname": hostname,
        "ip_address": ip_address,
        "cpu_usage": cpu_usage,
        "ram_usage": ram_usage,
        "disk_space_usage": disk_space_usage,
        "available_disk_space": available_disk_space,
        "disk_activity": disk_activity_percentage,
        "anydesk_id": anydesk_id,
        "status": "online",
        "ping": ping,
        "network_usage": network_info,
        "system_info": {
            "cpu_model": cpu_model,
            "total_ram": f"{total_ram}GB",
            "storage_devices": storage_devices,
            "os_info": os_info
        }
    }

def send_periodic_updates():
    """Background thread function to send updates every 5 seconds"""
    while should_run:
        if sio.connected:
            try:
                pc_info = get_system_info()
                sio.emit('pc_info_response', pc_info)
                print("Sent periodic update")
            except Exception as e:
                print(f"Error sending periodic update: {e}")
        time.sleep(5)

@sio.event
def connect():
    print("Connected to the server!")
    sio.emit('client_connected', {'hostname': socket.gethostname()})
    # Start the periodic updates thread
    update_thread = threading.Thread(target=send_periodic_updates)
    update_thread.daemon = True  # Thread will exit when main program exits
    update_thread.start()

@sio.event
def disconnect():
    print("Disconnected from the server!")

@sio.on('ping_request')
def handle_ping_request():
    sio.emit('ping_response')

@sio.on('ping_response')
def handle_ping_response():
    global ping_time, start_time
    if start_time is not None:
        ping_time = (time.time() - start_time) * 1000
        ping_event.set()
        start_time = None

def main():
    global should_run
    backend_url = "http://192.168.0.187:5000"
    try:
        sio.connect(backend_url)
        sio.wait()
    except Exception as e:
        print(f"Failed to connect to the server: {e}")
    finally:
        should_run = False  # Stop the background thread

if __name__ == "__main__":
    main()