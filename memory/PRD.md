# VitalSense AI - ICU Monitoring System PRD

## Original Problem Statement
Build a production-ready full-stack ICU monitoring system called VitalSense AI with:
- React + TailwindCSS + Recharts frontend
- FastAPI + MongoDB backend
- Socket.io for real-time vitals every 2 seconds
- Features: Authentication, Doctor/Patient Management, ICU Dashboard, Risk Engine, Alerts System

## User Personas
1. **ICU Doctors** - Monitor multiple patients simultaneously, receive critical alerts
2. **Hospital Administrators** - Manage doctors and patient admissions
3. **ICU Nurses** - View real-time vitals and respond to alerts

## Core Requirements (Static)
- JWT-based authentication with role-based access (doctor/admin)
- Doctor Management: name, specialization, license, department, shift, contact
- Patient Management: demographics, medical history, assigned doctor
- ICU Dashboard: 3x2 grid showing 6 patients with real-time vitals
- Patient Detail: 30-minute graphs for all vitals
- Risk Engine: Rule-based scoring (SpO2, HR, BP, Temp, RR)
- Alerts System: Timeline with risk level, vital affected, timestamp
- Dark medical theme (#0b1320 bg, #00d4ff accent)
- Sound notifications for critical alerts

## What's Been Implemented (March 6, 2026)
### Backend (/app/backend/server.py)
- [x] FastAPI server with Socket.IO integration
- [x] MongoDB models: Users, Doctors, Patients, Alerts
- [x] JWT authentication (register/login/me)
- [x] Doctor CRUD: POST/GET /api/doctors
- [x] Patient CRUD: POST/GET /api/patients, GET /api/patients/:id
- [x] Alerts API: GET /api/alerts
- [x] Risk Engine: Calculate risk score based on vital thresholds
- [x] Vitals Simulation: Generate realistic vitals every 2 seconds
- [x] ECG Waveform: Sine wave + noise simulation
- [x] Real-time broadcasting via Socket.IO

### Frontend (/app/frontend/src/)
- [x] Login Page with glassmorphism card
- [x] Dashboard with 3x2 patient grid
- [x] Patient Cards: vitals display + mini ECG
- [x] Patient Detail Page: real-time graphs, medical history
- [x] Doctor Management: add/list doctors
- [x] Patient Management: admit patients with medical history
- [x] Alerts Page: timeline view with filtering
- [x] Navbar: navigation + user menu
- [x] Risk Badges: color-coded (LOW/MODERATE/HIGH/CRITICAL)
- [x] ECG Charts: animated waveform using SVG
- [x] Vital Charts: Recharts AreaChart for 30-min history
- [x] Sound notifications for critical patients
- [x] Dark medical theme throughout

## Architecture
```
Frontend (React 19 + TailwindCSS)
├── Context: AuthContext, SocketContext
├── Pages: Login, Dashboard, PatientDetail, DoctorManagement, PatientManagement, Alerts
├── Components: Navbar, PatientCard, RiskBadge, ECGChart, VitalChart
└── Services: api.js (axios)

Backend (FastAPI + Socket.IO)
├── Auth: JWT-based, bcrypt hashing
├── Models: User, Doctor, Patient, Alert (Pydantic)
├── Risk Engine: Rule-based scoring
└── Simulation: Real-time vitals generation

Database (MongoDB)
├── users, doctors, patients, alerts collections
```

## Risk Scoring Rules
| Condition | Points |
|-----------|--------|
| SpO2 < 94% | +20 |
| HR > 120 or < 50 | +15 |
| BP systolic < 90 or > 180 | +20 |
| Temperature > 39°C | +10 |
| Respiratory Rate > 25 | +15 |
| Multiple abnormal vitals | ×1.5 multiplier |

| Score | Risk Level |
|-------|------------|
| 0-29 | LOW |
| 30-59 | MODERATE |
| 60-79 | HIGH |
| 80+ | CRITICAL |

## Prioritized Backlog

### P0 (Critical) - Done
- [x] Authentication system
- [x] Patient card with vitals
- [x] Real-time updates
- [x] Risk calculation

### P1 (High Priority)
- [ ] Persist vital history in MongoDB (currently in-memory)
- [ ] Add delete/update for doctors and patients
- [ ] Implement user roles permissions (admin vs doctor)
- [ ] Add pagination for alerts list

### P2 (Medium Priority)
- [ ] Export patient data to PDF
- [ ] Shift handover notes
- [ ] Custom alert thresholds per patient
- [ ] Mobile responsive improvements
- [ ] Dark/Light theme toggle

### P3 (Low Priority)
- [ ] Patient discharge workflow
- [ ] Medication management
- [ ] Lab results integration
- [ ] Trend analysis with AI predictions

## Next Action Items
1. Add more patients to test 3x2 grid display
2. Test critical patient alerts with sound
3. Verify real-time graph updates over 30 minutes
4. Consider adding patient discharge functionality
