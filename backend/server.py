from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import math
import random
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'vitalsense-secret-key-2024')
JWT_ALGORITHM = 'HS256'

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create the main FastAPI app
app = FastAPI(title="VitalSense AI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== MODELS ========================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "doctor"  # doctor or admin

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str

class DoctorCreate(BaseModel):
    name: str
    specialization: str
    license_number: str
    department: str
    shift_timing: str
    contact: str

class DoctorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    specialization: str
    license_number: str
    department: str
    shift_timing: str
    contact: str
    created_at: str

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    blood_group: str
    ward_bed: str
    assigned_doctor_id: str
    allergies: str = ""
    medications: str = ""
    emergency_contact: str
    # Past medical history
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    asthma: bool = False
    ckd: bool = False
    previous_icu: bool = False

class PatientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    age: int
    gender: str
    blood_group: str
    ward_bed: str
    assigned_doctor_id: str
    assigned_doctor_name: Optional[str] = None
    allergies: str
    medications: str
    emergency_contact: str
    diabetes: bool
    hypertension: bool
    heart_disease: bool
    asthma: bool
    ckd: bool
    previous_icu: bool
    created_at: str
    current_vitals: Optional[dict] = None
    risk_level: Optional[str] = None
    risk_score: Optional[int] = None

class AlertResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: str
    vital_affected: str
    risk_level: str
    description: str
    doctor_id: str
    doctor_name: str
    timestamp: str

# ======================== AUTH HELPERS ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ======================== RISK ENGINE ========================

def calculate_risk_score(vitals: dict) -> tuple:
    score = 0
    explanations = []
    abnormal_count = 0
    
    # SpO2 check
    spo2 = vitals.get('spo2', 98)
    if spo2 < 94:
        score += 20
        abnormal_count += 1
        explanations.append(f"Low SpO2: {spo2}%")
    
    # Heart rate check
    hr = vitals.get('heart_rate', 75)
    if hr > 120:
        score += 15
        abnormal_count += 1
        explanations.append(f"Tachycardia: {hr} bpm")
    elif hr < 50:
        score += 15
        abnormal_count += 1
        explanations.append(f"Bradycardia: {hr} bpm")
    
    # Blood pressure check
    bp_sys = vitals.get('bp_systolic', 120)
    if bp_sys < 90:
        score += 20
        abnormal_count += 1
        explanations.append(f"Hypotension: {bp_sys} mmHg")
    elif bp_sys > 180:
        score += 20
        abnormal_count += 1
        explanations.append(f"Hypertension: {bp_sys} mmHg")
    
    # Temperature check
    temp = vitals.get('temperature', 37.0)
    if temp > 39:
        score += 10
        abnormal_count += 1
        explanations.append(f"High fever: {temp}°C")
    
    # Respiratory rate check
    rr = vitals.get('respiratory_rate', 16)
    if rr > 25:
        score += 15
        abnormal_count += 1
        explanations.append(f"Tachypnea: {rr} breaths/min")
    
    # Multiple abnormal vitals multiplier
    if abnormal_count >= 2:
        score = int(score * 1.5)
        explanations.append("Multiple abnormal vitals detected")
    
    # Determine risk level
    if score >= 80:
        risk_level = "CRITICAL"
    elif score >= 60:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"
    
    return score, risk_level, explanations

# ======================== VITALS SIMULATION ========================

# Store patient vitals in memory for real-time updates
patient_vitals = {}
patient_vital_history = {}

def generate_ecg_point(t: float, deteriorating: bool = False) -> float:
    """Generate ECG-like waveform point"""
    # QRS complex simulation
    base = math.sin(2 * math.pi * t * 1.2) * 0.3
    qrs = math.exp(-((t % 1) - 0.5) ** 2 / 0.01) * 1.5
    noise = random.uniform(-0.05, 0.05)
    
    if deteriorating:
        # Add irregular patterns for deteriorating patients
        noise += random.uniform(-0.2, 0.2)
        if random.random() < 0.1:
            qrs *= 0.5  # Dropped beats
    
    return base + qrs + noise

def generate_vitals(patient_id: str, deteriorating: bool = False) -> dict:
    """Generate realistic vital signs"""
    prev_vitals = patient_vitals.get(patient_id, {})
    
    # Base values with slight variation from previous
    if deteriorating:
        # Deteriorating patient vitals
        hr = random.randint(125, 150) if random.random() < 0.7 else random.randint(40, 48)
        bp_sys = random.randint(75, 88) if random.random() < 0.6 else random.randint(185, 210)
        bp_dia = random.randint(45, 55) if bp_sys < 90 else random.randint(100, 120)
        spo2 = random.randint(85, 93)
        temp = round(random.uniform(39.1, 40.5), 1)
        rr = random.randint(26, 35)
    else:
        # Normal patient vitals with slight variations
        base_hr = prev_vitals.get('heart_rate', random.randint(65, 85))
        hr = max(55, min(100, base_hr + random.randint(-3, 3)))
        
        base_bp_sys = prev_vitals.get('bp_systolic', random.randint(110, 130))
        bp_sys = max(100, min(145, base_bp_sys + random.randint(-5, 5)))
        bp_dia = max(60, min(90, bp_sys - random.randint(35, 50)))
        
        base_spo2 = prev_vitals.get('spo2', random.randint(96, 99))
        spo2 = max(95, min(100, base_spo2 + random.randint(-1, 1)))
        
        base_temp = prev_vitals.get('temperature', round(random.uniform(36.5, 37.2), 1))
        temp = round(max(36.0, min(37.5, base_temp + random.uniform(-0.1, 0.1))), 1)
        
        base_rr = prev_vitals.get('respiratory_rate', random.randint(14, 18))
        rr = max(12, min(22, base_rr + random.randint(-1, 1)))
    
    # Generate ECG data points (30 points for mini waveform)
    ecg = [generate_ecg_point(i / 30, deteriorating) for i in range(30)]
    
    return {
        'heart_rate': hr,
        'bp_systolic': bp_sys,
        'bp_diastolic': bp_dia,
        'spo2': spo2,
        'temperature': temp,
        'respiratory_rate': rr,
        'ecg': ecg,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    existing = await db.users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': user.email,
        'password': hash_password(user.password),
        'name': user.name,
        'role': user.role,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.role)
    return {
        'token': token,
        'user': {'id': user_id, 'email': user.email, 'name': user.name, 'role': user.role}
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['role'])
    return {
        'token': token,
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role']}
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ======================== DOCTOR ROUTES ========================

@api_router.post("/doctors", response_model=DoctorResponse)
async def create_doctor(doctor: DoctorCreate, current_user: dict = Depends(get_current_user)):
    doctor_id = str(uuid.uuid4())
    doctor_doc = {
        'id': doctor_id,
        **doctor.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.doctors.insert_one(doctor_doc)
    return DoctorResponse(**doctor_doc)

@api_router.get("/doctors", response_model=List[DoctorResponse])
async def get_doctors(current_user: dict = Depends(get_current_user)):
    doctors = await db.doctors.find({}, {'_id': 0}).to_list(1000)
    return [DoctorResponse(**d) for d in doctors]

@api_router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(doctor_id: str, current_user: dict = Depends(get_current_user)):
    doctor = await db.doctors.find_one({'id': doctor_id}, {'_id': 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return DoctorResponse(**doctor)

# ======================== PATIENT ROUTES ========================

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    # Verify doctor exists
    doctor = await db.doctors.find_one({'id': patient.assigned_doctor_id}, {'_id': 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Assigned doctor not found")
    
    patient_id = str(uuid.uuid4())
    patient_doc = {
        'id': patient_id,
        **patient.model_dump(),
        'assigned_doctor_name': doctor['name'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.patients.insert_one(patient_doc)
    
    # Initialize vitals for this patient
    patient_vitals[patient_id] = generate_vitals(patient_id)
    patient_vital_history[patient_id] = []
    
    return PatientResponse(**patient_doc)

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(current_user: dict = Depends(get_current_user)):
    patients = await db.patients.find({}, {'_id': 0}).to_list(1000)
    result = []
    for p in patients:
        vitals = patient_vitals.get(p['id'], generate_vitals(p['id']))
        score, risk_level, _ = calculate_risk_score(vitals)
        p['current_vitals'] = vitals
        p['risk_level'] = risk_level
        p['risk_score'] = score
        result.append(PatientResponse(**p))
    return result

@api_router.get("/patients/{patient_id}", response_model=dict)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    vitals = patient_vitals.get(patient_id, generate_vitals(patient_id))
    score, risk_level, explanations = calculate_risk_score(vitals)
    
    # Get vital history for graphs (last 30 minutes = 900 data points at 2s intervals)
    history = patient_vital_history.get(patient_id, [])[-900:]
    
    # Get alerts for this patient
    alerts = await db.alerts.find({'patient_id': patient_id}, {'_id': 0}).sort('timestamp', -1).to_list(50)
    
    return {
        **patient,
        'current_vitals': vitals,
        'risk_level': risk_level,
        'risk_score': score,
        'risk_explanations': explanations,
        'vital_history': history,
        'alerts': alerts
    }

# ======================== ALERTS ROUTES ========================

@api_router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.alerts.find({}, {'_id': 0}).sort('timestamp', -1).to_list(100)
    return [AlertResponse(**a) for a in alerts]

async def create_alert(patient: dict, vital_name: str, risk_level: str, description: str):
    alert_id = str(uuid.uuid4())
    alert_doc = {
        'id': alert_id,
        'patient_id': patient['id'],
        'patient_name': patient['name'],
        'vital_affected': vital_name,
        'risk_level': risk_level,
        'description': description,
        'doctor_id': patient['assigned_doctor_id'],
        'doctor_name': patient.get('assigned_doctor_name', 'Unknown'),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    await db.alerts.insert_one(alert_doc)
    return alert_doc

# ======================== SOCKET.IO EVENTS ========================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_patient_room(sid, data):
    patient_id = data.get('patient_id')
    if patient_id:
        await sio.enter_room(sid, f"patient_{patient_id}")
        logger.info(f"Client {sid} joined room patient_{patient_id}")

@sio.event
async def leave_patient_room(sid, data):
    patient_id = data.get('patient_id')
    if patient_id:
        await sio.leave_room(sid, f"patient_{patient_id}")

# ======================== VITALS BROADCAST ========================

async def broadcast_vitals():
    """Broadcast vitals to all connected clients every 2 seconds"""
    while True:
        try:
            patients = await db.patients.find({}, {'_id': 0}).to_list(1000)
            
            for patient in patients:
                patient_id = patient['id']
                
                # Randomly make some patients deteriorate (5% chance)
                deteriorating = random.random() < 0.05
                
                # Generate new vitals
                vitals = generate_vitals(patient_id, deteriorating)
                patient_vitals[patient_id] = vitals
                
                # Store in history
                if patient_id not in patient_vital_history:
                    patient_vital_history[patient_id] = []
                patient_vital_history[patient_id].append(vitals)
                # Keep only last 30 minutes
                patient_vital_history[patient_id] = patient_vital_history[patient_id][-900:]
                
                # Calculate risk
                score, risk_level, explanations = calculate_risk_score(vitals)
                
                # Create alerts for high/critical
                if risk_level in ['HIGH', 'CRITICAL']:
                    for explanation in explanations:
                        if 'Multiple' not in explanation:
                            vital_name = explanation.split(':')[0] if ':' in explanation else explanation
                            await create_alert(patient, vital_name, risk_level, explanation)
                
                # Broadcast to dashboard
                await sio.emit('vitals_update', {
                    'patient_id': patient_id,
                    'vitals': vitals,
                    'risk_level': risk_level,
                    'risk_score': score
                })
                
                # Broadcast to patient-specific room
                await sio.emit('patient_vitals', {
                    'vitals': vitals,
                    'risk_level': risk_level,
                    'risk_score': score,
                    'explanations': explanations
                }, room=f"patient_{patient_id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting vitals: {e}")
        
        await asyncio.sleep(2)

# ======================== STARTUP/SHUTDOWN ========================

@app.on_event("startup")
async def startup():
    # Start vitals broadcast task
    asyncio.create_task(broadcast_vitals())
    logger.info("VitalSense AI started - vitals broadcast active")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ======================== ROOT ROUTES ========================

@api_router.get("/")
async def root():
    return {"message": "VitalSense AI API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
app = socket_app
