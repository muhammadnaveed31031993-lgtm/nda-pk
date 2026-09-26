import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // Authentication & Session States
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // User Access Scope
  const [userRole, setUserRole] = useState({
    is_admin: true,
    can_view_timesheet: true,
    can_view_salary: true,
    assigned_department: 'All'
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

  // Form States for Worker Registration
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [designation, setDesignation] = useState('Plumber');
  const [dailyRate, setDailyRate] = useState('');
  const [religion, setReligion] = useState('Muslim');
  const [lastVacationReturn, setLastVacationReturn] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('0');

  // Document Link States
  const [passportDoc, setPassportDoc] = useState('');
  const [idCardDoc, setIdCardDoc] = useState('');
  const [medicalCardDoc, setMedicalCardDoc] = useState('');
  const [visaDoc, setVisaDoc] = useState('');
  const [labourCardDoc, setLabourCardDoc] = useState('');

  // Permission / User Creation Form States
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [targetDept, setTargetDept] = useState('Plumbing');
  const [permTimesheet, setPermTimesheet] = useState(true);
  const [permSalary, setPermSalary] = useState(false);

  // Bulk Operations State
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');

  // Daily Overtime per worker
  const [overtimeInputs, setOvertimeInputs] = useState({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Check saved local login session on app start
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
    }
  }, [session]);

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

  // UNIFIED DIRECT LOGIN HANDLER
  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Primary Admin Direct Check
    if (cleanEmail === 'admin@nda.pk' && cleanPassword === '123456') {
      const adminRole = {
        is_admin: true,
        can_view_timesheet: true,
        can_view_salary: true,
        assigned_department: 'All'
      };
      const sessionObj = { user: { email: cleanEmail }, role: adminRole };
      setSession(sessionObj);
      setUserRole(adminRole);
      localStorage.setItem('nda_user_session', JSON.stringify(sessionObj));
      setAuthLoading(false);
      return;
    }

    // 2. Staff Member / Department User Check via user_permissions Table
    const { data: userPerm } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_email', cleanEmail)
      .eq('user_password', cleanPassword)
      .maybeSingle();

    if (userPerm) {
      const staffRole = {
        is_admin: false,
        can_view_timesheet: userPerm.can_view_timesheet,
        can_view_salary: userPerm.can_view_salary,
        assigned_department: userPerm.assigned_department || 'All'
      };
      const sessionObj = { user: { email: cleanEmail }, role: staffRole };
      setSession(sessionObj);
      setUserRole(staffRole);
      if (staffRole.assigned_department !== 'All') {
        setSelectedDeptFilter(staffRole.assigned_department);
      }
      localStorage.setItem('nda_user_session', JSON.stringify(sessionObj));
    } else {
      alert('Invalid Email or Password! Sahi credentials enter karein.');
    }

    setAuthLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem('nda_user_session');
    setSession(null);
  }

  // Delete Actions
  async function handleDeleteWorker(id) {
    if (window.confirm(`Kya aap Worker #${id} ko delete karna chahte hain?`)) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else {
        alert('Worker delete ho gaya!');
        fetchWorkers();
      }
    }
  }

  async function handleDeleteUserPermission(userEmail) {
    if (window.confirm(`Kya aap User ${userEmail} ka access delete karna chahte hain?`)) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_email', userEmail);
      if (error) alert('Error: ' + error.message);
      else {
        alert('User permission delete ho gayi!');
        fetchPermissionsList();
      }
    }
  }

  // Register Worker
  async function handleAddWorker(e) {
    e.preventDefault();
    if (!name.trim() || !dailyRate) {
      return alert('Name aur Daily Rate required hain!');
    }

    if (workerIdInput) {
      const existing = workers.find(w => Number(w.id) === Number(workerIdInput));
      if (existing) {
        return alert(`Worker ID #${workerIdInput} pehle se '${existing.name}' ko assign hai! Nayi ID enter karein.`);
      }
    }

    const nextAutoId = workers.length > 0 ? Math.max(...workers.map(w => Number(w.id) || 0)) + 1 : 1;
    const finalWorkerId = workerIdInput ? Number(workerIdInput) : nextAutoId;

    const newWorker = {
      id: finalWorkerId,
      name: name.trim(),
      department: department.trim(),
      designation: designation.trim(),
      daily_rate: Number(dailyRate),
      religion,
      currency: selectedCurrency,
      last_vacation_return: lastVacationReturn || null,
      security_deposit: Number(securityDeposit),
      passport_doc: passportDoc,
      id_card_doc: idCardDoc,
      medical_card_doc: medicalCardDoc,
      visa_doc: visaDoc,
      labour_card_doc: labourCardDoc
    };

    const { error } = await supabase.from('workers').insert([newWorker]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setWorkerIdInput('');
      setName('');
      setDailyRate('');
      setPassportDoc('');
      setIdCardDoc('');
      setMedicalCardDoc('');
      setVisaDoc('');
      setLabourCardDoc('');
      fetchWorkers();
    }
  }

  // Bulk Attendance / Overtime Action
  async function handleBulkAttendance() {
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
      alert(`Department ${bulkDepartment} ke ${deptWorkers.length} workers ki attendance & OT update ho gayi!`);
      fetchAttendance();
    }
  }

  async function handleMarkAttendance(workerId, status) {
    const otHours = Number(overtimeInputs[workerId] || 0);
    const worker = workers.find(w => w.id === workerId);
    
    const { error } = await supabase.from('attendance').insert([
      { worker_id: workerId, date: today, status, overtime_hours: otHours, department: worker?.department }
    ]);

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  // Save / Update User Permissions
  async function handleSavePermission(e) {
    e.preventDefault();
    if (!targetEmail || !targetPassword) return alert('Email aur Password dono enter karein!');

    try {
      const permData = {
        user_email: targetEmail.trim().toLowerCase(),
        user_password: targetPassword.trim(),
        can_view_timesheet: permTimesheet,
        can_view_salary: permSalary,
        assigned_department: targetDept,
        is_admin: false
      };

      const { error: permError } = await supabase
        .from('user_permissions')
        .upsert([permData], { onConflict: 'user_email' });

      if (permError) {
        alert('Permission Save Error: ' + permError.message);
      } else {
        alert(`User ${targetEmail} ka account ('${targetDept}' Dept) successfully save ho gaya hai!`);
        setTargetEmail('');
        setTargetPassword('');
        fetchPermissionsList();
      }
    } catch (err) {
      alert('System Error: ' + err.message);
    }
  }

  // Filtered Workers according to Department Selection / User Scope
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
      
      {/* Top Header Navigation bar */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email} ({userRole.is_admin ? 'Admin' : userRole.assigned_department})</span>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🔒 Logout</button>
      </header>

      {/* Tabs Menu Bar */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Summary</button>
        <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk Log</button>
        <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers & Docs</button>
        <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet</button>
        <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        {userRole.is_admin && <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 Permissions</button>}
      </div>

      {/* Main Content Area */}
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

        {/* TAB 2: BULK ATTENDANCE */}
        {activeTab === 'bulk' && (
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

        {/* TAB 3: WORKER REGISTRATION */}
        {activeTab === 'workers' && (
          <div>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>➕ Add Worker Record</h3>
              <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <input type="number" placeholder="Worker ID (Optional)" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
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
                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}>Save Worker</button>
              </form>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <h3>📋 Workers List ({selectedDeptFilter})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '8px' }}>ID</th>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>Dept</th>
                    <th style={{ padding: '8px' }}>Rate</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>#{w.id}</td>
                      <td style={{ padding: '8px', fontWeight: '600' }}>{w.name}</td>
                      <td style={{ padding: '8px', color: '#0369a1' }}>{w.department}</td>
                      <td style={{ padding: '8px' }}>{selectedCurrency} {w.daily_rate}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteWorker(w.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TIMESHEET */}
        {activeTab === 'attendance' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            <h3>📅 Daily Timesheet ({selectedDeptFilter})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Dept</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>OT (Hrs)</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
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
          </div>
        )}

        {/* TAB 5: PAYROLL */}
        {activeTab === 'payroll' && (
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

        {/* TAB 6: PERMISSIONS & USER CREATION (ADMIN ONLY) */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>🔐 Department Users & Permissions</h3>
            <form onSubmit={handleSavePermission} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '25px' }}>
              <input type="email" placeholder="Staff Email *" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="password" placeholder="Password *" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <option value="Plumbing">Plumbing Dept</option>
                <option value="Electrical">Electrical Dept</option>
                <option value="Civil">Civil Dept</option>
                <option value="Ali Mardan">Ali Mardan Dept</option>
                <option value="Mustafa">Mustafa Dept</option>
              </select>
              <button type="submit" style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}>Create User Account</button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px' }}>User Email</th>
                  <th style={{ padding: '8px' }}>Assigned Dept</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {permissionsList.map(u => (
                  <tr key={u.user_email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: '600' }}>{u.user_email}</td>
                    <td style={{ padding: '8px', color: '#0369a1' }}>{u.assigned_department}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteUserPermission(u.user_email)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete User</button>
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
