# Smart Home Automation System - Design Documentation Summary

**Version**: 2.0  
**Status**: Ready for Implementation  
**Target Pages**: 15-20 pages (Word format)

---

## 1. System Architecture

### 1.1 Architecture Overview
- **Architecture Style**: Microservices + Event-Driven
- **Communication**: REST APIs (client), MQTT (IoT devices), WebSocket (real-time)
- **Deployment**: Single VPS with PM2 or Docker Compose

### 1.2 High-Level Architecture
```
┌─────────────────────┐
│  Next.js Web App    │ (Client-Side Rendering)
│  (Browser/Mobile)   │
└──────────┬──────────┘
           │ HTTPS/WebSocket
┌──────────▼──────────┐
│   API Gateway       │ (Auth, Rate Limiting, Routing)
└──────────┬──────────┘
           │
┌──────────▼──────────────────────────────────┐
│        Microservices Layer                   │
│  User │ Device │ Room │ Schedule │ Face     │
│  Event │ Sensor │ Alert │ Analytics         │
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────┬──────────┬
│     MongoDB         │   MQTT   │
│  (Primary DB)       │  Broker  │ 
└─────────────────────┴──────────┴
           │
┌──────────▼──────────┐
│   IoT Devices       │ (ESP32, Raspberry Pi)
│ Lights │ Sensors    │
│ Locks │ Detectors   │
└─────────────────────┘
```

### 1.3 Core Components

**Client Layer**
- Next.js (CSR) + TypeScript + TailwindCSS
- Responsive design for all devices
- Real-time updates via WebSocket

**API Gateway**
- JWT authentication
- Rate limiting (5-100 req/min)
- Request routing to microservices

**Microservices** (Node.js + Express)
1. **User Service** (Port 3001): Authentication, RBAC
2. **Device Service** (Port 3002): Device control, MQTT
3. **Room Service** (Port 3003): Room management
4. **Schedule Service** (Port 3004): Cron jobs, automation
5. **Face Recognition** (Port 5000): Python, face_recognition
6. **Event Service** (Port 3005): Logging, events
7. **Sensor Data Service** (Port 3006): Time-series data, alert checking
8. **Alert Service** (Port 3007): Notifications (email, SMS, push)
9. **Analytics Service** (Port 3008): Reports, statistics

**Data Layer**
- MongoDB: Primary database (8 collections)
- MQTT Broker (Mosquitto): IoT communication
- Redis: Caching, sessions (optional)

---

## 2. Database Design

### 2.1 Collections (8 Total)

| Collection | Purpose | Retention |
|-----------|---------|-----------|
| users | User accounts, auth | Indefinite |
| rooms | Room organization | Indefinite |
| devices | IoT device registry | Indefinite |
| schedules | Automation schedules | Indefinite |
| schedule_logs | Execution history | 90 days (TTL) |
| alerts | Threshold-based alert rules | Indefinite |
| faces | Face recognition data | Indefinite |
| sensor_data | Time-series readings | 90 days (TTL) |
| events | System events, logs | 1 year |

### 2.2 Key Schemas

**User**
```javascript
{
  _id, email, password_hash, name, role,
  phone, notification_preferences, is_active,
  created_at, updated_at
}
// role: 'admin' | 'family' | 'guest'
```

**Device**
```javascript
{
  _id, name, device_type, room_id, user_id,
  mac_address, ip_address, mqtt_topic,
  status, is_active, properties,
  last_updated, created_at, updated_at
}
// device_type: 'light' | 'door_lock' | 'temperature_sensor' | 
//              'motion_sensor' | 'smoke_detector' | etc.
```

**Schedule**
```javascript
{
  _id, name, description, device_id, user_id,
  cron_expression, action, parameters,
  is_enabled, last_executed, next_execution,
  created_at, updated_at
}
```

**Alert** (Threshold-based Rules)
```javascript
{
  _id, name, user_id, device_id,
  alert_type, // 'temperature' | 'humidity' | 'motion' | 'smoke'
  condition: {
    operator, // '>' | '<' | '=' | '>=' | '<=' | '!='
    value     // threshold value (e.g., 30 for temperature)
  },
  enabled, last_triggered, trigger_count,
  created_at, updated_at
}
// Example: "High Temperature" alert triggers when temp > 30°C
```

