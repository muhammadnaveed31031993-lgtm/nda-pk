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

  // OCR PAPER TIMESHEET PHOTO SCANNER HANDLER (GPT-4o)
  async function handleScanPaperSheet(event) {
    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Sheet ki photo scan ho rahi hai, please wait...');

    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API Key nahi mili! Vercel environment variables check karein.");
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract table data from this daily attendance sheet. Return ONLY a valid JSON object with key 'rows' containing an array of objects. Each object must have: 'id_no' (number from ID No column), 'working_days' (number: 1 if Working Days is 'ONE' or marked present, 0 if absent), and 'overtime' (number from Total Overtime column, if empty then 0). Ignore blank rows."
                },
                {
                  type: "image_url",
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const parsedContent = JSON.parse(data.choices[0].message.content);
      const rows = parsedContent.rows || parsedContent;

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

      setScanStatus(`Zabardast! Total ${recordsToInsert.length} workers ka data auto save ho gaya.`);
      fetchAttendance();

    } catch (err) {
      console.error(err);
      setScanStatus('Error: ' + err.message);
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

  // SAVE NAVEED PERSONAL DOC
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
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>⚡ Department Bulk Attendance & Overtime</h3>
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
                  <option value="Present">Present All</option>
                  <option value="Absent">Absent All</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px' }}>Bulk Overtime (Hours)</label>
                <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={handleBulkAttendance} style={{ width: '100%', backgroundColor: '#16a34a', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Apply to All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORKER MANAGEMENT & DOCUMENT FILE UPLOAD */}
        {activeTab === 'workers' && (userRole.is_admin || userRole.can_view_workers) && (
          <div>
            {(userRole.is_admin || userRole.can_add_workers) && (
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>{editingWorkerId ? `✏️ Edit Worker Record (#${editingWorkerId})` : '➕ Add New Worker & Documents'}</h3>
                
                <form onSubmit={handleSaveWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <input type="number" placeholder="Worker ID (Optional)" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} disabled={!!editingWorkerId} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  <input type="text" placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    <option value="Plumbing">Plumbing Dept</option>
                    <option value="Electrical">Electrical Dept</option>
                    <option value="Civil">Civil Dept</option>
                    <option value="Ali Mardan">Ali Mardan Dept</option>
                    <option value="Mustafa">Mustafa Dept</option>
                  </select>
                  <input type="text" placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  <input type="number" placeholder={`Daily Rate (${selectedCurrency}) *`} value={dailyRate} onChange={e => setDailyRate(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />

                  {/* DIRECT JPG/PDF FILE UPLOAD INPUTS */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>📁 Upload Worker Documents (JPG / PNG / PDF):</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
                      
                      <div>
                        <label style={{ display: 'block', fontWeight: '600' }}>Passport Copy:</label>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setPassportFileUrl)} />
                        {passportFileUrl && <a href={passportFileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '11px', display: 'block', marginTop: '2px' }}>📄 View Passport File</a>}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600' }}>ID Card Copy:</label>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setIdCardFileUrl)} />
                        {idCardFileUrl && <a href={idCardFileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '11px', display: 'block', marginTop: '2px' }}>📄 View ID Card File</a>}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600' }}>Visa Copy:</label>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setVisaFileUrl)} />
                        {visaFileUrl && <a href={visaFileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '11px', display: 'block', marginTop: '2px' }}>📄 View Visa File</a>}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600' }}>Labour Card Copy:</label>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setLabourCardFileUrl)} />
                        {labourCardFileUrl && <a href={labourCardFileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '11px', display: 'block', marginTop: '2px' }}>📄 View Labour Card File</a>}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600' }}>Medical Card Copy:</label>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setMedicalCardFileUrl)} />
                        {medicalCardFileUrl && <a href={medicalCardFileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '11px', display: 'block', marginTop: '2px' }}>📄 View Medical File</a>}
                      </div>

                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button type="submit" disabled={uploadingFile} style={{ backgroundColor: editingWorkerId ? '#d97706' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px 20px' }}>
                      {uploadingFile ? 'Uploading File...' : editingWorkerId ? '💾 Update Worker Details' : '➕ Save Worker'}
                    </button>
                    {editingWorkerId && (
                      <button type="button" onClick={resetWorkerForm} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '10px 15px' }}>Cancel Edit</button>
                    )}
                  </div>
                </form>
              </div>
            )}

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <h3>📋 Workers Directory & Files ({selectedDeptFilter})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '8px' }}>ID</th>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>Dept</th>
                    <th style={{ padding: '8px' }}>Rate</th>
                    <th style={{ padding: '8px' }}>Attached Files</th>
                    {(userRole.is_admin || userRole.can_add_workers) && <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>#{w.id}</td>
                      <td style={{ padding: '8px', fontWeight: '600' }}>{w.name}</td>
                      <td style={{ padding: '8px', color: '#0369a1' }}>{w.department}</td>
                      <td style={{ padding: '8px' }}>{selectedCurrency} {w.daily_rate}</td>
                      <td style={{ padding: '8px', fontSize: '11px' }}>
                        {w.passport_file_url && <a href={w.passport_file_url} target="_blank" rel="noreferrer" style={{ marginRight: '6px', color: '#2563eb' }}>📁 Passport</a>}
                        {w.id_card_file_url && <a href={w.id_card_file_url} target="_blank" rel="noreferrer" style={{ marginRight: '6px', color: '#2563eb' }}>📁 ID Card</a>}
                        {w.visa_file_url && <a href={w.visa_file_url} target="_blank" rel="noreferrer" style={{ marginRight: '6px', color: '#2563eb' }}>📁 Visa</a>}
                        {w.labour_card_file_url && <a href={w.labour_card_file_url} target="_blank" rel="noreferrer" style={{ marginRight: '6px', color: '#2563eb' }}>📁 Labour Card</a>}
                        {w.medical_card_file_url && <a href={w.medical_card_file_url} target="_blank" rel="noreferrer" style={{ marginRight: '6px', color: '#2563eb' }}>📁 Medical</a>}
                      </td>
                      {(userRole.is_admin || userRole.can_add_workers) && (
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => handleStartEditWorker(w)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️ Edit</button>
                          <button onClick={() => handleDeleteWorker(w.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NAVEED PERSONAL DOCS */}
        {activeTab === 'personal_docs' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>📂 Naveed Personal Documents Vault</h3>
            
            <form onSubmit={handleSavePersonalDoc} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px', backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Document Title *</label>
                <input type="text" placeholder="e.g. Naveed Visa 2026 / Passport" value={personalDocTitle} onChange={e => setPersonalDocTitle(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Category</label>
                <select value={personalDocCategory} onChange={e => setPersonalDocCategory(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}>
                  <option value="Visa">Visa Copy</option>
                  <option value="Passport">Passport Copy</option>
                  <option value="Emirates ID">Emirates / National ID</option>
                  <option value="Licence">Driving License</option>
                  <option value="Contract">Agreement / Contract</option>
                  <option value="General">Other Personal File</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Upload File (JPG / PNG / PDF)</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setPersonalFileUrl)} style={{ width: '100%', fontSize: '12px' }} />
                {personalFileUrl && <span style={{ color: '#16a34a', fontSize: '11px', display: 'block', marginTop: '2px' }}>✅ File attached!</span>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" disabled={uploadingFile} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px 20px' }}>
                  {uploadingFile ? 'Uploading...' : '💾 Save Personal Document'}
                </button>
              </div>
            </form>

            <h4>Saved Documents Vault</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px' }}>Title</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Uploaded Date</th>
                  <th style={{ padding: '8px' }}>File Link</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {personalDocs.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0369a1' }}>{doc.doc_title}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{doc.doc_category}</span>
                    </td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: '8px' }}>
                      <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>
                        📄 Open / View File
                      </a>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDeletePersonalDoc(doc.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: TIMESHEET & EDIT ATTENDANCE + AI PHOTO SCANNER */}
        {activeTab === 'attendance' && (userRole.is_admin || userRole.can_view_timesheet) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            
            {/* AUTOMATIC PAPER SHEET SCANNER BOX */}
            <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px dashed #3b82f6' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#1e40af' }}>📷 Automatic Daily Paper Sheet Scanner (AI)</h4>
              <p style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#1e3a8a' }}>
                Handwritten paper sheet ki picture le kar upload karein. System automatic ID No aur Overtime read kar ke Database mein add kar dega.
              </p>
              
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleScanPaperSheet} 
                disabled={scanning}
              />

              {scanning && <p style={{ color: '#d97706', fontWeight: 'bold', fontSize: '12px', marginTop: '8px' }}>⌛ {scanStatus}</p>}
              {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px', marginTop: '8px' }}>{scanStatus}</p>}
            </div>

            <h3>📅 Daily Timesheet & Attendance Logs</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Dept</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>OT (Hrs)</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Mark Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(worker => {
                  const record = latestAttendanceMap[worker.id];
                  const currentStatus = record ? record.status : 'Not Marked';
                  const currentOT = record ? record.overtime_hours : 0;
                  return (
                    <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>#{worker.id}</td>
                      <td style={{ padding: '8px' }}>{worker.name}</td>
                      <td style={{ padding: '8px', color: '#0369a1' }}>{worker.department}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: currentStatus === 'Present' ? '#dcfce7' : currentStatus === 'Absent' ? '#fee2e2' : '#f1f5f9',
                          color: currentStatus === 'Present' ? '#166534' : currentStatus === 'Absent' ? '#991b1b' : '#475569'
                        }}>
                          {currentStatus} {currentStatus === 'Present' && currentOT > 0 ? `(+${currentOT}h OT)` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          placeholder="0"
                          value={overtimeInputs[worker.id] ?? ''}
                          onChange={(e) => setOvertimeInputs({ ...overtimeInputs, [worker.id]: e.target.value })}
                          style={{ width: '50px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => handleMarkAttendance(worker.id, 'Present')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>Present</button>
                        <button onClick={() => handleMarkAttendance(worker.id, 'Absent')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Absent</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h4 style={{ marginTop: '25px', marginBottom: '10px', color: '#0f172a' }}>📝 Edit Recent Attendance Logs</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#e2e8f0' }}>
                  <th style={{ padding: '6px' }}>Date</th>
                  <th style={{ padding: '6px' }}>Worker ID</th>
                  <th style={{ padding: '6px' }}>Status</th>
                  <th style={{ padding: '6px' }}>OT Hours</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Edit / Delete</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 15).map(att => (
                  <tr key={att.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{att.date}</td>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>#{att.worker_id}</td>
                    <td style={{ padding: '6px' }}>
                      {editingAttendanceId === att.id ? (
                        <select value={editAttStatus} onChange={e => setEditAttStatus(e.target.value)} style={{ padding: '2px' }}>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      ) : (
                        <span style={{ color: att.status === 'Present' ? '#166534' : '#991b1b', fontWeight: 'bold' }}>{att.status}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px' }}>
                      {editingAttendanceId === att.id ? (
                        <input type="number" value={editAttOT} onChange={e => setEditAttOT(e.target.value)} style={{ width: '40px' }} />
                      ) : (
                        `${att.overtime_hours || 0} hrs`
                      )}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      {editingAttendanceId === att.id ? (
                        <>
                          <button onClick={() => handleSaveAttendanceEdit(att.id)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', marginRight: '4px' }}>Save</button>
                          <button onClick={() => setEditingAttendanceId(null)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingAttendanceId(att.id); setEditAttStatus(att.status); setEditAttOT(att.overtime_hours); }} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', marginRight: '4px' }}>✏️ Edit</button>
                          <button onClick={() => handleDeleteAttendance(att.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}>🗑️ Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: PAYROLL */}
        {activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            <h3>💵 Payroll Report ({selectedCurrency})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Worker</th>
                  <th style={{ padding: '8px' }}>Dept</th>
                  <th style={{ padding: '8px' }}>Days Present</th>
                  <th style={{ padding: '8px' }}>OT Hrs</th>
                  <th style={{ padding: '8px', fontWeight: 'bold' }}>Total Payable</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>#{s.id}</td>
                    <td style={{ padding: '8px' }}>{s.name}</td>
                    <td style={{ padding: '8px', color: '#0369a1' }}>{s.department}</td>
                    <td style={{ padding: '8px' }}>{s.presentDays}</td>
                    <td style={{ padding: '8px' }}>{s.totalOT}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#16a34a' }}>{selectedCurrency} {Math.round(s.totalPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 7: USER CREATION & EDIT PERMISSIONS */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>🔐 {editingEmail ? `Edit User Permissions (${editingEmail})` : 'Create New User Account'}</h3>
            
            <form onSubmit={handleSavePermission} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Email Address *</label>
                <input type="email" placeholder="user@nda.pk" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} disabled={!!editingEmail} required style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Password *</label>
                <input type="password" placeholder="Password" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Assigned Department</label>
                <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}>
                  <option value="Plumbing">Plumbing Dept</option>
                  <option value="Electrical">Electrical Dept</option>
                  <option value="Civil">Civil Dept</option>
                  <option value="Ali Mardan">Ali Mardan Dept</option>
                  <option value="Mustafa">Mustafa Dept</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#d97706', display: 'block', marginBottom: '8px' }}>Allowed Features & Access Permissions:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '13px' }}>
                  <label><input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> 📊 Summary / Dashboard</label>
                  <label><input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> ⚡ Bulk Logging</label>
                  <label><input type="checkbox" checked={permWorkers} onChange={e => setPermWorkers(e.target.checked)} /> 👷 View Workers</label>
                  <label><input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> ➕ Add / Delete Workers</label>
                  <label><input type="checkbox" checked={permTimesheet} onChange={e => setPermTimesheet(e.target.checked)} /> 📅 View / Mark Timesheet</label>
                  <label><input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> 💵 View Payroll</label>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px 20px' }}>
                  {editingEmail ? '💾 Update User Permissions' : '➕ Create User Account'}
                </button>
                {editingEmail && (
                  <button type="button" onClick={resetPermForm} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '10px 15px' }}>Cancel Edit</button>
                )}
              </div>
            </form>

            <h4>Users List & Current Permissions</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px' }}>User Email</th>
                  <th style={{ padding: '8px' }}>Dept</th>
                  <th style={{ padding: '8px' }}>Active Permissions</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {permissionsList.map(u => (
                  <tr key={u.user_email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: '600' }}>{u.user_email}</td>
                    <td style={{ padding: '8px', color: '#0369a1' }}>{u.assigned_department}</td>
                    <td style={{ padding: '8px', fontSize: '11px' }}>
                      {u.can_view_dashboard && <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Summary</span>}
                      {u.can_use_bulk && <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Bulk</span>}
                      {u.can_view_workers && <span style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Workers</span>}
                      {u.can_add_workers && <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Add Workers</span>}
                      {u.can_view_timesheet && <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Timesheet</span>}
                      {u.can_view_payroll && <span style={{ backgroundColor: '#fce7f3', color: '#9d174d', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Payroll</span>}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleStartEditUser(u)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>✏️ Edit</button>
                      <button onClick={() => handleDeleteUserPermission(u.user_email)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
