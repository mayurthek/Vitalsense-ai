import requests
import sys
import json
from datetime import datetime

class VitalSenseAPITester:
    def __init__(self, base_url="https://patient-vitals-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.created_doctor_id = None
        self.created_patient_id = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, expect_json=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = self.headers.copy()
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            print(f"   Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")

            if expect_json:
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                return success, response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_register_admin(self):
        """Test user registration"""
        user_data = {
            "email": "admin@hospital.com",
            "password": "admin123",
            "name": "Admin User",
            "role": "admin"
        }
        success, response = self.run_test("Register Admin User", "POST", "auth/register", 200, user_data)
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Token received: {self.token[:20]}...")
        return success
    
    def test_register_doctor(self):
        """Test doctor user registration"""
        user_data = {
            "email": "doctor@hospital.com", 
            "password": "doctor123",
            "name": "Dr. Smith",
            "role": "doctor"
        }
        success, response = self.run_test("Register Doctor User", "POST", "auth/register", 200, user_data)
        return success

    def test_login(self):
        """Test login with registered credentials"""
        login_data = {
            "email": "admin@hospital.com",
            "password": "admin123"
        }
        success, response = self.run_test("Login", "POST", "auth/login", 200, login_data)
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Login successful, token: {self.token[:20]}...")
        return success

    def test_get_me(self):
        """Test get current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_create_doctor(self):
        """Test creating a doctor"""
        doctor_data = {
            "name": "Dr. John Smith",
            "specialization": "Critical Care Medicine", 
            "license_number": "MD-12345",
            "department": "ICU",
            "shift_timing": "8AM - 8PM",
            "contact": "+1 234 567 8900"
        }
        success, response = self.run_test("Create Doctor", "POST", "doctors", 200, doctor_data)
        if success and 'id' in response:
            self.created_doctor_id = response['id']
            print(f"   ✅ Doctor created with ID: {self.created_doctor_id}")
        return success

    def test_get_doctors(self):
        """Test fetching all doctors"""
        success, response = self.run_test("Get All Doctors", "GET", "doctors", 200)
        if success:
            print(f"   ✅ Retrieved {len(response)} doctors")
        return success

    def test_get_doctor_by_id(self):
        """Test fetching specific doctor"""
        if not self.created_doctor_id:
            print("   ⚠️ Skipped - No doctor ID available")
            return True
        return self.run_test("Get Doctor by ID", "GET", f"doctors/{self.created_doctor_id}", 200)

    def test_create_patient(self):
        """Test creating a patient"""
        if not self.created_doctor_id:
            print("   ⚠️ Skipped - No doctor ID available")
            return True
            
        patient_data = {
            "name": "Jane Doe",
            "age": 45,
            "gender": "Female",
            "blood_group": "A+",
            "ward_bed": "ICU-01",
            "assigned_doctor_id": self.created_doctor_id,
            "allergies": "Penicillin",
            "medications": "Metformin",
            "emergency_contact": "+1 987 654 3210",
            "diabetes": True,
            "hypertension": False,
            "heart_disease": False,
            "asthma": False,
            "ckd": False,
            "previous_icu": False
        }
        success, response = self.run_test("Create Patient", "POST", "patients", 200, patient_data)
        if success and 'id' in response:
            self.created_patient_id = response['id']
            print(f"   ✅ Patient created with ID: {self.created_patient_id}")
        return success

    def test_get_patients(self):
        """Test fetching all patients"""
        success, response = self.run_test("Get All Patients", "GET", "patients", 200)
        if success:
            print(f"   ✅ Retrieved {len(response)} patients")
            if response and len(response) > 0:
                patient = response[0]
                if 'current_vitals' in patient and 'risk_level' in patient:
                    print(f"   ✅ Patient has vitals and risk data")
                else:
                    print(f"   ⚠️ Patient missing vitals or risk data")
        return success

    def test_get_patient_by_id(self):
        """Test fetching specific patient with detailed info"""
        if not self.created_patient_id:
            print("   ⚠️ Skipped - No patient ID available")
            return True
        success, response = self.run_test("Get Patient by ID", "GET", f"patients/{self.created_patient_id}", 200)
        if success:
            required_fields = ['current_vitals', 'risk_level', 'risk_score', 'risk_explanations', 'vital_history']
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Has {field}")
                else:
                    print(f"   ⚠️ Missing {field}")
        return success

    def test_get_alerts(self):
        """Test fetching alerts"""
        return self.run_test("Get Alerts", "GET", "alerts", 200)

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "invalid@hospital.com",
            "password": "wrongpassword"
        }
        return self.run_test("Invalid Login", "POST", "auth/login", 401, login_data)

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        success, _ = self.run_test("Unauthorized Access", "GET", "doctors", 401)
        self.token = temp_token  # Restore token
        return success

def main():
    print("🏥 VitalSense AI - Backend API Testing")
    print("=" * 50)
    
    tester = VitalSenseAPITester()
    
    # Health and Auth Tests
    tests = [
        tester.test_health,
        tester.test_register_admin,
        tester.test_login,
        tester.test_get_me,
        tester.test_register_doctor,
        tester.test_invalid_login,
        tester.test_unauthorized_access,
    ]
    
    # Doctor Management Tests
    tests.extend([
        tester.test_create_doctor,
        tester.test_get_doctors,
        tester.test_get_doctor_by_id,
    ])
    
    # Patient Management Tests  
    tests.extend([
        tester.test_create_patient,
        tester.test_get_patients,
        tester.test_get_patient_by_id,
    ])
    
    # Alerts Tests
    tests.extend([
        tester.test_get_alerts,
    ])
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed = tester.tests_run - tester.tests_passed
        print(f"❌ {failed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())