**Sensor Data**
```javascript
{
  _id, device_id, room_id, device_type,
  data: { temperature, humidity, motion, etc. },
  timestamp, created_at
}
// TTL: 90 days auto-deletion
```

**Event**
```javascript
{
  _id, event_type, severity, device_id,
  room_id, user_id, message, data,
  is_resolved, resolved_at, timestamp,
  created_at
}
// severity: 'info' | 'warning' | 'critical'
```

### 2.3 Relationships
- User → Rooms (1:N)
- User → Devices (1:N)
- User → Alerts (1:N)
- Room → Devices (1:N)
- Device → Sensor Data (1:N)
- Device → Events (1:N)
- Device → Alerts (1:N)
- Schedule → Schedule Logs (1:N)

### 2.4 Indexes
```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })

// Devices
db.devices.createIndex({ user_id: 1, room_id: 1 })
db.devices.createIndex({ mac_address: 1 }, { unique: true })
db.devices.createIndex({ status: 1 })

// Sensor Data (with TTL)
db.sensor_data.createIndex({ device_id: 1, timestamp: -1 })
db.sensor_data.createIndex({ created_at: 1 }, 
  { expireAfterSeconds: 7776000 }) // 90 days

// Events
db.events.createIndex({ severity: 1, is_resolved: 1, timestamp: -1 })
```

---

## 3. API Design

### 3.1 Base URL
- **Production**: `https://api.smarthome.com/api/v1`
- **Development**: `http://localhost:3000/api/v1`

### 3.2 Authentication
All endpoints (except login/register) require JWT token:
```
Authorization: Bearer <token>
```

### 3.3 Standard Response Format
**Success**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error**
```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERR001",
  "errors": [ ... ]
}
```

### 3.4 Key Endpoints

**Authentication**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

**Devices**
- `GET /devices` - List all devices
- `GET /devices/:id` - Get device details
- `POST /devices` - Create device
- `POST /devices/:id/control` - Control device
- `PUT /devices/:id` - Update device
- `DELETE /devices/:id` - Delete device

**Rooms**
- `GET /rooms` - List all rooms
- `POST /rooms` - Create room
- `GET /rooms/:id/devices` - Get room with devices

**Schedules**
- `GET /schedules` - List all schedules
- `POST /schedules` - Create schedule
- `PUT /schedules/:id` - Update schedule
- `DELETE /schedules/:id` - Delete schedule
- `GET /schedules/:id/logs` - Get execution logs

**Alerts** (Threshold-based Rules)
- `GET /alerts` - List all alert rules
- `GET /alerts/:id` - Get alert rule details
- `POST /alerts` - Create alert rule
- `PUT /alerts/:id` - Update alert rule
- `DELETE /alerts/:id` - Delete alert rule
- `PATCH /alerts/:id/enable` - Enable/disable alert
- `GET /alerts/:id/history` - Get trigger history

**Face Recognition**
- `POST /faces/register` - Register face (multipart/form-data)
- `POST /faces/recognize` - Recognize face
- `GET /faces` - List registered faces
- `DELETE /faces/:id` - Delete face

**Sensor Data**
- `GET /sensor-data?device=:id` - Query sensor data
- `GET /sensor-data/:deviceId/latest` - Latest reading
- `GET /sensor-data/:deviceId/stats` - Statistics

**Events**
- `GET /events` - List events (filterable)
- `GET /events/:id` - Get event details
- `PATCH /events/:id/resolve` - Mark resolved

**User Management** (Admin only)
- `GET /users` - List all users
- `PATCH /users/:id/role` - Update user role
- `PUT /users/:id/notification-preferences` - Update notification settings
- `DELETE /users/:id` - Delete user

**Analytics**
- `GET /analytics/dashboard` - Dashboard summary
- `GET /analytics/device-usage` - Device usage report
- `GET /analytics/door-access` - Door access report

**Alerts/Notifications**
- `GET /alerts` - List all alerts
- `GET /alerts/:id` - Get alert details
- `POST /alerts/send` - Send manual alert
- `PATCH /alerts/:id/acknowledge` - Acknowledge alert
- `PUT /users/:id/notification-preferences` - Update notification settings

### 3.5 Rate Limiting
| Endpoint Type | Limit |
|--------------|-------|
| Authentication | 5 req/min |
| Device Control | 30 req/min |
| Data Queries | 60 req/min |
| Other | 100 req/min |

