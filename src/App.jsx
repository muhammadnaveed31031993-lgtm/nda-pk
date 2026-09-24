import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // Authentication & Permission States
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userRole, setUserRole] = useState({
    is_admin: true,
    can_view_timesheet: true,
    can_view_salary: true,
    can_view_annual_leave: true,
    can_view_security_deposit: true,
    can_add_edit_workers: true
  });

  // Global Settings
  const [selectedCurrency, setSelectedCurrency] = useState('AED');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Data States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);

  // Form States for Worker Registration
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Carpenter');
  const [designation, setDesignation] = useState('Carpenter');
  const [dailyRate, setDailyRate] = useState('');
  const [religion, setReligion] = useState('Muslim');
  const [lastVacationReturn, setLastVacationReturn] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('0');
  const [passportNo, setPassportNo] = useState('');
  const [nationalId, setNationalId] = useState('');

  // Bulk Operations State
  const [bulkDepartment, setBulkDepartment] = useState('Carpenter');
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
    }
  }, [session]);

  async function fetchUserPermissions() {
    const { data } = await supabase.from('user_permissions').select('*').eq('user_email', session?.user?.email).single();
    if (data) setUserRole(data);
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

  // Register Worker
  async function handleAddWorker(e) {
    e.preventDefault();
    if (!userRole.can_add_edit_workers && !userRole.is_admin) {
      return alert('Aap ko workers add karne ki permission nahi hai!');
    }

    const newWorker = {
      id: Number(workerIdInput),
      name: name.trim(),
      department: department.trim(),
      designation: designation.trim(),
      daily_rate: Number(dailyRate),
      religion,
      currency: selectedCurrency,
      last_vacation_return: lastVacationReturn || null,
      security_deposit: Number(securityDeposit),
      passport_no: passportNo,
      national_id: nationalId
    };

    const { error } = await supabase.from('workers').insert([newWorker]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setWorkerIdInput('');
      setName('');
      setDailyRate('');
      setPassportNo('');
      setNationalId('');
      fetchWorkers();
    }
  }

  // Bulk Attendance / Overtime Action
  async function handleBulkAttendance() {
    const deptWorkers = workers.filter(w => w.department.toLowerCase() === bulkDepartment.toLowerCase());
    if (deptWorkers.length === 0) return alert('Is department mein koi worker nahi mila!');

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

  // Calculations
  const activeWorkerIds = new Set(workers.map(w => w.id));
  const todayAttendance = attendance.filter(a => a.date === today && activeWorkerIds.has(a.worker_id));
  
  const latestAttendanceMap = {};
  todayAttendance.forEach(a => {
    latestAttendanceMap[a.worker_id] = a;
  });

  const salaryData = workers.map(worker => {
    const workerRecords = attendance.filter(a => a.worker_id === worker.id && a.status === 'Present');
    const presentDays = workerRecords.length;
    const totalOT = workerRecords.reduce((acc, curr) => acc + Number(curr.overtime_hours || 0), 0);
    const dailyRateNum = Number(worker.daily_rate || 0);
    const hourlyRate = dailyRateNum / 8;
    const baseSalary = presentDays * dailyRateNum;
    const otSalary = totalOT * hourlyRate;
    const totalPayable = baseSalary + otSalary;

    // Leave Calculations (Assumed 2.5 days accrued per month worked)
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
            <h1 style={{ color: '#f8fafc', fontSize: '24px', margin: 0 }}>NDA-PK ERP Portal</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>HR, Timekeeping & Permissions Manager</p>
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
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK Management</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email}</span>
        </div>
        <nav style={{ flex: 1, marginTop: '20px' }}>
          {userRole.can_view_timesheet && <button onClick={() => setActiveTab('dashboard')} style={{ width: '100%', textAlign: 'left', padding: '12px 20px', backgroundColor: activeTab === 'dashboard' ? '#1e293b' : 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>📊 Dashboard</button>}
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
        
        {/* Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>HR ERP & Timekeeping Module</h1>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Currency:</label>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED (Dirhams)</option>
              <option value="PKR">PKR (Rupees)</option>
              <option value="USD">USD ($)</option>
            </select>
            <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>🖨️ Print / PDF</button>
          </div>
        </header>

        {/* TAB 1: BULK ATTENDANCE & OVERTIME */}
        {activeTab === 'bulk' && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2>⚡ Department Bulk Attendance & Overtime</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Is tool se aap ek hi click par pure department (e.g. Sabhi Carpenters) ko Present/Absent mark karke Overtime de sakte hain.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '20px' }}>
              <div>
                <label style={{ fontSize: '12px' }}>Select Department</label>
                <input type="text" value={bulkDepartment} onChange={e => setBulkDepartment(e.target.value)} placeholder="Carpenter, Mason..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
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

        {/* TAB 2: WORKER REGISTRATION & DOCUMENTS */}
        {activeTab === 'workers' && (
          <div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
              <h2>➕ Add Worker & Document Record</h2>
              <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <input type="number" placeholder="Manual Worker ID *" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Department (e.g., Carpenter)" value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="number" placeholder={`Daily Rate (${selectedCurrency}) *`} value={dailyRate} onChange={e => setDailyRate(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <select value={religion} onChange={e => setReligion(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Muslim">Muslim</option>
                  <option value="Non-Muslim">Non-Muslim</option>
                </select>
                <input type="date" title="Last Vacation Return Date" value={lastVacationReturn} onChange={e => setLastVacationReturn(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="number" placeholder={`Security Deposit (${selectedCurrency})`} value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Passport No." value={passportNo} onChange={e => setPassportNo(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input type="text" placeholder="Emirates ID / CNIC" value={nationalId} onChange={e => setNationalId(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Worker File</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: PAYROLL & LEAVE SALARY REPORT */}
        {activeTab === 'payroll' && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2>💵 Accumulated Payroll & Leave Salary Report ({selectedCurrency})</h2>
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
                    <td style={{ padding: '10px' }}>{s.department}</td>
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

      </main>
    </div>
  );
}
