import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// Supabase Configuration & Admin Client Initialization
const SUPABASE_URL = "https://aogwksalhyevskcuyxuu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "sb_secret_l5IgRzKw5P5sYcqvnyq8Bw_12q4Ka4o";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
export default function App() {
  // Authentication & Permission States
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchWorkers();
      fetchAttendance();
      fetchUserPermissions();
      fetchPermissionsList();
    }
  }, [session]);

  async function fetchUserPermissions() {
    if (session?.user?.email === 'admin@nda.pk') {
      setUserRole({
        is_admin: true,
        can_view_timesheet: true,
        can_view_salary: true,
        assigned_department: 'All'
      });
      return;
    }
    const { data } = await supabase.from('user_permissions').select('*').eq('user_email', session?.user?.email).single();
    if (data) {
      setUserRole(data);
      if (data.assigned_department && data.assigned_department !== 'All') {
        setSelectedDeptFilter(data.assigned_department);
      }
    }
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

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login Failed: ' + error.message);
    setAuthLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
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

  async function handleDeleteAttendance(id) {
    if (window.confirm('Kya aap is attendance entry ko delete karna chahte hain?')) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else {
        alert('Attendance entry delete ho gayi!');
        fetchAttendance();
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

  // AUTOMATIC USER CREATION & ACCESS PERMISSION (Bina Verification Ke Direct Active)
  async function handleSavePermission(e) {
    e.preventDefault();
    if (!targetEmail || !targetPassword) return alert('Email aur Password dono enter karein!');

    try {
      // 1. Direct Auth User Create karein (Email Auto-Confirmed)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail.trim(),
        password: targetPassword.trim(),
        email_confirm: true
      });

      if (authError && !authError.message.includes('already exists') && !authError.message.includes('already registered')) {
        return alert('Auth Error: ' + authError.message);
      }

      // 2. Department aur Permissions save karein
      const permData = {
        user_email: targetEmail.trim(),
        user_password: targetPassword.trim(),
        can_view_timesheet: permTimesheet,
        can_view_salary: permSalary,
        assigned_department: targetDept,
        is_admin: false
      };

      const { error: permError } = await supabase.from('user_permissions').upsert([permData]);

      if (permError) {
        alert('Permission Save Error: ' + permError.message);
      } else {
        alert(`User ${targetEmail} ka account active ho gaya hai! Ab yeh direct login kar sakta hai.`);
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

    const accruedLeaveDays = Math.round((presentDays / 30) * 2.5 * 10) / 10;
    const estimatedLeaveSalary = accruedLeaveDays * dailyRateNum;

    return { ...worker, presentDays, totalOT, baseSalary, otSalary, totalPayable, accruedLeaveDays, estimatedLeaveSalary };
  });

  const grandTotalPayroll = salaryData.reduce((acc, curr) => acc + curr.totalPayable, 0);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#f8fafc', fontSize: '24px', margin: 0 }}>NDA-PK SYSTEM</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>HR, Timekeeping & Department Portal</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '12px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff' }} required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '12px' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff' }} required />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {authLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#fff', padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Admin: Naveed ({session.user.email})</span>
        </div>
        <nav style={{ flex: 1, marginTop: '20px' }}>
          <button onClick={() => setActiveTab('dashboard')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'dashboard' ? '#1e293b' : 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>📊 Dashboard Summary</button>
          <button onClick={() => setActiveTab('bulk')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'bulk' ? '#1e293b' : 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>⚡ Bulk Attendance & OT</button>
          {(userRole.can_add_edit_workers || userRole.is_admin) && <button onClick={() => setActiveTab('workers')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'workers' ? '#1e293b' : 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>👷 Workers & Documents</button>}
          {userRole.can_view_timesheet && <button onClick={() => setActiveTab('attendance')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'attendance' ? '#1e293b' : 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>📅 Daily Timesheet</button>}
          {(userRole.can_view_salary || userRole.is_admin) && <button onClick={() => setActiveTab('payroll')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'payroll' ? '#1e293b' : 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>💵 Payroll & Leave Salary</button>}
          {userRole.is_admin && <button onClick={() => setActiveTab('permissions')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'permissions' ? '#1e293b' : 'transparent', color: '#f59e0b', border: 'none', cursor: 'pointer' }}>🔐 Access & Permissions</button>}
        </nav>
        <div style={{ padding: '20px' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🔒 Logout</button>
        </div>
      </aside>

      {/* Main Panel */}
      <main style={{ flex: 1, padding: '30px' }}>
        
        {/* Header Bar with Department Filter */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>NDA-PK SYSTEM</h1>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Department Filter Selector */}
            {userRole.is_admin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>🏢 Department View:</label>
                <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #2563eb', backgroundColor: '#eff6ff', fontWeight: '600' }}>
                  <option value="All">All Departments</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Civil">Civil</option>
                  <option value="Ali Mardan">Ali Mardan</option>
                  <option value="Mustafa">Mustafa</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Currency:</label>
              <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="AED">AED (Dirhams)</option>
                <option value="PKR">PKR (Rupees)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>🖨️ Print / PDF</button>
          </div>
        </header>

        {/* TAB 1: DASHBOARD SUMMARY */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', fontSize: '14px' }}>
              📌 Showing Data For: {selectedDeptFilter === 'All' ? 'All Departments' : `Department (${selectedDeptFilter})`}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #2563eb' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Workers ({selectedDeptFilter})</span>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '5px' }}>{filteredWorkers.length}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #16a34a' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Present Today</span>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginTop: '5px' }}>{presentTodayCount}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #d97706' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Total Overtime</span>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706', marginTop: '5px' }}>{totalOvertimeToday} hrs</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #0891b2' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Total Payroll ({selectedCurrency})</span>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '5px' }}>
                  {selectedCurrency} {Math.round(grandTotalPayroll).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BULK ATTENDANCE */}
        {activeTab === 'bulk' && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2>⚡ Department Bulk Attendance & Overtime</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Is tool se aap ek hi click par pure department (Plumbing, Electrical, Civil, Ali Mardan, Mustafa) ko Present/Absent mark karke Overtime de sakte hain.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '20px' }}>
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
                  Apply to All {bulkDepartment}s
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORKER REGISTRATION & DOCUMENTS */}
        {activeTab === 'workers' && (
          <div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
              <h2>➕ Add Worker & Personal Documents Record</h2>
              <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <input type="number" placeholder="Worker ID No. (Optional)" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                
                {/* Department Selection */}
                <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Plumbing">Plumbing Dept</option>
                  <option value="Electrical">Electrical Dept</option>
                  <option value="Civil">Civil Dept</option>
                  <option value="Ali Mardan">Ali Mardan Dept</option>
                  <option value="Mustafa">Mustafa Dept</option>
                </select>

                <input type="text" placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="number" placeholder={`Daily Rate (${selectedCurrency}) *`} value={dailyRate} onChange={e => setDailyRate(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <select value={religion} onChange={e => setReligion(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Muslim">Muslim</option>
                  <option value="Non-Muslim">Non-Muslim</option>
                </select>
                <input type="date" title="Last Vacation Return Date" value={lastVacationReturn} onChange={e => setLastVacationReturn(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="number" placeholder={`Security Deposit (${selectedCurrency})`} value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />

                {/* Document Links Section */}
                <input type="text" placeholder="Passport Copy Link / No." value={passportDoc} onChange={e => setPassportDoc(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="ID Card Copy Link / No." value={idCardDoc} onChange={e => setIdCardDoc(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Medical Card Copy Link" value={medicalCardDoc} onChange={e => setMedicalCardDoc(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Visa Copy Link" value={visaDoc} onChange={e => setVisaDoc(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Labour Card Copy Link" value={labourCardDoc} onChange={e => setLabourCardDoc(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />

                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Worker File</button>
              </form>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2>📋 Worker Records & Documents Database ({selectedDeptFilter})</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Name</th>
                    <th style={{ padding: '10px' }}>Dept</th>
                    <th style={{ padding: '10px' }}>Passport</th>
                    <th style={{ padding: '10px' }}>ID Card</th>
                    <th style={{ padding: '10px' }}>Medical Card</th>
                    <th style={{ padding: '10px' }}>Visa</th>
                    <th style={{ padding: '10px' }}>Labour Card</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#2563eb' }}>#{w.id}</td>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{w.name}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#0369a1' }}>{w.department}</td>
                      <td style={{ padding: '10px' }}>{w.passport_doc || 'N/A'}</td>
                      <td style={{ padding: '10px' }}>{w.id_card_doc || 'N/A'}</td>
                      <td style={{ padding: '10px' }}>{w.medical_card_doc || 'N/A'}</td>
                      <td style={{ padding: '10px' }}>{w.visa_doc || 'N/A'}</td>
                      <td style={{ padding: '10px' }}>{w.labour_card_doc || 'N/A'}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteWorker(w.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DAILY TIMESHEET */}
        {activeTab === 'attendance' && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2>📅 Daily Timesheet & Attendance Log ({selectedDeptFilter})</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Today's Status</th>
                  <th style={{ padding: '12px' }}>Overtime (Hrs)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Mark Attendance</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(worker => {
                  const record = latestAttendanceMap[worker.id];
                  const currentStatus = record ? record.status : 'Not Marked';
                  const currentOT = record ? record.overtime_hours : 0;
                  return (
                    <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#2563eb' }}>#{worker.id}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{worker.name}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0369a1' }}>{worker.department}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: currentStatus === 'Present' ? '#dcfce7' : currentStatus === 'Absent' ? '#fee2e2' : '#f1f5f9',
                          color: currentStatus === 'Present' ? '#166534' : currentStatus === 'Absent' ? '#991b1b' : '#475569'
                        }}>
                          {currentStatus} {currentStatus === 'Present' && currentOT > 0 ? `(+${currentOT}h OT)` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          placeholder="0"
                          value={overtimeInputs[worker.id] ?? ''}
                          onChange={(e) => setOvertimeInputs({ ...overtimeInputs, [worker.id]: e.target.value })}
                          style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button onClick={() => handleMarkAttendance(worker.id, 'Present')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' }}>Present</button>
                        <button onClick={() => handleMarkAttendance(worker.id, 'Absent')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Absent</button>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {record && (
                          <button onClick={() => handleDeleteAttendance(record.id)} style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            🗑️ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: PAYROLL REPORT */}
        {activeTab === 'payroll' && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2>💵 Accumulated Payroll & Leave Salary Report ({selectedCurrency}) - {selectedDeptFilter}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Worker</th>
                  <th style={{ padding: '10px' }}>Department</th>
                  <th style={{ padding: '10px' }}>Daily Rate</th>
                  <th style={{ padding: '10px' }}>Present</th>
                  <th style={{ padding: '10px' }}>OT (Hrs)</th>
                  <th style={{ padding: '10px' }}>Accrued Leave Days</th>
                  <th style={{ padding: '10px' }}>Leave Pay ({selectedCurrency})</th>
                  <th style={{ padding: '10px' }}>Deposit Held</th>
                  <th style={{ padding: '10px', fontWeight: 'bold' }}>Net Total Payable</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#2563eb' }}>#{s.id}</td>
                    <td style={{ padding: '10px' }}>{s.name} <br/><span style={{ fontSize: '11px', color: '#64748b' }}>{s.religion}</span></td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#0369a1' }}>{s.department}</td>
                    <td style={{ padding: '10px' }}>{selectedCurrency} {s.daily_rate}</td>
                    <td style={{ padding: '10px', color: '#16a34a' }}>{s.presentDays} days</td>
                    <td style={{ padding: '10px' }}>{s.totalOT} hrs</td>
                    <td style={{ padding: '10px', color: '#d97706' }}>{s.accruedLeaveDays} days</td>
                    <td style={{ padding: '10px' }}>{selectedCurrency} {Math.round(s.estimatedLeaveSalary)}</td>
                    <td style={{ padding: '10px' }}>{selectedCurrency} {s.security_deposit}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#2563eb' }}>{selectedCurrency} {Math.round(s.totalPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: ACCESS PERMISSIONS & USER CREATION */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2>🔐 User Creation & Department Access Permissions</h2>
            <p style={{ color: '#64748b', fontSize: '13px' }}>Naye user ko specific email, password aur department assign karein. Woh user sirf apne assigned department ko dekh sakega.</p>
            
            <form onSubmit={handleSavePermission} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '25px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <input type="email" placeholder="User Email *" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="password" placeholder="User Password *" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              
              <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <option value="Plumbing">Plumbing Dept</option>
                <option value="Electrical">Electrical Dept</option>
                <option value="Civil">Civil Dept</option>
                <option value="Ali Mardan">Ali Mardan Dept</option>
                <option value="Mustafa">Mustafa Dept</option>
                <option value="All">All Departments</option>
              </select>

              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={permTimesheet} onChange={e => setPermTimesheet(e.target.checked)} /> Allow View Timesheet
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={permSalary} onChange={e => setPermSalary(e.target.checked)} /> Allow View Salary
              </label>
              
              <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Create / Save User</button>
            </form>

            <h3>Configured User Access Rules</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '10px' }}>User Email</th>
                  <th style={{ padding: '10px' }}>Assigned Department</th>
                  <th style={{ padding: '10px' }}>Timesheet Access</th>
                  <th style={{ padding: '10px' }}>Salary Access</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {permissionsList.map(p => (
                  <tr key={p.user_email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.user_email}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#0369a1' }}>{p.assigned_department || 'All'}</td>
                    <td style={{ padding: '10px' }}>{p.can_view_timesheet ? '✅ Allowed' : '❌ Blocked'}</td>
                    <td style={{ padding: '10px' }}>{p.can_view_salary ? '✅ Allowed' : '❌ Blocked'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteUserPermission(p.user_email)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Delete Access</button>
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
