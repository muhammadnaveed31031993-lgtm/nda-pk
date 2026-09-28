import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // Authentication & Session States
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // User Access Scope & Permissions
  const [userRole, setUserRole] = useState({
    is_admin: true,
    assigned_department: 'All',
    can_view_dashboard: true,
    can_use_bulk: true,
    can_view_workers: true,
    can_add_workers: true,
    can_view_timesheet: true,
    can_view_payroll: true
  });

  // Global Settings & Filters
  const [selectedCurrency, setSelectedCurrency] = useState('AED');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Data States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);

  // Edit / Add Worker Form States
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [designation, setDesignation] = useState('Plumber');
  const [basicSalary, setBasicSalary] = useState('');
  const [religion, setReligion] = useState('Muslim');

  // File Upload URL States (JPG / PNG / PDF)
  const [passportFileUrl, setPassportFileUrl] = useState('');
  const [idCardFileUrl, setIdCardFileUrl] = useState('');
  const [medicalCardFileUrl, setMedicalCardFileUrl] = useState('');
  const [visaFileUrl, setVisaFileUrl] = useState('');
  const [labourCardFileUrl, setLabourCardFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Personal Documents Module States
  const [personalDocTitle, setPersonalDocTitle] = useState('');
  const [personalDocCategory, setPersonalDocCategory] = useState('Visa');
  const [personalFileUrl, setPersonalFileUrl] = useState('');

  // OCR Photo Scanner States
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Permission / User Creation & Editing States
  const [editingEmail, setEditingEmail] = useState(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [targetDept, setTargetDept] = useState('Plumbing');
  const [permDashboard, setPermDashboard] = useState(true);
  const [permBulk, setPermBulk] = useState(false);
  const [permWorkers, setPermWorkers] = useState(false);
  const [permAddWorkers, setPermAddWorkers] = useState(false);
  const [permTimesheet, setPermTimesheet] = useState(true);
  const [permPayroll, setPermPayroll] = useState(false);

  // Edit Attendance State
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editAttStatus, setEditAttStatus] = useState('Present');
  const [editAttOT, setEditAttOT] = useState('0');

  // Bulk Operations State
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');

  // Daily Overtime per worker
  const [overtimeInputs, setOvertimeInputs] = useState({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const savedUser = localStorage.getItem('nda_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setSession(parsed);
        if (parsed.role) setUserRole(parsed.role);
      } catch (e) {
        localStorage.removeItem('nda_user_session');
      }
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWorkers();
      fetchAttendance();
      fetchPermissionsList();
      fetchPersonalDocs();
    }
  }, [session]);

  async function fetchPersonalDocs() {
    const { data } = await supabase.from('personal_docs').select('*').order('id', { ascending: false });
    setPersonalDocs(data || []);
  }

  async function fetchPermissionsList() {
    const { data } = await supabase.from('user_permissions').select('*');
    setPermissionsList(data || []);
  }

  async function fetchWorkers() {
    setLoading(true);
    const { data } = await supabase.from('workers').select('*').order('id', { ascending: true });
    setWorkers(data || []);
    setLoading(false);
  }

  async function fetchAttendance() {
    const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    setAttendance(data || []);
  }

  async function handleScanPaperSheet(event) {
    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Sheet ki photo Gemini OCR se scan ho rahi hai, please wait...');

    try {
      const apiKey = "AQ.Ab8RN6KiOT2MaWs5C3838Kug-DN99S7E6mx2186APH6BPshKuA";
      if (!apiKey) {
        throw new Error("Gemini API Key nahi mili! Apni .env file check karein.");
      }

      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (err) => reject(err);
      });

      const prompt = `Extract table data from this daily attendance sheet image. 
      Return ONLY a valid raw JSON array of objects without markdown fences or extra text.
      Each object must contain:
      - "id_no": (number, ID from ID No column)
      - "working_days": (number: 1 if present or working, 0 if absent)
      - "overtime": (number, total overtime hours, default 0 if blank)
      Ignore blank rows.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim()
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: file.type || 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message}`);
      }

      if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        throw new Error("Gemini se koi valid response nahi mila.");
      }

      const responseText = data.candidates[0].content.parts[0].text;
      
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const parsedData = JSON.parse(cleanJson);
      const rows = Array.isArray(parsedData) ? parsedData : (parsedData.rows || []);

      if (rows.length === 0) {
        throw new Error("Sheet se koi valid data extract nahi ho saka.");
      }

      setScanStatus('Data extract ho gaya, Database mein save ho raha hai...');

      const recordsToInsert = rows.map((item) => ({
        worker_id: Number(item.id_no),
        date: today,
        status: item.working_days > 0 ? 'Present' : 'Absent',
        overtime_hours: Number(item.overtime || 0)
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToInsert, { onConflict: 'worker_id,date' });

      if (error) throw new Error(`Supabase Error: ${error.message}`);

      setScanStatus(`Success! Total ${recordsToInsert.length} workers ka data save ho gaya.`);
      fetchAttendance();

    } catch (err) {
      console.error(err);
      setScanStatus('Scan Error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleFileUpload(file, docTypeSetter) {
    if (!file) return;
    try {
      setUploadingFile(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('worker-documents')
        .upload(filePath, file);

      if (uploadError) {
        alert('File Upload Error: ' + uploadError.message);
        setUploadingFile(false);
        return;
      }

      const { data } = supabase.storage.from('worker-documents').getPublicUrl(filePath);
      docTypeSetter(data.publicUrl);
      alert('Document uploaded successfully!');
    } catch (err) {
      alert('Upload Error: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSavePersonalDoc(e) {
    e.preventDefault();
    if (!personalDocTitle.trim() || !personalFileUrl) {
      return alert('Document Title aur File Upload dono zaroori hain!');
    }

    const newDoc = {
      doc_title: personalDocTitle.trim(),
      doc_category: personalDocCategory,
      file_url: personalFileUrl,
      file_type: personalFileUrl.endsWith('.pdf') ? 'PDF' : 'Image'
    };

    const { error } = await supabase.from('personal_docs').insert([newDoc]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Naveed Personal Document saved successfully!');
      setPersonalDocTitle('');
      setPersonalFileUrl('');
      fetchPersonalDocs();
    }
  }

  async function handleDeletePersonalDoc(id) {
    if (window.confirm('Kya aap yeh personal document delete karna chahte hain?')) {
      const { error } = await supabase.from('personal_docs').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchPersonalDocs();
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanEmail === 'admin@nda.pk' && cleanPassword === '123456') {
      const adminRole = {
        is_admin: true,
        assigned_department: 'All',
        can_view_dashboard: true,
        can_use_bulk: true,
        can_view_workers: true,
        can_add_workers: true,
        can_view_timesheet: true,
        can_view_payroll: true
      };
      const sessionObj = { user: { email: cleanEmail }, role: adminRole };
      setSession(sessionObj);
      setUserRole(adminRole);
      localStorage.setItem('nda_user_session', JSON.stringify(sessionObj));
      setAuthLoading(false);
      return;
    }

    const { data: userPerm } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_email', cleanEmail)
      .eq('user_password', cleanPassword)
      .maybeSingle();

    if (userPerm) {
      const staffRole = {
        is_admin: false,
        assigned_department: userPerm.assigned_department || 'All',
        can_view_dashboard: userPerm.can_view_dashboard ?? true,
        can_use_bulk: userPerm.can_use_bulk ?? false,
        can_view_workers: userPerm.can_view_workers ?? false,
        can_add_workers: userPerm.can_add_workers ?? false,
        can_view_timesheet: userPerm.can_view_timesheet ?? true,
        can_view_payroll: userPerm.can_view_payroll ?? false
      };

      const sessionObj = { user: { email: cleanEmail }, role: staffRole };
      setSession(sessionObj);
      setUserRole(staffRole);

      if (staffRole.assigned_department !== 'All') {
        setSelectedDeptFilter(staffRole.assigned_department);
      }

      if (staffRole.can_view_dashboard) setActiveTab('dashboard');
      else if (staffRole.can_use_bulk) setActiveTab('bulk');
      else if (staffRole.can_view_workers) setActiveTab('workers');
      else if (staffRole.can_view_timesheet) setActiveTab('attendance');
      else if (staffRole.can_view_payroll) setActiveTab('payroll');

      localStorage.setItem('nda_user_session', JSON.stringify(sessionObj));
    } else {
      alert('Invalid Email or Password!');
    }

    setAuthLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem('nda_user_session');
    setSession(null);
  }

  async function handleDeleteWorker(id) {
    if (!userRole.is_admin && !userRole.can_add_workers) {
      return alert('Aap ke paas worker delete karne ki permission nahi hai!');
    }
    if (window.confirm(`Kya aap Worker #${id} ko delete karna chahte hain?`)) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else {
        alert('Worker delete ho gaya!');
        fetchWorkers();
      }
    }
  }

  function handleStartEditWorker(worker) {
    setEditingWorkerId(worker.id);
    setWorkerIdInput(worker.id);
    setName(worker.name);
    setDepartment(worker.department || 'Plumbing');
    setDesignation(worker.designation || 'Worker');
    setBasicSalary(worker.basic_salary || worker.daily_rate || '');
    setReligion(worker.religion || 'Muslim');
    setPassportFileUrl(worker.passport_file_url || '');
    setIdCardFileUrl(worker.id_card_file_url || '');
    setMedicalCardFileUrl(worker.medical_card_file_url || '');
    setVisaFileUrl(worker.visa_file_url || '');
    setLabourCardFileUrl(worker.labour_card_file_url || '');
  }

  function resetWorkerForm() {
    setEditingWorkerId(null);
    setWorkerIdInput('');
    setName('');
    setDepartment('Plumbing');
    setDesignation('Plumber');
    setBasicSalary('');
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  async function handleSaveWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin && !userRole.can_add_workers) {
      return alert('Aap ke paas worker add/edit karne ki permission nahi hai!');
    }
    if (!name.trim() || !basicSalary) {
      return alert('Name aur Basic Salary required hain!');
    }

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      designation: designation.trim(),
      basic_salary: Number(basicSalary),
      religion,
      currency: selectedCurrency,
      passport_file_url: passportFileUrl,
      id_card_file_url: idCardFileUrl,
      medical_card_file_url: medicalCardFileUrl,
      visa_file_url: visaFileUrl,
      labour_card_file_url: labourCardFileUrl
    };

    if (editingWorkerId) {
      const { error } = await supabase.from('workers').update(workerData).eq('id', editingWorkerId);
      if (error) alert('Error: ' + error.message);
      else {
        alert('Worker data updated successfully!');
        resetWorkerForm();
        fetchWorkers();
      }
    } else {
      if (workerIdInput) {
        const existing = workers.find(w => Number(w.id) === Number(workerIdInput));
        if (existing) {
          return alert(`Worker ID #${workerIdInput} pehle se assign hai!`);
        }
      }

      const nextAutoId = workers.length > 0 ? Math.max(...workers.map(w => Number(w.id) || 0)) + 1 : 1;
      const finalWorkerId = workerIdInput ? Number(workerIdInput) : nextAutoId;

      const { error } = await supabase.from('workers').insert([{ id: finalWorkerId, ...workerData }]);
      if (error) alert('Error: ' + error.message);
      else {
        alert('Naya Worker add ho gaya!');
        resetWorkerForm();
        fetchWorkers();
      }
    }
  }

  async function handleSaveAttendanceEdit(attId) {
    const { error } = await supabase
      .from('attendance')
      .update({ status: editAttStatus, overtime_hours: Number(editAttOT) })
      .eq('id', attId);

    if (error) alert('Error: ' + error.message);
    else {
      alert('Attendance record updated!');
      setEditingAttendanceId(null);
      fetchAttendance();
    }
  }

  async function handleDeleteAttendance(attId) {
    if (window.confirm('Kya aap is attendance record ko delete karna chahte hain?')) {
      const { error } = await supabase.from('attendance').delete().eq('id', attId);
      if (error) alert('Error: ' + error.message);
      else fetchAttendance();
    }
  }

  async function handleBulkAttendance() {
    if (!userRole.is_admin && !userRole.can_use_bulk) {
      return alert('Aap ke paas Bulk Logging ki permission nahi hai!');
    }
    const deptWorkers = workers.filter(w => w.department.toLowerCase() === bulkDepartment.toLowerCase());
    if (deptWorkers.length === 0) return alert(`Department ${bulkDepartment} mein koi worker nahi mila!`);

    const records = deptWorkers.map(w => ({
      worker_id: w.id,
      date: today,
      status: bulkStatus,
      overtime_hours: Number(bulkOT),
      department: w.department
    }));

    const { error } = await supabase.from('attendance').insert(records);
    if (error) alert('Bulk Logging Error: ' + error.message);
    else {
      alert(`Department ${bulkDepartment} ke ${deptWorkers.length} workers ki attendance update ho gayi!`);
      fetchAttendance();
    }
  }

  async function handleMarkAttendance(workerId, status) {
    if (!userRole.is_admin && !userRole.can_view_timesheet) {
      return alert('Aap ke paas Timesheet ki permission nahi hai!');
    }
    const otHours = Number(overtimeInputs[workerId] || 0);
    const worker = workers.find(w => w.id === workerId);
    
    const { error } = await supabase.from('attendance').insert([
      { worker_id: workerId, date: today, status, overtime_hours: otHours, department: worker?.department }
    ]);

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  function handleStartEditUser(user) {
    setEditingEmail(user.user_email);
    setTargetEmail(user.user_email);
    setTargetPassword(user.user_password);
    setTargetDept(user.assigned_department || 'Plumbing');
    setPermDashboard(user.can_view_dashboard ?? true);
    setPermBulk(user.can_use_bulk ?? false);
    setPermWorkers(user.can_view_workers ?? false);
    setPermAddWorkers(user.can_add_workers ?? false);
    setPermTimesheet(user.can_view_timesheet ?? true);
    setPermPayroll(user.can_view_payroll ?? false);
  }

  function resetPermForm() {
    setEditingEmail(null);
    setTargetEmail('');
    setTargetPassword('');
    setTargetDept('Plumbing');
    setPermDashboard(true);
    setPermBulk(false);
    setPermWorkers(false);
    setPermAddWorkers(false);
    setPermTimesheet(true);
    setPermPayroll(false);
  }

  async function handleSavePermission(e) {
    e.preventDefault();
    if (!targetEmail || !targetPassword) return alert('Email aur Password dono enter karein!');

    try {
      const permData = {
        user_email: targetEmail.trim().toLowerCase(),
        user_password: targetPassword.trim(),
        assigned_department: targetDept,
        can_view_dashboard: permDashboard,
        can_use_bulk: permBulk,
        can_view_workers: permWorkers,
        can_add_workers: permAddWorkers,
        can_view_timesheet: permTimesheet,
        can_view_payroll: permPayroll,
        is_admin: false
      };

      const { error: permError } = await supabase
        .from('user_permissions')
        .upsert([permData], { onConflict: 'user_email' });

      if (permError) alert('Permission Save Error: ' + permError.message);
      else {
        alert(`User permissions successfully saved!`);
        resetPermForm();
        fetchPermissionsList();
      }
    } catch (err) {
      alert('System Error: ' + err.message);
    }
  }

  async function handleDeleteUserPermission(userEmail) {
    if (window.confirm(`Delete access for ${userEmail}?`)) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_email', userEmail);
      if (error) alert('Error: ' + error.message);
      else {
        fetchPermissionsList();
        if (editingEmail === userEmail) resetPermForm();
      }
    }
  }

  const filteredWorkers = workers.filter(w => {
    const userDeptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
    if (!userDeptScope || userDeptScope === 'All') return true;
    return w.department.toLowerCase() === userDeptScope.toLowerCase();
  });

  const activeWorkerIds = new Set(filteredWorkers.map(w => w.id));
  const todayAttendance = attendance.filter(a => a.date === today && activeWorkerIds.has(a.worker_id));
  
  const latestAttendanceMap = {};
  todayAttendance.forEach(a => {
    latestAttendanceMap[a.worker_id] = a;
  });

  const presentTodayCount = Object.values(latestAttendanceMap).filter(a => a.status === 'Present').length;
  const totalOvertimeToday = Object.values(latestAttendanceMap).reduce((acc, curr) => acc + Number(curr.overtime_hours || 0), 0);

  const salaryData = filteredWorkers.map(worker => {
    const workerRecords = attendance.filter(a => a.worker_id === worker.id && a.status === 'Present');
    const presentDays = workerRecords.length;
    const totalOT = workerRecords.reduce((acc, curr) => acc + Number(curr.overtime_hours || 0), 0);
    
    // Basic Salary calculation integration
    const baseSalaryNum = Number(worker.basic_salary || worker.daily_rate || 0);
    // Assuming standard monthly calculation (e.g. basic salary as fixed monthly or based on days)
    const hourlyRate = (baseSalaryNum / 30) / 8; // standard estimation per hour or proportional
    const otSalary = totalOT * hourlyRate;
    const totalPayable = baseSalaryNum + otSalary;

    return { ...worker, presentDays, totalOT, baseSalary: baseSalaryNum, otSalary, totalPayable };
  });

  const grandTotalPayroll = salaryData.reduce((acc, curr) => acc + curr.totalPayable, 0);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '380px', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ color: '#f8fafc', fontSize: '22px', margin: 0 }}>NDA-PK SYSTEM</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>Department & Staff Login</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. admin@nda.pk" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {authLoading ? 'Verifying...' : 'Login Now'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      
      {/* Global CSS for Clean Printing (Hides everything except printable area/payroll slip) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-payroll-area, .printable-payroll-area * {
            visibility: visible;
          }
          .printable-payroll-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Navigation Header */}
      <header className="no-print" style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email} ({userRole.is_admin ? 'Admin' : userRole.assigned_department})</span>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🔒 Logout</button>
      </header>

      {/* Tabs Menu Bar */}
      <div className="no-print" style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        {(userRole.is_admin || userRole.can_view_dashboard) && (
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Summary</button>
        )}
        {(userRole.is_admin || userRole.can_use_bulk) && (
          <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk Log</button>
        )}
        {(userRole.is_admin || userRole.can_view_workers) && (
          <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && (
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet</button>
        )}
        {(userRole.is_admin || userRole.can_view_payroll) && (
          <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('personal_docs')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'personal_docs' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📂 Naveed Personal Docs</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 User Permissions</button>
        )}
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        
        {/* Controls Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
          {userRole.is_admin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>🏢 Dept Filter:</label>
              <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #2563eb', backgroundColor: '#eff6ff', fontWeight: '600' }}>
                <option value="All">All Departments</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Civil">Civil</option>
                <option value="Ali Mardan">Ali Mardan</option>
                <option value="Mustafa">Mustafa</option>
              </select>
            </div>
          ) : (
            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Department: {userRole.assigned_department}</span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED (Dirhams)</option>
              <option value="PKR">PKR (Rupees)</option>
              <option value="USD">USD ($)</option>
            </select>
            <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🖨️ Print</button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (userRole.is_admin || userRole.can_view_dashboard) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #2563eb' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Workers</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{filteredWorkers.length}</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #16a34a' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Present Today</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{presentTodayCount}</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #d97706' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Total Overtime</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>{totalOvertimeToday} hrs</div>
            </div>
            {(userRole.is_admin || userRole.can_view_payroll) && (
              <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #0891b2' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll ({selectedCurrency})</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                  {selectedCurrency} {Math.round(grandTotalPayroll).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BULK ATTENDANCE */}
        {activeTab === 'bulk' && (userRole.is_admin || userRole.can_use_bulk) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>⚡ Bulk Attendance Logging</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Department</label>
              <select value={bulkDepartment} onChange={e => setBulkDepartment(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Civil">Civil</option>
                <option value="Ali Mardan">Ali Mardan</option>
                <option value="Mustafa">Mustafa</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Status for All</label>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Overtime Hours (Default)</label>
              <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleBulkAttendance} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Submit Bulk Attendance</button>
          </div>
        )}

        {/* TAB 3: WORKERS */}
        {activeTab === 'workers' && (userRole.is_admin || userRole.can_view_workers) && (
          <div>
            {(userRole.is_admin || userRole.can_add_workers) && (
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>{editingWorkerId ? `Edit Worker #${editingWorkerId}` : '➕ Add New Worker'}</h3>
                <form onSubmit={handleSaveWorker}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Worker ID (Optional)</label>
                      <input type="number" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} placeholder="Auto ID if blank" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Department</label>
                      <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Civil">Civil</option>
                        <option value="Ali Mardan">Ali Mardan</option>
                        <option value="Mustafa">Mustafa</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Designation</label>
                      <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Plumber" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Basic Salary ({selectedCurrency}) *</label>
                      <input type="number" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} placeholder="e.g. 3000" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Religion</label>
                      <select value={religion} onChange={e => setReligion(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="Muslim">Muslim</option>
                        <option value="Non-Muslim">Non-Muslim</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {editingWorkerId ? 'Update Worker' : 'Save Worker'}
                    </button>
                    {editingWorkerId && (
                      <button type="button" onClick={resetWorkerForm} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            )}

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0 }}>Workers Directory ({filteredWorkers.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '10px' }}>ID</th>
                      <th style={{ padding: '10px' }}>Name</th>
                      <th style={{ padding: '10px' }}>Department</th>
                      <th style={{ padding: '10px' }}>Designation</th>
                      <th style={{ padding: '10px' }}>Basic Salary</th>
                      <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>#{w.id}</td>
                        <td style={{ padding: '10px', fontWeight: '600' }}>{w.name}</td>
                        <td style={{ padding: '10px' }}>{w.department}</td>
                        <td style={{ padding: '10px' }}>{w.designation}</td>
                        <td style={{ padding: '10px' }}>{selectedCurrency} {w.basic_salary || w.daily_rate}</td>
                        <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleStartEditWorker(w)} style={{ padding: '4px 8px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '4px 8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TIMESHEET */}
        {activeTab === 'attendance' && (userRole.is_admin || userRole.can_view_timesheet) && (
          <div>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>📷 Scan Paper Timesheet (Gemini OCR)</h3>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Upload an image of the attendance paper sheet to automatically log data.</p>
              <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} style={{ marginBottom: '10px' }} />
              {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
              {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0 }}>📅 Today's Timesheet Entry ({today})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '10px' }}>ID</th>
                      <th style={{ padding: '10px' }}>Name</th>
                      <th style={{ padding: '10px' }}>Status Today</th>
                      <th style={{ padding: '10px' }}>Overtime (Hrs)</th>
                      <th style={{ padding: '10px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map(w => {
                      const currentAtt = latestAttendanceMap[w.id];
                      return (
                        <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px' }}>#{w.id}</td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>{w.name}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: currentAtt?.status === 'Present' ? '#dcfce7' : '#fee2e2', color: currentAtt?.status === 'Present' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                              {currentAtt ? currentAtt.status : 'Not Marked'}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number" 
                              defaultValue={currentAtt?.overtime_hours || 0} 
                              onChange={e => setOvertimeInputs({...overtimeInputs, [w.id]: e.target.value})} 
                              style={{ width: '60px', padding: '4px' }} 
                            />
                          </td>
                          <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleMarkAttendance(w.id, 'Present')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Present</button>
                            <button onClick={() => handleMarkAttendance(w.id, 'Absent')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Absent</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYROLL */}
        {activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
          <div className="printable-payroll-area" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>💵 Monthly Payroll & Salary Report</h3>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb' }}>Grand Total: {selectedCurrency} {Math.round(grandTotalPayroll).toLocaleString()}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Worker Name</th>
                    <th style={{ padding: '10px' }}>Basic Salary</th>
                    <th style={{ padding: '10px' }}>Present Days</th>
                    <th style={{ padding: '10px' }}>Total OT (Hrs)</th>
                    <th style={{ padding: '10px' }}>OT Pay</th>
                    <th style={{ padding: '10px' }}>Total Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px' }}>#{item.id}</td>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{item.name}</td>
                      <td style={{ padding: '10px' }}>{selectedCurrency} {item.baseSalary}</td>
                      <td style={{ padding: '10px' }}>{item.presentDays}</td>
                      <td style={{ padding: '10px' }}>{item.totalOT} hrs</td>
                      <td style={{ padding: '10px' }}>{selectedCurrency} {Math.round(item.otSalary)}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>{selectedCurrency} {Math.round(item.totalPayable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: PERSONAL DOCS */}
        {activeTab === 'personal_docs' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>📂 Naveed Personal Documents</h3>
            <form onSubmit={handleSavePersonalDoc} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Document Title</label>
                  <input type="text" value={personalDocTitle} onChange={e => setPersonalDocTitle(e.target.value)} placeholder="e.g. Passport Scan" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select value={personalDocCategory} onChange={e => setPersonalDocCategory(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Visa">Visa</option>
                    <option value="Passport">Passport</option>
                    <option value="ID Card">ID Card</option>
                    <option value="Medical">Medical</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Upload File (PDF/Image)</label>
                  <input type="file" onChange={e => handleFileUpload(e.target.files[0], setPersonalFileUrl)} style={{ width: '100%' }} />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Personal Document</button>
            </form>

            <div>
              <h4>Saved Documents</h4>
              {personalDocs.length === 0 ? <p style={{ color: '#64748b' }}>No documents uploaded yet.</p> : (
                <ul style={{ paddingLeft: '20px' }}>
                  {personalDocs.map(doc => (
                    <li key={doc.id} style={{ marginBottom: '8px' }}>
                      <strong>{doc.doc_title}</strong> ({doc.doc_category}) - <a href={doc.file_url} target="_blank" rel="noreferrer">View File</a>{' '}
                      <button onClick={() => handleDeletePersonalDoc(doc.id)} style={{ marginLeft: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: USER PERMISSIONS */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>🔐 Manage User Access & Permissions</h3>
            <form onSubmit={handleSavePermission} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>User Email</label>
                  <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="staff@nda.pk" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Password</label>
                  <input type="text" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Assigned Department</label>
                  <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Departments</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil">Civil</option>
                    <option value="Ali Mardan">Ali Mardan</option>
                    <option value="Mustafa">Mustafa</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px', fontSize: '13px' }}>
                <label><input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> Dashboard</label>
                <label><input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> Bulk Log</label>
                <label><input type="checkbox" checked={permWorkers} onChange={e => setPermWorkers(e.target.checked)} /> View Workers</label>
                <label><input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> Add/Edit Workers</label>
                <label><input type="checkbox" checked={permTimesheet} onChange={e => setPermTimesheet(e.target.checked)} /> Timesheet</label>
                <label><input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> Payroll</label>
              </div>
              <button type="submit" style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Permissions</button>
            </form>

            <div>
              <h4>Existing Staff Permissions</h4>
              {permissionsList.length === 0 ? <p style={{ color: '#64748b' }}>No custom staff permissions found.</p> : (
                <ul style={{ paddingLeft: '20px' }}>
                  {permissionsList.map(p => (
                    <li key={p.user_email} style={{ marginBottom: '8px' }}>
                      <strong>{p.user_email}</strong> (Dept: {p.assigned_department}){' '}
                      <button onClick={() => handleDeleteUserPermission(p.user_email)} style={{ marginLeft: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Revoke Access</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