### 3.6 WebSocket Events
**Connection**: `wss://api.smarthome.com/ws`

**Event Types**:
1. `device_status` - Device status changes
2. `alert` - Critical alerts
3. `schedule_executed` - Schedule completion
4. `sensor_data` - Real-time sensor updates
5. `face_recognized` - Door access events

### 3.7 Alert Service Endpoints (Threshold-based Rules)

**Get All Alert Rules**
```http
GET /alerts
Authorization: Bearer {token}
Query Parameters:
  - device_id: Device ID (optional)
  - alert_type: temperature/humidity/motion/smoke (optional)
  - enabled: true/false (optional)

Response: 200 OK
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "69228fefa2a5a02c17f7139d",
      "name": "High Temperature",
      "user_id": "691c55c931569bff4bbb6e02",
      "device": {
        "_id": "69228e915a048f18fc0c6dc7",
        "name": "Living Room Temp Sensor"
      },
      "alert_type": "temperature",
      "condition": {
        "operator": ">",
        "value": 30
      },
      "enabled": true,
      "last_triggered": "2025-11-25T12:29:11.510Z",
      "trigger_count": 1,
      "created_at": "2025-11-23T04:39:11.727Z"
    }
  ]
}
```

**Create Alert Rule**
```http
POST /alerts
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "High Temperature Alert",
  "device_id": "69228e915a048f18fc0c6dc7",
  "alert_type": "temperature",
  "condition": {
    "operator": ">",
    "value": 30
  },
  "enabled": true
}

Response: 201 Created
{
  "success": true,
  "message": "Alert rule created successfully",
  "data": {
    "_id": "69228fefa2a5a02c17f7139d",
    "name": "High Temperature Alert",
    "device_id": "69228e915a048f18fc0c6dc7",
    "alert_type": "temperature",
    "condition": {
      "operator": ">",
      "value": 30
    },
    "enabled": true,
    "trigger_count": 0,
    "created_at": "2025-11-23T04:39:11.727Z"
  }
}
```

**Update Alert Rule**
```http
PUT /alerts/:id
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "Very High Temperature",
  "condition": {
    "operator": ">",
    "value": 35
  },
  "enabled": true
}

Response: 200 OK
{
  "success": true,
  "message": "Alert rule updated successfully",
  "data": { ... }
}
```

**Enable/Disable Alert**
```http
PATCH /alerts/:id/enable
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "enabled": false
}

Response: 200 OK
{
  "success": true,
  "message": "Alert rule disabled",
  "data": {
    "_id": "69228fefa2a5a02c17f7139d",
    "enabled": false
  }
}
```

**Get Alert Trigger History**
```http
GET /alerts/:id/history
Authorization: Bearer {token}
Query Parameters:
  - start_date: ISO 8601 date (optional)
  - end_date: ISO 8601 date (optional)
  - limit: Number (default: 50)

Response: 200 OK
{
  "success": true,
  "data": {
    "alert": {
      "_id": "69228fefa2a5a02c17f7139d",
      "name": "High Temperature"
    },
    "trigger_count": 15,
    "history": [
      {
        "triggered_at": "2025-11-25T12:29:11.510Z",
        "sensor_value": 32.5,
        "threshold": 30,
        "event_id": "69228f0fa2a5a02c17f7140a"
      }
    ]
  }
}
```

**Delete Alert Rule**
```http
DELETE /alerts/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Alert rule deleted successfully"
}
```

**Alert Processing Flow**
```
1. Sensor sends data → MQTT → Sensor Data Service
2. Sensor Data Service stores data in MongoDB
3. Sensor Data Service queries active alerts for this device
4. For each alert:
   - Check if condition is met (e.g., temperature > 30)
   - If YES:
     → Create Event (severity based on alert_type)
     → Update alert.last_triggered & alert.trigger_count
     → Alert Service sends notifications (email, SMS, push)
     → WebSocket broadcast to connected clients
5. User receives notification
```

**Alert Types & Operators**
| Alert Type | Supported Operators | Value Type | Example |
|-----------|-------------------|-----------|---------|
| temperature | >, <, >=, <=, =, != | Number (°C) | temp > 30 |
| humidity | >, <, >=, <=, =, != | Number (%) | humidity < 30 |
| motion | = | Boolean | motion = true |
| smoke | = | Boolean | smoke = true |
| rain | = | Boolean | rain = true |

