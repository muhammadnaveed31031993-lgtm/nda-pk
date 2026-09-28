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
  const [activeTab, setActiveTab] = useState('attendance'); // Default tab set to Timesheet
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
  const [dailyRate, setDailyRate] = useState('');
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

  // NATIVE GEMINI OCR PAPER TIMESHEET PHOTO SCANNER (No Library Needed)
  async function handleScanPaperSheet(event) {
    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Sheet ki photo Gemini OCR se scan ho rahi hai, please wait...');

    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key nahi mili! Env variables (.env ya Vercel) check karein.");
      }

      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (err) => reject(err);
      });

      const prompt = `Extract table data from this daily attendance sheet image. 
      Return ONLY a valid raw JSON array of objects without markdown fences.
      Each object must contain:
      - "id_no": (number, ID from ID No column)
      - "working_days": (number: 1 if present or working, 0 if absent)
      - "overtime": (number, total overtime hours, default 0 if blank)
      Ignore blank rows.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      if (data.error) throw new Error(data.error.message);

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

      if (error) throw error;

      setScanStatus(`Success! Total ${recordsToInsert.length} workers ka data auto save ho gaya.`);
      fetchAttendance();

    } catch (err) {
      console.error(err);
      setScanStatus('Scan Error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  // DIRECT FILE UPLOAD HANDLER (JPG, PNG, PDF)
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

  // SAVE PERSONAL DOC
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
      alert('Personal Document saved successfully!');
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

  // UNIFIED LOGIN HANDLER
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

      setActiveTab('attendance');
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

  // DELETE WORKER
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

  // EDIT WORKER POPULATE FORM
  function handleStartEditWorker(worker) {
    setEditingWorkerId(worker.id);
    setWorkerIdInput(worker.id);
    setName(worker.name);
    setDepartment(worker.department || 'Plumbing');
    setDesignation(worker.designation || 'Worker');
    setDailyRate(worker.daily_rate || '');
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
    setDailyRate('');
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  // SAVE OR UPDATE WORKER
  async function handleSaveWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin && !userRole.can_add_workers) {
      return alert('Aap ke paas worker add/edit karne ki permission nahi hai!');
    }
    if (!name.trim() || !dailyRate) {
      return alert('Name aur Daily Rate required hain!');
    }

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      designation: designation.trim(),
      daily_rate: Number(dailyRate),
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

  // ATTENDANCE EDIT & DELETE
  async function handleDeleteAttendance(attId) {
    if (window.confirm('Kya aap is attendance record ko delete karna chahte hain?')) {
      const { error } = await supabase.from('attendance').delete().eq('id', attId);
      if (error) alert('Error: ' + error.message);
      else fetchAttendance();
    }
  }

  // BULK ATTENDANCE
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

    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    if (error) alert('Bulk Logging Error: ' + error.message);
    else {
      alert(`Department ${bulkDepartment} ke ${deptWorkers.length} workers ki attendance update ho gayi!`);
      fetchAttendance();
    }
  }

  // MARK ATTENDANCE WITH IMMEDIATE UI RE-RENDER & UPSERT
  async function handleMarkAttendance(workerId, status) {
    const otHours = Number(overtimeInputs[workerId] || 0);
    const worker = workers.find(w => w.id === workerId);

    const record = {
      worker_id: workerId,
      date: today,
      status: status,
      overtime_hours: otHours,
      department: worker?.department || 'Plumbing'
    };

    // Local state foran update karein taake redpoly / change immediately dikhe
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.worker_id === workerId && a.date === today));
      return [record, ...filtered];
    });

    const { error } = await supabase
      .from('attendance')
      .upsert([record], { onConflict: 'worker_id,date' });

    if (error) {
      alert('Attendance Save Error: ' + error.message);
      fetchAttendance();
    } else {
      fetchAttendance();
    }
  }

  // USER PERMISSIONS EDIT & DELETE
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

  // Filtered Workers
  const filteredWorkers = workers.filter(w => {
    const userDeptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
    if (!userDeptScope || userDeptScope === 'All') return true;
    return w.department.toLowerCase() === userDeptScope.toLowerCase();
  });

  // Calculations
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
    const dailyRateNum = Number(worker.daily_rate || 0);
    const hourlyRate = dailyRateNum / 8;
    const baseSalary = presentDays * dailyRateNum;
    const otSalary = totalOT * hourlyRate;
    const totalPayable = baseSalary + otSalary;

    return { ...worker, presentDays, totalOT, baseSalary, otSalary, totalPayable };
  });

  const grandTotalPayroll = salaryData.reduce((acc, curr) => acc + curr.totalPayable, 0);

  // LOGIN SCREEN
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
      
      {/* Navigation Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email} ({userRole.is_admin ? 'Admin' : userRole.assigned_department})</span>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🔒 Logout</button>
      </header>

      {/* Tabs Menu Bar */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet & Scan</button>
        <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Summary</button>
        <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk Log</button>
        <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers</button>
        <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('personal_docs')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'personal_docs' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📂 Personal Docs</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 User Permissions</button>
        )}
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
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

        {/* TAB 1: TIMESHEET & OCR SCANNER */}
        {activeTab === 'attendance' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>📅 Timesheet & OCR Photo Scanner</h3>
            
            {/* Native Gemini OCR File Upload Component */}
            <div style={{ padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px dashed #0284c7', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>📷 Paper Timesheet Scan (Gemini 1.5 Flash AI)</h4>
              <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
              {scanStatus && <p style={{ marginTop: '10px', fontWeight: 'bold', color: scanning ? '#d97706' : '#16a34a' }}>{scanStatus}</p>}
            </div>

            <h4>Mark Attendance Manually</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Worker</th>
                  <th style={{ padding: '8px' }}>OT Hours</th>
                  <th style={{ padding: '8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{w.name} (#{w.id})</td>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="number" 
                        placeholder="OT" 
                        value={overtimeInputs[w.id] || ''} 
                        onChange={e => setOvertimeInputs({ ...overtimeInputs, [w.id]: e.target.value })}
                        style={{ width: '60px', padding: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => handleMarkAttendance(w.id, 'Present')} style={{ padding: '4px 8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', marginRight: '5px' }}>Present</button>
                      <button onClick={() => handleMarkAttendance(w.id, 'Absent')} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px' }}>Absent</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ marginTop: '30px' }}>Logged Attendance History</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Worker ID</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Overtime</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{a.date}</td>
                    <td style={{ padding: '8px' }}>#{a.worker_id}</td>
                    <td style={{ padding: '8px' }}>{a.status}</td>
                    <td style={{ padding: '8px' }}>{a.overtime_hours} hrs</td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => handleDeleteAttendance(a.id)} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DASHBOARD SUMMARY */}
        {activeTab === 'dashboard' && (
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
            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #0891b2' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll ({selectedCurrency})</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                {selectedCurrency} {Math.round(grandTotalPayroll).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BULK ATTENDANCE */}
        {activeTab === 'bulk' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>⚡ Department Bulk Attendance & Overtime</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px' }}>Select Department</label>
                <select value={bulkDepartment} onChange={e => setBulkDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Civil">Civil</option>
                  <option value="Ali Mardan">Ali Mardan</option>
                  <option value="Mustafa">Mustafa</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px' }}>Status</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px' }}>Overtime Hours</label>
                <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
            <button onClick={handleBulkAttendance} style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply Bulk Log</button>
          </div>
        )}

        {/* TAB 4: WORKER MANAGER & DOCS */}
        {activeTab === 'workers' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>👷 Manage Workers & Documents</h3>
            <form onSubmit={handleSaveWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              <input placeholder="Worker ID" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input placeholder="Worker Name" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Civil">Civil</option>
                <option value="Ali Mardan">Ali Mardan</option>
                <option value="Mustafa">Mustafa</option>
              </select>
              <input placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Daily Rate" value={dailyRate} onChange={e => setDailyRate(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={religion} onChange={e => setReligion(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="Muslim">Muslim</option>
                <option value="Non-Muslim">Non-Muslim</option>
              </select>
              <button type="submit" style={{ padding: '8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                {editingWorkerId ? 'Update Worker' : 'Add Worker'}
              </button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Department</th>
                  <th style={{ padding: '8px' }}>Daily Rate</th>
                  <th style={{ padding: '8px' }}>Documents</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>#{w.id}</td>
                    <td style={{ padding: '8px' }}>{w.name}</td>
                    <td style={{ padding: '8px' }}>{w.department}</td>
                    <td style={{ padding: '8px' }}>{selectedCurrency} {w.daily_rate}</td>
                    <td style={{ padding: '8px', fontSize: '12px' }}>
                      {w.passport_file_url && <a href={w.passport_file_url} target="_blank" rel="noreferrer" style={{ marginRight: '5px' }}>Passport</a>}
                      {w.visa_file_url && <a href={w.visa_file_url} target="_blank" rel="noreferrer">Visa</a>}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => handleStartEditWorker(w)} style={{ marginRight: '5px', padding: '4px 8px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px' }}>Edit</button>
                      <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: PAYROLL */}
        {activeTab === 'payroll' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>💵 Monthly Payroll Report ({selectedCurrency})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Worker Name</th>
                  <th style={{ padding: '8px' }}>Present Days</th>
                  <th style={{ padding: '8px' }}>Total OT</th>
                  <th style={{ padding: '8px' }}>Base Salary</th>
                  <th style={{ padding: '8px' }}>OT Salary</th>
                  <th style={{ padding: '8px' }}>Total Payable</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{s.name}</td>
                    <td style={{ padding: '8px' }}>{s.presentDays}</td>
                    <td style={{ padding: '8px' }}>{s.totalOT} hrs</td>
                    <td style={{ padding: '8px' }}>{selectedCurrency} {s.baseSalary}</td>
                    <td style={{ padding: '8px' }}>{selectedCurrency} {Math.round(s.otSalary)}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{selectedCurrency} {Math.round(s.totalPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: PERSONAL DOCUMENTS */}
        {activeTab === 'personal_docs' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>📂 Personal Documents</h3>
            <form onSubmit={handleSavePersonalDoc} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input placeholder="Doc Title" value={personalDocTitle} onChange={e => setPersonalDocTitle(e.target.value)} required style={{ padding: '8px' }} />
              <select value={personalDocCategory} onChange={e => setPersonalDocCategory(e.target.value)} style={{ padding: '8px' }}>
                <option value="Visa">Visa</option>
                <option value="Passport">Passport</option>
                <option value="License">License</option>
              </select>
              <input type="file" onChange={e => handleFileUpload(e.target.files[0], setPersonalFileUrl)} />
              <button type="submit" disabled={uploadingFile} style={{ padding: '8px 15px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px' }}>Save Doc</button>
            </form>

            <ul>
              {personalDocs.map(doc => (
                <li key={doc.id} style={{ marginBottom: '8px' }}>
                  <strong>{doc.doc_title}</strong> ({doc.doc_category}) - <a href={doc.file_url} target="_blank" rel="noreferrer">View File</a>
                  <button onClick={() => handleDeletePersonalDoc(doc.id)} style={{ marginLeft: '10px', color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 7: PERMISSIONS */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>🔐 Staff Permissions Setup</h3>
            <form onSubmit={handleSavePermission} style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
              <input placeholder="User Email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} required style={{ padding: '8px' }} />
              <input placeholder="Password" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} required style={{ padding: '8px' }} />
              <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ padding: '8px' }}>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Civil">Civil</option>
                <option value="Ali Mardan">Ali Mardan</option>
                <option value="Mustafa">Mustafa</option>
              </select>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label><input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> Dashboard Access</label>
                <label><input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> Bulk Logging Access</label>
                <label><input type="checkbox" checked={permWorkers} onChange={e => setPermWorkers(e.target.checked)} /> View Workers Access</label>
                <label><input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> Add/Delete Workers Access</label>
                <label><input type="checkbox" checked={permTimesheet} onChange={e => setPermTimesheet(e.target.checked)} /> Timesheet Access</label>
                <label><input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> Payroll Access</label>
              </div>
              <button type="submit" style={{ padding: '10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Permissions</button>
            </form>

            <h4 style={{ marginTop: '20px' }}>Configured Staff Users</h4>
            <ul>
              {permissionsList.map(u => (
                <li key={u.user_email} style={{ marginBottom: '8px' }}>
                  {u.user_email} - ({u.assigned_department}) 
                  <button onClick={() => handleStartEditUser(u)} style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px' }}>Edit</button>
                  <button onClick={() => handleDeleteUserPermission(u.user_email)} style={{ marginLeft: '5px', padding: '2px 6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px' }}>Delete</button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </main>
    </div>
  );
}
