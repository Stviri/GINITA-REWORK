# GINITA Project 🖥️

GINITA is a real-time PC monitoring system that allows you to track and manage multiple computers across different branches. Built with Python Flask and Socket.IO for real-time updates.

## 🌟 Features

- **Real-time Monitoring**
  - CPU Usage
  - RAM Usage
  - Disk Activity
  - Network Status
  - AnyDesk Integration

- **Branch Management**
  - Organize PCs by branches
  - Quick branch navigation
  - Device count per branch

- **Device Overview**
  - Status indicators (Online/Offline)
  - Critical resource alerts
  - Favorite devices system
  - Search functionality

- **Detailed Device Information**
  - Individual device metrics
  - One-click AnyDesk connection
  - IP address information
  - Historical data

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js (for frontend development)
- AnyDesk (for remote connections)

### Installation

1. Clone the repository:
   
git clone https://github.com/Stviri/GINITA-REWORK.git


cd GINITA-REWORK


3. Install Python dependencies:

pip install -r requirements.txt

5. Start the server

python server.py

6. Run the client on monitored PCs

python client.py

## 🔧 Configuration

The system uses a subnet mapping configuration to organize devices into branches (view this in server.py)

SUBNET_MAPPING = {
"192.168.0": "Home",
"127.0.0": "Localhost",
"192.168.2": "subnet3",
}


Keep in mind that the client must be pointed to the back-end server url, view this in client.py

## 🎯 Usage

1. Access the dashboard at `http://localhost:5000`
2. Navigate to different branches using the Branches page
3. Click on devices to view detailed information
4. Use the search function to find specific devices
5. Mark important devices as favorites for quick access

## 🔐 Security

- Secure WebSocket connections
- Branch-specific data isolation
- No sensitive data storage

## 👥 Authors

- **Stviri** - *Initial work* - [GitHub Profile](https://github.com/Stviri)

## 🙏 Acknowledgments

- Flask-SocketIO team
- AnyDesk for remote access capabilities
- All contributors and testers