**Alert Severity Mapping**
- **Critical**: smoke = true, temperature > 40°C
- **Warning**: temperature > 30°C, humidity < 20%
- **Info**: motion detected, rain detected

**Notification Channels**
| Severity | Email | SMS | Push | WebSocket |
|----------|-------|-----|------|-----------|
| Critical | ✅ | ✅ | ✅ | ✅ |
| Warning | ✅ | ❌ | ✅ | ✅ |
| Info | ❌ | ❌ | ✅ | ✅ |

**Alert Rate Limiting**
- Same alert cannot trigger more than once per 5 minutes
- Prevents notification spam for fluctuating sensor values

---

## 4. Communication Patterns

### 4.1 REST API (Client ↔ Server)
- **Protocol**: HTTPS
- **Format**: JSON
- **Use**: CRUD operations, queries

### 4.2 WebSocket (Real-time Updates)
- **Protocol**: WSS (WebSocket Secure)
- **Format**: JSON events
- **Use**: Live device status, alerts, notifications

### 4.3 MQTT (IoT Devices)
- **Broker**: Mosquitto
- **QoS**: 0 (status), 1 (commands), 2 (critical)
- **Topics**:
  - `home/device/{id}/command` (Server → Device)
  - `home/device/{id}/status` (Device → Server)
  - `home/sensor/{id}/data` (Sensor → Server)

### 4.4 Service-to-Service
- **Protocol**: HTTP (internal network)
- **Format**: JSON
- **Use**: Microservice communication

---

## 5. Key Workflows

### 5.1 User Controls Light
```
User → Web App → API Gateway → Device Service
  → MQTT → Light Device → MQTT → Device Service
  → MongoDB → WebSocket → User (real-time update)
```

### 5.2 Face Recognition Door Unlock
```
Person → Door Camera → Face Recognition Service
  → (match found) → Device Service → MQTT → Door Lock
  → Event Service (log) → Alert Service (notify)
  → WebSocket → User
```

### 5.3 Schedule Execution
```
Cron (every minute) → Schedule Service
  → Device Service → MQTT → Device
  → MongoDB (log) → Event Service
  → Alert Service (if enabled)
```

### 5.4 Smoke Detector Alert (Threshold-based)
```
1. Smoke Sensor → MQTT → Sensor Data Service
2. Sensor Data Service:
   - Stores data: { smoke_detected: true, level: 85 }
   - Queries alerts collection for this device
   - Finds: Alert "Smoke Detected" (smoke = true)
3. Alert condition met → Trigger alert:
   - Update alert.last_triggered & alert.trigger_count
   - Create Event (severity: CRITICAL)
4. Event Service → Alert Service
5. Alert Service:
   - Sends Email (SendGrid)
   - Sends Push Notification (FCM)
6. WebSocket → All Connected Clients
7. Users receive CRITICAL alert on all channels
```

---

## 6. Technology Stack

### 6.1 Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Face Recognition**: Python 3.9+, Flask, face_recognition

### 6.2 Frontend
- **Framework**: Next.js 14+ (Client-Side Rendering)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State**: Zustand / React Context

### 6.3 Database & Infrastructure
- **Database**: MongoDB 6.0+
- **Cache**: Redis 7.0+ (optional)
- **Message Broker**: Mosquitto MQTT
- **Process Manager**: PM2
- **Web Server**: Nginx

### 6.4 IoT Devices
- **Platforms**: ESP32, Raspberry Pi, Arduino
- **Languages**: C++, Python
- **Protocol**: MQTT

---

## 7. Deployment

### 7.1 Recommended: Single VPS + PM2

**Server Specs** (Medium Production)
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 8GB
- **CPU**: 4 cores
- **Storage**: 100GB SSD

**Stack**
```
Nginx (SSL/Reverse Proxy)
  ↓
PM2 (Process Manager)
  ├─ Next.js App (Port 3000)
  ├─ API Gateway (Port 4000)
  ├─ 9 Microservices (Ports 3001-3008, 5000)
  ↓
MongoDB (Port 27017)
Mosquitto MQTT (Ports 1883, 8883)
```

