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

# ======================== MULTIMODAL MODELS ========================

class MultimodalCreate(BaseModel):
    patient_id: str
    vitals_notes: str = ""
    doctor_notes: str = ""
    lab_reports: str = ""
    fluid_intake: float = 0.0  # in ml
    urine_output: float = 0.0  # in ml
    consciousness_level: str = "Alert"  # Alert, Verbal, Pain, Unresponsive (AVPU)
    ventilator_mode: str = "None"  # None, CPAP, BiPAP, SIMV, etc.
    timestamp: Optional[str] = None

class MultimodalUpdate(BaseModel):
    vitals_notes: Optional[str] = None
    doctor_notes: Optional[str] = None
    lab_reports: Optional[str] = None
    fluid_intake: Optional[float] = None
    urine_output: Optional[float] = None
    consciousness_level: Optional[str] = None
    ventilator_mode: Optional[str] = None

class MultimodalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    vitals_notes: str
    doctor_notes: str
    lab_reports: str
    fluid_intake: float
    urine_output: float
    consciousness_level: str
    ventilator_mode: str
    timestamp: str
    created_at: str

# ======================== BASELINE MODELS ========================

class BaselineCreate(BaseModel):
    patient_id: str
    baseline_hr: float = 75.0
    baseline_bp_systolic: float = 120.0
    baseline_bp_diastolic: float = 80.0
    baseline_spo2: float = 98.0
    baseline_temp: float = 37.0
    baseline_rr: float = 16.0

class BaselineUpdate(BaseModel):
    baseline_hr: Optional[float] = None
    baseline_bp_systolic: Optional[float] = None
    baseline_bp_diastolic: Optional[float] = None
    baseline_spo2: Optional[float] = None
    baseline_temp: Optional[float] = None
    baseline_rr: Optional[float] = None

class BaselineResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    baseline_hr: float
    baseline_bp_systolic: float
    baseline_bp_diastolic: float
    baseline_spo2: float
    baseline_temp: float
    baseline_rr: float
    created_at: str
    updated_at: str

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

def calculate_baseline_deviation(vitals: dict, baseline: dict) -> tuple:
    """Calculate risk based on deviation from patient's baseline"""
    score = 0
    explanations = []
    
    if not baseline:
        return 0, []
    
    # HR deviation (>20% from baseline)
    hr = vitals.get('heart_rate', 75)
    baseline_hr = baseline.get('baseline_hr', 75)
    hr_deviation = abs(hr - baseline_hr) / baseline_hr * 100
    if hr_deviation > 20:
        score += 10
        explanations.append(f"HR {hr_deviation:.0f}% deviation from baseline ({baseline_hr} bpm)")
    
    # BP deviation (>15% from baseline)
    bp_sys = vitals.get('bp_systolic', 120)
    baseline_bp = baseline.get('baseline_bp_systolic', 120)
    bp_deviation = abs(bp_sys - baseline_bp) / baseline_bp * 100
    if bp_deviation > 15:
        score += 10
        explanations.append(f"BP {bp_deviation:.0f}% deviation from baseline ({baseline_bp} mmHg)")
    
    # SpO2 deviation (>3% drop from baseline)
    spo2 = vitals.get('spo2', 98)
    baseline_spo2 = baseline.get('baseline_spo2', 98)
    spo2_drop = baseline_spo2 - spo2
    if spo2_drop > 3:
        score += 15
        explanations.append(f"SpO2 dropped {spo2_drop:.0f}% from baseline ({baseline_spo2}%)")
    
    # Temp deviation (>1°C from baseline)
    temp = vitals.get('temperature', 37.0)
    baseline_temp = baseline.get('baseline_temp', 37.0)
    temp_deviation = abs(temp - baseline_temp)
    if temp_deviation > 1:
        score += 8
        explanations.append(f"Temp {temp_deviation:.1f}°C deviation from baseline ({baseline_temp}°C)")
    
    # RR deviation (>25% from baseline)
    rr = vitals.get('respiratory_rate', 16)
    baseline_rr = baseline.get('baseline_rr', 16)
    rr_deviation = abs(rr - baseline_rr) / baseline_rr * 100
    if rr_deviation > 25:
        score += 10
        explanations.append(f"RR {rr_deviation:.0f}% deviation from baseline ({baseline_rr}/min)")
    
    return score, explanations

