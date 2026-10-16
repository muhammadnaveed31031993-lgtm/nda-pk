import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const dailyTimesheetPrintStyle = `
@media print {.app-footer {
  display: block !important;
  visibility: visible !important;
  position: static !important;
  width: 100% !important;
  text-align: center !important;
  color: #000 !important;
  background: #fff !important;
  font-size: 12px !important;
  margin-top: 20px !important;
  padding: 10px !important;
}
  body * {
    visibility: hidden !important;
  }

  .daily-timesheet-print,
  .daily-timesheet-print * {
    visibility: visible !important;
  }

  .daily-timesheet-print {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 10px !important;
    background: white !important;
    color: black !important;
  }

  .daily-timesheet-print button {
    display: none !important;
  }

  @page {
    size: A4 landscape;
    margin: 8mm;
  }
}
`;

const fieldStyle = { width:'100%', boxSizing:'border-box', padding:'11px 12px', border:'1px solid #cbd5e1', borderRadius:8, background:'#fff', color:'#0f172a' };
const primaryStyle = { width:'100%', padding:'12px 14px', border:0, borderRadius:9, background:'#1d4ed8', color:'#fff', fontWeight:800, cursor:'pointer' };
const tableStyle = { width:'100%', borderCollapse:'collapse', fontSize:13, textAlign:'left' };
const thStyle = { padding:'10px 8px', borderBottom:'1px solid #e2e8f0', color:'#475569', whiteSpace:'nowrap' };
const tdStyle = { padding:'10px 8px', borderBottom:'1px solid #f1f5f9', verticalAlign:'top' };