**PM2 Ecosystem**
```javascript
module.exports = {
  apps: [
    { name: 'nextjs-app', script: 'npm', args: 'start', cwd: './frontend' },
    { name: 'api-gateway', script: './src/index.js', instances: 2, exec_mode: 'cluster' },
    { name: 'user-service', script: './src/index.js', cwd: './backend/user-service' },
    // ... 7 more services
  ]
}
```

### 7.2 Nginx Configuration
```nginx
server {
  listen 443 ssl http2;
  server_name yourdomain.com;
  
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  
  location / {
    proxy_pass http://localhost:3000;  # Next.js
  }
  
  location /api {
    proxy_pass http://localhost:4000;  # API Gateway
  }
  
  location /ws {
    proxy_pass http://localhost:4000;  # WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
  }
}
```

### 7.3 Alternative: Docker Compose
```yaml
version: '3.8'
services:
  nextjs:
    build: ./frontend
    ports: ["3000:3000"]
  
  api-gateway:
    build: ./backend/api-gateway
    ports: ["4000:4000"]
  
  user-service:
    build: ./backend/user-service
  
  # ... other services
  
  mongodb:
    image: mongo:6.0
    volumes:
      - mongodb_data:/data/db
  
  mosquitto:
    image: eclipse-mosquitto:2
    ports: ["1883:1883", "8883:8883"]
```

---

## 8. Security

### 8.1 Authentication
- **Method**: JWT (JSON Web Tokens)
- **Password**: bcrypt hashing (12 salt rounds)
- **Token Expiry**: 7 days

### 8.2 Authorization
- **Roles**: admin, family, guest
- **Middleware**: Role-based access control (RBAC)

### 8.3 Communication Security
- **Client**: HTTPS only (TLS 1.2+)
- **MQTT**: TLS encryption, username/password per device
- **WebSocket**: WSS (Secure WebSocket)

### 8.4 Data Security
- Face data: Encrypted at rest
- Sensitive fields: MongoDB field-level encryption
- API: Rate limiting per user/IP

---

## 9. Monitoring & Maintenance

### 9.1 Monitoring
- **PM2**: Process monitoring (`pm2 status`, `pm2 logs`, `pm2 monit`)
- **Health Checks**: Service health endpoints
- **Logs**: PM2 log rotation, Nginx logs

### 9.2 Backup
- **MongoDB**: Daily `mongodump` (retain 30 days)
- **Files**: Face images, event images

### 9.3 Data Retention
- **Sensor Data**: 90 days (TTL index)
- **Schedule Logs**: 90 days (TTL index)
- **Events**: 1 year (manual cleanup)
- **Other**: Indefinite (user-managed)

---

## 10. Scalability Considerations

### 10.1 Horizontal Scaling
- Stateless microservices
- MongoDB replica sets
- Load balancers (Nginx)
- Redis clustering (optional)

### 10.2 Performance Optimization
- Redis caching for frequent queries
- Database indexing (compound indexes)
- MQTT QoS optimization
- WebSocket for real-time (not polling)
- TTL indexes for automatic cleanup

### 10.3 Resource Management
- Connection pooling (MongoDB, Redis)
- Rate limiting per user/IP
- Pagination for large datasets
- Lazy loading on frontend

---

## 11. Error Handling

### 11.1 Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH001 | Invalid credentials | 401 |
| AUTH002 | Token expired | 401 |
| AUTH003 | Insufficient permissions | 403 |
| DEV001 | Device not found | 404 |
| DEV002 | Device offline | 400 |
| SCH001 | Invalid cron expression | 400 |
| FACE001 | No face detected | 400 |
| FACE003 | Face not recognized | 404 |
| VAL001 | Validation error | 400 |
| SYS001 | Internal server error | 500 |

### 11.2 Client Error Handling
```typescript
try {
  const response = await axios.post('/api/v1/devices', data);
} catch (error) {
  if (error.response) {
    // Server error response
    switch (error.response.status) {
      case 400: displayValidationErrors(error.response.data.errors); break;
      case 401: redirectToLogin(); break;
      case 404: showNotFoundMessage(); break;
      case 500: showErrorToast('Server error'); break;
    }
  } else if (error.request) {
    // Network error
    showErrorToast('Network error');
  }
}
```

---

## 12. Development Setup