def analyze_trend_deterioration(vital_history: list) -> tuple:
    """Analyze last 30 minutes of vitals for deterioration trends"""
    if len(vital_history) < 10:
        return 0, [], False
    
    score = 0
    explanations = []
    deteriorating = False
    
    # Get recent history (last ~30 min at 3s intervals = ~600 points)
    recent = vital_history[-600:] if len(vital_history) > 600 else vital_history
    
    if len(recent) < 10:
        return 0, [], False
    
    # Calculate trends using linear regression approximation
    n = len(recent)
    
    # HR trend
    hr_values = [v.get('heart_rate', 75) for v in recent]
    hr_start = sum(hr_values[:10]) / 10
    hr_end = sum(hr_values[-10:]) / 10
    hr_change = hr_end - hr_start
    
    # SpO2 trend
    spo2_values = [v.get('spo2', 98) for v in recent]
    spo2_start = sum(spo2_values[:10]) / 10
    spo2_end = sum(spo2_values[-10:]) / 10
    spo2_change = spo2_end - spo2_start
    
    # BP trend
    bp_values = [v.get('bp_systolic', 120) for v in recent]
    bp_start = sum(bp_values[:10]) / 10
    bp_end = sum(bp_values[-10:]) / 10
    bp_change = bp_end - bp_start
    
    # RR trend
    rr_values = [v.get('respiratory_rate', 16) for v in recent]
    rr_start = sum(rr_values[:10]) / 10
    rr_end = sum(rr_values[-10:]) / 10
    rr_change = rr_end - rr_start
    
    # Temp trend
    temp_values = [v.get('temperature', 37.0) for v in recent]
    temp_start = sum(temp_values[:10]) / 10
    temp_end = sum(temp_values[-10:]) / 10
    temp_change = temp_end - temp_start
    
    # Detect deterioration patterns
    deterioration_signs = 0
    
    # Rising HR (>15 bpm increase)
    if hr_change > 15:
        score += 10
        explanations.append(f"HR trending up: +{hr_change:.0f} bpm over 30 min")
        deterioration_signs += 1
    
    # Falling SpO2 (>3% drop)
    if spo2_change < -3:
        score += 15
        explanations.append(f"SpO2 trending down: {spo2_change:.0f}% over 30 min")
        deterioration_signs += 1
    
    # Falling BP (>15 mmHg drop)
    if bp_change < -15:
        score += 12
        explanations.append(f"BP trending down: {bp_change:.0f} mmHg over 30 min")
        deterioration_signs += 1
    
    # Rising RR (>5 breaths/min increase)
    if rr_change > 5:
        score += 10
        explanations.append(f"RR trending up: +{rr_change:.0f}/min over 30 min")
        deterioration_signs += 1
    
    # Rising Temp (>0.5°C increase)
    if temp_change > 0.5:
        score += 8
        explanations.append(f"Temp trending up: +{temp_change:.1f}°C over 30 min")
        deterioration_signs += 1
    
    # If multiple deterioration signs, flag as predictive warning
    if deterioration_signs >= 2:
        deteriorating = True
        score += 20
    
    return score, explanations, deteriorating

def calculate_multimodal_risk(multimodal_records: list) -> tuple:
    """Calculate risk based on multimodal data"""
    if not multimodal_records:
        return 0, []
    
    score = 0
    explanations = []
    
    # Get most recent record
    latest = multimodal_records[-1] if multimodal_records else None
    if not latest:
        return 0, []
    
    # Consciousness level check
    consciousness = latest.get('consciousness_level', 'Alert')
    if consciousness == 'Unresponsive':
        score += 30
        explanations.append("Patient unresponsive (AVPU: U)")
    elif consciousness == 'Pain':
        score += 20
        explanations.append("Patient responds only to pain (AVPU: P)")
    elif consciousness == 'Verbal':
        score += 10
        explanations.append("Patient responds only to verbal (AVPU: V)")
    
    # Ventilator check
    ventilator = latest.get('ventilator_mode', 'None')
    if ventilator not in ['None', '']:
        score += 5
        explanations.append(f"On ventilator: {ventilator}")
    
    # Fluid balance (intake - output)
    fluid_intake = latest.get('fluid_intake', 0)
    urine_output = latest.get('urine_output', 0)
    
    # Low urine output (<0.5 ml/kg/hr for 70kg = <35ml/hr)
    if urine_output < 30 and fluid_intake > 0:
        score += 15
        explanations.append(f"Low urine output: {urine_output} ml")
    
    # Fluid overload (intake >> output)
    if fluid_intake > 0 and urine_output > 0:
        balance = fluid_intake - urine_output
        if balance > 500:
            score += 10
            explanations.append(f"Positive fluid balance: +{balance:.0f} ml")
    
    return score, explanations

