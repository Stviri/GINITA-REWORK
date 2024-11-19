import json
import os
from flask import Flask, render_template, request, url_for
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime

# Initialize Flask application with Socket.IO support
app = Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Set up directory for subnet data storage
SUBNET_DIR = "subnets"
os.makedirs(SUBNET_DIR, exist_ok=True)

# Map IP subnets to branch names
SUBNET_MAPPING = {
    "192.168.0": "Home",
    "127.0.0": "Localhost",
    "192.168.2": "subnet3",
}

# Track connected clients and their status
connected_clients = {}
PING_TIMEOUT = 5  # seconds

# Helper function to extract subnet from IP address
def get_subnet(ip_address):
    return ".".join(ip_address.split(".")[:3]) if ip_address and "." in ip_address else None

# Load data for a specific subnet from JSON file
def load_subnet_data(file_name):
    file_path = os.path.join(SUBNET_DIR, file_name)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as file:
                return json.load(file)
        except json.JSONDecodeError:
            print(f"Error decoding JSON in {file_path}. Returning empty list.")
    return []

# Save subnet data to JSON file
def save_subnet_data(file_name, data):
    file_path = os.path.join(SUBNET_DIR, file_name)
    with open(file_path, "w") as file:
        json.dump(data, file, indent=4)

# Route handlers for different pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/devices')
def devices():
    return render_template('devices.html')

@app.route('/deviceoverview')
def deviceoverview():
    return render_template('deviceoverview.html')

@app.route('/deviceinfo')
def deviceinfo():
    return render_template('deviceinfo.html')

# Socket.IO event handlers
@socketio.on('fetch_pc_info')
def fetch_pc_info():
    """Fetch and send all subnet data to client"""
    all_subnet_data = {}
    for filename in os.listdir(SUBNET_DIR):
        if filename.endswith('.json'):
            branch_name = filename[:-5]  # Remove .json extension
            subnet_data = load_subnet_data(filename)
            all_subnet_data[branch_name] = subnet_data
    
    print("Sending existing subnet data:", all_subnet_data)
    emit('initial_pc_info', all_subnet_data)

@socketio.on('connect')
def handle_connect():
    """Handle new client connections"""
    print("Client connected")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnections and update status"""
    for hostname, data in connected_clients.items():
        if data['sid'] == request.sid:
            # Update device status to offline
            for subnet, filename in SUBNET_MAPPING.items():
                subnet_data = load_subnet_data(f"{filename}.json")
                for device in subnet_data:
                    if device.get('hostname') == hostname:
                        device['status'] = 'offline'
                        save_subnet_data(f"{filename}.json", subnet_data)
                        socketio.emit('status_update', {
                            'hostname': hostname,
                            'status': 'offline'
                        })
                        break
            connected_clients[hostname]['connected'] = False
            print(f"Client disconnected: {hostname}")
            break

@socketio.on('client_connected')
def handle_client_connected(data):
    if 'hostname' in data:
        client_hostname = data['hostname']
        connected_clients[client_hostname] = {
            'sid': request.sid,
            'connected': True
        }
        # Update status in JSON file and broadcast the change
        for subnet, filename in SUBNET_MAPPING.items():
            subnet_data = load_subnet_data(f"{filename}.json")
            for device in subnet_data:
                if device.get('hostname') == client_hostname:
                    device['status'] = 'online'
                    save_subnet_data(f"{filename}.json", subnet_data)
                    # Broadcast the status change to all clients
                    socketio.emit('status_update', {
                        'hostname': client_hostname,
                        'status': 'online'
                    })
                    break
        print(f"Client connected and registered: {client_hostname}")

@socketio.on('request_pc_info')
def request_pc_info(data):
    if not data or 'hostname' not in data:
        emit('error', {'message': 'Invalid request data'})
        return

    hostname = data['hostname']
    if hostname in connected_clients and connected_clients[hostname]['connected']:
        client_sid = connected_clients[hostname]['sid']
        print(f"Requesting info for device: {hostname} (sid: {client_sid})")
        emit('ping_request', room=client_sid)
    else:
        # Device is offline, immediately send offline status
        emit('device_pc_info', {
            'hostname': hostname,
            'status': 'offline',
            'message': 'Device is offline'
        })

@socketio.on('ping_request')
def handle_ping_request():
    # Immediately send response back to the requesting client
    emit('ping_response', room=request.sid)

@socketio.on('ping_response')
def handle_ping_response():
    # This is just for completing the ping-pong cycle
    pass

@socketio.on('pc_info_response')
def pc_info_response(data):
    print("Received PC info:", data)

    if isinstance(data, dict) and 'hostname' in data and 'ip_address' in data:
        subnet = get_subnet(data['ip_address'])
        file_name = SUBNET_MAPPING.get(subnet)
        
        if file_name:
            subnet_data = load_subnet_data(f"{file_name}.json")
            subnet_data = [entry for entry in subnet_data if entry.get('hostname') != data['hostname']]
            subnet_data.insert(0, data)
            save_subnet_data(f"{file_name}.json", subnet_data)
            emit('device_pc_info', data, broadcast=True)
        else:
            print(f"Subnet {subnet} is not mapped to any file. Ignoring device with IP {data['ip_address']}.")
    else:
        print(f"Unexpected data format: {data}")
        emit('error', {'message': 'Invalid data format received'})

@socketio.on('fetch_device_data')
def fetch_device_data(data):
    if not data or 'hostname' not in data:
        emit('error', {'message': 'Invalid request data'})
        return

    hostname = data['hostname']
    # Search through all subnet files for the device
    for filename in os.listdir(SUBNET_DIR):
        if filename.endswith('.json'):
            subnet_data = load_subnet_data(filename)
            device_data = next((device for device in subnet_data if device.get('hostname') == hostname), None)
            if device_data:
                emit('device_data', device_data)
                return
    
    emit('error', {'message': 'Device data not found'})

@socketio.on_error()
def handle_error(e):
    print(f"An error occurred: {str(e)}")
    emit('error', {'message': str(e)})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)