### 12.1 Prerequisites
- Node.js 18+
- MongoDB 6.0+
- Python 3.9+ (for face recognition)
- Mosquitto MQTT Broker

### 12.2 Installation
```bash
# Clone repository
git clone <repo-url>

# Backend services
cd backend
npm install

# Frontend
cd frontend
npm install

# Python face recognition service
cd backend/face-recognition-service
pip install -r requirements.txt
```

### 12.3 Environment Variables
```env
# .env
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/smarthome

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=admin
MQTT_PASSWORD=password

# Email (SendGrid)
SENDGRID_API_KEY=your_api_key

# Push Notifications (FCM)
FCM_SERVER_KEY=your_server_key
```

### 12.4 Run Development
```bash
# Start MongoDB
mongod

# Start MQTT Broker
mosquitto -c mosquitto.conf

# Start backend services (with PM2)
pm2 start ecosystem.config.js

# Or start individually
npm run dev:user-service
npm run dev:device-service
# ... other services

# Start frontend
cd frontend
npm run dev
```

---

## 13. Testing Strategy

### 13.1 Unit Tests
- Service logic testing
- Model validation testing
- Utility function testing

### 13.2 Integration Tests
- API endpoint testing
- Database operations testing
- MQTT message handling testing

### 13.3 E2E Tests
- User authentication flow
- Device control flow
- Schedule execution flow
- Face recognition flow

### 13.4 Testing Tools
- **Backend**: Jest, Supertest
- **Frontend**: Jest, React Testing Library
- **E2E**: Cypress / Playwright

---

## 14. Future Enhancements

### 14.1 Phase 2 Features
- Voice control (Alexa, Google Home integration)
- Mobile apps (React Native)
- Advanced analytics (ML predictions)
- Energy monitoring
- Multi-home support
- Third-party device integrations

### 14.2 Scalability Enhancements
- Kubernetes deployment
- Microservices mesh (Istio)
- GraphQL API (optional)
- TimescaleDB for time-series data
- Elasticsearch for advanced search

---

## 15. Documentation & Resources

### 15.1 Project Structure
```
smarthome-system/
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # Reusable components
│   │   ├── lib/              # API client, utils
│   │   └── stores/           # State management
│   └── package.json
├── backend/
│   ├── api-gateway/          # API Gateway service
│   ├── user-service/         # User management
│   ├── device-service/       # Device control
│   ├── room-service/         # Room management
│   ├── schedule-service/     # Scheduling & cron
│   ├── face-recognition/     # Face recognition (Python)
│   ├── event-service/        # Event logging
│   ├── sensor-data-service/  # Sensor data collection
│   ├── alert-service/        # Notifications
│   └── analytics-service/    # Reports & analytics
├── iot-devices/              # ESP32/Arduino code
├── docker-compose.yml        # Docker configuration
├── ecosystem.config.js       # PM2 configuration
└── docs/                     # Documentation
```

### 15.2 Key Documentation
- API Documentation (Postman/Swagger)
- Database Schema Documentation
- Deployment Guide
- User Manual
- IoT Device Setup Guide

---

## 16. Summary

### 16.1 System Highlights
- **Architecture**: Microservices + Event-Driven
- **Real-time**: WebSocket for instant updates
- **IoT Communication**: MQTT for efficient device control
- **Security**: JWT auth, RBAC, TLS encryption
- **Scalability**: Stateless services, MongoDB replica sets
- **Automation**: Cron-based scheduling
- **Face Recognition**: Python-based face recognition
- **Notifications**: Multi-channel (email, SMS, push)
- **Analytics**: Usage reports, door access logs

### 16.2 Key Metrics
- **9 Microservices**: Modular, independently deployable
- **8 Database Collections**: Normalized schema
- **40+ API Endpoints**: RESTful design
- **6 WebSocket Events**: Real-time updates
- **90-day Data Retention**: Automatic cleanup
- **100+ req/min**: Rate limiting per endpoint

### 16.3 Deployment Options
1. **Single VPS + PM2**: Simple, cost-effective (recommended)
2. **Docker Compose**: Container-based, scalable
3. **Cloud**: AWS/GCP/Azure (for large scale)

---

**Document Version**: 2.0  
**Last Updated**: December 5, 2025  
**Status**: Production-Ready  
**Estimated Implementation Time**: 8-12 weeks