export default function App() {
  const [session, setSession] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null); // 'hr' | 'business'
  const [businessType, setBusinessType] = useState('transport');
  const [businessTransactions, setBusinessTransactions] = useState([]);
  const [businessWorkers, setBusinessWorkers] = useState([]);
  const [businessSalaryPayments, setBusinessSalaryPayments] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0,10));
  const [businessMonth, setBusinessMonth] = useState(new Date().toISOString().slice(0,7));
  const [businessTxnKind, setBusinessTxnKind] = useState('income');
  const [businessTxnCategory, setBusinessTxnCategory] = useState('Daily income');
  const [businessTxnDescription, setBusinessTxnDescription] = useState('');
  const [businessTxnAmount, setBusinessTxnAmount] = useState('');
  const [businessTxnPaymentMode, setBusinessTxnPaymentMode] = useState('Cash');
  const [businessWorkerName, setBusinessWorkerName] = useState('');
  const [businessWorkerJob, setBusinessWorkerJob] = useState('Driver');
  const [businessWorkerPhone, setBusinessWorkerPhone] = useState('');
  const [businessWorkerSalary, setBusinessWorkerSalary] = useState('');
  const [businessSalaryWorkerId, setBusinessSalaryWorkerId] = useState('');
  const [businessSalaryAmount, setBusinessSalaryAmount] = useState('');
  const [businessSalaryPaymentMode, setBusinessSalaryPaymentMode] = useState('Cash');
  const [businessSalaryDate, setBusinessSalaryDate] = useState(new Date().toISOString().slice(0,10));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [showMonthlyTimesheetModal, setShowMonthlyTimesheetModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [timesheetSearchQuery, setTimesheetSearchQuery] = useState('');
  const [viewingWorkerTimesheet, setViewingWorkerTimesheet] = useState(null);
  const [annualLeaveList, setAnnualLeaveList] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  
  const [hasDeduction, setHasDeduction] = useState(true);
  const [manualDeductionDays, setManualDeductionDays] = useState('');
  const [deductionBreakdownText, setDeductionBreakdownText] = useState('');
  const [leaveWorkerId, setLeaveWorkerId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveExpectedReturnDate, setLeaveExpectedReturnDate] = useState('');
  const [leaveActualReturnDate, setLeaveActualReturnDate] = useState('');
  const [penaltyPerMonthDays, setPenaltyPerMonthDays] = useState(5);
  const [monthlyDeductions, setMonthlyDeductions] = useState({});
  
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [newLoginEmailInput, setNewLoginEmailInput] = useState('');
  const [cleanupMode, setCleanupMode] = useState('day');
  const [cleanupSelectedDate, setCleanupSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [cleanupMonth, setCleanupMonth] = useState(new Date().toISOString().slice(0,7));
  const [cleanupStartDate, setCleanupStartDate] = useState(new Date().toISOString().slice(0,10));
  const [cleanupEndDate, setCleanupEndDate] = useState(new Date().toISOString().slice(0,10));
  const [cleanupAttendance, setCleanupAttendance] = useState(true);
  const [cleanupDailyDetails, setCleanupDailyDetails] = useState(true);
  const [cleanupAnnualLeaves, setCleanupAnnualLeaves] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const [userRole, setUserRole] = useState({
    is_admin: true,
    assigned_department: 'All',
    assigned_site: 'All',
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

  const [selectedCurrency, setSelectedCurrency] = useState('AED');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [modalDepartment, setModalDepartment] = useState(null);
  const [modalLocationTab, setModalLocationTab] = useState('All');

  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [sitesList, setSitesList] = useState(['Sharjah Mamzar', 'Ajman Aaliya', 'Dubai Downtown']);
  const [departmentsList, setDepartmentsList] = useState(['Plumbing', 'Electrical', 'Civil', 'Mustafa']);

  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [workSite, setWorkSite] = useState('Sharjah Mamzar');
  const [designation, setDesignation] = useState('Plumber');
  const [designationsList, setDesignationsList] = useState([
    'Carpenter', 'Carpenter Helper', 'Steel Fixer', 'Steel Fixer Helper',
    'Plumber', 'Mason', 'Electrician', 'Painter', 'Helper', 'Foreman', 'Driver', 'Office Boy', 'Timekeeper'
  ]);
  const [newDesignation, setNewDesignation] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [religion, setReligion] = useState('Muslim');
  
  const [lastReturnDate, setLastReturnDate] = useState('');
  const [annualLeaveRate, setAnnualLeaveRate] = useState('30');
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState('0');

  const [passportFileUrl, setPassportFileUrl] = useState('');
  const [idCardFileUrl, setIdCardFileUrl] = useState('');
  const [medicalCardFileUrl, setMedicalCardFileUrl] = useState('');
  const [visaFileUrl, setVisaFileUrl] = useState('');
  const [labourCardFileUrl, setLabourCardFileUrl] = useState('');

  const [personalDocTitle, setPersonalDocTitle] = useState('');
  const [personalDocCategory, setPersonalDocCategory] = useState('Visa');
  const [personalFileUrl, setPersonalFileUrl] = useState('');
  const [newSiteInput, setNewSiteInput] = useState('');
  const [newDeptInput, setNewDeptInput] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  const [targetStaffId, setTargetStaffId] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [targetDept, setTargetDept] = useState('Plumbing');
  const [targetSite, setTargetSite] = useState('Sharjah Mamzar');
  
  const [permDashboard, setPermDashboard] = useState(true);
  const [permBulk, setPermBulk] = useState(false);
  const [permViewWorkers, setPermViewWorkers] = useState(true);
  const [permAddWorkers, setPermAddWorkers] = useState(false);
  const [permEditWorkers, setPermEditWorkers] = useState(false);
  const [permDeleteWorkers, setPermDeleteWorkers] = useState(false);
  const [permTimesheetView, setPermTimesheetView] = useState(true);
  const [permTimesheetEdit, setPermTimesheetEdit] = useState(true);
  const [permPayroll, setPermPayroll] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState(today);
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkDesignation, setBulkDesignation] = useState('All');
  const [bulkSite, setBulkSite] = useState('Sharjah Mamzar');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');
  const [bulkContractOT, setBulkContractOT] = useState('0');
  const [bulkWorkDetails, setBulkWorkDetails] = useState('');
  
  const [quickWorkerId, setQuickWorkerId] = useState('');
  const [quickSite, setQuickSite] = useState('Sharjah Mamzar');
  const [quickOTType, setQuickOTType] = useState('Normal OT');
  const [quickHours, setQuickHours] = useState('2');
  const [quickSaving, setQuickSaving] = useState(false);
  
  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [timesheetSiteInputs, setTimesheetSiteInputs] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [dailyTimesheetSite, setDailyTimesheetSite] = useState('All Workers');
  const [savedDailyWorkDetails, setSavedDailyWorkDetails] = useState('');

  // Auto Logout on Window Close / Unload
  useEffect(() => {
    const handleUnload = () => {
      localStorage.removeItem('nda_user_session');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  async function fetchBusinessData(type = businessType) {
    if (!session) return;
    setBusinessLoading(true);
    try {
      const [tx, ws, pay] = await Promise.all([
        supabase.from('business_transactions').select('*').eq('business_type', type).order('transaction_date', { ascending: false }),
        supabase.from('business_workers').select('*').eq('business_type', type).order('worker_name', { ascending: true }),
        supabase.from('business_salary_payments').select('*').eq('business_type', type).order('payment_date', { ascending: false })
      ]);
      const firstError = tx.error || ws.error || pay.error;
      if (firstError) throw firstError;
      setBusinessTransactions(tx.data || []);
      setBusinessWorkers(ws.data || []);
      setBusinessSalaryPayments(pay.data || []);
    } catch (e) {
      console.error('Business data load error:', e);
    } finally { setBusinessLoading(false); }
  }

  useEffect(() => {
    if (session && selectedSystem === 'business') fetchBusinessData(businessType);
  }, [session, selectedSystem, businessType]);

  async function handleSaveBusinessTransaction(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Business financial entries sirf admin add kar sakta hai.');
    const amount = Number(businessTxnAmount);
    if (!businessDate || !Number.isFinite(amount) || amount <= 0) return alert('Date aur amount sahi enter karein.');
    const payload = { business_type: businessType, transaction_date: businessDate, transaction_kind: businessTxnKind, category: businessTxnCategory.trim() || 'Income', description: businessTxnDescription.trim(), amount, payment_mode: businessTxnPaymentMode, created_by: session?.user?.email || '' };
    const { error } = await supabase.from('business_transactions').insert([payload]);
    if (error) return alert('Entry save nahi hui: ' + error.message);
    setBusinessTxnAmount(''); setBusinessTxnDescription('');
    await fetchBusinessData();
  }

  async function handleAddBusinessWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access denied.');
    if (!businessWorkerName.trim()) return alert('Worker ka naam likhein.');
    const payload = { business_type: businessType, worker_name: businessWorkerName.trim(), job_title: businessWorkerJob.trim(), phone: businessWorkerPhone.trim(), monthly_salary: Number(businessWorkerSalary) || 0, active: true };
    const { error } = await supabase.from('business_workers').insert([payload]);
    if (error) return alert('Error: ' + error.message);
    setBusinessWorkerName(''); setBusinessWorkerPhone(''); setBusinessWorkerSalary('');
    await fetchBusinessData();
  }

  async function handlePayBusinessSalary(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access denied.');
    const worker = businessWorkers.find(w => String(w.id) === String(businessSalaryWorkerId));
    const amount = Number(businessSalaryAmount);
    if (!worker || !businessSalaryDate || !Number.isFinite(amount) || amount <= 0) return alert('Sahi details select karein.');
    const { error } = await supabase.from('business_salary_payments').insert([{ business_type: businessType, worker_id: worker.id, payment_date: businessSalaryDate, amount, payment_mode: businessSalaryPaymentMode, notes: 'Monthly salary payment' }]);
    if (error) return alert('Error: ' + error.message);
    setBusinessSalaryAmount(''); await fetchBusinessData();
  }

  async function handleDeleteBusinessTransaction(id) {
    if (!userRole.is_admin) return;
    if (!window.confirm('Delete this entry?')) return;
    await supabase.from('business_transactions').delete().eq('id', id).eq('business_type', businessType);
    await fetchBusinessData();
  }

  useEffect(() => {
    async function loadDailyWorkDetails() {
      if (!selectedTimesheetDate || !dailyTimesheetSite) {
        setSavedDailyWorkDetails('');
        return;
      }
      let query = supabase.from('daily_work_details').select('work_site,work_details').eq('work_date', selectedTimesheetDate);
      if (dailyTimesheetSite !== 'All Workers' && dailyTimesheetSite !== 'All') {
        query = query.eq('work_site', dailyTimesheetSite);
      }
      const { data } = await query;
      if (dailyTimesheetSite === 'All Workers' || dailyTimesheetSite === 'All') {
        const combined = (data || []).filter(item => item.work_details).map(item => `${item.work_site || 'Site'}: ${item.work_details}`).join('\n');
        setSavedDailyWorkDetails(combined);
      } else {
        setSavedDailyWorkDetails(data?.[0]?.work_details || '');
      }
    }
    loadDailyWorkDetails();
  }, [selectedTimesheetDate, dailyTimesheetSite]);

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
      fetchAnnualLeaves();
      fetchDesignations();
    }
  }, [session]);

  async function fetchAnnualLeaves() {
    const { data } = await supabase.from('annual_leaves').select('*').order('id', { ascending: false });
    if (data) setAnnualLeaveList(data);
  }

  function getAnnualLeaveForWorker(workerId, date) {
    if (!workerId || !date) return null;
    return annualLeaveList.find(leave => {
      const sameWorker = String(leave.worker_id) === String(workerId);
      const startDate = leave.start_date;
      const actualReturn = leave.actual_return;
      const hasStarted = startDate && date >= startDate;
      const hasNotActuallyReturned = !actualReturn || actualReturn === 'On Leave' || date < actualReturn;
      return sameWorker && hasStarted && hasNotActuallyReturned;
    }) || null;
  }

  async function fetchDesignations() {
    const { data } = await supabase.from('designations').select('*').order('name', { ascending: true });
    if (data) {
      const savedNames = data.map(item => item.name);
      setDesignationsList(prev => [...new Set([...prev, ...savedNames])]);
    }
  }

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
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (error) return;
    setAttendance(data || []);

    const dateMap = {};
    (data || []).forEach(record => {
      if (!dateMap[record.date]) dateMap[record.date] = {};
      dateMap[record.date][record.worker_id] = {
        status: record.status,
        ot: Number(record.overtime_hours) || 0,
        contract_ot: Number(record.contract_overtime_hours) || 0,
        site: record.work_site || ''
      };
    });
    setAttendanceData(dateMap);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data: account, error: accountError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_email', cleanEmail)
        .maybeSingle();

      let resolvedAccount = account;
      if (!resolvedAccount && cleanEmail === 'admin@nda.pk' && cleanPassword === '123456') {
        const initialAdmin = {
          staff_id: 'ADMIN',
          user_email: 'admin@nda.pk',
          user_password: '123456',
          assigned_department: 'All',
          assigned_site: 'All',
          can_view_dashboard: true,
          can_use_bulk: true,
          can_view_workers: true,
          can_add_workers: true,
          can_edit_workers: true,
          can_delete_workers: true,
          can_view_timesheet: true,
          can_edit_timesheet: true,
          can_view_payroll: true,
          is_admin: true
        };
        const { data: insertedAdmin } = await supabase.from('user_permissions').insert([initialAdmin]).select('*').maybeSingle();
        resolvedAccount = insertedAdmin || initialAdmin;
      }

      if (!resolvedAccount || String(resolvedAccount.user_password) !== cleanPassword) {
        alert('Invalid Email or Password!');
        setAuthLoading(false);
        return;
      }

      const isAdminAccount = resolvedAccount.is_admin === true || resolvedAccount.is_admin === 'true';
      if (isAdminAccount) {
        const adminRole = {
          is_admin: true,
          assigned_department: 'All',
          assigned_site: 'All',
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
        setActiveTab('dashboard');
        setAuthLoading(false);
        return;
      }

      const staffRole = {
        is_admin: false,
        staff_id: resolvedAccount.staff_id || '',
        assigned_department: resolvedAccount.assigned_department || 'All',
        assigned_site: resolvedAccount.assigned_site || 'All',
        can_view_dashboard: resolvedAccount.can_view_dashboard ?? true,
        can_use_bulk: resolvedAccount.can_use_bulk ?? false,
        can_view_workers: resolvedAccount.can_view_workers ?? true,
        can_add_workers: resolvedAccount.can_add_workers ?? false,
        can_edit_workers: resolvedAccount.can_edit_workers ?? false,
        can_delete_workers: resolvedAccount.can_delete_workers ?? false,
        can_view_timesheet: resolvedAccount.can_view_timesheet ?? true,
        can_edit_timesheet: resolvedAccount.can_edit_timesheet ?? false,
        can_view_payroll: resolvedAccount.can_view_payroll ?? false
      };

      const sessionObj = { user: { email: cleanEmail }, role: staffRole };
      setSession(sessionObj);
      setUserRole(staffRole);
      localStorage.setItem('nda_user_session', JSON.stringify(sessionObj));
      setActiveTab('dashboard');
    } catch (err) {
      alert('Login error: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('nda_user_session');
    setSession(null);
    setSelectedSystem(null);
  }

  async function handleSingleAttendanceChange(workerId, dateStr, newStatus, newOt, newSite, newContractOT = 0) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) throw new Error('Permission denied.');
    
    // Agar status Absent ya Leave hai, toh OT automatic 0 ho jayegi
    const finalOt = (newStatus === 'Absent' || newStatus === 'Leave' || newStatus === 'Annual Leave') ? 0 : (Number(newOt) || 0);
    const finalContractOt = (newStatus === 'Absent' || newStatus === 'Leave' || newStatus === 'Annual Leave') ? 0 : (Number(newContractOT) || 0);

    const worker = workers.find(w => String(w.id) === String(workerId));
    const assignedSite = !userRole.is_admin && userRole.assigned_site !== 'All' ? userRole.assigned_site : (newSite || worker?.work_site || sitesList[0]);

    setAttendanceData(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [workerId]: { status: newStatus, ot: finalOt, contract_ot: finalContractOt, site: assignedSite }
      }
    }));

    await supabase.from('attendance').upsert([{
      worker_id: workerId,
      date: dateStr,
      status: newStatus,
      overtime_hours: finalOt,
      contract_overtime_hours: finalContractOt,
      department: worker?.department,
      work_site: assignedSite
    }], { onConflict: 'worker_id,date' });
  }

  // ✨ Auto-Absent Logic for unentered workers on a given date
  async function ensureDefaultAbsentForUnentered(dateStr, targetWorkers, currentAttendanceMap) {
    const upserts = [];
    targetWorkers.forEach(w => {
      const record = currentAttendanceMap[w.id];
      const annualLeave = getAnnualLeaveForWorker(w.id, dateStr);

      if (annualLeave) {
        if (!record || record.status !== 'Annual Leave') {
          upserts.push({
            worker_id: w.id,
            date: dateStr,
            status: 'Annual Leave',
            overtime_hours: 0,
            contract_overtime_hours: 0,
            work_site: w.work_site || sitesList[0]
          });
        }
      } else if (!record) {
        // Jis worker ki ID enter nahi hui, usko automatic ABSENT mark kar do
        upserts.push({
          worker_id: w.id,
          date: dateStr,
          status: 'Absent',
          overtime_hours: 0,
          contract_overtime_hours: 0,
          work_site: w.work_site || sitesList[0]
        });
      }
    });

    if (upserts.length > 0) {
      await supabase.from('attendance').upsert(upserts, { onConflict: 'worker_id,date' });
      await fetchAttendance();
    }
  }

  async function handleQuickAttendance(e) {
    e.preventDefault();
    if (quickSaving) return;
    const enteredId = quickWorkerId.trim();

    const worker = workers.find(w =>
      String(w.worker_id ?? '').trim().toLowerCase() === enteredId.toLowerCase() ||
      String(w.id).trim().toLowerCase() === enteredId.toLowerCase()
    );

    if (!worker) {
      alert('Worker ID nahi mila. Sahi ID enter karein.');
      return;
    }

    const hours = Number(quickHours) || 0;
    const normalOT = quickOTType === 'Normal OT' ? hours : 0;
    const contractOT = quickOTType === 'Contract OT' ? hours : 0;

    setQuickSaving(true);
    try {
      // Pehle ensure karein ke baqi tamam workers ke records table mein mojood hon
      const currentMap = attendanceData[selectedTimesheetDate] || {};
      const activeList = userRole.is_admin ? workers : filteredWorkers;
      await ensureDefaultAbsentForUnentered(selectedTimesheetDate, activeList, currentMap);

      // Ab jis worker ki ID enter hui hai use PRESENT mark karein
      await handleSingleAttendanceChange(
        worker.id,
        selectedTimesheetDate,
        'Present',
        normalOT,
        quickSite,
        contractOT
      );

      setQuickWorkerId('');
      setQuickHours('2');
      document.getElementById('quick-worker-id')?.focus();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setQuickSaving(false);
    }
  }

  const filteredWorkers = workers.filter(w => {
    const userDeptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
    const userSiteScope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
    let deptMatch = (!userDeptScope || userDeptScope === 'All' || w.department?.toLowerCase() === userDeptScope.toLowerCase());
    let siteMatch = (!userSiteScope || userSiteScope === 'All' || w.work_site?.toLowerCase() === userSiteScope.toLowerCase());
    return deptMatch && siteMatch;
  });

  const activeWorkerIds = new Set(filteredWorkers.map(w => w.id));
  const selectedDateAttendance = attendance.filter(a => a.date === selectedTimesheetDate && activeWorkerIds.has(a.worker_id));
  const latestAttendanceMap = {};
  selectedDateAttendance.forEach(a => { latestAttendanceMap[a.worker_id] = a; });

  const presentCountForDate = filteredWorkers.filter(worker => {
    const annualLeave = getAnnualLeaveForWorker(worker.id, selectedTimesheetDate);
    if (annualLeave) return false;
    const rec = latestAttendanceMap[worker.id];
    return (rec?.status || '').trim().toLowerCase() === 'present';
  }).length;

  const annualLeaveCountForDate = filteredWorkers.filter(worker => {
    const annualLeave = getAnnualLeaveForWorker(worker.id, selectedTimesheetDate);
    const rec = latestAttendanceMap[worker.id];
    return annualLeave || (rec?.status || '').toLowerCase() === 'annual leave';
  }).length;

  const absentCountForDate = filteredWorkers.filter(worker => {
    const annualLeave = getAnnualLeaveForWorker(worker.id, selectedTimesheetDate);
    if (annualLeave) return false;
    const rec = latestAttendanceMap[worker.id];
    const status = (rec?.status || '').toLowerCase();
    return status === 'absent' || !rec;
  }).length;

  if (!selectedSystem) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #164e63 0, #0f172a 48%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ textAlign: 'center', color: '#fff', marginBottom: 28 }}>
            <div style={{ fontSize: 13, letterSpacing: 4, color: '#67e8f9', fontWeight: 800 }}>NDA-PK DIGITAL WORKSPACE</div>
            <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '10px 0' }}>Choose Your System</h1>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Apna system select karein.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            <button onClick={() => setSelectedSystem('hr')} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #38bdf8', color: '#fff', background: 'linear-gradient(145deg,#075985,#1e3a8a)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>👷</div>
              <h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK HR SYSTEM</h2>
              <p style={{ color: '#dbeafe', lineHeight: 1.6 }}>Workers, attendance, timesheet, payroll, annual leave & permissions.</p>
              <span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#1d4ed8', borderRadius: 10, fontWeight: 800 }}>Open HR System →</span>
            </button>
            <button onClick={() => { setSelectedSystem('business'); setBusinessType('transport'); }} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #34d399', color: '#fff', background: 'linear-gradient(145deg,#065f46,#14532d)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>📈</div>
              <h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK BUSINESS</h2>
              <p style={{ color: '#d1fae5', lineHeight: 1.6 }}>Transport & Dairy Farming financial management.</p>
              <span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#047857', borderRadius: 10, fontWeight: 800 }}>Open Business →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '380px', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ color: '#f8fafc', fontSize: '22px', margin: 0 }}>NDA-PK SYSTEM</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>Secure Login</p>
            <button type="button" onClick={() => setSelectedSystem(null)} style={{ marginTop: 8, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>← Change System</button>
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

  // Agar user ne Business select kiya hai lekin woh admin nahi hai toh restriction
  if (selectedSystem === 'business' && !userRole.is_admin) {
    return (
      <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f1f5f9',padding:20,fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:'#fff',padding:28,borderRadius:16,maxWidth:500,textAlign:'center',boxShadow:'0 8px 30px #0f172a12'}}>
          <h2>Business Access Restricted</h2>
          <p>Business financial records sirf admin account ke liye available hain.</p>
          <button onClick={()=>setSelectedSystem(null)} style={primaryStyle}>Back to System Selection</button>
          <button onClick={handleLogout} style={{...primaryStyle,marginTop:10,background:'#64748b'}}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM (Multi-Site)</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <span style={{ fontSize: '16px' }}>👤</span>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Administrator</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>Muhammad Naveed</div>
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => setSelectedSystem(null)} style={{ padding: '6px 12px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Switch System</button>
          <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Dashboard</button>
        <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk & Quick ID</button>
        <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers Directory</button>
        <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet Report</button>
        <button onClick={() => setActiveTab('daily-timesheet')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'daily-timesheet' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📄 Daily Timesheet</button>
        <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        <button onClick={() => setActiveTab('changepass')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'changepass' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔑 Change Password</button>
        {userRole.is_admin && <button onClick={() => setActiveTab('sites')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'sites' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏗️ Sites</button>}
        {userRole.is_admin && <button onClick={() => setActiveTab('annualLeave')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'annualLeave' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🌴 Annual Leave</button>}
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2>Dashboard</h2>
            <p>Welcome to NDA-PK HR System. Use the top menu to navigate between Quick Attendance, Timesheets, and Payroll.</p>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px', color: '#1d4ed8' }}>⚡ Quick Worker ID Attendance Entry</h3>
            <p style={{ color: '#475569', fontSize: '13px' }}>Yahan 1 by 1 worker ki ID likh kar enter karein. Jis worker ki ID enter ki jayegi woh **Present** mark hoga, aur baqi tamam workers jo enter nahi honge woh automatic **Absent** ho jayenge. Annual leave wale workers har jagah automatic **Annual Leave** show honge.</p>

            <form onSubmit={handleQuickAttendance} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Date</label>
                  <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Worker ID No.</label>
                  <input id="quick-worker-id" value={quickWorkerId} onChange={e => setQuickWorkerId(e.target.value)} placeholder="Enter ID..." autoFocus required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Working Site</label>
                  <select value={quickSite} onChange={e => setQuickSite(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
                    {sitesList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>OT Hours</label>
                  <input type="number" min="0" step="0.5" value={quickHours} onChange={e => setQuickHours(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <button type="submit" disabled={quickSaving} style={{ padding: '11px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {quickSaving ? 'Saving...' : 'Enter & Mark Present'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>📅 Timesheet Summary for {selectedTimesheetDate}</h3>
            <p>Total Present: <b>{presentCountForDate}</b> | Total Absent: <b>{absentCountForDate}</b> | Annual Leave: <b>{annualLeaveCountForDate}</b></p>
          </div>
        )}

        {activeTab === 'daily-timesheet' && (
          <div className="daily-timesheet-print" style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
            <style>{dailyTimesheetPrintStyle}</style>
            <h2>📄 Daily Timesheet Report</h2>
            <div style={{ marginBottom: '15px' }}>
              <label>Date: </label>
              <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ padding: '6px' }} />
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Designation</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>OT Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(w => {
                  const annualLeave = getAnnualLeaveForWorker(w.id, selectedTimesheetDate);
                  const rec = attendanceData[selectedTimesheetDate]?.[w.id];
                  const status = annualLeave ? 'Annual Leave' : (rec?.status || 'Absent');
                  const ot = annualLeave ? 0 : (rec?.ot || 0);

                  return (
                    <tr key={w.id} style={{ backgroundColor: status === 'Annual Leave' ? '#fef3c7' : status === 'Present' ? '#dcfce7' : '#fee2e2' }}>
                      <td style={tdStyle}>#{w.id}</td>
                      <td style={tdStyle}>{w.name}</td>
                      <td style={tdStyle}>{w.designation || 'Worker'}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{status}</td>
                      <td style={tdStyle}>{ot} hrs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'changepass' && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', maxWidth: '500px', margin: '0 auto' }}>
            <h3>🔑 Change Password</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!currentPassInput || !newPassInput) return alert('Sabhi fields bharein.');
              const { error } = await supabase.from('user_permissions').update({ user_password: newPassInput }).eq('user_email', session.user.email);
              if (error) alert('Error: ' + error.message);
              else { alert('Password successfully update ho gaya!'); setCurrentPassInput(''); setNewPassInput(''); }
            }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Current Password</label>
                <input type="password" value={currentPassInput} onChange={e => setCurrentPassInput(e.target.value)} style={fieldStyle} required />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>New Password</label>
                <input type="password" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} style={fieldStyle} required />
              </div>
              <button style={primaryStyle}>Update Password</button>
            </form>
          </div>
        )}

        {activeTab === 'annualLeave' && userRole.is_admin && (
          <div>
            <h3>🌴 Annual Leave Management</h3>
            <p>Annual leave wale workers automatically sabhi sheets mein 'Annual Leave' show honge.</p>
          </div>
        )}
      </main>
    </div>
  );
}
