import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // Authentication & Session States
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Password Change State
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // User Access Scope & Permissions (Default strict fallback for staff)
  const [userRole, setUserRole] = useState({
    is_admin: true,
    assigned_department: 'All',
    can_view_dashboard: true,
    can_use_bulk: true,
    can_view_workers: true,
    can_add_workers: true,
    can_edit_workers: true,
    can_delete_workers: true,
    can_view_timesheet: true,
    can_edit_timesheet: true,
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
  const [monthlySalary, setMonthlySalary] = useState('');
  const [religion, setReligion] = useState('Muslim');
  
  // Leave Tracking States
  const [lastReturnDate, setLastReturnDate] = useState('');
  const [annualLeaveRate, setAnnualLeaveRate] = useState('30');

  // File Upload URL States
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
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [targetDept, setTargetDept] = useState('Plumbing');
  
  // Granular Permission Checkbox States
  const [permDashboard, setPermDashboard] = useState(true);
  const [permBulk, setPermBulk] = useState(false);
  const [permViewWorkers, setPermViewWorkers] = useState(true);
  const [permAddWorkers, setPermAddWorkers] = useState(false);
  const [permEditWorkers, setPermEditWorkers] = useState(false);
  const [permDeleteWorkers, setPermDeleteWorkers] = useState(false);
  const [permTimesheetView, setPermTimesheetView] = useState(true);
  const [permTimesheetEdit, setPermTimesheetEdit] = useState(true); // Sirf entry/edit karne ke liye
  const [permPayroll, setPermPayroll] = useState(false);

  // Bulk Operations State
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');

  // Daily Overtime per worker
  const [overtimeInputs, setOvertimeInputs] = useState({});

  const today = new Date().toISOString().split('T')[0];

  // Dynamic Current Month Total Days Calculation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const totalDaysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

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

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!newPasswordInput.trim()) return alert('Naya password enter karein!');

    if (session.user.email === 'admin@nda.pk') {
      alert('Admin password secured hai ya database permission table check karein.');
      return;
    }

    const { error } = await supabase
      .from('user_permissions')
      .update({ user_password: newPasswordInput.trim() })
      .eq('user_email', session.user.email);

    if (error) alert('Error: ' + error.message);
    else {
      alert('Password successfully change ho gaya!');
      setNewPasswordInput('');
    }
  }

  async function handleScanPaperSheet(event) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) {
      return alert('Aapko timesheet scan ya entry ki permission nahi hai!');
    }

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
      if (!apiKey) throw new Error("OpenAI API Key nahi mili!");

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
                  text: "Extract table data from this daily attendance sheet. Return ONLY a valid JSON object with key 'rows' containing an array of objects. Each object must have: 'id_no' (number), 'working_days' (number: 1 if present, 0 if absent), and 'overtime' (number)."
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

      setScanStatus(`Zabardast! Total ${recordsToInsert.length} workers ka data save ho gaya.`);
      fetchAttendance();

    } catch (err) {
      console.error(err);
      setScanStatus('Error: ' + err.message);
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
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!personalDocTitle.trim() || !personalFileUrl) return alert('Title aur File zaroori hain!');

    const newDoc = {
      doc_title: personalDocTitle.trim(),
      doc_category: personalDocCategory,
      file_url: personalFileUrl,
      file_type: personalFileUrl.endsWith('.pdf') ? 'PDF' : 'Image'
    };

    const { error } = await supabase.from('personal_docs').insert([newDoc]);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Personal Document saved successfully!');
      setPersonalDocTitle('');
      setPersonalFileUrl('');
      fetchPersonalDocs();
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
        can_edit_workers: true,
        can_delete_workers: true,
        can_view_timesheet: true,
        can_edit_timesheet: true,
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
        can_view_workers: userPerm.can_view_workers ?? true,
        can_add_workers: userPerm.can_add_workers ?? false,
        can_edit_workers: userPerm.can_edit_workers ?? false,
        can_delete_workers: userPerm.can_delete_workers ?? false,
        can_view_timesheet: userPerm.can_view_timesheet ?? true,
        can_edit_timesheet: userPerm.can_edit_timesheet ?? true,
        can_view_payroll: userPerm.can_view_payroll ?? false
      };

      const sessionObj = { user: { email: cleanEmail }, role: staffRole };
      setSession(sessionObj);
      setUserRole(staffRole);

      if (staffRole.assigned_department !== 'All') {
        setSelectedDeptFilter(staffRole.assigned_department);
      }
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
    if (!userRole.is_admin && !userRole.can_delete_workers) {
      return alert('Aapko workers delete karne ki permission nahi hai!');
    }
    if (window.confirm(`Delete Worker #${id}?`)) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchWorkers();
    }
  }

  function handleStartEditWorker(worker) {
    if (!userRole.is_admin && !userRole.can_edit_workers) {
      return alert('Aapko workers edit karne ki permission nahi hai!');
    }
    setEditingWorkerId(worker.id);
    setWorkerIdInput(worker.id);
    setName(worker.name);
    setDepartment(worker.department || 'Plumbing');
    setDesignation(worker.designation || 'Plumber');
    setMonthlySalary(worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth) || '');
    setReligion(worker.religion || 'Muslim');
    setLastReturnDate(worker.last_return_date || '');
    setAnnualLeaveRate(worker.annual_leave_rate || '30');
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
    setMonthlySalary('');
    setReligion('Muslim');
    setLastReturnDate('');
    setAnnualLeaveRate('30');
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  async function handleSaveWorker(e) {
    e.preventDefault();
    if (editingWorkerId && !userRole.is_admin && !userRole.can_edit_workers) {
      return alert('Aapko worker edit karne ki permission nahi hai!');
    }
    if (!editingWorkerId && !userRole.is_admin && !userRole.can_add_workers) {
      return alert('Aapko naya worker add karne ki permission nahi hai!');
    }
    if (!name.trim() || !monthlySalary) return alert('Name aur Monthly Salary required hain!');

    const monthlyNum = Number(monthlySalary);
    const dailyRateCalc = monthlyNum / totalDaysInCurrentMonth;

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      designation: designation.trim(),
      monthly_salary: monthlyNum,
      daily_rate: dailyRateCalc,
      religion,
      last_return_date: lastReturnDate || null,
      annual_leave_rate: Number(annualLeaveRate || 30),
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
        alert('Worker updated successfully!');
        resetWorkerForm();
        fetchWorkers();
      }
    } else {
      const nextAutoId = workers.length > 0 ? Math.max(...workers.map(w => Number(w.id) || 0)) + 1 : 1;
      const finalWorkerId = workerIdInput ? Number(workerIdInput) : nextAutoId;

      const { error } = await supabase.from('workers').insert([{ id: finalWorkerId, ...workerData }]);
      if (error) alert('Error: ' + error.message);
      else {
        alert('New Worker added successfully!');
        resetWorkerForm();
        fetchWorkers();
      }
    }
  }

  function handlePrintWorkerFile(worker, workerSalaryData) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Worker Profile - #${worker.id} ${worker.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h2 { border-bottom: 2px solid #2563eb; padding-bottom: 8px; color: #1e293b; }
            .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h2>NDA-PK SYSTEM - Worker Profile & Payroll Report</h2>
          <div class="box">
            <p><strong>Worker ID:</strong> #${worker.id}</p>
            <p><strong>Name:</strong> ${worker.name}</p>
            <p><strong>Department:</strong> ${worker.department}</p>
            <p><strong>Designation:</strong> ${worker.designation || 'N/A'}</p>
            <p><strong>Religion:</strong> ${worker.religion || 'Muslim'}</p>
            <p><strong>Monthly Salary:</strong> ${worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth)} ${worker.currency || 'AED'}</p>
            <p><strong>Month Days Base:</strong> ${totalDaysInCurrentMonth} Days this month</p>
            <p><strong>Last Return Date:</strong> ${worker.last_return_date || 'N/A'}</p>
          </div>
          <h3>Current Month Calculation</h3>
          <table>
            <tr><th>Present Days</th><td>${workerSalaryData.presentDays} Days</td></tr>
            <tr><th>Total Overtime</th><td>${workerSalaryData.totalOT} Hours</td></tr>
            <tr><th>Base Salary</th><td>${Math.round(workerSalaryData.baseSalary).toLocaleString()} ${worker.currency || 'AED'}</td></tr>
            <tr><th>OT Allowance</th><td>${Math.round(workerSalaryData.otSalary).toLocaleString()} ${worker.currency || 'AED'}</td></tr>
            <tr><th><strong>Total Payable</strong></th><td><strong>${Math.round(workerSalaryData.totalPayable).toLocaleString()} ${worker.currency || 'AED'}</strong></td></tr>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function handleBulkAttendance() {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) {
      return alert('Aapko bulk attendance enter karne ki permission nahi hai!');
    }
    const deptWorkers = workers.filter(w => w.department.toLowerCase() === bulkDepartment.toLowerCase());
    if (deptWorkers.length === 0) return alert(`No workers found in ${bulkDepartment}!`);

    const records = deptWorkers.map(w => ({
      worker_id: w.id,
      date: today,
      status: bulkStatus,
      overtime_hours: Number(bulkOT),
      department: w.department
    }));

    const { error } = await supabase.from('attendance').insert(records);
    if (error) alert('Error: ' + error.message);
    else {
      alert(`Attendance saved for ${deptWorkers.length} workers!`);
      fetchAttendance();
    }
  }

  async function handleMarkAttendance(workerId, status) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) {
      return alert('Aapko attendance/timesheet entry karne ki permission nahi hai! Aap sirf view kar sakte hain.');
    }
    const otHours = Number(overtimeInputs[workerId] || 0);
    const worker = workers.find(w => w.id === workerId);
    
    const { error } = await supabase.from('attendance').insert([
      { worker_id: workerId, date: today, status, overtime_hours: otHours, department: worker?.department }
    ]);

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  async function handleSavePermission(e) {
    e.preventDefault();
    if (!targetEmail || !targetPassword) return alert('Email & Password required!');

    const permData = {
      user_email: targetEmail.trim().toLowerCase(),
      user_password: targetPassword.trim(),
      assigned_department: targetDept,
      can_view_dashboard: permDashboard,
      can_use_bulk: permBulk,
      can_view_workers: permViewWorkers,
      can_add_workers: permAddWorkers,
      can_edit_workers: permEditWorkers,
      can_delete_workers: permDeleteWorkers,
      can_view_timesheet: permTimesheetView,
      can_edit_timesheet: permTimesheetEdit,
      can_view_payroll: permPayroll,
      is_admin: false
    };

    const { error } = await supabase.from('user_permissions').upsert([permData], { onConflict: 'user_email' });
    if (error) alert('Error: ' + error.message);
    else {
      alert('User permission saved successfully with granular rules!');
      fetchPermissionsList();
    }
  }

  const totalMuslims = workers.filter(w => (w.religion || 'Muslim') === 'Muslim').length;
  const totalNonMuslims = workers.filter(w => w.religion === 'Non-Muslim').length;

  const filteredWorkers = workers.filter(w => {
    const userDeptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
    if (!userDeptScope || userDeptScope === 'All') return true;
    return w.department.toLowerCase() === userDeptScope.toLowerCase();
  });

  const activeWorkerIds = new Set(filteredWorkers.map(w => w.id));
  const todayAttendance = attendance.filter(a => a.date === today && activeWorkerIds.has(a.worker_id));
  
  const latestAttendanceMap = {};
  todayAttendance.forEach(a => { latestAttendanceMap[a.worker_id] = a; });

  const presentTodayCount = Object.values(latestAttendanceMap).filter(a => a.status === 'Present').length;

  const salaryDataMap = {};
  workers.forEach(worker => {
    const workerRecords = attendance.filter(a => a.worker_id === worker.id && a.status === 'Present');
    const presentDays = workerRecords.length;
    const totalOT = workerRecords.reduce((acc, curr) => acc + Number(curr.overtime_hours || 0), 0);
    
    const monthlySal = Number(worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth) || 0);
    const dailyRateNum = monthlySal / totalDaysInCurrentMonth;
    const hourlyRate = dailyRateNum / 8;
    
    const baseSalary = (monthlySal / totalDaysInCurrentMonth) * presentDays;
    const otSalary = totalOT * (hourlyRate * 1.25);
    const totalPayable = baseSalary + otSalary;

    salaryDataMap[worker.id] = { presentDays, totalOT, baseSalary, otSalary, totalPayable, monthlySal };
  });

  const salaryData = filteredWorkers.map(worker => ({
    ...worker,
    ...(salaryDataMap[worker.id] || { presentDays: 0, totalOT: 0, baseSalary: 0, otSalary: 0, totalPayable: 0 })
  }));

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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@nda.pk" style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', boxSizing: 'border-box' }} required />
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
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email} {userRole.is_admin ? '(Admin)' : '(Staff Role Restricted)'} | Month Base: <strong style={{color: '#38bdf8'}}>{totalDaysInCurrentMonth} Days</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: '5px' }}>
            <input type="password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} placeholder="New Password" style={{ padding: '5px 8px', borderRadius: '4px', border: 'none', fontSize: '12px' }} />
            <button type="submit" style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Change Pass</button>
          </form>
          <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {/* Tabs Menu Bar with Permission Checks */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        {(userRole.is_admin || userRole.can_view_dashboard) && (
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Summary & Religion</button>
        )}
        {(userRole.is_admin || userRole.can_use_bulk) && (
          <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk Log</button>
        )}
        {(userRole.is_admin || userRole.can_view_workers) && (
          <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers Directory</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && (
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet Entry</button>
        )}
        {(userRole.is_admin || userRole.can_view_payroll) && (
          <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('personal_docs')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'personal_docs' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📂 Personal Docs</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 Permissions</button>
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
            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Department Scope: {userRole.assigned_department}</span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED (Dirhams)</option>
              <option value="PKR">PKR (Rupees)</option>
              <option value="USD">USD ($)</option>
            </select>
            <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Print Page</button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (userRole.is_admin || userRole.can_view_dashboard) && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #2563eb' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Total Workers</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{workers.length}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #16a34a' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Present Today</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{presentTodayCount}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #059669' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>🌙 Muslims</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>{totalMuslims}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #d97706' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>☀️ Non-Muslims</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>{totalNonMuslims}</div>
              </div>
              {(userRole.is_admin || userRole.can_view_payroll) && (
                <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #0891b2' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll</span>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BULK ATTENDANCE */}
        {activeTab === 'bulk' && (userRole.is_admin || userRole.can_use_bulk) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>⚡ Department Bulk Attendance & OCR Scanner</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px' }}>Department</label>
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
                  <option value="Leave">Leave</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px' }}>Overtime Hours</label>
                <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={handleBulkAttendance} style={{ width: '100%', padding: '9px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply Bulk</button>
              </div>
            </div>

            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>📸 OCR Paper Timesheet Scanner</h4>
              <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
              {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
              {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
            </div>
          </div>
        )}

        {/* TAB 3: WORKERS MANAGEMENT */}
        {activeTab === 'workers' && (userRole.is_admin || userRole.can_view_workers) && (
          <div>
            {(userRole.is_admin || userRole.can_add_workers || userRole.can_edit_workers) && (
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>{editingWorkerId ? `✏️ Edit Worker ID #${editingWorkerId}` : '➕ Add New Worker'}</h3>
                <form onSubmit={handleSaveWorker}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Worker ID (Optional)</label>
                      <input type="number" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} placeholder="e.g. 101" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Department</label>
                      <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Civil">Civil</option>
                        <option value="Ali Mardan">Ali Mardan</option>
                        <option value="Mustafa">Mustafa</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Designation</label>
                      <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Plumber" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Total Monthly Salary ({selectedCurrency}) *</label>
                      <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 3000" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Religion</label>
                      <select value={religion} onChange={e => setReligion(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <option value="Muslim">Muslim</option>
                        <option value="Non-Muslim">Non-Muslim</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Last Return Date</label>
                      <input type="date" value={lastReturnDate} onChange={e => setLastReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Leave Rate (Days/Year)</label>
                      <select value={annualLeaveRate} onChange={e => setAnnualLeaveRate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <option value="30">30 Days</option>
                        <option value="45">45 Days</option>
                        <option value="60">60 Days</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {editingWorkerId ? 'Update Worker' : 'Save Worker'}
                    </button>
                    {editingWorkerId && (
                      <button type="button" onClick={resetWorkerForm} style={{ padding: '10px 20px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Workers Table */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>👷 Workers Directory</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                    <th style={{ padding: '10px' }}>ID & Name</th>
                    <th style={{ padding: '10px' }}>Dept</th>
                    <th style={{ padding: '10px' }}>Monthly Salary</th>
                    <th style={{ padding: '10px' }}>Religion</th>
                    <th style={{ padding: '10px' }}>Earned Leave</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => {
                    let earnedDays = 0;
                    if (w.last_return_date) {
                      const returnDate = new Date(w.last_return_date);
                      const diffDays = (new Date() - returnDate) / (1000 * 60 * 60 * 24);
                      earnedDays = Math.round((diffDays / 365) * Number(w.annual_leave_rate || 30) * 10) / 10;
                    }

                    const workerSalData = salaryDataMap[w.id] || { presentDays: 0, totalOT: 0, baseSalary: 0, otSalary: 0, totalPayable: 0 };

                    return (
                      <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
                        <td style={{ padding: '10px' }}>{w.department}</td>
                        <td style={{ padding: '10px' }}>{w.monthly_salary || (w.daily_rate * totalDaysInCurrentMonth)} {w.currency || selectedCurrency}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ color: w.religion === 'Non-Muslim' ? '#d97706' : '#059669', fontWeight: 'bold' }}>
                            {w.religion || 'Muslim'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>{earnedDays} Days</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handlePrintWorkerFile(w, workerSalData)} style={{ padding: '4px 8px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🖨️ Print</button>
                            {(userRole.is_admin || userRole.can_edit_workers) && (
                              <button onClick={() => handleStartEditWorker(w)} style={{ padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                            )}
                            {(userRole.is_admin || userRole.can_delete_workers) && (
                              <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '4px 8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TIMESHEET */}
        {activeTab === 'attendance' && (userRole.is_admin || userRole.can_view_timesheet) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>📅 Daily Timesheet Entry</h3>
            {(!userRole.is_admin && !userRole.can_edit_timesheet) && (
              <p style={{ color: '#d97706', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px' }}>⚠️ Note: Aapko timesheet entry karne ki permission nahi hai. Aap sirf view kar sakte hain.</p>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Worker ID & Name</th>
                    <th style={{ padding: '10px' }}>Department</th>
                    <th style={{ padding: '10px' }}>Overtime (Hrs)</th>
                    <th style={{ padding: '10px' }}>Attendance ({today})</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(worker => {
                    return (
                      <tr key={worker.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>#{worker.id} - {worker.name}</td>
                        <td style={{ padding: '10px' }}>{worker.department}</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" placeholder="OT Hrs" value={overtimeInputs[worker.id] || ''} onChange={e => setOvertimeInputs({...overtimeInputs, [worker.id]: e.target.value})} disabled={!userRole.is_admin && !userRole.can_edit_timesheet} style={{ width: '70px', padding: '5px' }} />
                        </td>
                        <td style={{ padding: '10px' }}>
                          {(userRole.is_admin || userRole.can_edit_timesheet) ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleMarkAttendance(worker.id, 'Present')} style={{ padding: '5px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Present</button>
                              <button onClick={() => handleMarkAttendance(worker.id, 'Absent')} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Absent</button>
                              <button onClick={() => handleMarkAttendance(worker.id, 'Leave')} style={{ padding: '5px 10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Leave</button>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>Read-Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PAYROLL */}
        {activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>💵 Monthly Payroll ({totalDaysInCurrentMonth} Days Basis Calculation)</h3>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>Grand Total: {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Worker ID & Name</th>
                    <th style={{ padding: '10px' }}>Monthly Salary</th>
                    <th style={{ padding: '10px' }}>Present Days</th>
                    <th style={{ padding: '10px' }}>OT (Hrs)</th>
                    <th style={{ padding: '10px' }}>Base Salary</th>
                    <th style={{ padding: '10px' }}>OT Pay</th>
                    <th style={{ padding: '10px' }}>Total Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>#{s.id} - {s.name}</td>
                      <td style={{ padding: '10px' }}>{s.monthly_salary || (s.daily_rate * totalDaysInCurrentMonth)}</td>
                      <td style={{ padding: '10px' }}>{s.presentDays}</td>
                      <td style={{ padding: '10px' }}>{s.totalOT}</td>
                      <td style={{ padding: '10px' }}>{Math.round(s.baseSalary).toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>{Math.round(s.otSalary).toLocaleString()}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>{Math.round(s.totalPayable).toLocaleString()} {selectedCurrency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: PERSONAL DOCS */}
        {activeTab === 'personal_docs' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>📂 Personal Documents</h3>
            <form onSubmit={handleSavePersonalDoc} style={{ marginBottom: '25px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <input type="text" value={personalDocTitle} onChange={e => setPersonalDocTitle(e.target.value)} placeholder="Document Title" style={{ padding: '8px' }} required />
                <select value={personalDocCategory} onChange={e => setPersonalDocCategory(e.target.value)} style={{ padding: '8px' }}>
                  <option value="Visa">Visa</option>
                  <option value="Passport">Passport</option>
                  <option value="ID Card">ID Card</option>
                  <option value="Certificate">Certificate</option>
                </select>
                <input type="file" accept="image/*,application/pdf" onChange={e => handleFileUpload(e.target.files[0], setPersonalFileUrl)} style={{ fontSize: '12px' }} />
              </div>
              <button type="submit" style={{ marginTop: '15px', padding: '9px 18px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Document</button>
            </form>
          </div>
        )}

        {/* TAB 7: GRANULAR PERMISSIONS PANEL */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🔐 Granular Staff Permissions & Access Control</h3>
            <form onSubmit={handleSavePermission} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff Email</label>
                  <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="staff@nda.pk" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password</label>
                  <input type="text" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Department Scope</label>
                  <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
                    <option value="All">All Departments</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil">Civil</option>
                    <option value="Ali Mardan">Ali Mardan</option>
                    <option value="Mustafa">Mustafa</option>
                  </select>
                </div>
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2563eb' }}>Check What This User Can Do:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> View Dashboard
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> Bulk Attendance & OCR
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permViewWorkers} onChange={e => setPermViewWorkers(e.target.checked)} /> View Workers Directory
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> Add New Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permEditWorkers} onChange={e => setPermEditWorkers(e.target.checked)} /> Edit Workers Info
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#dc2626', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={permDeleteWorkers} onChange={e => setPermDeleteWorkers(e.target.checked)} /> Delete Workers (Danger)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetView} onChange={e => setPermTimesheetView(e.target.checked)} /> View Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', backgroundColor: '#eff6ff', padding: '5px', borderRadius: '4px', border: '1px solid #3b82f6' }}>
                  <input type="checkbox" checked={permTimesheetEdit} onChange={e => setPermTimesheetEdit(e.target.checked)} /> <strong>Mark/Edit Timesheet (Sirf Entry)</strong>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> View Payroll Reports
                </label>
              </div>

              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Granular Permissions</button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
