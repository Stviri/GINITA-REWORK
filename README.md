# GINITA Project 🖥️

GINITA is a real-time PC monitoring system that allows you to track and manage multiple computers across different branches. Built with Python Flask and Socket.IO for real-time updates.

## 🌟 Features

### Real-time Monitoring
- CPU Usage & Performance Metrics
- RAM Utilization Tracking
- Disk Activity & Storage Space
- Network Status & Bandwidth Usage
- AnyDesk Integration for Remote Access
- Critical Resource Alerts
- Real-time Performance Graphs

### Branch Management
- Subnet-based Branch Organization
- Automatic Device Categorization
- Quick Branch Navigation
- Real-time Device Count per Branch
- Branch-specific Data Isolation

### Device Overview
- Live Status Indicators (Online/Offline)
- Resource Usage Alerts
- Favorite Devices System
- Advanced Search & Filtering
- Device Health Indicators
- Quick Access Controls

### Detailed Device Information
- Comprehensive System Metrics
- One-click AnyDesk Connection
- IP Address & Network Details
- Historical Performance Data
- Storage Device Management
- System Information Details

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- AnyDesk (for remote connections)
- Modern web browser with WebSocket support
- Network access between clients and server

### Installation

1. Clone the repository:

git clone https://github.com/Stviri/GINITA-REWORK.git

cd GINITA-REWORK

2. Install Python dependencies:

pip install -r requirements.txt

3. Configure the application:
   - Update subnet mappings in `server.py`
   - Configure client connection settings in `client.py`
   - Adjust monitoring thresholds if needed

4. Start the server:

python server.py

5. Deploy the client:

python client.py

## 🔧 Configuration

### Subnet Mapping
Configure branch organization in server.py:

SUBNET_MAPPING = {
"192.168.0": "Home",
"127.0.0": "Localhost",
"192.168.2": "subnet3",
}

### Monitoring Thresholds
Default critical thresholds:
- CPU Usage: 80%
- RAM Usage: 80%
- Disk Space: 80%
- Network Bandwidth: 0.6 MB/s

## 🎯 Usage

1. Access the dashboard: `http://localhost:5000`
2. Navigate branches via the sidebar
3. Monitor device status in real-time
4. Click devices for detailed information
5. Use search/filters to find specific devices
6. Mark important devices as favorites
7. Receive notifications for critical events
8. Connect remotely via AnyDesk integration

## 🔐 Security Features

- Secure WebSocket Connections
- Branch-specific Data Isolation
- No Sensitive Data Storage
- IP-based Access Control
- Rate Limiting Protection
- Subnet-based Authorization

## 🛠 Technical Stack

### Backend
- Flask Web Framework
- Flask-SocketIO
- Python psutil
- Gevent WebSocket

### Frontend
- HTML5/CSS3
- JavaScript
- Socket.IO Client
- Responsive Design
- Real-time Charts

### Communication
- WebSocket Protocol
- HTTP/REST APIs
- Real-time Events

## 📱 Mobile Support
- Responsive Design
- Touch-friendly Interface
- Mobile-first Approach
- Adaptive Layouts
- Performance Optimized

## 👥 Authors

- **Stviri** - *Initial work* - [GitHub Profile](https://github.com/Stviri)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Flask-SocketIO team
- AnyDesk for remote access capabilities
- All contributors and testers
- Open source community

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact the development team
- Check documentation