def calculate_risk_score(vitals: dict, baseline: dict = None, vital_history: list = None, multimodal: list = None) -> tuple:
    score = 0
    explanations = []
    abnormal_count = 0
    predictive_warning = False
    
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
    
    # Add baseline deviation risk
    if baseline:
        baseline_score, baseline_explanations = calculate_baseline_deviation(vitals, baseline)
        score += baseline_score
        explanations.extend(baseline_explanations)
    
    # Add trend deterioration risk
    if vital_history:
        trend_score, trend_explanations, deteriorating = analyze_trend_deterioration(vital_history)
        score += trend_score
        explanations.extend(trend_explanations)
        predictive_warning = deteriorating
    
    # Add multimodal risk
    if multimodal:
        multimodal_score, multimodal_explanations = calculate_multimodal_risk(multimodal)
        score += multimodal_score
        explanations.extend(multimodal_explanations)
    
    # Determine risk level
    if score >= 80:
        risk_level = "CRITICAL"
    elif score >= 60:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"
    
    return score, risk_level, explanations, predictive_warning

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
    "access_token": token,
    "token_type": "bearer",
    "user": {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }
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

@api_router.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, current_user: dict = Depends(get_current_user)):
    # Check if doctor exists
    doctor = await db.doctors.find_one({'id': doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check if doctor has assigned patients
    assigned_patients = await db.patients.count_documents({'assigned_doctor_id': doctor_id})
    if assigned_patients > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete doctor with {assigned_patients} assigned patients")
    
    await db.doctors.delete_one({'id': doctor_id})
    return {"message": "Doctor deleted successfully"}

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
        history = patient_vital_history.get(p['id'], [])
        baseline = await db.baselines.find_one({'patient_id': p['id']}, {'_id': 0})
        multimodal = await db.multimodal.find({'patient_id': p['id']}, {'_id': 0}).sort('timestamp', -1).to_list(10)
        score, risk_level, _, predictive = calculate_risk_score(vitals, baseline, history, multimodal)
        p['current_vitals'] = vitals
        p['risk_level'] = risk_level
        p['risk_score'] = score
        p['predictive_warning'] = predictive
        result.append(PatientResponse(**p))
    return result

@api_router.get("/patients/{patient_id}", response_model=dict)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    vitals = patient_vitals.get(patient_id, generate_vitals(patient_id))
    
    # Get vital history for graphs (last 30 minutes = 600 data points at 3s intervals)
    history = patient_vital_history.get(patient_id, [])[-600:]
    
    # Get baseline and multimodal data
    baseline = await db.baselines.find_one({'patient_id': patient_id}, {'_id': 0})
    multimodal = await db.multimodal.find({'patient_id': patient_id}, {'_id': 0}).sort('timestamp', -1).to_list(20)
    
    score, risk_level, explanations, predictive_warning = calculate_risk_score(vitals, baseline, history, multimodal)
    
    # Get alerts for this patient
    alerts = await db.alerts.find({'patient_id': patient_id}, {'_id': 0}).sort('timestamp', -1).to_list(50)
    
    return {
        **patient,
        'current_vitals': vitals,
        'risk_level': risk_level,
        'risk_score': score,
        'risk_explanations': explanations,
        'vital_history': history,
        'alerts': alerts,
        'baseline': baseline,
        'multimodal': multimodal,
        'predictive_warning': predictive_warning
    }

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    # Check if patient exists
    patient = await db.patients.find_one({'id': patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Delete patient
    await db.patients.delete_one({'id': patient_id})
    
    # Clean up vitals data
    if patient_id in patient_vitals:
        del patient_vitals[patient_id]
    if patient_id in patient_vital_history:
        del patient_vital_history[patient_id]
    
    # Delete associated alerts
    await db.alerts.delete_many({'patient_id': patient_id})
    
    return {"message": "Patient discharged successfully"}

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

# ======================== MULTIMODAL ROUTES ========================

@api_router.post("/multimodal", response_model=MultimodalResponse)
async def create_multimodal(data: MultimodalCreate, current_user: dict = Depends(get_current_user)):
    # Verify patient exists
    patient = await db.patients.find_one({'id': data.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    record_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    record_doc = {
        'id': record_id,
        **data.model_dump(),
        'timestamp': data.timestamp or now,
        'created_at': now
    }
    await db.multimodal.insert_one(record_doc)
    return MultimodalResponse(**record_doc)

@api_router.get("/multimodal", response_model=List[MultimodalResponse])
async def get_multimodal(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {'patient_id': patient_id} if patient_id else {}
    records = await db.multimodal.find(query, {'_id': 0}).sort('timestamp', -1).to_list(100)
    return [MultimodalResponse(**r) for r in records]

@api_router.get("/multimodal/{record_id}", response_model=MultimodalResponse)
async def get_multimodal_record(record_id: str, current_user: dict = Depends(get_current_user)):
    record = await db.multimodal.find_one({'id': record_id}, {'_id': 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return MultimodalResponse(**record)

@api_router.put("/multimodal/{record_id}", response_model=MultimodalResponse)
async def update_multimodal(record_id: str, data: MultimodalUpdate, current_user: dict = Depends(get_current_user)):
    record = await db.multimodal.find_one({'id': record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.multimodal.update_one({'id': record_id}, {'$set': update_data})
    
    updated = await db.multimodal.find_one({'id': record_id}, {'_id': 0})
    return MultimodalResponse(**updated)

@api_router.delete("/multimodal/{record_id}")
async def delete_multimodal(record_id: str, current_user: dict = Depends(get_current_user)):
    record = await db.multimodal.find_one({'id': record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.multimodal.delete_one({'id': record_id})
    return {"message": "Record deleted successfully"}

# ======================== BASELINE ROUTES ========================

@api_router.post("/baseline", response_model=BaselineResponse)
async def create_baseline(data: BaselineCreate, current_user: dict = Depends(get_current_user)):
    # Verify patient exists
    patient = await db.patients.find_one({'id': data.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if baseline already exists for this patient
    existing = await db.baselines.find_one({'patient_id': data.patient_id})
    if existing:
        raise HTTPException(status_code=400, detail="Baseline already exists for this patient. Use PUT to update.")
    
    baseline_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    baseline_doc = {
        'id': baseline_id,
        **data.model_dump(),
        'created_at': now,
        'updated_at': now
    }
    await db.baselines.insert_one(baseline_doc)
    return BaselineResponse(**baseline_doc)

@api_router.get("/baseline", response_model=List[BaselineResponse])
async def get_baselines(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {'patient_id': patient_id} if patient_id else {}
    baselines = await db.baselines.find(query, {'_id': 0}).to_list(100)
    return [BaselineResponse(**b) for b in baselines]

@api_router.get("/baseline/{baseline_id}", response_model=BaselineResponse)
async def get_baseline(baseline_id: str, current_user: dict = Depends(get_current_user)):
    baseline = await db.baselines.find_one({'id': baseline_id}, {'_id': 0})
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not found")
    return BaselineResponse(**baseline)

@api_router.put("/baseline/{baseline_id}", response_model=BaselineResponse)
async def update_baseline(baseline_id: str, data: BaselineUpdate, current_user: dict = Depends(get_current_user)):
    baseline = await db.baselines.find_one({'id': baseline_id})
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.baselines.update_one({'id': baseline_id}, {'$set': update_data})
    updated = await db.baselines.find_one({'id': baseline_id}, {'_id': 0})
    return BaselineResponse(**updated)

@api_router.delete("/baseline/{baseline_id}")
async def delete_baseline(baseline_id: str, current_user: dict = Depends(get_current_user)):
    baseline = await db.baselines.find_one({'id': baseline_id})
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not found")
    await db.baselines.delete_one({'id': baseline_id})
    return {"message": "Baseline deleted successfully"}

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
    """Broadcast vitals to all connected clients every 3 seconds"""
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
                # Keep only last 30 minutes (600 points at 3s intervals)
                patient_vital_history[patient_id] = patient_vital_history[patient_id][-600:]
                
                # Get baseline and multimodal for enhanced risk calculation
                baseline = await db.baselines.find_one({'patient_id': patient_id}, {'_id': 0})
                multimodal = await db.multimodal.find({'patient_id': patient_id}, {'_id': 0}).sort('timestamp', -1).to_list(10)
                history = patient_vital_history.get(patient_id, [])
                
                # Calculate enhanced risk
                score, risk_level, explanations, predictive_warning = calculate_risk_score(vitals, baseline, history, multimodal)
                
                # Create alerts for high/critical
                if risk_level in ['HIGH', 'CRITICAL']:
                    for explanation in explanations:
                        if 'Multiple' not in explanation and 'trending' not in explanation.lower():
                            vital_name = explanation.split(':')[0] if ':' in explanation else explanation
                            await create_alert(patient, vital_name, risk_level, explanation)
                
                # Create predictive warning alert
                if predictive_warning:
                    await create_alert(patient, "Predictive Warning", "HIGH", 
                        "Possible patient deterioration in next 30 minutes.")
                
                # Broadcast to dashboard
                await sio.emit('vitals_update', {
                    'patient_id': patient_id,
                    'vitals': vitals,
                    'risk_level': risk_level,
                    'risk_score': score,
                    'predictive_warning': predictive_warning
                })
                
                # Broadcast to patient-specific room
                await sio.emit('patient_vitals', {
                    'vitals': vitals,
                    'risk_level': risk_level,
                    'risk_score': score,
                    'explanations': explanations,
                    'predictive_warning': predictive_warning
                }, room=f"patient_{patient_id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting vitals: {e}")
        
        await asyncio.sleep(3)

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
