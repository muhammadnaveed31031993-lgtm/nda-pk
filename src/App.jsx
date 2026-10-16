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
  background: #fff !important;import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const dailyTimesheetPrintStyle = "@media print {.app-footer {\n  display: block !important;\n  visibility: visible !important;\n  position: static !important;\n  width: 100% !important;\n  text-align: center !important;\n  color: #000 !important;\n  background: #fff !important;\n  font-size: 12px !important;\n  margin-top: 20px !important;\n  padding: 10px !important;\n}\n  body * {\n    visibility: hidden !important;\n  }\n\n  .daily-timesheet-print,\n  .daily-timesheet-print * {\n    visibility: visible !important;\n  }\n\n  .daily-timesheet-print {\n    position: absolute !important;\n    left: 0 !important;\n    top: 0 !important;\n    width: 100% !important;\n    margin: 0 !important;\n    padding: 10px !important;\n    background: white !important;\n    color: black !important;\n  }\n\n  .daily-timesheet-print button {\n    display: none !important;\n  }\n\n  @page {\n    size: A4 landscape;\n    margin: 8mm;\n  }\n}";

const fieldStyle = { width:'100%', boxSizing:'border-box', padding:'11px 12px', border:'1px solid #cbd5e1', borderRadius:8, background:'#fff', color:'#0f172a' };
const primaryStyle = { width:'100%', padding:'12px 14px', border:0, borderRadius:9, background:'#1d4ed8', color:'#fff', fontWeight:800, cursor:'pointer' };
const tableStyle = { width:'100%', borderCollapse:'collapse', fontSize:13, textAlign:'left' };
const thStyle = { padding:'10px 8px', borderBottom:'1px solid #e2e8f0', color:'#475569', whiteSpace:'nowrap' };
const tdStyle = { padding:'10px 8px', borderBottom:'1px solid #f1f5f9', verticalAlign:'top' };

export default function App() {
  const [session, setSession] = useState(null);
  // Select which system to open before entering either workspace.
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
 // Monthly Timesheet Modal & Date Selection States
  const [showMonthlyTimesheetModal, setShowMonthlyTimesheetModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0 = Jan, 11 = Dec
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // e.g. 2026
  const [timesheetSearchQuery, setTimesheetSearchQuery] = useState(''); // 
  const [viewingWorkerTimesheet, setViewingWorkerTimesheet] = useState(null);
  // Annual Leave Tracking & Penalty States
  const [annualLeaveList, setAnnualLeaveList] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [annualManagementView, setAnnualManagementView] = useState('annual');
  const [employmentRecords, setEmploymentRecords] = useState([]);
  const [leaveSalaryRecords, setLeaveSalaryRecords] = useState([]);
  const [employmentEdit, setEmploymentEdit] = useState({});
  const [leaveSalaryWorkerId, setLeaveSalaryWorkerId] = useState('');
  const [leaveSalaryLastDate, setLeaveSalaryLastDate] = useState('');
  const [leaveSalaryAmount, setLeaveSalaryAmount] = useState('');
  const [finalCalcWorkerId, setFinalCalcWorkerId] = useState('');
  const [finalCalcDate, setFinalCalcDate] = useState(new Date().toISOString().slice(0,10));
  
  // Manual & Custom Deduction States
  const [hasDeduction, setHasDeduction] = useState(true);
  const [manualDeductionDays, setManualDeductionDays] = useState('');
  const [deductionBreakdownText, setDeductionBreakdownText] = useState('');
  const [leaveWorkerId, setLeaveWorkerId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveExpectedReturnDate, setLeaveExpectedReturnDate] = useState('');
  const [leaveActualReturnDate, setLeaveActualReturnDate] = useState('');
  const [penaltyPerMonthDays, setPenaltyPerMonthDays] = useState(5);
  
  // 12 Months dynamic deduction days state
  const [monthlyDeductions, setMonthlyDeductions] = useState({});
  
  // Password and administrator login settings
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

  // Data States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [sitesList, setSitesList] = useState(['Sharjah Mamzar', 'Ajman Aaliya', 'Dubai Downtown']);
  const [departmentsList, setDepartmentsList] = useState(['Plumbing', 'Electrical', 'Civil', 'Mustafa']);

  // Edit / Add Worker Form States
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [workSite, setWorkSite] = useState('Sharjah Mamzar');
  const [designation, setDesignation] = useState('Plumber');
  const [designationsList, setDesignationsList] = useState([
  'Carpenter',
  'Carpenter Helper',
  'Steel Fixer',
  'Steel Fixer Helper',
  'Plumber',
  'Mason',
  'Electrician',
  'Painter',
  'Helper',
  'Foreman',
  'Driver',
  'Office Boy',
  'Timekeeper'
]);
const [newDesignation, setNewDesignation] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [religion, setReligion] = useState('Muslim');
  
  const [lastReturnDate, setLastReturnDate] = useState('');
  const [annualLeaveRate, setAnnualLeaveRate] = useState('30');
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState('0');

  // File Upload URL States
  const [passportFileUrl, setPassportFileUrl] = useState('');
  const [idCardFileUrl, setIdCardFileUrl] = useState('');
  const [medicalCardFileUrl, setMedicalCardFileUrl] = useState('');
  const [visaFileUrl, setVisaFileUrl] = useState('');
  const [labourCardFileUrl, setLabourCardFileUrl] = useState('');

  // Personal Docs & New Site/Dept Form
  const [personalDocTitle, setPersonalDocTitle] = useState('');
  const [personalDocCategory, setPersonalDocCategory] = useState('Visa');
  const [personalFileUrl, setPersonalFileUrl] = useState('');
  const [newSiteInput, setNewSiteInput] = useState('');
  const [newDeptInput, setNewDeptInput] = useState('');

  // OCR Photo Scanner States
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Permission Creation States & Staff ID Input
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

  // Date and Bulk States with Designation
  const today = new Date().toISOString().split('T')[0];
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState(today);
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkDesignation, setBulkDesignation] = useState('All');
  const [bulkSite, setBulkSite] = useState('Sharjah Mamzar');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');
  const [bulkContractOT, setBulkContractOT] = useState('0');
  const [bulkWorkDetails, setBulkWorkDetails] = useState('');
  
  // Quick Attendance States
  const [quickWorkerId, setQuickWorkerId] = useState('');
  const [quickSite, setQuickSite] = useState('Sharjah Mamzar');
  const [quickOTType, setQuickOTType] = useState('Normal OT');
  const [quickHours, setQuickHours] = useState('2');
  const [quickSaving, setQuickSaving] = useState(false);
  const [siteAttendanceIds, setSiteAttendanceIds] = useState('');
  const [siteAttendanceSite, setSiteAttendanceSite] = useState('Sharjah Mamzar');
  const [siteAttendanceSaving, setSiteAttendanceSaving] = useState(false);
  
  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [timesheetSiteInputs, setTimesheetSiteInputs] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
 const [dailyTimesheetSite, setDailyTimesheetSite] = useState('All Workers');
const [savedDailyWorkDetails, setSavedDailyWorkDetails] = useState('');
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
      alert('Business tables load nahi huay. Supabase SQL setup chalayein. Detail: ' + (e?.message || e));
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
    const payload = { business_type: businessType, transaction_date: businessDate, transaction_kind: businessTxnKind, category: businessTxnCategory.trim() || (businessTxnKind === 'income' ? 'Income' : 'Expense'), description: businessTxnDescription.trim(), amount, payment_mode: businessTxnPaymentMode, created_by: session?.user?.email || '' };
    const { error } = await supabase.from('business_transactions').insert([payload]);
    if (error) return alert('Entry save nahi hui: ' + error.message);
    setBusinessTxnAmount(''); setBusinessTxnDescription('');
    await fetchBusinessData();
    alert('Business entry save ho gayi.');
  }

  async function handleAddBusinessWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Workers add karne ki permission sirf admin ko hai.');
    if (!businessWorkerName.trim()) return alert('Worker ka naam likhein.');
    const payload = { business_type: businessType, worker_name: businessWorkerName.trim(), job_title: businessWorkerJob.trim() || (businessType === 'transport' ? 'Driver' : 'Farm Worker'), phone: businessWorkerPhone.trim(), monthly_salary: Number(businessWorkerSalary) || 0, active: true };
    const { error } = await supabase.from('business_workers').insert([payload]);
    if (error) return alert('Worker save nahi hua: ' + error.message);
    setBusinessWorkerName(''); setBusinessWorkerPhone(''); setBusinessWorkerSalary('');
    await fetchBusinessData(); alert('Worker add ho gaya.');
  }

  async function handlePayBusinessSalary(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Salary payments sirf admin record kar sakta hai.');
    const worker = businessWorkers.find(w => String(w.id) === String(businessSalaryWorkerId));
    const amount = Number(businessSalaryAmount);
    if (!worker || !businessSalaryDate || !Number.isFinite(amount) || amount <= 0) return alert('Worker, date aur salary amount sahi select karein.');
    const { error } = await supabase.from('business_salary_payments').insert([{ business_type: businessType, worker_id: worker.id, payment_date: businessSalaryDate, amount, payment_mode: businessSalaryPaymentMode, notes: 'Monthly salary payment' }]);
    if (error) return alert('Salary payment save nahi hui: ' + error.message);
    setBusinessSalaryAmount(''); await fetchBusinessData(); alert('Salary payment save ho gayi.');
  }

  async function handleDeleteBusinessTransaction(id) {
    if (!userRole.is_admin) return alert('Sirf admin delete kar sakta hai.');
    if (!window.confirm('Kya aap is financial entry ko permanently delete karna chahte hain?')) return;
    const { error } = await supabase.from('business_transactions').delete().eq('id', id).eq('business_type', businessType);
    if (error) return alert('Delete error: ' + error.message);
    await fetchBusinessData();
  }

  useEffect(() => {
    async function loadDailyWorkDetails() {
      if (!selectedTimesheetDate || !dailyTimesheetSite) {
        setSavedDailyWorkDetails('');
        return;
      }

      let query = supabase
        .from('daily_work_details')
        .select('work_site,work_details')
        .eq('work_date', selectedTimesheetDate);

      if (dailyTimesheetSite !== 'All Workers' && dailyTimesheetSite !== 'All') {
        query = query.eq('work_site', dailyTimesheetSite);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Daily Work Details load error:', error.message);
        setSavedDailyWorkDetails('');
        return;
      }

      if (dailyTimesheetSite === 'All Workers' || dailyTimesheetSite === 'All') {
        const combined = (data || [])
          .filter(item => item.work_details)
          .map(item => `${item.work_site || 'Site'}: ${item.work_details}`)
          .join('\n');
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

  // Security: do not restore a logged-in session from localStorage; login is required on every fresh app load.

 useEffect(() => {
  if (session) {
    fetchWorkers();
    fetchAttendance();
    fetchPermissionsList();
    fetchPersonalDocs();
    fetchAnnualLeaves();
    fetchEmploymentRecords();
    fetchLeaveSalaryRecords();
    fetchDesignations();
  }
}, [session]);

  async function fetchAnnualLeaves() {
    const { data, error } = await supabase.from('annual_leaves').select('*').order('id', { ascending: false });
    if (error) {
      console.error('Error fetching annual leaves:', error.message);
    } else if (data) {
      setAnnualLeaveList(data);
    }
  }

  async function fetchEmploymentRecords() {
    const { data, error } = await supabase.from('worker_employment_records').select('*');
    if (error) { console.warn('Employment records table not ready:', error.message); return; }
    setEmploymentRecords(data || []);
  }

  async function fetchLeaveSalaryRecords() {
    const { data, error } = await supabase.from('worker_leave_salary_records').select('*').order('leave_salary_last_date', { ascending: false });
    if (error) { console.warn('Leave salary records table not ready:', error.message); return; }
    setLeaveSalaryRecords(data || []);
  }

  async function saveEmploymentRecord(workerId) {
    if (!userRole.is_admin) return alert('Sirf admin employment details update kar sakta hai.');
    const row = employmentEdit[String(workerId)] || {};
    if (!row.joining_date) return alert('Worker ki joining/start date enter karein.');
    const payload = { worker_id: String(workerId), joining_date: row.joining_date, cancellation_date: row.cancellation_date || null, basic_salary: Number(row.basic_salary || 0) };
    const { error } = await supabase.from('worker_employment_records').upsert([payload], { onConflict: 'worker_id' });
    if (error) return alert('Employment record save nahi hua: ' + error.message + '\nPehle neeche diya SQL Supabase mein run karein.');
    await fetchEmploymentRecords();
    alert('Joining date / final calculation details save ho gayi hain.');
  }

  async function saveLeaveSalaryReceived(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Sirf admin leave salary received record kar sakta hai.');
    if (!leaveSalaryWorkerId || !leaveSalaryLastDate) return alert('Worker aur leave salary ki last date select karein.');
    const { error } = await supabase.from('worker_leave_salary_records').insert([{ worker_id: String(leaveSalaryWorkerId), leave_salary_last_date: leaveSalaryLastDate, amount: Number(leaveSalaryAmount || 0), received_at: new Date().toISOString() }]);
    if (error) return alert('Leave salary record save nahi hua: ' + error.message + '\nPehle neeche diya SQL Supabase mein run karein.');
    setLeaveSalaryWorkerId(''); setLeaveSalaryLastDate(''); setLeaveSalaryAmount('');
    await fetchLeaveSalaryRecords();
    alert('Leave salary received save ho gayi. Is date ke baad leave balance dobara accrue hoga.');
  }
    // Check whether a worker is on annual leave on a selected date
function getAnnualLeaveForWorker(workerId, date) {
    if (!workerId || !date) return null;

    const leaveRecord = annualLeaveList.find(leave => {
      const sameWorker =
        String(leave.worker_id) === String(workerId);

      const startDate = leave.start_date;
      const actualReturn = leave.actual_return;

      const hasStarted = Boolean(startDate && String(date).slice(0, 10) >= String(startDate).slice(0, 10));

      // A future leave must not affect today's status. The actual return date is the first date back at work.
      const hasNotActuallyReturned =
        !actualReturn ||
        actualReturn === 'On Leave' ||
        String(date).slice(0, 10) < String(actualReturn).slice(0, 10);

      return (
        sameWorker &&
        hasStarted &&
        hasNotActuallyReturned
      );
    });

    return leaveRecord || null;
  }

async function fetchDesignations() {
  const { data, error } = await supabase
    .from('designations')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching designations:', error.message);
    return;
  }

  if (data) {
    const savedNames = data.map(item => item.name);

    setDesignationsList(prev => [
      ...new Set([...prev, ...savedNames])
    ]);
  }
}


 async function handleSaveAnnualLeave(e) {
    e.preventDefault();
     if (!userRole.is_admin) return alert('Sirf admin annual leave records manage kar sakta hai.');
    if (!leaveWorkerId || !leaveStartDate || !leaveExpectedReturnDate) {
      return alert('Mukammal details enter karein!');
    }

    let finalDeductionDays = 0;
    let breakdownSummary = 'No Deduction';

    if (hasDeduction) {
      let breakdownArr = [];
      for (const [monthKey, days] of Object.entries(monthlyDeductions)) {
        const d = Number(days) || 0;
        if (d > 0) {
          finalDeductionDays += d;
          breakdownArr.push(`${monthKey}: ${d} days`);
        }
      }
      if (breakdownArr.length > 0) {
        breakdownSummary = breakdownArr.join(', ');
      }
    }

    const leaveData = {
      worker_id: leaveWorkerId,
      start_date: leaveStartDate,
      expected_return: leaveExpectedReturnDate,
      actual_return: leaveActualReturnDate || 'On Leave',
      has_deduction: hasDeduction,
      deduction_breakdown: breakdownSummary,
      deduction_days: finalDeductionDays.toFixed(1),
      status: leaveActualReturnDate ? 'Returned' : 'On Leave'
    };

    let error;
    if (targetStaffId) {
      const res = await supabase.from('annual_leaves').update(leaveData).eq('id', targetStaffId);
      error = res.error;
    } else {
      const res = await supabase.from('annual_leaves').insert([leaveData]);
      error = res.error;
    }

    if (error) {
      alert('Error saving leave record: ' + error.message);
    } else {
      alert('Leave record successfully save ho gaya!');
      setLeaveModalOpen(false);
      setTargetStaffId('');
      setMonthlyDeductions({});
      fetchAnnualLeaves();
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
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Attendance load error:', error.message);
    alert('Attendance load nahi hui: ' + error.message);
    return;
  }

  setAttendance(data || []);

  // Dashboard aur Timesheet ke liye date-wise attendance state
  const dateMap = {};

  (data || []).forEach(record => {
    if (!dateMap[record.date]) {
      dateMap[record.date] = {};
    }

    dateMap[record.date][record.worker_id] = {
      status: record.status,
      ot: Number(record.overtime_hours) || 0,
      contract_ot: Number(record.contract_overtime_hours) || 0,
      contract_overtime_hours: Number(record.contract_overtime_hours) || 0,
      site: record.work_site || '',
      work_site: record.work_site || ''
    };
  });

  setAttendanceData(dateMap);
}
  async function handleUpdateExtension(workerId, newExtensionDays) {
    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Permission denied!');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Worker aapke assigned scope mein nahi hai.');
    const { error } = await supabase
      .from('workers')
      .update({ extension_days: parseInt(newExtensionDays) || 0 })
      .eq('id', workerId);
    
    if (error) {
      alert('Error updating extension: ' + error.message);
    } else {
      fetchWorkers();
    }
  }

  async function handleMarkReturned(workerId) {
    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Permission denied!');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Worker aapke assigned scope mein nahi hai.');
    const todayDate = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('workers')
      .update({ 
        on_leave: false, 
        actual_return_date: todayDate,
        extension_days: 0,
        late_days: 0 
      })
      .eq('id', workerId);
    
    if (error) {
      alert('Error updating return status: ' + error.message);
    } else {
      fetchWorkers();
      alert('Worker marked as returned successfully!');
    }
  }

  async function handleDeleteUserPermission(emailToDelete) {
    if (!userRole.is_admin) return;
    if (window.confirm(`Delete access for ${emailToDelete}?`)) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_email', emailToDelete);
      if (error) alert('Error: ' + error.message);
      else fetchPermissionsList();
    }
  }
  
  function handleDeleteSite(siteToDelete) {
    if (!userRole.is_admin) return alert('Access Denied!');
    if (sitesList.length <= 1) {
      return alert('Kam az kam ek working site honi lazmi hai!');
    }
    if (window.confirm(`Kya aap waqai '${siteToDelete}' site delete karna chahte hain?`)) {
      const updatedSites = sitesList.filter(site => site !== siteToDelete);
      setSitesList(updatedSites);
      
      if (selectedSiteFilter === siteToDelete) setSelectedSiteFilter('All');
      if (workSite === siteToDelete) setWorkSite(updatedSites[0]);
      
      alert(`Site '${siteToDelete}' successfully delete ho gayi!`);
    }
  }

  async function handleAddNewSite(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!newSiteInput.trim()) return alert('Site name enter karein!');
    if (sitesList.includes(newSiteInput.trim())) return alert('Yeh site pehle se mojood hai!');

    setSitesList([...sitesList, newSiteInput.trim()]);
    alert(`New working site '${newSiteInput.trim()}' added successfully!`);
    setNewSiteInput('');
  }

  async function handleAddNewDepartment(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!newDeptInput.trim()) return alert('Department name enter karein!');
    if (departmentsList.includes(newDeptInput.trim())) return alert('Yeh department pehle se mojood hai!');

    setDepartmentsList([...departmentsList, newDeptInput.trim()]);
    alert(`New department '${newDeptInput.trim()}' added successfully!`);
    setNewDeptInput('');
  }
  function handleDeleteDepartment(deptToDelete) {
    if (!userRole.is_admin) return alert('Access Denied!');
    if (departmentsList.length <= 1) {
      return alert('Kam az kam ek department hona lazmi hai!');
    }
    if (window.confirm(`Kya aap waqai '${deptToDelete}' department delete karna chahte hain?`)) {
      const updatedDepts = departmentsList.filter(dept => dept !== deptToDelete);
      setDepartmentsList(updatedDepts);
      
      if (selectedDeptFilter === deptToDelete) setSelectedDeptFilter('All');
      if (department === deptToDelete) setDepartment(updatedDepts[0]);
      
      alert(`Department '${deptToDelete}' successfully delete ho gaya!`);
    }
  }

  async function handleChangePasswordSubmit(e) {
    e.preventDefault();

    if (!session?.user?.email) return alert('Please login again.');
    if (!currentPassInput.trim()) return alert('Current password enter karein.');

    const currentEmail = session.user.email.trim().toLowerCase();
    const { data: accounts, error: accountError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_email', currentEmail)
      .order('id', { ascending: true });

    if (accountError) return alert('Account check error: ' + accountError.message);
    const accountRows = accounts || [];
    const account = accountRows.find(row => String(row.user_password) === currentPassInput.trim()) || null;
    if (!account) {
      return alert('Current password ghalat hai.');
    }

    const isAdminAccount = userRole.is_admin && (account.is_admin === true || account.is_admin === 'true');
    if (userRole.is_admin && !isAdminAccount) {
      return alert('Admin account database mein verify nahi hua. Default admin credentials ko pehle database mein initialize karna zaroori hai.');
    }

    const nextEmail = isAdminAccount && newLoginEmailInput.trim()
      ? newLoginEmailInput.trim().toLowerCase()
      : currentEmail;
    const nextPassword = newPassInput.trim() || account.user_password;

    if (!nextEmail) return alert('Login ID / email enter karein.');
    if (nextPassword.length < 6) return alert('Password kam az kam 6 characters ka hona chahiye.');

    const changes = {
      user_email: nextEmail,
      user_password: nextPassword
    };

    // Update every duplicate row for this login ID, otherwise an old duplicate row could still accept the old password.
    const { error: updateError } = await supabase
      .from('user_permissions')
      .update(changes)
      .eq('user_email', currentEmail);

    if (updateError) {
      return alert('Login ID / password update nahi hua: ' + updateError.message);
    }

    const updatedSession = {
      ...session,
      user: { ...session.user, email: nextEmail },
      role: userRole
    };

    setSession(updatedSession);
    setCurrentPassInput('');
    setNewPassInput('');
    setNewLoginEmailInput('');
    alert('Login ID / password database mein update ho gaya. Security ke liye ab dobara nayi details se login karein.');
    handleLogout();
  }

  async function handleDeleteOldRecords() {
    if (!userRole.is_admin) return alert('Sirf admin timesheet records delete kar sakta hai.');
    let startDate = cleanupSelectedDate;
    let endDate = cleanupSelectedDate;
    if (cleanupMode === 'month') {
      if (!/^\d{4}-\d{2}$/.test(cleanupMonth)) return alert('Month select karein.');
      const [yy, mm] = cleanupMonth.split('-').map(Number);
      startDate = `${cleanupMonth}-01`;
      endDate = `${yy}-${String(mm).padStart(2, '0')}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`;
    } else if (cleanupMode === 'range') {
      startDate = cleanupStartDate; endDate = cleanupEndDate;
      if (!startDate || !endDate || startDate > endDate) return alert('Date range sahi select karein.');
    }
    const selectedTables = [];
    if (cleanupAttendance) selectedTables.push('Timesheet / attendance');
    if (cleanupDailyDetails) selectedTables.push('Daily work details');
    if (cleanupAnnualLeaves) selectedTables.push('Completed annual leave records');
    if (!selectedTables.length) return alert('Kam az kam ek record type select karein.');
    const confirmed = window.confirm(`PERMANENT DELETE\nRange: ${startDate} se ${endDate} tak (dono dates shamil)\n\n${selectedTables.join('\n')}\n\nIs range ke tamam matching records delete honge. Yeh undo nahi ho sakta. Continue?`);
    if (!confirmed) return;
    setCleanupLoading(true);
    const results = [];
    try {
      if (cleanupAttendance) {
        const { data, error } = await supabase.from('attendance').delete().gte('date', startDate).lte('date', endDate).select('worker_id,date');
        if (error) results.push('Attendance error: ' + error.message); else results.push(`Timesheet records deleted: ${(data || []).length}`);
      }
      if (cleanupDailyDetails) {
        const { data, error } = await supabase.from('daily_work_details').delete().gte('work_date', startDate).lte('work_date', endDate).select('work_date,work_site');
        if (error) results.push('Daily work details error: ' + error.message); else results.push(`Daily work details deleted: ${(data || []).length}`);
      }
      if (cleanupAnnualLeaves) {
        const { data, error } = await supabase.from('annual_leaves').delete().gte('start_date', startDate).lte('start_date', endDate).neq('actual_return', 'On Leave').select('id');
        if (error) results.push('Annual leave error: ' + error.message); else results.push(`Annual leave records deleted: ${(data || []).length}`);
      }
      await fetchAttendance(); await fetchAnnualLeaves();
      alert(results.join('\n'));
    } catch (err) { alert('Record cleanup error: ' + (err?.message || String(err))); }
    finally { setCleanupLoading(false); }
  }

  async function handleScanPaperSheet(event) {
    if (!userRole.is_admin && !userRole.can_use_bulk) {
      return alert('Aapko Bulk/OCR ki permission nahi hai!');
    }

    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Sheet ki photo scan ho rahi hai...');

    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('OCR API key missing. Configure VITE_OPENAI_API_KEY in Vercel Environment Variables. For security, move OCR calls to a server-side API route.');

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
                  text: "Extract table data from attendance sheet. Return ONLY valid JSON with key 'rows' containing objects with: 'id_no' (number), 'working_days' (number), and 'overtime' (number)."
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
        date: selectedTimesheetDate,
        status: item.working_days > 0 ? 'Present' : 'Absent',
        overtime_hours: Number(item.overtime || 0),
        work_site: bulkSite
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToInsert, { onConflict: 'worker_id,date' });

      if (error) throw error;

      setScanStatus(`Zabardast! Total ${recordsToInsert.length} workers ka data scan ho gaya.`);
      fetchAttendance();

    } catch (err) {
      setScanStatus('Error: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data: accounts, error: accountError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_email', cleanEmail)
        .order('id', { ascending: true });
      const accountRows = accounts || [];
      const account = accountRows.find(row => String(row.user_password) === cleanPassword) || accountRows[0] || null;

      if (accountError) {
        alert('Login database error: ' + accountError.message);
        return;
      }

      let resolvedAccount = account;

      // First-time setup for the legacy default administrator.
      // Once the admin row exists, the hard-coded default login is no longer accepted.
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

        const { data: insertedAdmin, error: insertError } = await supabase
          .from('user_permissions')
          .insert([initialAdmin])
          .select('*')
          .maybeSingle();

        if (insertError) {
          alert('Default admin login database mein save nahi ho saka: ' + insertError.message +
            '\nLogin access temporary milega, lekin password change ke liye database write access theek karni hogi.');
          resolvedAccount = initialAdmin;
        } else {
          resolvedAccount = insertedAdmin || initialAdmin;
        }
      }

      if (!resolvedAccount || String(resolvedAccount.user_password) !== cleanPassword) {
        alert('Invalid Email or Password!');
        return;
      }

      const isAdminAccount =
        resolvedAccount.is_admin === true || resolvedAccount.is_admin === 'true';

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
        setActiveTab('dashboard');
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

      if (staffRole.assigned_department !== 'All') {
        setSelectedDeptFilter(staffRole.assigned_department);
        setBulkDepartment(staffRole.assigned_department);
      }
      if (staffRole.assigned_site !== 'All') {
        setSelectedSiteFilter(staffRole.assigned_site);
        setBulkSite(staffRole.assigned_site);
        setQuickSite(staffRole.assigned_site);
      }


      if (staffRole.can_view_dashboard) setActiveTab('dashboard');
      else if (staffRole.can_view_timesheet) setActiveTab('attendance');
      else if (staffRole.can_view_workers) setActiveTab('workers');
      else setActiveTab('changepass');
    } catch (err) {
      alert('Login error: ' + (err?.message || String(err)));
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('nda_user_session');
    setSession(null);
    setSelectedSystem(null);
  }

  async function handleDeleteWorker(id) {
    if (!userRole.is_admin && !userRole.can_delete_workers) {
      return alert('Permission denied!');
    }
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(id))) {
      return alert('Aap sirf apne assigned department/site ke workers delete kar sakte hain.');
    }
    if (window.confirm(`Delete Worker #${id}?`)) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchWorkers();
    }
  }

  function handleStartEditWorker(worker) {
    if (!userRole.is_admin && !userRole.can_edit_workers) {
      return alert('Permission denied!');
    }
    setEditingWorkerId(worker.id);
    setWorkerIdInput(worker.id);
    setName(worker.name);
    setDepartment(worker.department || departmentsList[0]);
    setWorkSite(worker.work_site || sitesList[0]);
    setDesignation(worker.designation || 'Worker');
    setMonthlySalary(worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth) || '');
    setReligion(worker.religion || 'Muslim');
    setLastReturnDate(worker.last_return_date || '');
    setAnnualLeaveRate(worker.annual_leave_rate || '30');
    setAnnualLeaveBalance(String(worker.annual_leave_balance ?? 0));
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
    setDepartment(departmentsList[0]);
    setWorkSite(sitesList[0]);
    setDesignation('Worker');
    setMonthlySalary('');
    setReligion('Muslim');
    setLastReturnDate('');
    setAnnualLeaveRate('30');
    setAnnualLeaveBalance('0');
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  async function handleSaveWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin) {
      if (editingWorkerId && !userRole.can_edit_workers) return alert('Permission denied: worker edit allowed nahi.');
      if (!editingWorkerId && !userRole.can_add_workers) return alert('Permission denied: worker add allowed nahi.');
      if (userRole.assigned_department && userRole.assigned_department !== 'All' &&
          department.toLowerCase() !== userRole.assigned_department.toLowerCase()) {
        return alert('Aap sirf apne assigned department mein worker add/edit kar sakte hain.');
      }
      if (userRole.assigned_site && userRole.assigned_site !== 'All' &&
          workSite.toLowerCase() !== userRole.assigned_site.toLowerCase()) {
        return alert('Aap sirf apni assigned site select kar sakte hain.');
      }
    }
    if (!name.trim() || !monthlySalary) return alert('Name and Salary required!');

    const monthlyNum = Number(monthlySalary);
    const dailyRateCalc = monthlyNum / totalDaysInCurrentMonth;

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      work_site: workSite.trim(),
      designation: designation.trim(),
      monthly_salary: monthlyNum,
      daily_rate: dailyRateCalc,
      religion,
      last_return_date: lastReturnDate || null,
      annual_leave_rate: Number(annualLeaveRate || 30),
      annual_leave_balance: Number(annualLeaveBalance || 0),
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

   // Print Individual Worker Monthly Report
  function handlePrintWorkerMonthlyReport(worker) {
    const workerAttendance = attendance.filter(
      a => String(a.worker_id) === String(worker.id)
    );

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Print window blocked. Please allow pop-ups and try again.');
      return;
    }

    const currency = worker.currency || 'AED';
    const monthlySalary =
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * Number(totalDaysInCurrentMonth || 0));

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Monthly Report - #${worker.id}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              padding: 0;
              color: #111;
              margin: 0;
            }

            h2 {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 8px;
              color: #1e293b;
              font-size: 20px;
            }

            .box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }

            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: left;
            }

            th {
              background: #e2e8f0;
            }

            .report-footer {
              display: block !important;
              width: 100%;
              text-align: center;
              margin-top: 30px;
              padding: 12px 0;
              border-top: 1px solid #94a3b8;
              color: #111 !important;
              background: #fff !important;
              font-family: Arial, sans-serif;
              font-size: 12px;
              font-weight: bold;
              visibility: visible !important;
            }

            @media print {
              .report-footer {
                display: block !important;
                visibility: visible !important;
                color: #111 !important;
              }
            }
          </style>
        </head>
        <body>
          <h2>NDA-PK SYSTEM - Individual Worker Monthly Report</h2>

          <div class="box">
            <p><strong>Worker ID:</strong> #${worker.id}</p>
            <p><strong>Name:</strong> ${worker.name || ''}</p>
            <p><strong>Department:</strong> ${worker.department || 'N/A'}
              | <strong>Site:</strong> ${worker.work_site || 'N/A'}</p>
            <p><strong>Monthly Salary:</strong>
              ${monthlySalary} ${currency}</p>
          </div>

          <h3>Daily Attendance &amp; Overtime Record</h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Normal OT</th>
<th>Contract OT</th>
<th>Total OT</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              ${
                workerAttendance.length === 0
                  ? '<tr><td colspan="4">No attendance records found.</td></tr>'
                  : workerAttendance.map(att => `
                      <tr>
                        <td>${att.date || ''}</td>
                        <td>${att.status || ''}</td>                       
<td>${Number(att.overtime_hours) || 0} Hours</td>
<td>${Number(att.contract_overtime_hours) || 0} Hours</td>
<td>${(Number(att.overtime_hours) || 0) + (Number(att.contract_overtime_hours) || 0)} Hours</td>
                        <td>${att.work_site || worker.work_site || 'N/A'}</td>
                      </tr>
                    `).join('')
              }
            </tbody>
          </table>

          <div class="report-footer">
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 2. Handle Bulk Attendance & Overtime (Supports 'All' Departments & Designations)
 async function handleBulkAttendance() {
  if (!userRole.is_admin && !userRole.can_use_bulk) return alert('Aapko Bulk Attendance ki permission nahi hai.');

  const selectedDesignations =
    bulkDesignation === 'All'
      ? ['All']
      : bulkDesignation.toLowerCase() === 'steel fixer'
        ? ['steel fixer', 'steel fixer helper', 'steel labour', 'steel fixer labour', 'steel foreman', 'steel fixer foreman']
        : bulkDesignation.toLowerCase() === 'carpenter'
          ? ['carpenter', 'carpenter helper']
          : [bulkDesignation.toLowerCase()];

  const allowedWorkers = userRole.is_admin ? workers : filteredWorkers;
  const effectiveBulkSite =
    userRole.is_admin || userRole.assigned_site === 'All'
      ? bulkSite
      : userRole.assigned_site;
  const deptWorkers = allowedWorkers.filter(w => {
    const matchDept =
      bulkDepartment === 'All' ||
      (w.department &&
        w.department.toLowerCase() === bulkDepartment.toLowerCase());

    const workerDesignation = (w.designation || '').toLowerCase();

    const matchDesig =
      selectedDesignations.includes('All') ||
      selectedDesignations.includes(workerDesignation);

    return matchDept && matchDesig;
  });

  if (deptWorkers.length === 0) {
    return alert(
      `No workers found matching department (${bulkDepartment}) and designation (${bulkDesignation})!`
    );
  }

  const records = deptWorkers.map(w => ({
    worker_id: w.id,
    date: selectedTimesheetDate,
    status: attendanceData[selectedTimesheetDate]?.[w.id]?.status || attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate)?.status || 'Absent',
    overtime_hours: Number(bulkOT) || 0,
    contract_overtime_hours: Number(bulkContractOT) || 0,
    department: w.department,
    work_site: effectiveBulkSite
  }));

  const { error: attendanceError } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'worker_id,date' });

  if (attendanceError) {
    alert('Attendance save error: ' + attendanceError.message);
    return;
  }

  setAttendanceData(prev => {
    const updated = { ...prev };

    if (!updated[selectedTimesheetDate]) {
      updated[selectedTimesheetDate] = {};
    }
    
deptWorkers.forEach(w => {
  updated[selectedTimesheetDate][w.id] = {
    status: attendanceData[selectedTimesheetDate]?.[w.id]?.status || attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate)?.status || 'Absent',
    ot: Number(bulkOT) || 0,
    contract_ot: Number(bulkContractOT) || 0,
    contract_overtime_hours: Number(bulkContractOT) || 0,
    site: effectiveBulkSite
  };
});

    return updated;
  });

  alert(
    `Overtime updated for ${selectedTimesheetDate}: ${deptWorkers.length} workers. Existing attendance status was preserved.`
  );

  fetchAttendance();
}

  
 // 3. Handle Single Attendance & OT Change (Auto-saves to DB and updates Monthly Timesheet)
async function handleSingleAttendanceChange(
  workerId,
  dateStr,
  newStatus,
  newOt,
  newSite,
  newContractOT = 0
) {
  if (!userRole.is_admin && !userRole.can_edit_timesheet) {
    throw new Error('Aapko timesheet edit karne ki permission nahi hai.');
  }
  if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) {
    throw new Error('Yeh worker aapki assigned department/site mein nahi hai.');
  }
  const previousRecord = attendanceData[dateStr]?.[workerId] || {};
  const worker = workers.find(w => String(w.id) === String(workerId));

  const assignedSite =
    !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
      ? userRole.assigned_site
      : (newSite || previousRecord.site || worker?.work_site || sitesList[0] || 'Sharjah Mamzar');

  const updatedRecord = {
    ...previousRecord,
    status: newStatus,
    ot: Number(newOt) || 0,
    contract_ot: Number(newContractOT) || 0,
    contract_overtime_hours: Number(newContractOT) || 0,
    site: assignedSite
  };

  setAttendanceData(prev => ({
    ...prev,
    [dateStr]: {
      ...(prev[dateStr] || {}),
      [workerId]: updatedRecord
    }
  }));

  try {
    const { error } = await supabase
      .from('attendance')
      .upsert([{
        worker_id: workerId,
        date: dateStr,
        status: newStatus,
        overtime_hours: Number(newOt) || 0,
        contract_overtime_hours: Number(newContractOT) || 0,
        department: worker?.department,
        work_site: assignedSite
      }], { onConflict: 'worker_id,date' });

    
if (error) {
  throw new Error(error.message);
}

  } catch (err) {
    alert('Save karte waqt error: ' + err.message);
  }
}
  
async function handleSaveSiteAttendance(e) {
  e.preventDefault();
  if (!userRole.is_admin && !userRole.can_edit_timesheet && !userRole.can_use_bulk) return alert('Aapko attendance save karne ki permission nahi hai.');
  if (!selectedTimesheetDate || !siteAttendanceSite) return alert('Date aur site select karein.');
  const allowedWorkers = userRole.is_admin ? workers : filteredWorkers;
  const enteredIds = [...new Set(siteAttendanceIds.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
  const presentWorkers = enteredIds.map(id => allowedWorkers.find(w =>
    String(w.worker_id ?? '').trim() === id || String(w.id).trim() === id
  ));
  const missingIds = enteredIds.filter((id, i) => !presentWorkers[i]);
  if (missingIds.length) return alert('Yeh Worker ID nahi milin: ' + missingIds.join(', '));
  const scopedWorkers = allowedWorkers.filter(w =>
    String(w.work_site || '').trim().toLowerCase() === siteAttendanceSite.trim().toLowerCase()
  );
  const selectedWorkers = [...new Map([...scopedWorkers, ...presentWorkers].map(w => [String(w.id), w])).values()];
  if (!selectedWorkers.length) return alert('Is site ke workers nahi mile. Pehle Workers Directory mein unki site set karein.');
  setSiteAttendanceSaving(true);
  try {
    const records = selectedWorkers.map(w => {
      const old = attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate);
      const isPresent = presentWorkers.some(p => String(p.id) === String(w.id));
      return {
        worker_id: w.id, date: selectedTimesheetDate, status: isPresent ? 'Present' : 'Absent',
        overtime_hours: Number(old?.overtime_hours) || 0,
        contract_overtime_hours: Number(old?.contract_overtime_hours) || 0,
        department: w.department || '', work_site: siteAttendanceSite
      };
    });
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    if (error) throw error;
    setSiteAttendanceIds('');
    await fetchAttendance();
    alert(`Attendance save ho gayi: ${records.filter(r => r.status === 'Present').length} Present, ${records.filter(r => r.status === 'Absent').length} Absent (${siteAttendanceSite}).`);
  } catch (err) {
    alert('Attendance save nahi hui: ' + (err?.message || String(err)));
  } finally { setSiteAttendanceSaving(false); }
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
    alert('Worker ID nahi mila. ID check karein.');
    return;
  }

  const hours = Number(quickHours);

  if (!Number.isFinite(hours) || hours < 0) {
    alert('OT hours sahi enter karein.');
    return;
  }

  const normalOT = quickOTType === 'Normal OT' ? hours : 0;
  const contractOT = quickOTType === 'Contract OT' ? hours : 0;

  setQuickSaving(true);

  try {
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
  alert('Save karte waqt error: ' + err.message);
  throw err;
} finally {
    setQuickSaving(false);
  }
}

  // 4. Handle Mark Single Attendance (For timesheet table)
  async function handleMarkAttendance(workerId, status) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) return alert('Aapko timesheet edit karne ki permission nahi hai.');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Yeh worker aapke assigned scope mein nahi hai.');
    const worker = workers.find(w => String(w.id) === String(workerId));
  const oldRecord = attendanceData[selectedTimesheetDate]?.[workerId] || {};

const assignedSiteForToday =
  !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
    ? userRole.assigned_site
    : (timesheetSiteInputs[workerId] ||
       oldRecord.site ||
       oldRecord.work_site ||
       worker?.work_site ||
       sitesList[0]);

const otHours = Number(
  overtimeInputs[workerId] ??
  oldRecord.ot ??
  oldRecord.overtime_hours ??
  0
);
    
    const { error } = await supabase.from('attendance').upsert([
      { worker_id: workerId, date: selectedTimesheetDate, status, overtime_hours: otHours, department: worker?.department, work_site: assignedSiteForToday }
    ], { onConflict: 'worker_id,date' });

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  // 5. Handle Save Staff Permissions
  async function handleSavePermission(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Sirf admin staff permissions change kar sakta hai.');
    if (!targetEmail || !targetPassword) return alert('Staff email aur password enter karein.');
    if (targetEmail.trim().toLowerCase() === session?.user?.email?.toLowerCase()) return alert('Admin apna account staff permission form se edit nahi kar sakta.');

    const permData = {
      staff_id: targetStaffId.trim(),
      user_email: targetEmail.trim().toLowerCase(),
      user_password: targetPassword.trim(),
      assigned_department: targetDept,
      assigned_site: targetSite,
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
      alert('Staff permission saved successfully!');
      setTargetStaffId('');
      setTargetEmail('');
      setTargetPassword('');
      fetchPermissionsList();
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
  const attendanceRecord = latestAttendanceMap[worker.id];
  const status = (attendanceRecord?.status || '').trim().toLowerCase();

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === String(worker.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    const start = leave.start_date;
    const end = leave.expected_return;

    return (
      sameWorker &&
      onLeave &&
      start <= selectedTimesheetDate &&
      selectedTimesheetDate <= end
    );
  });

  return status === 'present' && !onAnnualLeave;
}).length;

const annualLeaveCountForDate = filteredWorkers.filter(worker => {
  const record = annualLeaveList.find(leave => {
    const sameWorker =
      String(leave.worker_id) === String(worker.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    const start = leave.start_date;
    const end = leave.expected_return;

    return (
      sameWorker &&
      onLeave &&
      start <= selectedTimesheetDate &&
      selectedTimesheetDate <= end
    );
  });

  const attendanceRecord = latestAttendanceMap[worker.id];
  return record || (
    (attendanceRecord?.status || '').toLowerCase() === 'annual leave'
  );
}).length;
const absentCountForDate = Object.values(latestAttendanceMap).filter(
  a => (a.status || '').toLowerCase() === 'absent'
).length;
 
  const salaryDataMap = {};

  // Selected month ke total days
  const payrollMonthDays = new Date(
    selectedYear,
    selectedMonth + 1,
    0
  ).getDate();

  // Admin ko tamam sites ke workers dikhayein
  // Staff ko sirf apni permitted workers list dikhayein
  const payrollWorkers = userRole.is_admin
    ? workers
    : filteredWorkers;

  payrollWorkers.forEach(worker => {
    // Sirf selected month ke attendance records
    const monthlyRecords = attendance.filter(a => {
      const recordDate = String(a.date || '');

      return (
        String(a.worker_id) === String(worker.id) &&
        recordDate.length >= 10 &&
        Number(recordDate.slice(0, 4)) === Number(selectedYear) &&
        Number(recordDate.slice(5, 7)) === Number(selectedMonth + 1)
      );
    });

    // Present days count karein
    const presentDays = monthlyRecords.filter(a =>
      String(a.status || '').trim().toLowerCase() === 'present'
    ).length;

    // Normal OT + Contract OT
    const totalOT = monthlyRecords.reduce((total, record) => {
      const normalOT = Number(record.overtime_hours) || 0;
      const contractOT = Number(record.contract_overtime_hours) || 0;

      return total + normalOT + contractOT;
    }, 0);

    const monthlySal = Number(
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * payrollMonthDays) ||
      0
    );

    const dailyRateNum = monthlySal / payrollMonthDays;
    const hourlyRate = dailyRateNum / 8;

    const baseSalary = dailyRateNum * presentDays;
    const otSalary = totalOT * (hourlyRate * 1.25);
    const totalPayable = baseSalary + otSalary;

    salaryDataMap[worker.id] = {
      presentDays,
      totalOT,
      baseSalary,
      otSalary,
      totalPayable,
      monthlySal
    };
  });

  const salaryData = payrollWorkers.map(worker => ({
    ...worker,
    ...(salaryDataMap[worker.id] || {
      presentDays: 0,
      totalOT: 0,
      baseSalary: 0,
      otSalary: 0,
      totalPayable: 0,
      monthlySal: 0
    })
  }));

  const grandTotalPayroll = salaryData.reduce(
    (total, worker) => total + worker.totalPayable,
    0
  );

  if (!selectedSystem) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #164e63 0, #0f172a 48%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ textAlign: 'center', color: '#fff', marginBottom: 28 }}>
            <div style={{ fontSize: 13, letterSpacing: 4, color: '#67e8f9', fontWeight: 800 }}>NDA-PK DIGITAL WORKSPACE</div>
            <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '10px 0' }}>Choose Your System</h1>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Apna system select karein jahan aap kaam karna chahte hain.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            <button onClick={() => setSelectedSystem('hr')} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #38bdf8', color: '#fff', background: 'linear-gradient(145deg,#075985,#1e3a8a)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>👷</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK HR SYSTEM</h2><p style={{ color: '#dbeafe', lineHeight: 1.6 }}>Workers, attendance, timesheet, overtime, payroll, annual leave, permissions aur HR reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#1d4ed8', borderRadius: 10, fontWeight: 800 }}>Open HR System →</span>
            </button>
            <button onClick={() => { setSelectedSystem('business'); setBusinessType('transport'); }} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #34d399', color: '#fff', background: 'linear-gradient(145deg,#065f46,#14532d)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>📈</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK BUSINESS</h2><p style={{ color: '#d1fae5', lineHeight: 1.6 }}>Transport business aur dairy farming: daily income/expense, cash balance, profit, workers salary aur monthly reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#047857', borderRadius: 10, fontWeight: 800 }}>Open Business →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '380px', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ color: '#f8fafc', fontSize: '22px', margin: 0 }}>NDA-PK SYSTEM</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>{selectedSystem === 'hr' ? 'HR SYSTEM · Sites & Staff Login' : 'BUSINESS MANAGEMENT LOGIN'}</p>
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

  if (selectedSystem === 'business' && !userRole.is_admin) {
    return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f1f5f9',padding:20,fontFamily:"'Segoe UI',sans-serif"}}><div style={{background:'#fff',padding:28,borderRadius:16,maxWidth:500,textAlign:'center',boxShadow:'0 8px 30px #0f172a12'}}><h2>Business Access Restricted</h2><p>Business financial records aur salaries filhal admin account ke liye available hain.</p><button onClick={()=>setSelectedSystem(null)} style={primaryStyle}>Back to System Selection</button><button onClick={handleLogout} style={{...primaryStyle,marginTop:10,background:'#64748b'}}>Logout</button></div></div>;
  }

  if (selectedSystem === 'business') {
    const txToday = businessTransactions.filter(t => t.transaction_date === businessDate);
    const txMonth = businessTransactions.filter(t => String(t.transaction_date || '').slice(0,7) === businessMonth);
    const salaryMonth = businessSalaryPayments.filter(t => String(t.payment_date || '').slice(0,7) === businessMonth);
    const sum = (arr, kind) => arr.filter(t => t.transaction_kind === kind).reduce((n,t) => n + (Number(t.amount)||0), 0);
    const todayIncome = sum(txToday, 'income'); const todayExpense = sum(txToday, 'expense');
    const monthIncome = sum(txMonth, 'income'); const monthExpense = sum(txMonth, 'expense');
    const monthSalary = salaryMonth.reduce((n,t) => n + (Number(t.amount)||0), 0);
    const cashIn = businessTransactions.filter(t => t.payment_mode === 'Cash' && t.transaction_kind === 'income').reduce((n,t) => n + (Number(t.amount)||0),0);
    const cashOut = businessTransactions.filter(t => t.payment_mode === 'Cash' && t.transaction_kind === 'expense').reduce((n,t) => n + (Number(t.amount)||0),0) + businessSalaryPayments.filter(t => t.payment_mode === 'Cash').reduce((n,t) => n + (Number(t.amount)||0),0);
    const currency = 'AED';
    const money = n => `${currency} ${Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const businessLabel = businessType === 'transport' ? 'Transport Business' : 'Dairy Farming';
    return (
      <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Segoe UI',sans-serif", color:'#0f172a' }}>
        <header style={{ padding:'22px clamp(16px,3vw,34px)', color:'#fff', background: businessType === 'transport' ? 'linear-gradient(115deg,#0f172a,#1d4ed8)' : 'linear-gradient(115deg,#064e3b,#16a34a)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div><div style={{fontSize:12,letterSpacing:3,opacity:.8,fontWeight:800}}>NDA.PK BUSINESS</div><h1 style={{margin:'6px 0',fontSize:28}}>{businessLabel} Dashboard</h1><div style={{color:'#dbeafe',fontSize:13}}>Signed in: {session.user.email}</div></div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={handleLogout} style={{padding:'10px 13px',borderRadius:9,border:'1px solid #ffffff80',background:'#ffffff18',color:'#fff',cursor:'pointer'}}>⇄ Switch System</button><button onClick={handleLogout} style={{padding:'10px 13px',borderRadius:9,border:0,background:'#dc2626',color:'#fff',fontWeight:700,cursor:'pointer'}}>Logout</button></div>
        </header>
        <main style={{maxWidth:1400,margin:'0 auto',padding:'22px clamp(12px,2vw,28px)'}}>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
            <button onClick={()=>setBusinessType('transport')} style={{padding:'11px 18px',borderRadius:10,border:0,background:businessType==='transport'?'#1d4ed8':'#fff',color:businessType==='transport'?'#fff':'#334155',fontWeight:800,cursor:'pointer'}}>🚚 Transport</button>
            <button onClick={()=>setBusinessType('dairy')} style={{padding:'11px 18px',borderRadius:10,border:0,background:businessType==='dairy'?'#15803d':'#fff',color:businessType==='dairy'?'#fff':'#334155',fontWeight:800,cursor:'pointer'}}>🐄 Dairy Farming</button>
            <span style={{alignSelf:'center',color:'#64748b',fontSize:13}}>{businessLoading?'Loading business data…':'Income, expenses, cash balance, salaries and monthly reports'}</span>
          </div>
          <section style={{background:'#fff',borderRadius:16,padding:18,boxShadow:'0 5px 22px #0f172a0b',marginBottom:18,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><label style={{fontWeight:700}}>Dashboard date <input type="date" value={businessDate} onChange={e=>setBusinessDate(e.target.value)} style={{marginLeft:8,padding:9,border:'1px solid #cbd5e1',borderRadius:8}} /></label><label style={{fontWeight:700}}>Monthly report <input type="month" value={businessMonth} onChange={e=>setBusinessMonth(e.target.value)} style={{marginLeft:8,padding:9,border:'1px solid #cbd5e1',borderRadius:8}} /></label><button onClick={()=>fetchBusinessData()} style={{padding:'10px 15px',border:0,borderRadius:8,background:'#0f172a',color:'#fff',cursor:'pointer'}}>↻ Refresh</button></section>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:20}}>
            {[['Today Income',money(todayIncome),'#16a34a'],['Today Expense',money(todayExpense),'#dc2626'],['Today Profit',money(todayIncome-todayExpense),'#2563eb'],['Cash Balance (all records)',money(cashIn-cashOut),'#7c3aed'],['Month Income',money(monthIncome),'#059669'],['Month Expenses + Salaries',money(monthExpense+monthSalary),'#ea580c'],['Month Net Profit',money(monthIncome-monthExpense-monthSalary),'#0f766e'],['Active Workers',businessWorkers.filter(w=>w.active!==false).length,'#334155']].map((c,i)=><div key={c[0]} style={{background:'#fff',borderRadius:15,padding:18,boxShadow:'0 5px 22px #0f172a0b',borderTop:`4px solid ${c[2]}`}}><div style={{fontSize:12,color:'#64748b',fontWeight:700}}>{c[0]}</div><div style={{fontSize:23,fontWeight:850,color:c[2],marginTop:8}}>{c[1]}</div></div>)}
          </div>
          {userRole.is_admin && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18,marginBottom:20}}>
            <form onSubmit={handleSaveBusinessTransaction} style={{background:'#fff',borderRadius:15,padding:20,boxShadow:'0 5px 22px #0f172a0b'}}><h3 style={{marginTop:0}}>➕ Add Daily Income / Expense</h3><div style={{display:'grid',gap:10}}><input type="date" value={businessDate} onChange={e=>setBusinessDate(e.target.value)} required style={fieldStyle}/><select value={businessTxnKind} onChange={e=>{setBusinessTxnKind(e.target.value);setBusinessTxnCategory(e.target.value==='income'?'Daily income':'Fuel / feed / other expense')}} style={fieldStyle}><option value="income">Income</option><option value="expense">Expense</option></select><input value={businessTxnCategory} onChange={e=>setBusinessTxnCategory(e.target.value)} placeholder="Category (fuel, trip, milk, feed...)" style={fieldStyle} required/><input value={businessTxnDescription} onChange={e=>setBusinessTxnDescription(e.target.value)} placeholder={businessType==='transport'?'Vehicle / trip / customer details':'Milk sale / cattle / feed details'} style={fieldStyle}/><input type="number" min="0.01" step="0.01" value={businessTxnAmount} onChange={e=>setBusinessTxnAmount(e.target.value)} placeholder="Amount (AED)" required style={fieldStyle}/><select value={businessTxnPaymentMode} onChange={e=>setBusinessTxnPaymentMode(e.target.value)} style={fieldStyle}><option>Cash</option><option>Bank</option><option>Credit</option></select><button style={primaryStyle}>Save Financial Entry</button></div></form>
            <form onSubmit={handleAddBusinessWorker} style={{background:'#fff',borderRadius:15,padding:20,boxShadow:'0 5px 22px #0f172a0b'}}><h3 style={{marginTop:0}}>👷 Add {businessType==='transport'?'Driver / Staff':'Farm Worker'}</h3><div style={{display:'grid',gap:10}}><input value={businessWorkerName} onChange={e=>setBusinessWorkerName(e.target.value)} placeholder="Worker full name" required style={fieldStyle}/><input value={businessWorkerJob} onChange={e=>setBusinessWorkerJob(e.target.value)} placeholder={businessType==='transport'?'Driver / Mechanic / Helper':'Farm worker / Milker / Caretaker'} style={fieldStyle}/><input value={businessWorkerPhone} onChange={e=>setBusinessWorkerPhone(e.target.value)} placeholder="Phone (optional)" style={fieldStyle}/><input type="number" min="0" step="0.01" value={businessWorkerSalary} onChange={e=>setBusinessWorkerSalary(e.target.value)} placeholder="Monthly salary (AED)" style={fieldStyle}/><button style={{...primaryStyle,background:'#15803d'}}>Save Worker</button></div></form>
            <form onSubmit={handlePayBusinessSalary} style={{background:'#fff',borderRadius:15,padding:20,boxShadow:'0 5px 22px #0f172a0b'}}><h3 style={{marginTop:0}}>💳 Record Worker Salary</h3><div style={{display:'grid',gap:10}}><select value={businessSalaryWorkerId} onChange={e=>setBusinessSalaryWorkerId(e.target.value)} required style={fieldStyle}><option value="">Select worker</option>{businessWorkers.map(w=><option key={w.id} value={w.id}>{w.worker_name} — {w.job_title}</option>)}</select><input type="date" value={businessSalaryDate} onChange={e=>setBusinessSalaryDate(e.target.value)} required style={fieldStyle}/><input type="number" min="0.01" step="0.01" value={businessSalaryAmount} onChange={e=>setBusinessSalaryAmount(e.target.value)} placeholder="Salary paid (AED)" required style={fieldStyle}/><select value={businessSalaryPaymentMode} onChange={e=>setBusinessSalaryPaymentMode(e.target.value)} style={fieldStyle}><option>Cash</option><option>Bank</option></select><button style={{...primaryStyle,background:'#7c3aed'}}>Save Salary Payment</button></div></form>
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:18}}>
            <section style={{background:'#fff',borderRadius:15,padding:18,overflowX:'auto',boxShadow:'0 5px 22px #0f172a0b'}}><h3>📋 {businessLabel} Workers</h3><table style={tableStyle}><thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Role</th><th style={thStyle}>Monthly Salary</th></tr></thead><tbody>{businessWorkers.map(w=><tr key={w.id}><td style={tdStyle}>{w.worker_name}</td><td style={tdStyle}>{w.job_title}</td><td style={tdStyle}>{money(w.monthly_salary)}</td></tr>)}{!businessWorkers.length&&<tr><td colSpan="3" style={tdStyle}>No workers added yet.</td></tr>}</tbody></table></section>
            <section style={{background:'#fff',borderRadius:15,padding:18,overflowX:'auto',boxShadow:'0 5px 22px #0f172a0b'}}><h3>🧾 Monthly Transactions — {businessMonth}</h3><table style={tableStyle}><thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Type / Category</th><th style={thStyle}>Details</th><th style={thStyle}>Amount</th>{userRole.is_admin&&<th style={thStyle}>Action</th>}</tr></thead><tbody>{txMonth.map(t=><tr key={t.id}><td style={tdStyle}>{t.transaction_date}</td><td style={tdStyle}><b style={{color:t.transaction_kind==='income'?'#15803d':'#dc2626'}}>{t.transaction_kind}</b><br/>{t.category}</td><td style={tdStyle}>{t.description||'—'}<br/><small>{t.payment_mode}</small></td><td style={tdStyle}>{money(t.amount)}</td>{userRole.is_admin&&<td style={tdStyle}><button onClick={()=>handleDeleteBusinessTransaction(t.id)} style={{border:0,background:'#fee2e2',color:'#b91c1c',padding:'6px 8px',borderRadius:6,cursor:'pointer'}}>Delete</button></td>}</tr>)}{!txMonth.length&&<tr><td colSpan={userRole.is_admin?5:4} style={tdStyle}>No transactions for this month.</td></tr>}</tbody></table></section>
            <section style={{background:'#fff',borderRadius:15,padding:18,overflowX:'auto',boxShadow:'0 5px 22px #0f172a0b'}}><h3>💰 Salary Payments — {businessMonth}</h3><table style={tableStyle}><thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Worker</th><th style={thStyle}>Amount</th></tr></thead><tbody>{salaryMonth.map(p=><tr key={p.id}><td style={tdStyle}>{p.payment_date}</td><td style={tdStyle}>{businessWorkers.find(w=>String(w.id)===String(p.worker_id))?.worker_name||`Worker #${p.worker_id}`}</td><td style={tdStyle}>{money(p.amount)}</td></tr>)}{!salaryMonth.length&&<tr><td colSpan="3" style={tdStyle}>No salary payments for this month.</td></tr>}</tbody></table></section>
          </div>
          <p style={{fontSize:12,color:'#64748b',marginTop:20}}>Cash balance shown here is the net of all recorded Cash income minus Cash expenses. Monthly net profit subtracts recorded salary payments from income minus operating expenses.</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      
     {/* Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM (Multi-Site)</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email} {userRole.staff_id ? `(ID: ${userRole.staff_id})` : ''} | Days: <strong style={{color: '#38bdf8'}}>{totalDaysInCurrentMonth}</strong></span>
        </div>

        {/* Admin Name - Merged in Top Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <span style={{ fontSize: '16px' }}>👤</span>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Administrator</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>Muhammad Naveed</div>
          </div>
        </div>

        <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Switch System</button>
        <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Logout</button>
      </header>

      {/* Tabs Menu Bar */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        {(userRole.is_admin || userRole.can_view_dashboard) && (
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Dashboard</button>
        )}
        {(userRole.is_admin || userRole.can_use_bulk) && (
          <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk & OCR</button>
        )}
        {(userRole.is_admin || userRole.can_view_workers) && (
          <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers Directory</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && (
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet Entry</button>
        )}
      {(userRole.is_admin || userRole.can_view_timesheet) && <button
  onClick={() => setActiveTab('daily-timesheet')}
  style={{
    padding: '10px 15px',
    backgroundColor: activeTab === 'daily-timesheet' ? '#2563eb' : 'transparent',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  }}
>
  📄 Daily Timesheet
</button>}
        {(userRole.is_admin || userRole.can_view_payroll) && (
          <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        )}
        <button onClick={() => setActiveTab('changepass')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'changepass' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔑 Change Password</button>
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('sites')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'sites' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏗️ Working Sites</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('departments')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'departments' ? '#7c3aed' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏢 Departments</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 Permissions</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('annualLeave')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'annualLeave' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🌴 Annual Leave</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('data-cleanup')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'data-cleanup' ? '#dc2626' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🗑️ Data Cleanup</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && <button 
          onClick={() => setShowMonthlyTimesheetModal(true)} 
          style={{ padding: '10px 15px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}
        >
          📊 Monthly Timesheet
        </button>}
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        
        {/* Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
          {userRole.is_admin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginRight: '5px' }}>Dept:</label>
                <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #2563eb' }}>
                  <option value="All">All Depts</option>
                  {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginRight: '5px' }}>Site:</label>
                <select value={selectedSiteFilter} onChange={e => setSelectedSiteFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #059669' }}>
                  <option value="All">All Sites</option>
                  {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Site: {userRole.assigned_site} | Dept: {userRole.assigned_department}</span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED</option>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
            <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Print Page</button>
          </div>
        </div>
        
{/* TAB 1: DASHBOARD */}
{activeTab === 'dashboard' && (userRole.is_admin || userRole.can_view_dashboard) && (
  <>
    <section style={{background:'linear-gradient(120deg,#0f172a 0%,#1d4ed8 65%,#0e7490 100%)',borderRadius:18,padding:'24px clamp(16px,3vw,30px)',color:'#fff',marginBottom:20,boxShadow:'0 12px 30px #1e3a8a20',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,letterSpacing:3,fontWeight:800,color:'#bae6fd'}}>NDA-PK · HR CONTROL CENTER</div><h2 style={{fontSize:'clamp(23px,3vw,32px)',margin:'8px 0'}}>Workforce Overview</h2><p style={{margin:0,color:'#dbeafe',fontSize:14}}>Attendance, site deployment and payroll at a glance.</p></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><label style={{fontSize:12,color:'#dbeafe'}}>Dashboard Date<input type="date" value={selectedTimesheetDate} onChange={e=>setSelectedTimesheetDate(e.target.value)} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/></label><button onClick={()=>setShowMonthlyTimesheetModal(true)} style={{alignSelf:'end',padding:'10px 13px',background:'#fff',color:'#1d4ed8',border:0,borderRadius:9,fontWeight:800,cursor:'pointer'}}>📊 Monthly Report</button></div>
    </section>
    {/* Stats Grid */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '18px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '5px solid #2563eb'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>Total Workers</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
          {filteredWorkers.length}
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        padding: '18px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '5px solid #16a34a'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          Present on {selectedTimesheetDate}
        </span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>
          {presentCountForDate}
        </div>
      </div>

      {(userRole.is_admin || userRole.can_view_payroll) && (
        <div style={{
          backgroundColor: '#fff',
          padding: '18px',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '5px solid #0891b2'
        }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
            {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}
          </div>
        </div>
      )}
    </div>

    {/* Department & Designation Attendance Breakdown */}
    <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#1e293b' }}>
      Workers by Trade & Site — {selectedTimesheetDate}
    </h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    }}>
     {(userRole.is_admin
  ? departmentsList
  : departmentsList.filter(dept =>
      !userRole.assigned_department ||
      userRole.assigned_department === 'All' ||
      dept.toLowerCase() === userRole.assigned_department.toLowerCase()
    )
).map(dept => {
  const deptWorkers = filteredWorkers.filter(
    w => w.department?.toLowerCase() === dept.toLowerCase()
  );
        // Workers who have an attendance record for the selected date
        const deptAttendanceWorkers = deptWorkers.filter(w =>
          Boolean(attendanceData[selectedTimesheetDate]?.[w.id])
        );

        const totalAttendanceCount = deptAttendanceWorkers.length;

        const designationsInDept = Array.from(
          new Set(deptWorkers.map(w => w.designation || 'Worker'))
        );

        return (
          <div
            key={dept}
            onClick={() => setModalDepartment(dept)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '20px',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{
              margin: '0 0 5px 0',
              color: '#1e293b',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '6px'
            }}>
              🏢 {dept}
            </h3>

            <p style={{ margin: '6px 0 12px 0', color: '#0f172a', fontSize: '14px' }}>
              Workers with attendance: <strong>{totalAttendanceCount}</strong>
            </p>

            <hr style={{
              border: '0',
              borderTop: '1px solid #e2e8f0',
              margin: '10px 0'
            }} />

            {designationsInDept.map(desig => {
              const desigWorkers = deptWorkers.filter(
                w => (w.designation || 'Worker') === desig
              );

              const desigAttendanceWorkers = desigWorkers.filter(w =>
                Boolean(attendanceData[selectedTimesheetDate]?.[w.id])
              );
            const getAttendanceStatus = (worker) =>
  attendanceData[selectedTimesheetDate]?.[worker.id]?.status || '';

const presentCount = desigWorkers.filter(w => {
  const status = getAttendanceStatus(w)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  if (status !== 'present') return false;

  const workerKey = String(w.id);

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === workerKey;

    const start = leave.start_date;
    const end = leave.actual_return;

    const isStillOnLeave =
      leave.status !== 'Returned' &&
      (!end || end === 'On Leave' || selectedTimesheetDate < end);

    return (
      sameWorker &&
      isStillOnLeave &&
      start &&
      start <= selectedTimesheetDate
    );
  });

  return !onAnnualLeave;
}).length;

const absentCount = desigWorkers.filter(w => {
  const status = getAttendanceStatus(w)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  if (status !== 'absent') return false;

  const workerKey = String(w.worker_id ?? w.id);

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker = String(leave.worker_id) === workerKey;
    const start = leave.start_date;
    const end = leave.actual_return;

    const isStillOnLeave =
      leave.status !== 'Returned' &&
      (!end || end === 'On Leave');

    return (
      sameWorker &&
      isStillOnLeave &&
      start &&
      start <= selectedTimesheetDate
    );
  });

  return !onAnnualLeave;
}).length;

const annualLeaveCount = desigWorkers.filter(w => {
  const status = getAttendanceStatus(w)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  const workerKey = String(w.worker_id ?? w.id);

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker = String(leave.worker_id) === workerKey;

    const start = leave.start_date;
    const isStillOnLeave =
      leave.status !== 'Returned' &&
      (!leave.actual_return || leave.actual_return === 'On Leave');

    return (
      sameWorker &&
      isStillOnLeave &&
      start &&
      start <= selectedTimesheetDate
    );
  });

  return status === 'annual leave' || onAnnualLeave;
}).length;
const otherLeaveCount = desigWorkers.filter(
  w => ['leave', 'sick leave', 'sick_leave', 'other leave'].includes(
    getAttendanceStatus(w).toLowerCase()
  )
).length;

              return (
                <div
                  key={desig}
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#f8fafc',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '6px'
                  }}>
                    <span>🛠️ {desig}</span>
                    <span style={{
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}>
                      {desigAttendanceWorkers.length} Attended
                    </span>
                  </div>

                  {sitesList.map(site => {
                    const siteWorkersCount = desigWorkers.filter(w => {
                      const attendanceRecord =
                        attendanceData[selectedTimesheetDate]?.[w.id];

                      return Boolean(attendanceRecord) &&
                        (attendanceRecord.site || attendanceRecord.work_site) === site;
                    }).length;

                    if (siteWorkersCount === 0) return null;

                    return (
                      <div
                        key={site}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '12px',
                          paddingLeft: '8px',
                          color: '#334155',
                          margin: '5px 0',
                          borderLeft: '3px solid #0ea5e9'
                        }}
                      >
                        <span>📍 {site}</span>
                        <strong style={{ color: '#0284c7', fontSize: '13px' }}>
                          {siteWorkersCount} Workers
                        </strong>
                      </div>
                    );
                  })}

                  <div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '10px',
  marginBottom: '10px'
}}>
  <span style={{
    background: '#dcfce7',
    color: '#166534',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Present: {presentCount}
  </span>

  <span style={{
    background: '#fee2e2',
    color: '#991b1b',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Absent: {absentCount}
  </span>

  <span style={{
    background: '#fef3c7',
    color: '#92400e',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Annual Leave: {annualLeaveCount}
  </span>

  <span style={{
    background: '#dbeafe',
    color: '#1e40af',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Other Leave: {otherLeaveCount}
  </span>
</div>
                  {desigAttendanceWorkers.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                      No attendance saved for this date
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  </>
)}

{/* Modal / Popup for Specific Department Workers */}
{modalDepartment && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}>
    <div style={{
      background: '#fff',
      padding: '25px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '750px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>
          {modalDepartment} - Workers Detail
        </h2>

        <button
          onClick={() => setModalDepartment(null)}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Close X
        </button>
      </div>

      {/* Filtered Workers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>ID</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Name</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Designation</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Site / Location</th>
            </tr>
          </thead>

          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => w.department?.toLowerCase() === modalDepartment?.toLowerCase())
              .filter(w => {
                if (modalLocationTab === 'All') return true;

                const attendanceRecord =
                  attendanceData[selectedTimesheetDate]?.[w.id];

                return (attendanceRecord?.site || attendanceRecord?.work_site) === modalLocationTab;
              })
              
.map(worker => {
  const attendanceRecord =
    attendanceData[selectedTimesheetDate]?.[worker.id];

  const annualLeave = getAnnualLeaveForWorker(
    worker.id,
    selectedTimesheetDate
  );

  return (
           
<tr
  key={worker.id}
style={{
  backgroundColor: annualLeave ? '#dcfce7' : '#ffffff',
  color: annualLeave ? '#166534' : '#111827',
  fontWeight: annualLeave ? 'bold' : 'normal'
}}
>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      #{worker.worker_id || worker.id}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {worker.name}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {worker.designation || 'N/A'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {attendanceRecord?.site || attendanceRecord?.work_site || 'No attendance'}
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

{/* Print Styles */}
<style>{`
  @media print {
    .print-signature {
      display: block !important;
    }
  }
`}</style>
   
{/* TAB 2: BULK & OCR */}
{activeTab === 'bulk' && (userRole.is_admin || userRole.can_use_bulk) && (
  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <h3 style={{ margin: '0 0 10px 0' }}>⚡ Bulk Overtime Only — Department / Designation</h3>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Date</label>
        <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Department</label>
        <select value={bulkDepartment} onChange={e => setBulkDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="All">All Departments</option>
          {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Designation (Steel, Carpenter etc)</label>      
<select
  value={bulkDesignation}
  onChange={e => setBulkDesignation(e.target.value)}
  style={{
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1'
  }}
>
  <option value="All">All Designations</option>
  {designationsList.map((d, idx) => (
    <option key={idx} value={d}>{d}</option>
  ))}
</select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Working Site</label>
        <select value={bulkSite} onChange={e => setBulkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Overtime Hours</label>
        <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>
      
<div>
  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Contract OT Hours</label>
  <input
    type="number"
    min="0"
    value={bulkContractOT}
    onChange={e => setBulkContractOT(e.target.value)}
    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
  />
</div>


      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button onClick={handleBulkAttendance} style={{ width: '100%', padding: '9px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply OT to Selected Workers</button>
      </div>
    </div>

    <div style={{ marginTop: '20px', padding: '18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
      <h3 style={{ margin: '0 0 8px', color: '#166534' }}>🟢 Site Attendance by Worker ID</h3>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#166534' }}>Date aur site select karein, phir sirf Present workers ki IDs comma, space ya new line se likhein. Selected site ke baqi workers Absent mark honge.</p>
      <form onSubmit={handleSaveSiteAttendance}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Attendance Date</label><input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }} /></div>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Working Site</label><select value={siteAttendanceSite} onChange={e => setSiteAttendanceSite(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}>{sitesList.map(site => <option key={site} value={site}>{site}</option>)}</select></div>
        </div>
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginTop: 12 }}>Present Workers — ID No.</label>
        <textarea value={siteAttendanceIds} onChange={e => setSiteAttendanceIds(e.target.value)} rows={3} placeholder={'Example: 101, 102, 108\\n109\\n115'} style={{ ...fieldStyle, marginTop: 5, resize: 'vertical' }} />
        <button type="submit" disabled={siteAttendanceSaving} style={{ ...primaryStyle, marginTop: 12, background: '#15803d', opacity: siteAttendanceSaving ? .7 : 1 }}>{siteAttendanceSaving ? 'Saving Attendance…' : 'Save Site Attendance (Others Absent)'}</button>
      </form>
    </div>

    <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
      <h4 style={{ margin: '0 0 8px 0' }}>📸 OCR Scanner (For Date: {selectedTimesheetDate})</h4>
      <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
      {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
      {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
    </div>
    
{/* QUICK ATTENDANCE BOX */}
<div style={{
  marginTop: '20px',
  padding: '18px',
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '10px'
}}>
  <h3 style={{ margin: '0 0 15px', color: '#1d4ed8' }}>
    ⚡ Quick Bulk Attendance
  </h3>

  <form onSubmit={handleQuickAttendance}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      alignItems: 'end'
    }}>
      <div>
        <label>Worker ID No.</label>
        <input
          id="quick-worker-id"
          value={quickWorkerId}
          onChange={e => setQuickWorkerId(e.target.value)}
          placeholder="Enter Worker ID"
          autoComplete="off"
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
        />
      </div>

      <div>
        <label>Working Site</label>
        <select
          value={quickSite}
          onChange={e => setQuickSite(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px'
          }}
        >
          {sitesList.map(site => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>
      </div>

      <div>
        <label>OT Type</label>
        <select
          value={quickOTType}
          onChange={e => setQuickOTType(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px'
          }}
        >
          <option value="Normal OT">Normal OT</option>
          <option value="Contract OT">Contract OT</option>
        </select>
      </div>

      <div>
        <label>OT Hours</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={quickHours}
          onChange={e => setQuickHours(e.target.value)}
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={quickSaving}
        style={{
          padding: '11px',
          backgroundColor: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        {quickSaving ? 'Saving...' : 'Save & Enter'}
      </button>
    </div>

    <p style={{ fontSize: '12px', color: '#475569' }}>
      Date: {selectedTimesheetDate} | Status: Present
    </p>
  </form>
</div>

    {/* Individual Worker Attendance List */}
    <div style={{ marginTop: '30px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>
        👥 Individual Attendance ({bulkDepartment} - {selectedTimesheetDate})
      </h4>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>ID</th>
              <th style={{ padding: '8px' }}>Worker Name</th>
              <th style={{ padding: '8px' }}>Designation</th>
              <th style={{ padding: '8px' }}>Site</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>OT Hours</th>
              <th style={{ padding: '8px' }}>Contract OT</th>
              <th style={{ padding: '8px' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => bulkDepartment === 'All' || w.department === bulkDepartment)
              .map((worker) => {
                const record = attendanceData[selectedTimesheetDate]?.[worker.id] || { status: 'Present', ot: 0 };
                const currentSite = record.site || worker.work_site || sitesList[0] || 'Sharjah Mamzar';

                return (
                  <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{worker.worker_id || worker.id}</td>
                    <td style={{ padding: '8px' }}>{worker.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{worker.designation || '-'}</td>

                    <td style={{ padding: '8px' }}>
                      <select
                        value={currentSite}
                        onChange={(e) => {
                          const selectedSite = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                site: selectedSite
                              }
                            }
                          }));
                        }}
                        style={{ padding: '6px', borderRadius: '4px', minWidth: '130px' }}
                      >
                        {sitesList.map((site) => (
                          <option key={site} value={site}>{site}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <select
                        value={record.status}
                        onChange={(e) => {
                          const selectedStatus = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                status: selectedStatus
                              }
                            }
                          }));
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: record.status === 'Present' ? '#16a34a' : record.status === 'Absent' ? '#dc2626' : '#d97706' }}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        value={record.ot || 0}
                        onChange={(e) => {
                          const selectedOT = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                ot: selectedOT
                              }
                            }
                          }));
                        }}
                        style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={record.contract_ot ?? record.contract_overtime_hours ?? 0}
                        onChange={(e) => {
                          const selectedContractOT = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                contract_ot: selectedContractOT
                              }
                            }
                          }));
                        }}
                        style={{ width: '75px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>

                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={async () => {
                          const latestRecord = attendanceData[selectedTimesheetDate]?.[worker.id] || record;
                          const siteToSave = latestRecord.site || worker.work_site || sitesList[0] || 'Sharjah Mamzar';

                         
await handleSingleAttendanceChange(
  worker.id,
  selectedTimesheetDate,
  latestRecord.status || 'Present',
  latestRecord.ot ?? 0,
  siteToSave,
  latestRecord.contract_ot ?? latestRecord.contract_overtime_hours ?? 0
);

                          alert('Update Successful! Site, Status, OT aur Contract OT save kar diye gaye.');
                        }}
                        style={{
                          padding: '7px 11px',
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Update
                      </button>
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

       {/* TAB 3: WORKERS DIRECTORY */}
{activeTab === 'workers' && (userRole.is_admin || userRole.can_view_workers) && (
  <div>
    {(userRole.is_admin || userRole.can_add_workers || userRole.can_edit_workers) && (
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>{editingWorkerId ? `✏️ Edit Worker #${editingWorkerId}` : '➕ Add New Worker'}</h3>
        <form onSubmit={handleSaveWorker}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Worker ID</label>
              <input type="number" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} placeholder="e.g. 101" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Designation</label>
           
<select
  value={designation}
  onChange={e => setDesignation(e.target.value)}
  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
>
  {designationsList.map((d, idx) => (
    <option key={idx} value={d}>{d}</option>
  ))}
</select>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
  <input
    type="text"
    value={newDesignation}
    onChange={e => setNewDesignation(e.target.value)}
    placeholder="Add new designation"
    style={{
      flex: 1,
      padding: '8px',
      borderRadius: '6px',
      border: '1px solid #cbd5e1'
    }}
  />
<button
  type="button"
  onClick={async () => {
    const value = newDesignation.trim();

    if (!value) return;

    if (
      designationsList.some(
        d => d.toLowerCase() === value.toLowerCase()
      )
    ) {
      alert('Designation already exists!');
      return;
    }

    const { error } = await supabase
      .from('designations')
      .insert([{ name: value }]);

    if (error) {
      alert('Designation save nahi hui: ' + error.message);
      return;
    }

    setDesignationsList(prev => [...prev, value]);
    setDesignation(value);
    setNewDesignation('');
    alert('Designation successfully saved!');
  }}
  style={{
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer'
  }}
>
  + Add
</button>
</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Working Site</label>
              <select value={workSite} onChange={e => setWorkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Monthly Salary *</label>
              <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="3000" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Annual Leave Balance (Days)</label>
              <input type="number" min="0" step="0.5" value={annualLeaveBalance} onChange={e => setAnnualLeaveBalance(e.target.value)} placeholder="e.g. 30" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
      
          {/* DOCUMENTS UPLOAD SECTION */}
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1e293b' }}>📁 Worker Documents Upload</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Passport Copy</label>
                <input type="file" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const fileName = `pass_${Date.now()}.${file.name.split('.').pop()}`;
                    const { error: uploadError } = await supabase.storage.from('worker-documents').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from('worker-documents').getPublicUrl(fileName);
                    setPassportFileUrl(data.publicUrl);
                    alert('Passport uploaded successfully!');
                  } catch (err) {
                    alert('Passport upload error: ' + err.message);
                  }
                }} style={{ fontSize: '11px' }} />
              </div>

              <div>
  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ID Card</label>
  <input 
    type="file" 
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `idcard_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('worker-documents').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('worker-documents').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        setIdCardFileUrl(publicUrl);
        alert('ID Card uploaded successfully!');
      } catch (err) {
        alert('Upload Error: ' + err.message);
      }
    }} 
    style={{ fontSize: '11px' }} 
  />
  {idCardFileUrl && <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>✔ Saved & Ready</div>}
</div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Visa Copy</label>
                <input type="file" onChange={(e) => alert('Visa selected!')} style={{ fontSize: '11px' }} />
              </div>

            </div>
          </div>

          <button type="submit" style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {editingWorkerId ? 'Update Worker' : 'Save Worker'}
          </button>
        </form>
      </div>
    )}

    {/* WORKERS DIRECTORY TABLE */}
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <h3 style={{ margin: '0 0 15px 0' }}>👷 Workers Directory</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '10px' }}>ID & Name</th>
            <th style={{ padding: '10px' }}>Dept / Designation</th>
            <th style={{ padding: '10px' }}>Salary</th>
            <th style={{ padding: '10px' }}>Documents View</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredWorkers.map(w => (
            <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
              <td style={{ padding: '10px' }}>{w.department} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{w.designation || 'Worker'}</span></td>
              <td style={{ padding: '10px' }}>{w.monthly_salary} {w.currency || selectedCurrency}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {w.passport_file_url ? (
                    <a href={w.passport_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '3px 6px', borderRadius: '4px', textDecoration: 'none' }}>Passport</a>
                  ) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Passport</span>}
                </div>
              </td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(userRole.is_admin || userRole.can_edit_workers) && (
                    <button onClick={() => handleStartEditWorker(w)} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                  )}
                  {(userRole.is_admin || userRole.can_delete_workers) && (
                    <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
       
{/* TAB 4: TIMESHEET */}
{activeTab === 'attendance' &&
 (userRole.is_admin || userRole.can_view_timesheet) &&
 (() => {
   const reportWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(w => {
     const deptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
     const siteScope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
     const deptMatch = !deptScope || deptScope === 'All' ||
       w.department?.toLowerCase() === deptScope.toLowerCase();
     const siteMatch = !siteScope || siteScope === 'All' ||
       w.work_site?.toLowerCase() === siteScope.toLowerCase();
     return deptMatch && siteMatch;
   });

   const getRecord = worker =>
     attendanceData[selectedTimesheetDate]?.[worker.id] ||
     attendance.find(a =>
       String(a.worker_id) === String(worker.id) &&
       a.date === selectedTimesheetDate
     ) || {};

   const getStatus = worker =>
     String(getRecord(worker).status || 'Absent').toLowerCase().replace(/_/g, ' ').trim();

   const getSite = worker =>
     getRecord(worker).site ||
     getRecord(worker).work_site ||
     worker.work_site ||
     'Unassigned';

  const presentCount = reportWorkers.filter(w => {
  const status = getStatus(w);

  const isOnAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === String(w.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    return (
      sameWorker &&
      onLeave &&
      leave.start_date <= selectedTimesheetDate &&
      selectedTimesheetDate <= leave.expected_return
    );
  });

  return status === 'present' && !isOnAnnualLeave;
}).length;
   const absentWorkers = reportWorkers.filter(w =>
     getStatus(w) === 'absent'
   );

   const annualLeaveCount = reportWorkers.filter(w =>
     ['annual leave', 'annual-leave'].includes(getStatus(w))
   ).length;

   const otherLeaveCount = reportWorkers.filter(w =>
     ['leave', 'sick leave', 'other leave'].includes(getStatus(w))
   ).length;

   const mamzarAbsent = absentWorkers.filter(w =>
     getSite(w).toLowerCase().includes('mamzar')
   ).length;

   const otherSiteAbsent = absentWorkers.filter(w =>
     !getSite(w).toLowerCase().includes('mamzar')
   ).length;

   return (
     <div style={{
       background: '#fff',
       padding: '20px',
       borderRadius: '10px',
       boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
     }}>
       <div style={{
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         flexWrap: 'wrap',
         gap: '12px',
         marginBottom: '18px'
       }}>
         <div>
           <h3 style={{ margin: 0 }}>📅 Daily Attendance Report</h3>
           <p style={{ color: '#64748b', fontSize: '12px', marginBottom: 0 }}>
             Department-wise and site-wise attendance
           </p>
         </div>

         <div>
           <label style={{
             fontWeight: 'bold',
             color: '#2563eb',
             marginRight: '8px'
           }}>
             Select Date:
           </label>
           <input
             type="date"
             value={selectedTimesheetDate}
             onChange={e => setSelectedTimesheetDate(e.target.value)}
             style={{
               padding: '8px',
               borderRadius: '6px',
               border: '1px solid #2563eb'
             }}
           />
         </div>
       </div>

       {userRole.is_admin && (
         <div style={{ marginBottom: '16px' }}>
           <label style={{ fontWeight: 'bold', marginRight: '8px' }}>
             Department:
           </label>
           <select
             value={selectedDeptFilter}
             onChange={e => setSelectedDeptFilter(e.target.value)}
             style={{ padding: '8px', borderRadius: '6px' }}
           >
             <option value="All">All Departments</option>
             {departmentsList.map((d, i) => (
               <option key={i} value={d}>{d}</option>
             ))}
           </select>
         </div>
       )}

       <div style={{
         display: 'grid',
         gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
         gap: '10px',
         marginBottom: '20px'
       }}>
         {[
           { label: 'Total Workers', value: reportWorkers.length, color: '#334155', bg: '#f1f5f9' },
           { label: 'Present', value: presentCount, color: '#166534', bg: '#dcfce7' },
           { label: 'Absent', value: absentWorkers.length, color: '#991b1b', bg: '#fee2e2' },
           { label: 'Annual Leave', value: annualLeaveCount, color: '#92400e', bg: '#fef3c7' },
           { label: 'Other Leave', value: otherLeaveCount, color: '#1e40af', bg: '#dbeafe' },
           { label: 'Mamzar Absent', value: mamzarAbsent, color: '#9f1239', bg: '#ffe4e6' },
           { label: 'Other Site Absent', value: otherSiteAbsent, color: '#6b21a8', bg: '#f3e8ff' }
         ].map(item => (
           <div key={item.label} style={{
             padding: '13px',
             borderRadius: '8px',
             background: item.bg,
             color: item.color
           }}>
             <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
               {item.label}
             </div>
             <div style={{ fontSize: '25px', fontWeight: 'bold', marginTop: '5px' }}>
               {item.value}
             </div>
           </div>
         ))}
       </div>

       <div style={{ overflowX: 'auto' }}>
         <table style={{
           width: '100%',
           borderCollapse: 'collapse',
           minWidth: '720px'
         }}>
           <thead>
             <tr style={{
               background: '#1e293b',
               color: '#fff',
               textAlign: 'left'
             }}>
               <th style={{ padding: '10px' }}>Worker</th>
               <th style={{ padding: '10px' }}>Department</th>
               <th style={{ padding: '10px' }}>Site</th>
               <th style={{ padding: '10px' }}>OT Hours</th>
               <th style={{ padding: '10px' }}>Status</th>
               <th style={{ padding: '10px' }}>Action</th>
             </tr>
           </thead>

           <tbody>
             {reportWorkers.map(worker => {
               const record = getRecord(worker);
               const savedStatus = record.status || 'Absent';
               const savedSite = getSite(worker);
               const savedOT = record.ot ?? record.overtime_hours ?? 0;

               return (
                 <tr key={worker.id} style={{
                   borderBottom: '1px solid #e2e8f0',
                   backgroundColor: savedStatus.toLowerCase() === 'absent' ? '#fee2e2' : 'transparent',
                   color: savedStatus.toLowerCase() === 'absent' ? '#991b1b' : 'inherit'
                 }}>
                   <td style={{ padding: '10px', fontWeight: 'bold' }}>
                     #{worker.id} - {worker.name}
                     <div style={{
                       fontSize: '11px',
                       color: '#64748b',
                       fontWeight: 'normal'
                     }}>
                       {worker.designation || 'Worker'}
                     </div>
                   </td>

                   <td style={{ padding: '10px' }}>
                     {worker.department || '-'}
                   </td>

                   <td style={{ padding: '10px' }}>
                     <select
                       value={timesheetSiteInputs[worker.id] || savedSite}
                       onChange={e => setTimesheetSiteInputs(prev => ({
                         ...prev,
                         [worker.id]: e.target.value
                       }))}
                       style={{ padding: '6px', maxWidth: '160px' }}
                     >
                       {!sitesList.includes(savedSite) && (
                         <option value={savedSite}>{savedSite}</option>
                       )}
                       {sitesList.map((site, i) => (
                         <option key={i} value={site}>{site}</option>
                       ))}
                     </select>
                   </td>

                   <td style={{ padding: '10px' }}>
                     <input
                       type="number"
                       min="0"
                       value={overtimeInputs[worker.id] ?? savedOT}
                       onChange={e => setOvertimeInputs(prev => ({
                         ...prev,
                         [worker.id]: e.target.value
                       }))}
                       style={{ width: '70px', padding: '6px' }}
                     />
                   </td>

                   <td style={{ padding: '10px' }}>
                     <select
                       id={`status-${worker.id}`}
                       key={`${worker.id}-${selectedTimesheetDate}-${savedStatus}`}
                       defaultValue={savedStatus}
                       style={{ padding: '6px', borderRadius: '4px' }}
                     >
                       <option value="Present">Present</option>
                       <option value="Absent">Absent</option>
                       <option value="Annual Leave">Annual Leave</option>
                       <option value="Sick Leave">Sick Leave</option>
                       <option value="Leave">Leave</option>
                       <option value="Other Leave">Other Leave</option>
                     </select>
                   </td>

                   <td style={{ padding: '10px' }}>
                     <button
                       onClick={() => {
                         const dropdown = document.getElementById(`status-${worker.id}`);
                         handleMarkAttendance(
                           worker.id,
                           dropdown ? dropdown.value : savedStatus
                         );
                       }}
                       style={{
                         padding: '7px 12px',
                         background: '#2563eb',
                         color: '#fff',
                         border: 'none',
                         borderRadius: '5px',
                         cursor: 'pointer',
                         fontWeight: 'bold'
                       }}
                     >
                       Update
                     </button>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>
     </div>
   );
 })()}
              
        {/* TAB 5A: DAILY TIMESHEET */}
        {activeTab === 'daily-timesheet' && (userRole.is_admin || userRole.can_view_timesheet) && (
         <div
  className="daily-timesheet-print"
  style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}
>
  <style>{dailyTimesheetPrintStyle}</style>

            <h2>📄 Daily Timesheet</h2>

            <div style={{
              display: 'flex',
              gap: '15px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={selectedTimesheetDate}
                  onChange={e => setSelectedTimesheetDate(e.target.value)}
                  style={{ padding: '9px', border: '1px solid #cbd5e1', borderRadius: '5px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Working Site
                </label>
                <select
                  value={dailyTimesheetSite}
                  onChange={e => setDailyTimesheetSite(e.target.value)}
                  style={{ padding: '9px', minWidth: '200px', border: '1px solid #cbd5e1', borderRadius: '5px' }}
                >
                 
<option value="All Workers">All Workers</option>
{sitesList.map((site, idx) => (
  <option key={idx} value={site}>{site}</option>
))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '950px'
              }}>
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>S.No</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Name</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Designation</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>ID</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Status</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Normal Hours</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Contract OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Total OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {(userRole.is_admin ? workers : filteredWorkers)
                    .filter(worker => {
                      const record =
                        attendanceData[selectedTimesheetDate]?.[worker.id] ||
                        attendance.find(a =>
                          String(a.worker_id) === String(worker.id) &&
                          a.date === selectedTimesheetDate
                        ) ||
                        {};
                    
const workerSite =
  record.site ||
  record.work_site ||
  worker.work_site ||
  '';
return (
  dailyTimesheetSite === 'All' ||
  dailyTimesheetSite === 'All Workers' ||
  workerSite.toLowerCase().trim() ===
    dailyTimesheetSite.toLowerCase().trim()
);
})
.map((worker, index) => {
                      const record =
                        attendanceData[selectedTimesheetDate]?.[worker.id] ||
                        attendance.find(a =>
                          String(a.worker_id) === String(worker.id) &&
                          a.date === selectedTimesheetDate
                        ) ||
                        {};
                  
                      const annualLeave = getAnnualLeaveForWorker(
                        worker.id,
                        selectedTimesheetDate
                      );

                      const status = annualLeave
                        ? 'Annual Leave'
                        : (record.status || 'Absent');

                      const ot = annualLeave
                        ? 0
                        : (Number(record.ot ?? record.overtime_hours ?? 0) || 0);

                      const contractOT = annualLeave
                        ? 0
                        : (Number(record.contract_ot ?? record.contract_overtime_hours ?? 0) || 0);

                      const totalOT = ot + contractOT;

                      const normalHours =
                        !annualLeave &&
                        String(status).toLowerCase() === 'present'
                          ? 8
                          : 0;

                      return (                       
<tr
  key={worker.id}
  style={{
    backgroundColor:
      String(status).trim().toLowerCase() === 'annual leave'
        ? '#fef3c7'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#fee2e2'
          : '#ffffff',
    color:
      String(status).trim().toLowerCase() === 'annual leave'
        ? '#92400e'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#991b1b'
          : '#111827',
    fontWeight:
      ['annual leave', 'absent'].includes(String(status).trim().toLowerCase())
        ? 'bold'
        : 'normal'
  }}
>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.name || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.designation || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{worker.id || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{status}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{normalHours}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{ot}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{contractOT}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{totalOT}</td>
                         <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>-</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px'
            }}>
              <strong>Daily Work Details / Remarks</strong>
              <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                {savedDailyWorkDetails || 'Is date aur site ke liye koi Daily Work Details save nahi hain.'}
              </p>
            </div>

            <div style={{ marginTop: '15px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>
        )}
       
{/* TAB 5: MONTHLY SHEET */}
{activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
  <div
    id="monthly-sheet-print"
    style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}
  >
<style>{`
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  @media print {
    body * {
      visibility: hidden !important;
    }

    #monthly-sheet-print,
    #monthly-sheet-print * {
      visibility: visible !important;
    }

    #monthly-sheet-print {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
    }

    #monthly-sheet-print .no-print {
      display: none !important;
    }

    #monthly-sheet-print table {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 9px !important;
    }

    #monthly-sheet-print th,
    #monthly-sheet-print td {
      border: 1px solid #555 !important;
      padding: 5px 3px !important;
      color: #000 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
    }

    #monthly-sheet-print h3 {
      color: #000 !important;
    }
  }
`}</style>
    <div
      className="no-print"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}
    >
      <h3 style={{ margin: 0 }}>📋 Monthly Sheet</h3>

      <button
        onClick={() => window.print()}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          padding: '10px 18px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        🖨️ Print / Save as PDF
      </button>
    </div>

    <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>
      Monthly Salary & Overtime Sheet
    </div>

    <div
      style={{
        overflowX: 'auto',
        width: '100%'
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: '750px',
          borderCollapse: 'collapse',
          textAlign: 'center',
          fontSize: '12px'
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#e2e8f0' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>S.No.</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px', textAlign: 'left' }}>Name</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>ID</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Present</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Overtime</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Overtime Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Salary Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Salary</th>
          </tr>
        </thead>

        <tbody>         
{salaryData.map((s, index) => {
  const totalOT = Number(s.totalOT || 0);
  const overtimePay = Number(s.otSalary || 0);
  const salaryPay = Number(s.baseSalary || 0);
  const totalSalary = Number(s.totalPayable || (salaryPay + overtimePay));

            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {index + 1}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>
                  {s.name}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {s.id}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {s.presentDays}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {totalOT} hrs
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(overtimePay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(salaryPay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>
                  {Math.round(totalSalary).toLocaleString()} {selectedCurrency}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
            <td
              colSpan={7}
              style={{
                border: '1px solid #94a3b8',
                padding: '10px',
                textAlign: 'right'
              }}
            >
              GRAND TOTAL
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '10px' }}>
              {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
)}
        {/* TAB 6: CHANGE LOGIN DETAILS */}
        {activeTab === 'changepass' && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>🔑 Change Login Details</h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '13px' }}>
              {userRole.is_admin ? 'Admin yahan apna login email aur password dono change kar sakta hai.' : 'Staff apna password change kar sakta hai. Login email admin hi change karega.'}
            </p>
            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Current Password *</label>
                <input type="password" value={currentPassInput} onChange={e => setCurrentPassInput(e.target.value)} placeholder="Enter current password" autoComplete="current-password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              {userRole.is_admin && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Admin Login Email</label>
                  <input type="email" value={newLoginEmailInput} onChange={e => setNewLoginEmailInput(e.target.value)} placeholder={session?.user?.email || 'admin@nda.pk'} autoComplete="username" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Password {userRole.is_admin ? '(optional if changing email only)' : '*'}</label>
                <input type="password" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} placeholder="Enter new password" autoComplete="new-password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required={!userRole.is_admin} />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Update Login Details</button>
            </form>
          </div>
        )}

        {/* TAB 7: WORKING SITES MANAGEMENT */}
        {activeTab === 'sites' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🏗️ Manage Working Sites</h3>
            <form onSubmit={handleAddNewSite} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={newSiteInput} onChange={e => setNewSiteInput(e.target.value)} placeholder="e.g. Dubai Marina Site" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Site</button>
            </form>
            <h4>Current Active Sites:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sitesList.map((site, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8fafc', marginBottom: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#334155' }}>
                  <span>{site}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteSite(site)}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB: DEPARTMENTS MANAGEMENT */}
        {activeTab === 'departments' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🏢 Manage Departments</h3>
            <form onSubmit={handleAddNewDepartment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={newDeptInput} onChange={e => setNewDeptInput(e.target.value)} placeholder="e.g. Mechanical" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Dept</button>
            </form>
            <h4>Current Active Departments:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {departmentsList.map((dept, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8fafc', marginBottom: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#334155' }}>
                  <span>{dept}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteDepartment(dept)}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 9: PERMISSIONS PANEL */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🔐 Granular Staff Permissions & Staff ID Allocation</h3>
            <form onSubmit={handleSavePermission} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#1e293b' }}>{targetEmail ? `✏️ Edit Access for: ${targetEmail}` : '➕ Add New Staff Access'}</h4>
                {targetEmail && (
                  <button type="button" onClick={() => {
                    setTargetStaffId('');
                    setTargetEmail('');
                    setTargetPassword('');
                    setTargetDept('All');
                    setTargetSite('All');
                    setPermDashboard(true);
                    setPermBulk(false);
                    setPermViewWorkers(true);
                    setPermAddWorkers(false);
                    setPermEditWorkers(false);
                    setPermDeleteWorkers(false);
                    setPermTimesheetView(true);
                    setPermTimesheetEdit(true);
                    setPermPayroll(false);
                  }} style={{ padding: '4px 10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Cancel Edit</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff ID</label>
                  <input type="text" value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} placeholder="e.g. STF-01" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff Email *</label>
                  <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="staff@nda.pk" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password *</label>
                  <input type="text" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Assigned Dept</label>
                  <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Depts</option>
                    {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Assigned Site</label>
                  <select value={targetSite} onChange={e => setTargetSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Sites</option>
                    {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Checkboxes Permissions */}
              <h4 style={{ margin: '15px 0 10px 0', fontSize: '14px', color: '#334155' }}>Select Permissions:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> Can View Dashboard
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> Can Use Bulk & OCR
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permViewWorkers} onChange={e => setPermViewWorkers(e.target.checked)} /> Can View Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> Can Add Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permEditWorkers} onChange={e => setPermEditWorkers(e.target.checked)} /> Can Edit Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDeleteWorkers} onChange={e => setPermDeleteWorkers(e.target.checked)} /> Can Delete Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetView} onChange={e => setPermTimesheetView(e.target.checked)} /> Can View Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetEdit} onChange={e => setPermTimesheetEdit(e.target.checked)} /> Can Edit Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> Can View Payroll
                </label>
              </div>

              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save / Update Staff Access</button>
            </form>

            <h4 style={{ margin: '20px 0 10px 0' }}>Existing Staff Access List & Active Permissions</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Staff ID & Email</th>
                    <th style={{ padding: '10px' }}>Dept / Site Scope</th>
                    <th style={{ padding: '10px' }}>Assigned Permissions Summary</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsList.filter(p => !p.is_admin).map((p, idx) => {
                    const activePerms = [];
                    if (p.can_view_dashboard) activePerms.push('Dashboard');
                    if (p.can_use_bulk) activePerms.push('Bulk/OCR');
                    if (p.can_view_workers) activePerms.push('View Workers');
                    if (p.can_add_workers) activePerms.push('Add Worker');
                    if (p.can_edit_workers) activePerms.push('Edit Worker');
                    if (p.can_delete_workers) activePerms.push('Delete Worker');
                    if (p.can_view_timesheet) activePerms.push('View Timesheet');
                    if (p.can_edit_timesheet) activePerms.push('Edit Timesheet');
                    if (p.can_view_payroll) activePerms.push('Payroll');

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>
                          <strong>{p.staff_id || 'N/A'}</strong><br/>
                          <span style={{ color: '#0284c7' }}>{p.user_email}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          Dept: <strong>{p.assigned_department}</strong><br/>
                          Site: <strong>{p.assigned_site}</strong>
                        </td>
                        <td style={{ padding: '10px', maxWidth: '300px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {activePerms.map((ap, i) => (
                              <span key={i} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{ap}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => {
                              setTargetStaffId(p.staff_id || '');
                              setTargetEmail(p.user_email || '');
                              setTargetPassword(p.user_password || '');
                              setTargetDept(p.assigned_department || 'All');
                              setTargetSite(p.assigned_site || 'All');
                              setPermDashboard(p.can_view_dashboard ?? true);
                              setPermBulk(p.can_use_bulk ?? false);
                              setPermViewWorkers(p.can_view_workers ?? true);
                              setPermAddWorkers(p.can_add_workers ?? false);
                              setPermEditWorkers(p.can_edit_workers ?? false);
                              setPermDeleteWorkers(p.can_delete_workers ?? false);
                              setPermTimesheetView(p.can_view_timesheet ?? true);
                              setPermTimesheetEdit(p.can_edit_timesheet ?? true);
                              setPermPayroll(p.can_view_payroll ?? false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                            <button onClick={() => handleDeleteUserPermission(p.user_email)} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
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
      {/* ADMIN ONLY: DATE / MONTH / RANGE TIMESHEET CLEANUP */}
        {activeTab === 'data-cleanup' && userRole.is_admin && (
          <div style={{ background:'#fff', padding:24, borderRadius:16, border:'1px solid #fecaca', maxWidth:850, boxShadow:'0 8px 28px #991b1b0b' }}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}><div style={{fontSize:30}}>🗑️</div><div><h2 style={{margin:0,color:'#991b1b'}}>Delete Timesheet Records</h2><p style={{margin:'5px 0 0',color:'#64748b',fontSize:13}}>Sirf selected day, poora month, ya custom date range delete karein.</p></div></div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0'}}>
              {[['day','One Day'],['month','Full Month'],['range','Date Range']].map(([value,label])=><button key={value} onClick={()=>setCleanupMode(value)} style={{padding:'10px 15px',borderRadius:9,border:cleanupMode===value?'1px solid #b91c1c':'1px solid #cbd5e1',background:cleanupMode===value?'#fee2e2':'#fff',color:cleanupMode===value?'#991b1b':'#334155',fontWeight:800,cursor:'pointer'}}>{label}</button>)}
            </div>
            {cleanupMode==='day'&&<label style={{display:'block',fontWeight:700,marginBottom:15}}>Select exact date to delete <input type="date" value={cleanupSelectedDate} onChange={e=>setCleanupSelectedDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',maxWidth:330,boxSizing:'border-box'}}/></label>}
            {cleanupMode==='month'&&<label style={{display:'block',fontWeight:700,marginBottom:15}}>Select month <input type="month" value={cleanupMonth} onChange={e=>setCleanupMonth(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',maxWidth:330,boxSizing:'border-box'}}/></label>}
            {cleanupMode==='range'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:15}}><label style={{fontWeight:700}}>From date<input type="date" value={cleanupStartDate} onChange={e=>setCleanupStartDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',boxSizing:'border-box'}}/></label><label style={{fontWeight:700}}>To date<input type="date" value={cleanupEndDate} onChange={e=>setCleanupEndDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',boxSizing:'border-box'}}/></label></div>}
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',padding:13,borderRadius:10,color:'#9a3412',fontSize:13,margin:'12px 0 18px'}}><b>Important:</b> Selected date(s) bhi delete hon gi. {cleanupMode==='month'?'Selected month ke pehle se aakhri din tak tamam records delete honge.':cleanupMode==='range'?'From aur To dono dates include hain.':'Sirf isi date ki timesheet delete hogi.'} Delete hone ke baad restore nahi kar sakte.</div>
            <div style={{display:'grid',gap:12,marginBottom:20}}>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupAttendance} onChange={e=>setCleanupAttendance(e.target.checked)}/><span><b>Timesheet / Attendance</b> — status, normal OT, contract OT, site</span></label>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupDailyDetails} onChange={e=>setCleanupDailyDetails(e.target.checked)}/><span><b>Daily work details</b> — site remarks and daily work notes</span></label>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupAnnualLeaves} onChange={e=>setCleanupAnnualLeaves(e.target.checked)}/><span><b>Completed annual leave records</b> — records starting inside the selected date range; active “On Leave” records are excluded</span></label>
            </div>
            <button type="button" disabled={cleanupLoading} onClick={handleDeleteOldRecords} style={{padding:'12px 18px',background:cleanupLoading?'#9ca3af':'#b91c1c',color:'#fff',border:0,borderRadius:9,fontWeight:800,cursor:cleanupLoading?'wait':'pointer'}}>{cleanupLoading?'Deleting records…':'Permanently Delete Selected Records'}</button>
          </div>
        )}

     {/* TAB 10: ANNUAL LEAVES, PENALTIES & 12-MONTH DEDUCTION */}
        {activeTab === 'annualLeave' && userRole.is_admin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}>UAE Labor Law: Annual Leave & 12-Month Overstay Deductions</h2>
              <button onClick={() => {
                setTargetStaffId('');
                setLeaveWorkerId('');
                setLeaveStartDate('');
                setLeaveExpectedReturnDate('');
                setLeaveActualReturnDate('');
                setHasDeduction(true);
                setMonthlyDeductions({});
                setLeaveModalOpen(true);
              }} style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Record Annual Leave</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              <button onClick={() => setAnnualManagementView('annual')} style={{ padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', color: '#fff', background: annualManagementView === 'annual' ? '#047857' : '#64748b', fontWeight: 800 }}>1. Annual Leave</button>
              <button onClick={() => setAnnualManagementView('count')} style={{ padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', color: '#fff', background: annualManagementView === 'count' ? '#047857' : '#64748b', fontWeight: 800 }}>2. Leave Count Workers</button>
              <button onClick={() => setAnnualManagementView('final')} style={{ padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', color: '#fff', background: annualManagementView === 'final' ? '#047857' : '#64748b', fontWeight: 800 }}>3. Final Calculation</button>
            </div>

            {annualManagementView === 'annual' && <>
            {leaveModalOpen && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>{targetStaffId ? '✏️ Edit Leave & 12-Month Deduction' : 'Add Leave & Multi-Month Deduction Breakdown'}</h3>
                <form onSubmit={handleSaveAnnualLeave}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Worker</label>
                      <select value={leaveWorkerId} onChange={e => setLeaveWorkerId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required>
                        <option value="">Choose Worker...</option>
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>#{w.id} - {w.name} ({w.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Leave Start Date</label>
                      <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Expected Return Date</label>
                      <input type="date" value={leaveExpectedReturnDate} onChange={e => setLeaveExpectedReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Actual Return Date (Optional)</label>
                      <input type="date" value={leaveActualReturnDate} onChange={e => setLeaveActualReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                 
                  {/* Deduction Controls & 12-Month Breakdown Section */}
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <input type="checkbox" id="hasDeductionCheck" checked={hasDeduction} onChange={e => setHasDeduction(e.target.checked)} style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }} />
                      <label htmlFor="hasDeductionCheck" style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer' }}>Overstay Penalty / Deduction Applicable?</label>
                    </div>

                    {hasDeduction && (
                      <div>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
                          📅 Select Month-by-Month Deduction Days (Up to next 12 Months):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          {Array.from({ length: 12 }).map((_, i) => {
                            const d = new Date();
                            d.setMonth(d.getMonth() + i);
                            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });

                            return (
                              <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{monthName}</label>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  min="0"
                                  placeholder="Days (e.g. 5)" 
                                  value={monthlyDeductions[monthKey] || ''} 
                                  onChange={e => {
                                    setMonthlyDeductions({
                                      ...monthlyDeductions,
                                      [monthKey]: e.target.value
                                    });
                                  }} 
                                  style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          * Jis mahine mein jitne din deduct karne hain wahan enter karein.
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{targetStaffId ? 'Update Record' : 'Save Leave Record'}</button>
                    <button type="button" onClick={() => setLeaveModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Table View */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '12px' }}>Worker ID</th>
                    <th style={{ padding: '12px' }}>Leave Period</th>
                    <th style={{ padding: '12px' }}>Actual Return</th>
                    <th style={{ padding: '12px' }}>Deduction Breakdown / Total</th>
                    <th style={{ padding: '12px' }}>Accrued Leave Balance</th>
                    <th style={{ padding: '12px' }}>Leave Days Used</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    {userRole.is_admin && <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {annualLeaveList.length === 0 ? (
                    <tr><td colSpan={userRole.is_admin ? 8 : 7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No annual leave records found.</td></tr>
                  ) : (
                    annualLeaveList.map((leave, idx) => {
                      

let accruedDays = 0;

const today = new Date();
today.setHours(0, 0, 0, 0);

const startDate = leave.start_date
  ? new Date(leave.start_date + 'T00:00:00')
  : null;

const actualReturnDate =
  leave.actual_return && leave.actual_return !== 'On Leave'
    ? new Date(leave.actual_return + 'T00:00:00')
    : null;

let leaveDaysUsed = 0;

if (startDate) {
  const endDate = actualReturnDate || today;
  const diffDays = Math.floor(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  );
  leaveDaysUsed = Math.max(0, diffDays + 1);
}

// Is worker ke tamam leave records date ke hisaab se
// arrange karke balance calculate karein.
const workerLeaves = annualLeaveList
  .filter(
    item => String(item.worker_id) === String(leave.worker_id)
  )
  .slice()
  .sort((a, b) =>
    String(a.start_date || '').localeCompare(
      String(b.start_date || '')
    )
  );

let balance = 0;
let lastReturn = null;
let firstReturnFound = false;

for (const item of workerLeaves) {
  const s = item.start_date
    ? new Date(item.start_date + 'T00:00:00')
    : null;

  const r =
    item.actual_return && item.actual_return !== 'On Leave'
      ? new Date(item.actual_return + 'T00:00:00')
      : null;

  if (!s) continue;

  // Pehli recorded Actual Return Date se earning shuru.
  if (!firstReturnFound) {
    if (r) {
      lastReturn = r;
      firstReturnFound = true;
    }
    continue;
  }

  // Wapsi se agli annual leave tak 2.5 din per month.
  if (lastReturn) {
    const daysBetween = Math.max(
      0,
      Math.floor((s - lastReturn) / (1000 * 60 * 60 * 24))
    );

    balance += daysBetween * (30 / 365);
  }

  // Guzari hui annual leave balance se minus.
  const end = r || today;
  const usedDays = Math.max(
    0,
    Math.floor((end - s) / (1000 * 60 * 60 * 24)) + 1
  );

  balance -= usedDays;

  if (r) {
    lastReturn = r;
  } else {
    // Worker abhi leave par hai; earning ruki rahegi.
    lastReturn = null;
    break;
  }
}

// Agar worker wapas aa chuka hai, to aaj tak earning jorein.
if (lastReturn) {
  const daysSinceReturn = Math.max(
    0,
    Math.floor((today - lastReturn) / (1000 * 60 * 60 * 24))
  );

  balance += daysSinceReturn * (30 / 365);
}

accruedDays = balance.toFixed(1);
                      return (
                        <tr key={leave.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px' }}>#{leave.worker_id}</td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            <div><strong>Start:</strong> {leave.start_date}</div>
                            <div><strong>Expected:</strong> {leave.expected_return}</div>
                          </td>
                          <td style={{ padding: '12px' }}>{leave.actual_return}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: Number(leave.deduction_days) > 0 ? 'bold' : 'normal', color: Number(leave.deduction_days) > 0 ? '#dc2626' : 'inherit' }}>
                              Total: {leave.deduction_days} Days
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                              {leave.deduction_breakdown || 'No Breakdown'}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {leave.actual_return && leave.actual_return !== 'On Leave' ? (
                              <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', fontSize: '12px' }}>
                                🟢 {accruedDays} Days Accumulated
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Pending Return</span>
                            )}
                          </td>
                          
<td style={{ padding: '12px' }}>
  <span style={{
    padding: '4px 8px',
    borderRadius: '4px',
    background: '#fff7ed',
    color: '#c2410c',
    fontWeight: 'bold',
    fontSize: '12px'
  }}>
    {leaveDaysUsed} Days
  </span>
</td>
                          <td style={{ padding: '12px' }}>
                            {(() => {
                              const todayText = new Date().toISOString().slice(0, 10);
                              const displayStatus = leave.actual_return && leave.actual_return !== 'On Leave' ? 'Returned' : (leave.start_date && leave.start_date > todayText ? 'Upcoming' : 'On Leave');
                              const statusStyle = displayStatus === 'Returned' ? { background: '#dcfce7', color: '#166534' } : displayStatus === 'Upcoming' ? { background: '#dbeafe', color: '#1d4ed8' } : { background: '#bbf7d0', color: '#166534' };
                              return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, ...statusStyle }}>{displayStatus}</span>;
                            })()}
                          </td>
                          {userRole.is_admin && (
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button onClick={() => {
                                  setTargetStaffId(leave.id);
                                  setLeaveWorkerId(leave.worker_id);
                                  setLeaveStartDate(leave.start_date);
                                  setLeaveExpectedReturnDate(leave.expected_return);
                                  setLeaveActualReturnDate(leave.actual_return === 'On Leave' ? '' : leave.actual_return);
                                  setHasDeduction(leave.has_deduction ?? true);
                                  setMonthlyDeductions({});
                                  setLeaveModalOpen(true);
                                }} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                                <button onClick={async () => {
                                  if (confirm('Kya aap waqai is leave record ko delete karna chahte hain?')) {
                                    const { error } = await supabase.from('annual_leaves').delete().eq('id', leave.id);
                                    if (error) {
                                      alert('Error deleting record: ' + error.message);
                                    } else {
                                      setAnnualLeaveList(annualLeaveList.filter(l => l.id !== leave.id));
                                      alert('Record delete ho gaya!');
                                      fetchAnnualLeaves();
                                    }
                                  }
                                }} style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </>}

            {annualManagementView === 'count' && <div style={{ display: 'grid', gap: 18 }}>
              <section style={{ background: '#fff', padding: 18, border: '1px solid #cbd5e1', borderRadius: 10, overflowX: 'auto' }}>
                <h3 style={{ marginTop: 0 }}>Leave Count — All Workers</h3>
                <p style={{ color: '#475569', fontSize: 13 }}>Calculation: 30 days per year (2.5 days per month). Leave salary receive hone ki last date se balance zero samjha jayega; us ke baad nayi leave accrual shuru hoti hai. Har worker ki joining date pehle save karein.</p>
                <table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Joining Date</th><th style={thStyle}>Last Leave Salary Date</th><th style={thStyle}>Earned Days</th><th style={thStyle}>Leave Used</th><th style={thStyle}>Available Balance</th></tr></thead><tbody>
                  {workers.map(w => {
                    const emp = employmentRecords.find(r => String(r.worker_id) === String(w.id)) || {};
                    const salaryRecords = leaveSalaryRecords.filter(r => String(r.worker_id) === String(w.id)).sort((a,b) => String(b.leave_salary_last_date || '').localeCompare(String(a.leave_salary_last_date || '')));
                    const latestSalaryRecord = salaryRecords[0];
                    const joinDate = emp.joining_date || w.joining_date || w.start_date || (w.created_at ? String(w.created_at).slice(0,10) : '');
                    const accrualStart = latestSalaryRecord?.leave_salary_last_date || joinDate;
                    const todayString = new Date().toISOString().slice(0,10);
                    const accrued = accrualStart && accrualStart <= todayString ? Math.max(0, ((new Date(todayString + 'T00:00:00') - new Date(accrualStart + 'T00:00:00')) / 86400000) * (30 / 365)) : 0;
                    const used = annualLeaveList.filter(l => String(l.worker_id) === String(w.id) && l.start_date && l.start_date >= (accrualStart || '9999-12-31') && l.start_date <= todayString).reduce((sum,l) => { const end = l.actual_return && l.actual_return !== 'On Leave' ? l.actual_return : todayString; return sum + Math.max(0, Math.floor((new Date(end + 'T00:00:00') - new Date(l.start_date + 'T00:00:00')) / 86400000) + 1); }, 0);
                    const balance = latestSalaryRecord ? Math.max(0, accrued - used) : Math.max(0, accrued - used);
                    const edit = employmentEdit[String(w.id)] || { joining_date: joinDate, cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || w.basic_salary || '' };
                    return <tr key={w.id}><td style={tdStyle}><b>#{w.worker_id || w.id} — {w.name}</b><div style={{ color: '#64748b', fontSize: 12 }}>{w.department} / {w.designation}</div></td><td style={tdStyle}><input type="date" value={edit.joining_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, joining_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 145, padding: 7 }} /><button onClick={() => saveEmploymentRecord(w.id)} style={{ marginTop: 5, padding: '5px 8px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save Date</button></td><td style={tdStyle}>{latestSalaryRecord?.leave_salary_last_date || 'Never recorded'}</td><td style={tdStyle}>{accrued.toFixed(1)} days</td><td style={tdStyle}>{used.toFixed(1)} days</td><td style={tdStyle}><b style={{ color: '#15803d', background: '#dcfce7', padding: '5px 8px', borderRadius: 6 }}>{balance.toFixed(1)} days</b></td></tr>;
                  })}
                </tbody></table>
              </section>
              <section style={{ background: '#f8fafc', padding: 18, border: '1px solid #cbd5e1', borderRadius: 10 }}>
                <h3 style={{ marginTop: 0 }}>Leave Salary Received — Reset Leave Balance</h3>
                <p style={{ fontSize: 13, color: '#475569' }}>Yahan salary ki woh last date dalein jis tak leave salary pay hui. Is record ke baad earned leave dobara us date se calculate hogi.</p>
                <form onSubmit={saveLeaveSalaryReceived} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, alignItems: 'end' }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Worker<select value={leaveSalaryWorkerId} onChange={e => setLeaveSalaryWorkerId(e.target.value)} required style={fieldStyle}><option value="">Choose worker</option>{workers.map(w => <option key={w.id} value={w.id}>#{w.worker_id || w.id} — {w.name}</option>)}</select></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Leave salary paid up to<input type="date" value={leaveSalaryLastDate} onChange={e => setLeaveSalaryLastDate(e.target.value)} required style={fieldStyle} /></label>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Amount (AED, optional)<input type="number" min="0" step="0.01" value={leaveSalaryAmount} onChange={e => setLeaveSalaryAmount(e.target.value)} style={fieldStyle} /></label>
                  <button type="submit" style={{ ...primaryStyle, background: '#047857' }}>Leave Salary Received</button>
                </form>
                <div style={{ marginTop: 14, overflowX: 'auto' }}><table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Paid Up To</th><th style={thStyle}>Amount</th><th style={thStyle}>Recorded</th></tr></thead><tbody>{leaveSalaryRecords.map(r => <tr key={r.id}><td style={tdStyle}>{workers.find(w => String(w.id) === String(r.worker_id))?.name || `Worker #${r.worker_id}`}</td><td style={tdStyle}>{r.leave_salary_last_date}</td><td style={tdStyle}>{Number(r.amount || 0).toFixed(2)} AED</td><td style={tdStyle}>{r.received_at ? String(r.received_at).slice(0,10) : ''}</td></tr>)}{!leaveSalaryRecords.length && <tr><td colSpan="4" style={tdStyle}>No leave salary records yet.</td></tr>}</tbody></table></div>
              </section>
            </div>}

            {annualManagementView === 'final' && <div style={{ background: '#fff', padding: 18, border: '1px solid #cbd5e1', borderRadius: 10, overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>Final Calculation — UAE Private-Sector Gratuity Estimate</h3>
              <p style={{ color: '#475569', fontSize: 13 }}>Estimate basic salary par hota hai, total salary par zaroori nahi. App mein joining date, cancellation/last working date aur basic salary save karein. General full-time formula: 1 saal se kam service par gratuity nahi; pehle 5 saal ke liye har saal 21 din basic wage, 5 saal ke baad har additional saal 30 din, aur total cap 2 saal ki basic wage. Final payment se pehle HR/UAE labour guidance se verify karein.</p>
              <table style={tableStyle}><thead><tr><th style={thStyle}>Worker</th><th style={thStyle}>Joining Date</th><th style={thStyle}>Cancellation / Last Date</th><th style={thStyle}>Basic Salary AED</th><th style={thStyle}>Service</th><th style={thStyle}>Gratuity Days</th><th style={thStyle}>Estimated Gratuity AED</th><th style={thStyle}>Save</th></tr></thead><tbody>
                {workers.map(w => {
                  const emp = employmentRecords.find(r => String(r.worker_id) === String(w.id)) || {};
                  const edit = employmentEdit[String(w.id)] || { joining_date: emp.joining_date || w.joining_date || w.start_date || (w.created_at ? String(w.created_at).slice(0,10) : ''), cancellation_date: emp.cancellation_date || '', basic_salary: emp.basic_salary || w.basic_salary || '' };
                  const endDate = edit.cancellation_date || finalCalcDate;
                  const start = edit.joining_date ? new Date(edit.joining_date + 'T00:00:00') : null;
                  const end = endDate ? new Date(endDate + 'T00:00:00') : null;
                  const serviceDays = start && end && end >= start ? Math.floor((end - start) / 86400000) : 0;
                  const serviceYears = serviceDays / 365;
                  const basic = Math.max(0, Number(edit.basic_salary || 0));
                  const gratuityDays = serviceYears < 1 ? 0 : Math.min(730, Math.max(0, Math.min(serviceYears, 5) * 21 + Math.max(0, serviceYears - 5) * 30));
                  const gratuityAmount = Math.min(basic * 2, (basic / 30) * gratuityDays);
                  return <tr key={w.id}><td style={tdStyle}><b>#{w.worker_id || w.id} — {w.name}</b></td><td style={tdStyle}><input type="date" value={edit.joining_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, joining_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 140, padding: 7 }} /></td><td style={tdStyle}><input type="date" value={edit.cancellation_date || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, cancellation_date: e.target.value } }))} style={{ ...fieldStyle, minWidth: 140, padding: 7 }} /><div style={{ fontSize: 11, color: '#64748b' }}>Blank = current date</div></td><td style={tdStyle}><input type="number" min="0" step="0.01" value={edit.basic_salary || ''} onChange={e => setEmploymentEdit(prev => ({ ...prev, [String(w.id)]: { ...edit, basic_salary: e.target.value } }))} style={{ ...fieldStyle, minWidth: 110, padding: 7 }} /></td><td style={tdStyle}>{(serviceDays / 365).toFixed(2)} years</td><td style={tdStyle}>{gratuityDays.toFixed(1)}</td><td style={tdStyle}><b>{gratuityAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</b></td><td style={tdStyle}><button onClick={() => saveEmploymentRecord(w.id)} style={{ padding: '7px 10px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>Save</button></td></tr>;
                })}
              </tbody></table>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 12 }}>Current calculation date: {finalCalcDate}. <label>Calculation date <input type="date" value={finalCalcDate} onChange={e => setFinalCalcDate(e.target.value)} style={{ ...fieldStyle, width: 180, display: 'inline-block' }} /></label></p>
            </div>}
          </div>
        )}
        {/* 📊 MONTHLY TIMESHEET MODAL WITH SEARCH, DEPT FILTER & VIEW/PRINT OPTIONS */}
{showMonthlyTimesheetModal && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '1050px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📊 Monthly Timesheet & Worker Report</h2>
        <button 
          onClick={() => setShowMonthlyTimesheetModal(false)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✕ Close
        </button>
      </div>     
<style>{`
  @media print {
    .monthly-timesheet-filters {
      display: none !important;
    }

    .monthly-timesheet-actions {
      display: none !important;
    }
  }
`}</style>

      {/* Filters: Search, Department, Month, Year */}
    <div className="monthly-timesheet-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Search by ID or Name */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Search Worker (ID / Name)</label>
            <input 
              type="text" 
              placeholder="e.g. 101 or John..." 
              value={timesheetSearchQuery} 
              onChange={e => setTimesheetSearchQuery(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '180px' }}
            />
          </div>

          {/* Department Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Filter Department</label>
            <select 
              value={selectedDeptFilter || 'All'} 
              onChange={e => setSelectedDeptFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '150px' }}
            >
              <option value="All">All Departments</option>
              {departmentsList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Month</label>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Year</label>
            <input 
              type="number" 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '90px' }} 
            />
          </div>
        </div>

        <button 
          onClick={() => window.print()} 
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          🖨️ Print Full Report
        </button>
      </div>

      {/* Filtered & Searched Workers List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '10px' }}>Worker ID & Name</th>
              <th style={{ padding: '10px' }}>Department</th>
              <th style={{ padding: '10px' }}>Working Site</th>
              <th className="monthly-timesheet-actions" style={{ padding: '10px', textAlign: 'center' }}>Actions (View / Print / PDF)</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers
              .filter(w => {
                const matchesDept = selectedDeptFilter === 'All' || !selectedDeptFilter || w.department === selectedDeptFilter;
                const matchesSearch = !timesheetSearchQuery || 
                  String(w.id).toLowerCase().includes(timesheetSearchQuery.toLowerCase()) || 
                  w.name.toLowerCase().includes(timesheetSearchQuery.toLowerCase());
                return matchesDept && matchesSearch;
              })
              .map(w => (
              <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
                <td style={{ padding: '10px' }}>{w.department}</td>
                <td style={{ padding: '10px' }}>{w.work_site || sitesList[0]}</td>
                <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  
                  {/* View Timesheet Button */}
                  <button 
                    onClick={() => setViewingWorkerTimesheet(w)} 
                    style={{ padding: '6px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    👁️ View Timesheet
                  </button>

                  {/* Print / PDF Button */}
                  <button 
                    onClick={() => handlePrintWorkerMonthlyReport(w)} 
                    style={{ padding: '6px 10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    📄 Print / PDF
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
)}
      {/* 👁 SINGLE WORKER TIMESHEET PREVIEW MODAL */}
{viewingWorkerTimesheet && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: 'bold' }}>📄 Monthly Timesheet Details</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Worker: <b>#{viewingWorkerTimesheet.id} - {viewingWorkerTimesheet.name}</b> | Dept: {viewingWorkerTimesheet.department} | Month: {selectedMonth + 1} / {selectedYear}
          </p>
        </div>
        <button 
          onClick={() => setViewingWorkerTimesheet(null)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✕ Close View
        </button>
      </div>

      {/* Worker Basic Info Card */}
      <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '13px' }}>
          <div><b>Designation:</b> {viewingWorkerTimesheet.designation || 'Worker'}</div>
          <div><b>Working Site:</b> {viewingWorkerTimesheet.work_site || 'N/A'}</div>
          <div><b>Monthly Salary:</b> {viewingWorkerTimesheet.monthly_salary || 'N/A'} {viewingWorkerTimesheet.currency || 'AED'}</div>
        </div>
      </div>

      {/* Timesheet Table Preview using real attendance data */}
      <div style={{ marginBottom: '20px', maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Date</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Status</th>
             <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Normal OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Contract OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Total OT</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Site</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
        const workerAttendance = attendance.filter(
  a =>
    String(a.worker_id) ===
    String(viewingWorkerTimesheet.id)
);

const monthlyRows = workerAttendance.map(att => {
  const annualLeave = getAnnualLeaveForWorker(
    viewingWorkerTimesheet.id,
    String(att.date).slice(0, 10)
  );

  return {
    ...att,
    status: annualLeave ? 'Annual Leave' : att.status,
    overtime_hours: annualLeave ? 0 : (att.overtime_hours || 0)
  };
});

return monthlyRows.map((att, idx) => {
  const rowStatus = String(att.status || '').trim().toLowerCase();

  let rowBg = '#ffffff';
  let statusBg = '#dcfce7';
  let statusColor = '#166534';

  if (rowStatus === 'annual leave') {
    rowBg = '#fef3c7';
    statusBg = '#fef3c7';
    statusColor = '#92400e';
  } else if (rowStatus === 'absent') {
    rowBg = '#fee2e2';
    statusBg = '#fee2e2';
    statusColor = '#991b1b';
  } else if (rowStatus === 'sick leave' || rowStatus === 'other leave') {
    rowBg = '#ffedd5';
    statusBg = '#ffedd5';
    statusColor = '#9a3412';
  } else if (rowStatus === 'present') {
    rowBg = '#dcfce7';
    statusBg = '#dcfce7';
    statusColor = '#166534';
  }

  return (
    <tr
      key={idx}
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: rowBg
      }}
    >
      <td style={{ padding: '8px 10px', fontWeight: '500' }}>
        {att.date}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: statusBg,
            color: statusColor,
            fontWeight: 'bold'
          }}
        >
          {att.status}
        </span>
      </td>
     <td style={{ padding: '8px 10px', color: '#475569' }}>
  {Number(att.overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', color: '#7c3aed' }}>
  {Number(att.contract_overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', fontWeight: 'bold' }}>
  {(Number(att.overtime_hours) || 0) +
   (Number(att.contract_overtime_hours) || 0)} Hours
</td>
      <td style={{ padding: '8px 10px', color: '#64748b' }}>
        {att.work_site || viewingWorkerTimesheet.work_site || 'N/A'}
      </td>
    </tr>
  );
});
            })()}
          </tbody>
        </table>
      </div>

      {/* Action Buttons inside View Modal */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button 
          onClick={() => handlePrintWorkerMonthlyReport(viewingWorkerTimesheet)}
          style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          🖨️ Print / Download PDF
        </button>
        <button 
          onClick={() => setViewingWorkerTimesheet(null)}
          style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          Close
        </button>
      </div>

    </div>
  </div>
)}
      </main>
     
{/* Footer */}
<div
  style={{
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
    padding: '12px',
    marginTop: '20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 'bold',
    borderTop: '1px solid #cbd5e1'
  }}
>
</div>
    </div>
  );
}
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
  // Select which system to open before entering either workspace.
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
 // Monthly Timesheet Modal & Date Selection States
  const [showMonthlyTimesheetModal, setShowMonthlyTimesheetModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0 = Jan, 11 = Dec
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // e.g. 2026
  const [timesheetSearchQuery, setTimesheetSearchQuery] = useState(''); // 
  const [viewingWorkerTimesheet, setViewingWorkerTimesheet] = useState(null);
  // Annual Leave Tracking & Penalty States
  const [annualLeaveList, setAnnualLeaveList] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  
  // Manual & Custom Deduction States
  const [hasDeduction, setHasDeduction] = useState(true);
  const [manualDeductionDays, setManualDeductionDays] = useState('');
  const [deductionBreakdownText, setDeductionBreakdownText] = useState('');
  const [leaveWorkerId, setLeaveWorkerId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveExpectedReturnDate, setLeaveExpectedReturnDate] = useState('');
  const [leaveActualReturnDate, setLeaveActualReturnDate] = useState('');
  const [penaltyPerMonthDays, setPenaltyPerMonthDays] = useState(5);
  
  // 12 Months dynamic deduction days state
  const [monthlyDeductions, setMonthlyDeductions] = useState({});
  
  // Password and administrator login settings
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

  // Data States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [sitesList, setSitesList] = useState(['Sharjah Mamzar', 'Ajman Aaliya', 'Dubai Downtown']);
  const [departmentsList, setDepartmentsList] = useState(['Plumbing', 'Electrical', 'Civil', 'Mustafa']);

  // Edit / Add Worker Form States
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Plumbing');
  const [workSite, setWorkSite] = useState('Sharjah Mamzar');
  const [designation, setDesignation] = useState('Plumber');
  const [designationsList, setDesignationsList] = useState([
  'Carpenter',
  'Carpenter Helper',
  'Steel Fixer',
  'Steel Fixer Helper',
  'Plumber',
  'Mason',
  'Electrician',
  'Painter',
  'Helper',
  'Foreman',
  'Driver',
  'Office Boy',
  'Timekeeper'
]);
const [newDesignation, setNewDesignation] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [religion, setReligion] = useState('Muslim');
  
  const [lastReturnDate, setLastReturnDate] = useState('');
  const [annualLeaveRate, setAnnualLeaveRate] = useState('30');
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState('0');

  // File Upload URL States
  const [passportFileUrl, setPassportFileUrl] = useState('');
  const [idCardFileUrl, setIdCardFileUrl] = useState('');
  const [medicalCardFileUrl, setMedicalCardFileUrl] = useState('');
  const [visaFileUrl, setVisaFileUrl] = useState('');
  const [labourCardFileUrl, setLabourCardFileUrl] = useState('');

  // Personal Docs & New Site/Dept Form
  const [personalDocTitle, setPersonalDocTitle] = useState('');
  const [personalDocCategory, setPersonalDocCategory] = useState('Visa');
  const [personalFileUrl, setPersonalFileUrl] = useState('');
  const [newSiteInput, setNewSiteInput] = useState('');
  const [newDeptInput, setNewDeptInput] = useState('');

  // OCR Photo Scanner States
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Permission Creation States & Staff ID Input
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

  // Date and Bulk States with Designation
  const today = new Date().toISOString().split('T')[0];
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState(today);
  const [bulkDepartment, setBulkDepartment] = useState('Plumbing');
  const [bulkDesignation, setBulkDesignation] = useState('All');
  const [bulkSite, setBulkSite] = useState('Sharjah Mamzar');
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkOT, setBulkOT] = useState('5');
  const [bulkContractOT, setBulkContractOT] = useState('0');
  const [bulkWorkDetails, setBulkWorkDetails] = useState('');
  
  // Quick Attendance States
  const [quickWorkerId, setQuickWorkerId] = useState('');
  const [quickSite, setQuickSite] = useState('Sharjah Mamzar');
  const [quickOTType, setQuickOTType] = useState('Normal OT');
  const [quickHours, setQuickHours] = useState('2');
  const [quickSaving, setQuickSaving] = useState(false);
  const [siteAttendanceIds, setSiteAttendanceIds] = useState('');
  const [siteAttendanceSite, setSiteAttendanceSite] = useState('Sharjah Mamzar');
  const [siteAttendanceSaving, setSiteAttendanceSaving] = useState(false);
  
  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [timesheetSiteInputs, setTimesheetSiteInputs] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
 const [dailyTimesheetSite, setDailyTimesheetSite] = useState('All Workers');
const [savedDailyWorkDetails, setSavedDailyWorkDetails] = useState('');
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
      alert('Business tables load nahi huay. Supabase SQL setup chalayein. Detail: ' + (e?.message || e));
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
    const payload = { business_type: businessType, transaction_date: businessDate, transaction_kind: businessTxnKind, category: businessTxnCategory.trim() || (businessTxnKind === 'income' ? 'Income' : 'Expense'), description: businessTxnDescription.trim(), amount, payment_mode: businessTxnPaymentMode, created_by: session?.user?.email || '' };
    const { error } = await supabase.from('business_transactions').insert([payload]);
    if (error) return alert('Entry save nahi hui: ' + error.message);
    setBusinessTxnAmount(''); setBusinessTxnDescription('');
    await fetchBusinessData();
    alert('Business entry save ho gayi.');
  }

  async function handleAddBusinessWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Workers add karne ki permission sirf admin ko hai.');
    if (!businessWorkerName.trim()) return alert('Worker ka naam likhein.');
    const payload = { business_type: businessType, worker_name: businessWorkerName.trim(), job_title: businessWorkerJob.trim() || (businessType === 'transport' ? 'Driver' : 'Farm Worker'), phone: businessWorkerPhone.trim(), monthly_salary: Number(businessWorkerSalary) || 0, active: true };
    const { error } = await supabase.from('business_workers').insert([payload]);
    if (error) return alert('Worker save nahi hua: ' + error.message);
    setBusinessWorkerName(''); setBusinessWorkerPhone(''); setBusinessWorkerSalary('');
    await fetchBusinessData(); alert('Worker add ho gaya.');
  }

  async function handlePayBusinessSalary(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Salary payments sirf admin record kar sakta hai.');
    const worker = businessWorkers.find(w => String(w.id) === String(businessSalaryWorkerId));
    const amount = Number(businessSalaryAmount);
    if (!worker || !businessSalaryDate || !Number.isFinite(amount) || amount <= 0) return alert('Worker, date aur salary amount sahi select karein.');
    const { error } = await supabase.from('business_salary_payments').insert([{ business_type: businessType, worker_id: worker.id, payment_date: businessSalaryDate, amount, payment_mode: businessSalaryPaymentMode, notes: 'Monthly salary payment' }]);
    if (error) return alert('Salary payment save nahi hui: ' + error.message);
    setBusinessSalaryAmount(''); await fetchBusinessData(); alert('Salary payment save ho gayi.');
  }

  async function handleDeleteBusinessTransaction(id) {
    if (!userRole.is_admin) return alert('Sirf admin delete kar sakta hai.');
    if (!window.confirm('Kya aap is financial entry ko permanently delete karna chahte hain?')) return;
    const { error } = await supabase.from('business_transactions').delete().eq('id', id).eq('business_type', businessType);
    if (error) return alert('Delete error: ' + error.message);
    await fetchBusinessData();
  }

  useEffect(() => {
    async function loadDailyWorkDetails() {
      if (!selectedTimesheetDate || !dailyTimesheetSite) {
        setSavedDailyWorkDetails('');
        return;
      }

      let query = supabase
        .from('daily_work_details')
        .select('work_site,work_details')
        .eq('work_date', selectedTimesheetDate);

      if (dailyTimesheetSite !== 'All Workers' && dailyTimesheetSite !== 'All') {
        query = query.eq('work_site', dailyTimesheetSite);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Daily Work Details load error:', error.message);
        setSavedDailyWorkDetails('');
        return;
      }

      if (dailyTimesheetSite === 'All Workers' || dailyTimesheetSite === 'All') {
        const combined = (data || [])
          .filter(item => item.work_details)
          .map(item => `${item.work_site || 'Site'}: ${item.work_details}`)
          .join('\n');
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

  // Security: do not restore a logged-in session from localStorage; login is required on every fresh app load.

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
    const { data, error } = await supabase.from('annual_leaves').select('*').order('id', { ascending: false });
    if (error) {
      console.error('Error fetching annual leaves:', error.message);
    } else if (data) {
      setAnnualLeaveList(data);
    }
  }
    // Check whether a worker is on annual leave on a selected date
function getAnnualLeaveForWorker(workerId, date) {
    if (!workerId || !date) return null;

    const leaveRecord = annualLeaveList.find(leave => {
      const sameWorker =
        String(leave.worker_id) === String(workerId);

      const startDate = leave.start_date;
      const actualReturn = leave.actual_return;

      const hasStarted =
        startDate && date >= startDate;

      // Leave remains active until actual return is recorded
      const hasNotActuallyReturned =
        !actualReturn ||
        actualReturn === 'On Leave' ||
        date < actualReturn;

      return (
        sameWorker &&
        hasStarted &&
        hasNotActuallyReturned
      );
    });

    return leaveRecord || null;
  }

async function fetchDesignations() {
  const { data, error } = await supabase
    .from('designations')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching designations:', error.message);
    return;
  }

  if (data) {
    const savedNames = data.map(item => item.name);

    setDesignationsList(prev => [
      ...new Set([...prev, ...savedNames])
    ]);
  }
}


 async function handleSaveAnnualLeave(e) {
    e.preventDefault();
     if (!userRole.is_admin) return alert('Sirf admin annual leave records manage kar sakta hai.');
    if (!leaveWorkerId || !leaveStartDate || !leaveExpectedReturnDate) {
      return alert('Mukammal details enter karein!');
    }

    let finalDeductionDays = 0;
    let breakdownSummary = 'No Deduction';

    if (hasDeduction) {
      let breakdownArr = [];
      for (const [monthKey, days] of Object.entries(monthlyDeductions)) {
        const d = Number(days) || 0;
        if (d > 0) {
          finalDeductionDays += d;
          breakdownArr.push(`${monthKey}: ${d} days`);
        }
      }
      if (breakdownArr.length > 0) {
        breakdownSummary = breakdownArr.join(', ');
      }
    }

    const leaveData = {
      worker_id: leaveWorkerId,
      start_date: leaveStartDate,
      expected_return: leaveExpectedReturnDate,
      actual_return: leaveActualReturnDate || 'On Leave',
      has_deduction: hasDeduction,
      deduction_breakdown: breakdownSummary,
      deduction_days: finalDeductionDays.toFixed(1),
      status: leaveActualReturnDate ? 'Returned' : 'On Leave'
    };

    let error;
    if (targetStaffId) {
      const res = await supabase.from('annual_leaves').update(leaveData).eq('id', targetStaffId);
      error = res.error;
    } else {
      const res = await supabase.from('annual_leaves').insert([leaveData]);
      error = res.error;
    }

    if (error) {
      alert('Error saving leave record: ' + error.message);
    } else {
      alert('Leave record successfully save ho gaya!');
      setLeaveModalOpen(false);
      setTargetStaffId('');
      setMonthlyDeductions({});
      fetchAnnualLeaves();
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
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Attendance load error:', error.message);
    alert('Attendance load nahi hui: ' + error.message);
    return;
  }

  setAttendance(data || []);

  // Dashboard aur Timesheet ke liye date-wise attendance state
  const dateMap = {};

  (data || []).forEach(record => {
    if (!dateMap[record.date]) {
      dateMap[record.date] = {};
    }

    dateMap[record.date][record.worker_id] = {
      status: record.status,
      ot: Number(record.overtime_hours) || 0,
      contract_ot: Number(record.contract_overtime_hours) || 0,
      contract_overtime_hours: Number(record.contract_overtime_hours) || 0,
      site: record.work_site || '',
      work_site: record.work_site || ''
    };
  });

  setAttendanceData(dateMap);
}
  async function handleUpdateExtension(workerId, newExtensionDays) {
    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Permission denied!');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Worker aapke assigned scope mein nahi hai.');
    const { error } = await supabase
      .from('workers')
      .update({ extension_days: parseInt(newExtensionDays) || 0 })
      .eq('id', workerId);
    
    if (error) {
      alert('Error updating extension: ' + error.message);
    } else {
      fetchWorkers();
    }
  }

  async function handleMarkReturned(workerId) {
    if (!userRole.is_admin && !userRole.can_edit_workers) return alert('Permission denied!');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Worker aapke assigned scope mein nahi hai.');
    const todayDate = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('workers')
      .update({ 
        on_leave: false, 
        actual_return_date: todayDate,
        extension_days: 0,
        late_days: 0 
      })
      .eq('id', workerId);
    
    if (error) {
      alert('Error updating return status: ' + error.message);
    } else {
      fetchWorkers();
      alert('Worker marked as returned successfully!');
    }
  }

  async function handleDeleteUserPermission(emailToDelete) {
    if (!userRole.is_admin) return;
    if (window.confirm(`Delete access for ${emailToDelete}?`)) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_email', emailToDelete);
      if (error) alert('Error: ' + error.message);
      else fetchPermissionsList();
    }
  }
  
  function handleDeleteSite(siteToDelete) {
    if (!userRole.is_admin) return alert('Access Denied!');
    if (sitesList.length <= 1) {
      return alert('Kam az kam ek working site honi lazmi hai!');
    }
    if (window.confirm(`Kya aap waqai '${siteToDelete}' site delete karna chahte hain?`)) {
      const updatedSites = sitesList.filter(site => site !== siteToDelete);
      setSitesList(updatedSites);
      
      if (selectedSiteFilter === siteToDelete) setSelectedSiteFilter('All');
      if (workSite === siteToDelete) setWorkSite(updatedSites[0]);
      
      alert(`Site '${siteToDelete}' successfully delete ho gayi!`);
    }
  }

  async function handleAddNewSite(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!newSiteInput.trim()) return alert('Site name enter karein!');
    if (sitesList.includes(newSiteInput.trim())) return alert('Yeh site pehle se mojood hai!');

    setSitesList([...sitesList, newSiteInput.trim()]);
    alert(`New working site '${newSiteInput.trim()}' added successfully!`);
    setNewSiteInput('');
  }

  async function handleAddNewDepartment(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Access Denied!');
    if (!newDeptInput.trim()) return alert('Department name enter karein!');
    if (departmentsList.includes(newDeptInput.trim())) return alert('Yeh department pehle se mojood hai!');

    setDepartmentsList([...departmentsList, newDeptInput.trim()]);
    alert(`New department '${newDeptInput.trim()}' added successfully!`);
    setNewDeptInput('');
  }
  function handleDeleteDepartment(deptToDelete) {
    if (!userRole.is_admin) return alert('Access Denied!');
    if (departmentsList.length <= 1) {
      return alert('Kam az kam ek department hona lazmi hai!');
    }
    if (window.confirm(`Kya aap waqai '${deptToDelete}' department delete karna chahte hain?`)) {
      const updatedDepts = departmentsList.filter(dept => dept !== deptToDelete);
      setDepartmentsList(updatedDepts);
      
      if (selectedDeptFilter === deptToDelete) setSelectedDeptFilter('All');
      if (department === deptToDelete) setDepartment(updatedDepts[0]);
      
      alert(`Department '${deptToDelete}' successfully delete ho gaya!`);
    }
  }

  async function handleChangePasswordSubmit(e) {
    e.preventDefault();

    if (!session?.user?.email) return alert('Please login again.');
    if (!currentPassInput.trim()) return alert('Current password enter karein.');

    const currentEmail = session.user.email.trim().toLowerCase();
    const { data: account, error: accountError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_email', currentEmail)
      .maybeSingle();

    if (accountError) return alert('Account check error: ' + accountError.message);
    if (!account || String(account.user_password) !== currentPassInput.trim()) {
      return alert('Current password ghalat hai.');
    }

    const isAdminAccount = userRole.is_admin && (account.is_admin === true || account.is_admin === 'true');
    if (userRole.is_admin && !isAdminAccount) {
      return alert('Admin account database mein verify nahi hua. Default admin credentials ko pehle database mein initialize karna zaroori hai.');
    }

    const nextEmail = isAdminAccount && newLoginEmailInput.trim()
      ? newLoginEmailInput.trim().toLowerCase()
      : currentEmail;
    const nextPassword = newPassInput.trim() || account.user_password;

    if (!nextEmail) return alert('Login ID / email enter karein.');
    if (nextPassword.length < 6) return alert('Password kam az kam 6 characters ka hona chahiye.');

    const changes = {
      user_email: nextEmail,
      user_password: nextPassword
    };

    let passwordUpdateQuery = supabase.from('user_permissions').update(changes);
    passwordUpdateQuery = account.id != null
      ? passwordUpdateQuery.eq('id', account.id)
      : passwordUpdateQuery.eq('user_email', currentEmail);
    const { error: updateError } = await passwordUpdateQuery;

    if (updateError) {
      return alert('Login ID / password update nahi hua: ' + updateError.message);
    }

    const updatedSession = {
      ...session,
      user: { ...session.user, email: nextEmail },
      role: userRole
    };

    setSession(updatedSession);
    setCurrentPassInput('');
    setNewPassInput('');
    setNewLoginEmailInput('');
    alert('Login ID / password database mein update ho gaya. Security ke liye ab dobara nayi details se login karein.');
    handleLogout();
  }

  async function handleDeleteOldRecords() {
    if (!userRole.is_admin) return alert('Sirf admin timesheet records delete kar sakta hai.');
    let startDate = cleanupSelectedDate;
    let endDate = cleanupSelectedDate;
    if (cleanupMode === 'month') {
      if (!/^\d{4}-\d{2}$/.test(cleanupMonth)) return alert('Month select karein.');
      const [yy, mm] = cleanupMonth.split('-').map(Number);
      startDate = `${cleanupMonth}-01`;
      endDate = `${yy}-${String(mm).padStart(2, '0')}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`;
    } else if (cleanupMode === 'range') {
      startDate = cleanupStartDate; endDate = cleanupEndDate;
      if (!startDate || !endDate || startDate > endDate) return alert('Date range sahi select karein.');
    }
    const selectedTables = [];
    if (cleanupAttendance) selectedTables.push('Timesheet / attendance');
    if (cleanupDailyDetails) selectedTables.push('Daily work details');
    if (cleanupAnnualLeaves) selectedTables.push('Completed annual leave records');
    if (!selectedTables.length) return alert('Kam az kam ek record type select karein.');
    const confirmed = window.confirm(`PERMANENT DELETE\nRange: ${startDate} se ${endDate} tak (dono dates shamil)\n\n${selectedTables.join('\n')}\n\nIs range ke tamam matching records delete honge. Yeh undo nahi ho sakta. Continue?`);
    if (!confirmed) return;
    setCleanupLoading(true);
    const results = [];
    try {
      if (cleanupAttendance) {
        const { data, error } = await supabase.from('attendance').delete().gte('date', startDate).lte('date', endDate).select('worker_id,date');
        if (error) results.push('Attendance error: ' + error.message); else results.push(`Timesheet records deleted: ${(data || []).length}`);
      }
      if (cleanupDailyDetails) {
        const { data, error } = await supabase.from('daily_work_details').delete().gte('work_date', startDate).lte('work_date', endDate).select('work_date,work_site');
        if (error) results.push('Daily work details error: ' + error.message); else results.push(`Daily work details deleted: ${(data || []).length}`);
      }
      if (cleanupAnnualLeaves) {
        const { data, error } = await supabase.from('annual_leaves').delete().gte('start_date', startDate).lte('start_date', endDate).neq('actual_return', 'On Leave').select('id');
        if (error) results.push('Annual leave error: ' + error.message); else results.push(`Annual leave records deleted: ${(data || []).length}`);
      }
      await fetchAttendance(); await fetchAnnualLeaves();
      alert(results.join('\n'));
    } catch (err) { alert('Record cleanup error: ' + (err?.message || String(err))); }
    finally { setCleanupLoading(false); }
  }

  async function handleScanPaperSheet(event) {
    if (!userRole.is_admin && !userRole.can_use_bulk) {
      return alert('Aapko Bulk/OCR ki permission nahi hai!');
    }

    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Sheet ki photo scan ho rahi hai...');

    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('OCR API key missing. Configure VITE_OPENAI_API_KEY in Vercel Environment Variables. For security, move OCR calls to a server-side API route.');

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
                  text: "Extract table data from attendance sheet. Return ONLY valid JSON with key 'rows' containing objects with: 'id_no' (number), 'working_days' (number), and 'overtime' (number)."
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
        date: selectedTimesheetDate,
        status: item.working_days > 0 ? 'Present' : 'Absent',
        overtime_hours: Number(item.overtime || 0),
        work_site: bulkSite
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToInsert, { onConflict: 'worker_id,date' });

      if (error) throw error;

      setScanStatus(`Zabardast! Total ${recordsToInsert.length} workers ka data scan ho gaya.`);
      fetchAttendance();

    } catch (err) {
      setScanStatus('Error: ' + err.message);
    } finally {
      setScanning(false);
    }
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

      if (accountError) {
        alert('Login database error: ' + accountError.message);
        return;
      }

      let resolvedAccount = account;

      // First-time setup for the legacy default administrator.
      // Once the admin row exists, the hard-coded default login is no longer accepted.
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

        const { data: insertedAdmin, error: insertError } = await supabase
          .from('user_permissions')
          .insert([initialAdmin])
          .select('*')
          .maybeSingle();

        if (insertError) {
          alert('Default admin login database mein save nahi ho saka: ' + insertError.message +
            '\nLogin access temporary milega, lekin password change ke liye database write access theek karni hogi.');
          resolvedAccount = initialAdmin;
        } else {
          resolvedAccount = insertedAdmin || initialAdmin;
        }
      }

      if (!resolvedAccount || String(resolvedAccount.user_password) !== cleanPassword) {
        alert('Invalid Email or Password!');
        return;
      }

      const isAdminAccount =
        resolvedAccount.is_admin === true || resolvedAccount.is_admin === 'true';

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
        setActiveTab('dashboard');
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

      if (staffRole.assigned_department !== 'All') {
        setSelectedDeptFilter(staffRole.assigned_department);
        setBulkDepartment(staffRole.assigned_department);
      }
      if (staffRole.assigned_site !== 'All') {
        setSelectedSiteFilter(staffRole.assigned_site);
        setBulkSite(staffRole.assigned_site);
        setQuickSite(staffRole.assigned_site);
      }


      if (staffRole.can_view_dashboard) setActiveTab('dashboard');
      else if (staffRole.can_view_timesheet) setActiveTab('attendance');
      else if (staffRole.can_view_workers) setActiveTab('workers');
      else setActiveTab('changepass');
    } catch (err) {
      alert('Login error: ' + (err?.message || String(err)));
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('nda_user_session');
    setSession(null);
    setSelectedSystem(null);
  }

  async function handleDeleteWorker(id) {
    if (!userRole.is_admin && !userRole.can_delete_workers) {
      return alert('Permission denied!');
    }
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(id))) {
      return alert('Aap sirf apne assigned department/site ke workers delete kar sakte hain.');
    }
    if (window.confirm(`Delete Worker #${id}?`)) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchWorkers();
    }
  }

  function handleStartEditWorker(worker) {
    if (!userRole.is_admin && !userRole.can_edit_workers) {
      return alert('Permission denied!');
    }
    setEditingWorkerId(worker.id);
    setWorkerIdInput(worker.id);
    setName(worker.name);
    setDepartment(worker.department || departmentsList[0]);
    setWorkSite(worker.work_site || sitesList[0]);
    setDesignation(worker.designation || 'Worker');
    setMonthlySalary(worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth) || '');
    setReligion(worker.religion || 'Muslim');
    setLastReturnDate(worker.last_return_date || '');
    setAnnualLeaveRate(worker.annual_leave_rate || '30');
    setAnnualLeaveBalance(String(worker.annual_leave_balance ?? 0));
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
    setDepartment(departmentsList[0]);
    setWorkSite(sitesList[0]);
    setDesignation('Worker');
    setMonthlySalary('');
    setReligion('Muslim');
    setLastReturnDate('');
    setAnnualLeaveRate('30');
    setAnnualLeaveBalance('0');
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  async function handleSaveWorker(e) {
    e.preventDefault();
    if (!userRole.is_admin) {
      if (editingWorkerId && !userRole.can_edit_workers) return alert('Permission denied: worker edit allowed nahi.');
      if (!editingWorkerId && !userRole.can_add_workers) return alert('Permission denied: worker add allowed nahi.');
      if (userRole.assigned_department && userRole.assigned_department !== 'All' &&
          department.toLowerCase() !== userRole.assigned_department.toLowerCase()) {
        return alert('Aap sirf apne assigned department mein worker add/edit kar sakte hain.');
      }
      if (userRole.assigned_site && userRole.assigned_site !== 'All' &&
          workSite.toLowerCase() !== userRole.assigned_site.toLowerCase()) {
        return alert('Aap sirf apni assigned site select kar sakte hain.');
      }
    }
    if (!name.trim() || !monthlySalary) return alert('Name and Salary required!');

    const monthlyNum = Number(monthlySalary);
    const dailyRateCalc = monthlyNum / totalDaysInCurrentMonth;

    const workerData = {
      name: name.trim(),
      department: department.trim(),
      work_site: workSite.trim(),
      designation: designation.trim(),
      monthly_salary: monthlyNum,
      daily_rate: dailyRateCalc,
      religion,
      last_return_date: lastReturnDate || null,
      annual_leave_rate: Number(annualLeaveRate || 30),
      annual_leave_balance: Number(annualLeaveBalance || 0),
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

   // Print Individual Worker Monthly Report
  function handlePrintWorkerMonthlyReport(worker) {
    const workerAttendance = attendance.filter(
      a => String(a.worker_id) === String(worker.id)
    );

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Print window blocked. Please allow pop-ups and try again.');
      return;
    }

    const currency = worker.currency || 'AED';
    const monthlySalary =
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * Number(totalDaysInCurrentMonth || 0));

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Monthly Report - #${worker.id}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              padding: 0;
              color: #111;
              margin: 0;
            }

            h2 {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 8px;
              color: #1e293b;
              font-size: 20px;
            }

            .box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }

            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: left;
            }

            th {
              background: #e2e8f0;
            }

            .report-footer {
              display: block !important;
              width: 100%;
              text-align: center;
              margin-top: 30px;
              padding: 12px 0;
              border-top: 1px solid #94a3b8;
              color: #111 !important;
              background: #fff !important;
              font-family: Arial, sans-serif;
              font-size: 12px;
              font-weight: bold;
              visibility: visible !important;
            }

            @media print {
              .report-footer {
                display: block !important;
                visibility: visible !important;
                color: #111 !important;
              }
            }
          </style>
        </head>
        <body>
          <h2>NDA-PK SYSTEM - Individual Worker Monthly Report</h2>

          <div class="box">
            <p><strong>Worker ID:</strong> #${worker.id}</p>
            <p><strong>Name:</strong> ${worker.name || ''}</p>
            <p><strong>Department:</strong> ${worker.department || 'N/A'}
              | <strong>Site:</strong> ${worker.work_site || 'N/A'}</p>
            <p><strong>Monthly Salary:</strong>
              ${monthlySalary} ${currency}</p>
          </div>

          <h3>Daily Attendance &amp; Overtime Record</h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Normal OT</th>
<th>Contract OT</th>
<th>Total OT</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              ${
                workerAttendance.length === 0
                  ? '<tr><td colspan="4">No attendance records found.</td></tr>'
                  : workerAttendance.map(att => `
                      <tr>
                        <td>${att.date || ''}</td>
                        <td>${att.status || ''}</td>                       
<td>${Number(att.overtime_hours) || 0} Hours</td>
<td>${Number(att.contract_overtime_hours) || 0} Hours</td>
<td>${(Number(att.overtime_hours) || 0) + (Number(att.contract_overtime_hours) || 0)} Hours</td>
                        <td>${att.work_site || worker.work_site || 'N/A'}</td>
                      </tr>
                    `).join('')
              }
            </tbody>
          </table>

          <div class="report-footer">
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 2. Handle Bulk Attendance & Overtime (Supports 'All' Departments & Designations)
 async function handleBulkAttendance() {
  if (!userRole.is_admin && !userRole.can_use_bulk) return alert('Aapko Bulk Attendance ki permission nahi hai.');

  const selectedDesignations =
    bulkDesignation === 'All'
      ? ['All']
      : bulkDesignation.toLowerCase() === 'steel fixer'
        ? ['steel fixer', 'steel fixer helper', 'steel labour', 'steel fixer labour', 'steel foreman', 'steel fixer foreman']
        : bulkDesignation.toLowerCase() === 'carpenter'
          ? ['carpenter', 'carpenter helper']
          : [bulkDesignation.toLowerCase()];

  const allowedWorkers = userRole.is_admin ? workers : filteredWorkers;
  const effectiveBulkSite =
    userRole.is_admin || userRole.assigned_site === 'All'
      ? bulkSite
      : userRole.assigned_site;
  const deptWorkers = allowedWorkers.filter(w => {
    const matchDept =
      bulkDepartment === 'All' ||
      (w.department &&
        w.department.toLowerCase() === bulkDepartment.toLowerCase());

    const workerDesignation = (w.designation || '').toLowerCase();

    const matchDesig =
      selectedDesignations.includes('All') ||
      selectedDesignations.includes(workerDesignation);

    return matchDept && matchDesig;
  });

  if (deptWorkers.length === 0) {
    return alert(
      `No workers found matching department (${bulkDepartment}) and designation (${bulkDesignation})!`
    );
  }

  const records = deptWorkers.map(w => ({
    worker_id: w.id,
    date: selectedTimesheetDate,
    status: attendanceData[selectedTimesheetDate]?.[w.id]?.status || attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate)?.status || 'Absent',
    overtime_hours: Number(bulkOT) || 0,
    contract_overtime_hours: Number(bulkContractOT) || 0,
    department: w.department,
    work_site: effectiveBulkSite
  }));

  const { error: attendanceError } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'worker_id,date' });

  if (attendanceError) {
    alert('Attendance save error: ' + attendanceError.message);
    return;
  }

  setAttendanceData(prev => {
    const updated = { ...prev };

    if (!updated[selectedTimesheetDate]) {
      updated[selectedTimesheetDate] = {};
    }
    
deptWorkers.forEach(w => {
  updated[selectedTimesheetDate][w.id] = {
    status: attendanceData[selectedTimesheetDate]?.[w.id]?.status || attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate)?.status || 'Absent',
    ot: Number(bulkOT) || 0,
    contract_ot: Number(bulkContractOT) || 0,
    contract_overtime_hours: Number(bulkContractOT) || 0,
    site: effectiveBulkSite
  };
});

    return updated;
  });

  alert(
    `Overtime updated for ${selectedTimesheetDate}: ${deptWorkers.length} workers. Existing attendance status was preserved.`
  );

  fetchAttendance();
}

  
 // 3. Handle Single Attendance & OT Change (Auto-saves to DB and updates Monthly Timesheet)
async function handleSingleAttendanceChange(
  workerId,
  dateStr,
  newStatus,
  newOt,
  newSite,
  newContractOT = 0
) {
  if (!userRole.is_admin && !userRole.can_edit_timesheet) {
    throw new Error('Aapko timesheet edit karne ki permission nahi hai.');
  }
  if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) {
    throw new Error('Yeh worker aapki assigned department/site mein nahi hai.');
  }
  const previousRecord = attendanceData[dateStr]?.[workerId] || {};
  const worker = workers.find(w => String(w.id) === String(workerId));

  const assignedSite =
    !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
      ? userRole.assigned_site
      : (newSite || previousRecord.site || worker?.work_site || sitesList[0] || 'Sharjah Mamzar');

  const updatedRecord = {
    ...previousRecord,
    status: newStatus,
    ot: Number(newOt) || 0,
    contract_ot: Number(newContractOT) || 0,
    contract_overtime_hours: Number(newContractOT) || 0,
    site: assignedSite
  };

  setAttendanceData(prev => ({
    ...prev,
    [dateStr]: {
      ...(prev[dateStr] || {}),
      [workerId]: updatedRecord
    }
  }));

  try {
    const { error } = await supabase
      .from('attendance')
      .upsert([{
        worker_id: workerId,
        date: dateStr,
        status: newStatus,
        overtime_hours: Number(newOt) || 0,
        contract_overtime_hours: Number(newContractOT) || 0,
        department: worker?.department,
        work_site: assignedSite
      }], { onConflict: 'worker_id,date' });

    
if (error) {
  throw new Error(error.message);
}

  } catch (err) {
    alert('Save karte waqt error: ' + err.message);
  }
}
  
async function handleSaveSiteAttendance(e) {
  e.preventDefault();
  if (!userRole.is_admin && !userRole.can_edit_timesheet && !userRole.can_use_bulk) return alert('Aapko attendance save karne ki permission nahi hai.');
  if (!selectedTimesheetDate || !siteAttendanceSite) return alert('Date aur site select karein.');
  const allowedWorkers = userRole.is_admin ? workers : filteredWorkers;
  const enteredIds = [...new Set(siteAttendanceIds.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
  const presentWorkers = enteredIds.map(id => allowedWorkers.find(w =>
    String(w.worker_id ?? '').trim() === id || String(w.id).trim() === id
  ));
  const missingIds = enteredIds.filter((id, i) => !presentWorkers[i]);
  if (missingIds.length) return alert('Yeh Worker ID nahi milin: ' + missingIds.join(', '));
  const scopedWorkers = allowedWorkers.filter(w =>
    String(w.work_site || '').trim().toLowerCase() === siteAttendanceSite.trim().toLowerCase()
  );
  const selectedWorkers = [...new Map([...scopedWorkers, ...presentWorkers].map(w => [String(w.id), w])).values()];
  if (!selectedWorkers.length) return alert('Is site ke workers nahi mile. Pehle Workers Directory mein unki site set karein.');
  setSiteAttendanceSaving(true);
  try {
    const records = selectedWorkers.map(w => {
      const old = attendance.find(a => String(a.worker_id) === String(w.id) && a.date === selectedTimesheetDate);
      const isPresent = presentWorkers.some(p => String(p.id) === String(w.id));
      return {
        worker_id: w.id, date: selectedTimesheetDate, status: isPresent ? 'Present' : 'Absent',
        overtime_hours: Number(old?.overtime_hours) || 0,
        contract_overtime_hours: Number(old?.contract_overtime_hours) || 0,
        department: w.department || '', work_site: siteAttendanceSite
      };
    });
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    if (error) throw error;
    setSiteAttendanceIds('');
    await fetchAttendance();
    alert(`Attendance save ho gayi: ${records.filter(r => r.status === 'Present').length} Present, ${records.filter(r => r.status === 'Absent').length} Absent (${siteAttendanceSite}).`);
  } catch (err) {
    alert('Attendance save nahi hui: ' + (err?.message || String(err)));
  } finally { setSiteAttendanceSaving(false); }
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
    alert('Worker ID nahi mila. ID check karein.');
    return;
  }

  const hours = Number(quickHours);

  if (!Number.isFinite(hours) || hours < 0) {
    alert('OT hours sahi enter karein.');
    return;
  }

  const normalOT = quickOTType === 'Normal OT' ? hours : 0;
  const contractOT = quickOTType === 'Contract OT' ? hours : 0;

  setQuickSaving(true);

  try {
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
  alert('Save karte waqt error: ' + err.message);
  throw err;
} finally {
    setQuickSaving(false);
  }
}

  // 4. Handle Mark Single Attendance (For timesheet table)
  async function handleMarkAttendance(workerId, status) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) return alert('Aapko timesheet edit karne ki permission nahi hai.');
    if (!userRole.is_admin && !filteredWorkers.some(w => String(w.id) === String(workerId))) return alert('Yeh worker aapke assigned scope mein nahi hai.');
    const worker = workers.find(w => String(w.id) === String(workerId));
  const oldRecord = attendanceData[selectedTimesheetDate]?.[workerId] || {};

const assignedSiteForToday =
  !userRole.is_admin && userRole.assigned_site && userRole.assigned_site !== 'All'
    ? userRole.assigned_site
    : (timesheetSiteInputs[workerId] ||
       oldRecord.site ||
       oldRecord.work_site ||
       worker?.work_site ||
       sitesList[0]);

const otHours = Number(
  overtimeInputs[workerId] ??
  oldRecord.ot ??
  oldRecord.overtime_hours ??
  0
);
    
    const { error } = await supabase.from('attendance').upsert([
      { worker_id: workerId, date: selectedTimesheetDate, status, overtime_hours: otHours, department: worker?.department, work_site: assignedSiteForToday }
    ], { onConflict: 'worker_id,date' });

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  // 5. Handle Save Staff Permissions
  async function handleSavePermission(e) {
    e.preventDefault();
    if (!userRole.is_admin) return alert('Sirf admin staff permissions change kar sakta hai.');
    if (!targetEmail || !targetPassword) return alert('Staff email aur password enter karein.');
    if (targetEmail.trim().toLowerCase() === session?.user?.email?.toLowerCase()) return alert('Admin apna account staff permission form se edit nahi kar sakta.');

    const permData = {
      staff_id: targetStaffId.trim(),
      user_email: targetEmail.trim().toLowerCase(),
      user_password: targetPassword.trim(),
      assigned_department: targetDept,
      assigned_site: targetSite,
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
      alert('Staff permission saved successfully!');
      setTargetStaffId('');
      setTargetEmail('');
      setTargetPassword('');
      fetchPermissionsList();
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
  const attendanceRecord = latestAttendanceMap[worker.id];
  const status = (attendanceRecord?.status || '').trim().toLowerCase();

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === String(worker.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    const start = leave.start_date;
    const end = leave.expected_return;

    return (
      sameWorker &&
      onLeave &&
      start <= selectedTimesheetDate &&
      selectedTimesheetDate <= end
    );
  });

  return status === 'present' && !onAnnualLeave;
}).length;

const annualLeaveCountForDate = filteredWorkers.filter(worker => {
  const record = annualLeaveList.find(leave => {
    const sameWorker =
      String(leave.worker_id) === String(worker.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    const start = leave.start_date;
    const end = leave.expected_return;

    return (
      sameWorker &&
      onLeave &&
      start <= selectedTimesheetDate &&
      selectedTimesheetDate <= end
    );
  });

  const attendanceRecord = latestAttendanceMap[worker.id];
  return record || (
    (attendanceRecord?.status || '').toLowerCase() === 'annual leave'
  );
}).length;
const absentCountForDate = Object.values(latestAttendanceMap).filter(
  a => (a.status || '').toLowerCase() === 'absent'
).length;
 
  const salaryDataMap = {};

  // Selected month ke total days
  const payrollMonthDays = new Date(
    selectedYear,
    selectedMonth + 1,
    0
  ).getDate();

  // Admin ko tamam sites ke workers dikhayein
  // Staff ko sirf apni permitted workers list dikhayein
  const payrollWorkers = userRole.is_admin
    ? workers
    : filteredWorkers;

  payrollWorkers.forEach(worker => {
    // Sirf selected month ke attendance records
    const monthlyRecords = attendance.filter(a => {
      const recordDate = String(a.date || '');

      return (
        String(a.worker_id) === String(worker.id) &&
        recordDate.length >= 10 &&
        Number(recordDate.slice(0, 4)) === Number(selectedYear) &&
        Number(recordDate.slice(5, 7)) === Number(selectedMonth + 1)
      );
    });

    // Present days count karein
    const presentDays = monthlyRecords.filter(a =>
      String(a.status || '').trim().toLowerCase() === 'present'
    ).length;

    // Normal OT + Contract OT
    const totalOT = monthlyRecords.reduce((total, record) => {
      const normalOT = Number(record.overtime_hours) || 0;
      const contractOT = Number(record.contract_overtime_hours) || 0;

      return total + normalOT + contractOT;
    }, 0);

    const monthlySal = Number(
      worker.monthly_salary ||
      (Number(worker.daily_rate || 0) * payrollMonthDays) ||
      0
    );

    const dailyRateNum = monthlySal / payrollMonthDays;
    const hourlyRate = dailyRateNum / 8;

    const baseSalary = dailyRateNum * presentDays;
    const otSalary = totalOT * (hourlyRate * 1.25);
    const totalPayable = baseSalary + otSalary;

    salaryDataMap[worker.id] = {
      presentDays,
      totalOT,
      baseSalary,
      otSalary,
      totalPayable,
      monthlySal
    };
  });

  const salaryData = payrollWorkers.map(worker => ({
    ...worker,
    ...(salaryDataMap[worker.id] || {
      presentDays: 0,
      totalOT: 0,
      baseSalary: 0,
      otSalary: 0,
      totalPayable: 0,
      monthlySal: 0
    })
  }));

  const grandTotalPayroll = salaryData.reduce(
    (total, worker) => total + worker.totalPayable,
    0
  );

  if (!selectedSystem) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #164e63 0, #0f172a 48%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ textAlign: 'center', color: '#fff', marginBottom: 28 }}>
            <div style={{ fontSize: 13, letterSpacing: 4, color: '#67e8f9', fontWeight: 800 }}>NDA-PK DIGITAL WORKSPACE</div>
            <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '10px 0' }}>Choose Your System</h1>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Apna system select karein jahan aap kaam karna chahte hain.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            <button onClick={() => setSelectedSystem('hr')} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #38bdf8', color: '#fff', background: 'linear-gradient(145deg,#075985,#1e3a8a)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>👷</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK HR SYSTEM</h2><p style={{ color: '#dbeafe', lineHeight: 1.6 }}>Workers, attendance, timesheet, overtime, payroll, annual leave, permissions aur HR reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#1d4ed8', borderRadius: 10, fontWeight: 800 }}>Open HR System →</span>
            </button>
            <button onClick={() => { setSelectedSystem('business'); setBusinessType('transport'); }} style={{ textAlign: 'left', padding: 28, minHeight: 230, borderRadius: 22, border: '1px solid #34d399', color: '#fff', background: 'linear-gradient(145deg,#065f46,#14532d)', boxShadow: '0 18px 50px #0005', cursor: 'pointer' }}>
              <div style={{ fontSize: 40 }}>📈</div><h2 style={{ fontSize: 25, margin: '14px 0 8px' }}>NDA.PK BUSINESS</h2><p style={{ color: '#d1fae5', lineHeight: 1.6 }}>Transport business aur dairy farming: daily income/expense, cash balance, profit, workers salary aur monthly reports.</p><span style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#fff', color: '#047857', borderRadius: 10, fontWeight: 800 }}>Open Business →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '380px', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ color: '#f8fafc', fontSize: '22px', margin: 0 }}>NDA-PK SYSTEM</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>{selectedSystem === 'hr' ? 'HR SYSTEM · Sites & Staff Login' : 'BUSINESS MANAGEMENT LOGIN'}</p>
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

  if (selectedSystem === 'business' && !userRole.is_admin) {
    return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f1f5f9',padding:20,fontFamily:"'Segoe UI',sans-serif"}}><div style={{background:'#fff',padding:28,borderRadius:16,maxWidth:500,textAlign:'center',boxShadow:'0 8px 30px #0f172a12'}}><h2>Business Access Restricted</h2><p>Business financial records aur salaries filhal admin account ke liye available hain.</p><button onClick={()=>setSelectedSystem(null)} style={primaryStyle}>Back to System Selection</button><button onClick={handleLogout} style={{...primaryStyle,marginTop:10,background:'#64748b'}}>Logout</button></div></div>;
  }

  if (selectedSystem === 'business') {
    const txToday = businessTransactions.filter(t => t.transaction_date === businessDate);
    const txMonth = businessTransactions.filter(t => String(t.transaction_date || '').slice(0,7) === businessMonth);
    const salaryMonth = businessSalaryPayments.filter(t => String(t.payment_date || '').slice(0,7) === businessMonth);
    const sum = (arr, kind) => arr.filter(t => t.transaction_kind === kind).reduce((n,t) => n + (Number(t.amount)||0), 0);
    const todayIncome = sum(txToday, 'income'); const todayExpense = sum(txToday, 'expense');
    const monthIncome = sum(txMonth, 'income'); const monthExpense = sum(txMonth, 'expense');
    const monthSalary = salaryMonth.reduce((n,t) => n + (Number(t.amount)||0), 0);
    const cashIn = businessTransactions.filter(t => t.payment_mode === 'Cash' && t.transaction_kind === 'income').reduce((n,t) => n + (Number(t.amount)||0),0);
    const cashOut = businessTransactions.filter(t => t.payment_mode === 'Cash' && t.transaction_kind === 'expense').reduce((n,t) => n + (Number(t.amount)||0),0) + businessSalaryPayments.filter(t => t.payment_mode === 'Cash').reduce((n,t) => n + (Number(t.amount)||0),0);
    const currency = 'AED';
    const money = n => `${currency} ${Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    const businessLabel = businessType === 'transport' ? 'Transport Business' : 'Dairy Farming';
    return (
      <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Segoe UI',sans-serif", color:'#0f172a' }}>
        <header style={{ padding:'22px clamp(16px,3vw,34px)', color:'#fff', background: businessType === 'transport' ? 'linear-gradient(115deg,#0f172a,#1d4ed8)' : 'linear-gradient(115deg,#064e3b,#16a34a)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div><div style={{fontSize:12,letterSpacing:3,opacity:.8,fontWeight:800}}>NDA.PK BUSINESS</div><h1 style={{margin:'6px 0',fontSize:28}}>{businessLabel} Dashboard</h1><div style={{color:'#dbeafe',fontSize:13}}>Signed in: {session.user.email}</div></div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={handleLogout} style={{padding:'10px 13px',borderRadius:9,border:'1px solid #ffffff80',background:'#ffffff18',color:'#fff',cursor:'pointer'}}>⇄ Switch System</button><button onClick={handleLogout} style={{padding:'10px 13px',borderRadius:9,border:0,background:'#dc2626',color:'#fff',fontWeight:700,cursor:'pointer'}}>Logout</button></div>
        </header>
        <main style={{maxWidth:1400,margin:'0 auto',padding:'22px clamp(12px,2vw,28px)'}}>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
            <button onClick={()=>setBusinessType('transport')} style={{padding:'11px 18px',borderRadius:10,border:0,background:businessType==='transport'?'#1d4ed8':'#fff',color:businessType==='transport'?'#fff':'#334155',fontWeight:800,cursor:'pointer'}}>🚚 Transport</button>
            <button onClick={()=>setBusinessType('dairy')} style={{padding:'11px 18px',borderRadius:10,border:0,background:businessType==='dairy'?'#15803d':'#fff',color:businessType==='dairy'?'#fff':'#334155',fontWeight:800,cursor:'pointer'}}>🐄 Dairy Farming</button>
            <span style={{alignSelf:'center',color:'#64748b',fontSize:13}}>{businessLoading?'Loading business data…':'Income, expenses, cash balance, salaries and monthly reports'}</span>
          </div>
          <section style={{background:'#fff',borderRadius:16,padding:18,boxShadow:'0 5px 22px #0f172a0b',marginBottom:18,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><label style={{fontWeight:700}}>Dashboard date <input type="date" value={businessDate} onChange={e=>setBusinessDate(e.target.value)} style={{marginLeft:8,padding:9,border:'1px solid #cbd5e1',borderRadius:8}} /></label><label style={{fontWeight:700}}>Monthly report <input type="month" value={businessMonth} onChange={e=>setBusinessMonth(e.target.value)} style={{marginLeft:8,padding:9,border:'1px solid #cbd5e1',borderRadius:8}} /></label><button onClick={()=>fetchBusinessData()} style={{padding:'10px 15px',border:0,borderRadius:8,background:'#0f172a',color:'#fff',cursor:'pointer'}}>↻ Refresh</button></section>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:20}}>
            {[['Today Income',money(todayIncome),'#16a34a'],['Today Expense',money(todayExpense),'#dc2626'],['Today Profit',money(todayIncome-todayExpense),'#2563eb'],['Cash Balance (all records)',money(cashIn-cashOut),'#7c3aed'],['Month Income',money(monthIncome),'#059669'],['Month Expenses + Salaries',money(monthExpense+monthSalary),'#ea580c'],['Month Net Profit',money(monthIncome-monthExpense-monthSalary),'#0f766e'],['Active Workers',businessWorkers.filter(w=>w.active!==false).length,'#334155']].map((c,i)=><div key={c[0]} style={{background:'#fff',borderRadius:15,padding:18,boxShadow:'0 5px 22px #0f172a0b',borderTop:`4px solid ${c[2]}`}}><div style={{fontSize:12,color:'#64748b',fontWeight:700}}>{c[0]}</div><div style={{fontSize:23,fontWeight:850,color:c[2],marginTop:8}}>{c[1]}</div></div>)}
          </div>
          {userRole.is_admin && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18,marginBottom:20}}>
            <form onSubmit={handleSaveBusinessTransaction} style={{background:'#fff',borderRadius:15,padding:20,boxShadow:'0 5px 22px #0f172a0b'}}><h3 style={{marginTop:0}}>➕ Add Daily Income / Expense</h3><div style={{display:'grid',gap:10}}><input type="date" value={businessDate} onChange={e=>setBusinessDate(e.target.value)} required style={fieldStyle}/><select value={businessTxnKind} onChange={e=>{setBusinessTxnKind(e.target.value);setBusinessTxnCategory(e.target.value==='income'?'Daily income':'Fuel / feed / other expense')}} style={fieldStyle}><option value="income">Income</option><option value="expense">Expense</option></select><input value={businessTxnCategory} onChange={e=>setBusinessTxnCategory(e.target.value)} placeholder="Category (fuel, trip, milk, feed...)" style={fieldStyle} required/><input value={businessTxnDescription} onChange={e=>setBusinessTxnDescription(e.target.value)} placeholder={businessType==='transport'?'Vehicle / trip / customer details':'Milk sale / cattle / feed details'} style={fieldStyle}/><input type="number" min="0.01" step="0.01" value={businessTxnAmount} onChange={e=>setBusinessTxnAmount(e.target.value)} placeholder="Amount (AED)" required style={fieldStyle}/><select value={businessTxnPaymentMode} onChange={e=>setBusinessTxnPaymentMode(e.target.value)} style={fieldStyle}><option>Cash</option><option>Bank</option><option>Credit</option></select><button style={primaryStyle}>Save Financial Entry</button></div></form>
            <form onSubmit={handleAddBusinessWorker} style={{background:'#fff',borderRadius:15,padding:20,boxShadow:'0 5px 22px #0f172a0b'}}><h3 style={{marginTop:0}}>👷 Add {businessType==='transport'?'Driver / Staff':'Farm Worker'}</h3><div style={{display:'grid',gap:10}}><input value={businessWorkerName} onChange={e=>setBusinessWorkerName(e.target.value)} placeholder="Worker full name" required style={fieldStyle}/><input value={businessWorkerJob} onChange={e=>setBusinessWorkerJob(e.target.value)} placeholder={businessType==='transport'?'Driver / Mechanic / Helper':'Farm worker / Milker / Caretaker'} style={fieldStyle}/><input value={businessWorkerPhone} onChange={e=>setBusinessWorkerPhone(e.target.value)} placeholder="Phone (optional)" style={fieldStyle}/><input type="number" min="0" step="0.01" value={businessWorkerSalary} onChange={e=>setBusinessWorkerSalary(e.target.value)} placeholder="Monthly salary (AED)" style={fieldStyle}/><button style={{...primaryStyle,background:'#15803d'}}>Save Worker</button></div></form>
            <form onSubmit={handlePayBusinessSalary} style={{background:'#fff',borderRadius:15,padding:20,boxShadow:'0 5px 22px #0f172a0b'}}><h3 style={{marginTop:0}}>💳 Record Worker Salary</h3><div style={{display:'grid',gap:10}}><select value={businessSalaryWorkerId} onChange={e=>setBusinessSalaryWorkerId(e.target.value)} required style={fieldStyle}><option value="">Select worker</option>{businessWorkers.map(w=><option key={w.id} value={w.id}>{w.worker_name} — {w.job_title}</option>)}</select><input type="date" value={businessSalaryDate} onChange={e=>setBusinessSalaryDate(e.target.value)} required style={fieldStyle}/><input type="number" min="0.01" step="0.01" value={businessSalaryAmount} onChange={e=>setBusinessSalaryAmount(e.target.value)} placeholder="Salary paid (AED)" required style={fieldStyle}/><select value={businessSalaryPaymentMode} onChange={e=>setBusinessSalaryPaymentMode(e.target.value)} style={fieldStyle}><option>Cash</option><option>Bank</option></select><button style={{...primaryStyle,background:'#7c3aed'}}>Save Salary Payment</button></div></form>
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:18}}>
            <section style={{background:'#fff',borderRadius:15,padding:18,overflowX:'auto',boxShadow:'0 5px 22px #0f172a0b'}}><h3>📋 {businessLabel} Workers</h3><table style={tableStyle}><thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Role</th><th style={thStyle}>Monthly Salary</th></tr></thead><tbody>{businessWorkers.map(w=><tr key={w.id}><td style={tdStyle}>{w.worker_name}</td><td style={tdStyle}>{w.job_title}</td><td style={tdStyle}>{money(w.monthly_salary)}</td></tr>)}{!businessWorkers.length&&<tr><td colSpan="3" style={tdStyle}>No workers added yet.</td></tr>}</tbody></table></section>
            <section style={{background:'#fff',borderRadius:15,padding:18,overflowX:'auto',boxShadow:'0 5px 22px #0f172a0b'}}><h3>🧾 Monthly Transactions — {businessMonth}</h3><table style={tableStyle}><thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Type / Category</th><th style={thStyle}>Details</th><th style={thStyle}>Amount</th>{userRole.is_admin&&<th style={thStyle}>Action</th>}</tr></thead><tbody>{txMonth.map(t=><tr key={t.id}><td style={tdStyle}>{t.transaction_date}</td><td style={tdStyle}><b style={{color:t.transaction_kind==='income'?'#15803d':'#dc2626'}}>{t.transaction_kind}</b><br/>{t.category}</td><td style={tdStyle}>{t.description||'—'}<br/><small>{t.payment_mode}</small></td><td style={tdStyle}>{money(t.amount)}</td>{userRole.is_admin&&<td style={tdStyle}><button onClick={()=>handleDeleteBusinessTransaction(t.id)} style={{border:0,background:'#fee2e2',color:'#b91c1c',padding:'6px 8px',borderRadius:6,cursor:'pointer'}}>Delete</button></td>}</tr>)}{!txMonth.length&&<tr><td colSpan={userRole.is_admin?5:4} style={tdStyle}>No transactions for this month.</td></tr>}</tbody></table></section>
            <section style={{background:'#fff',borderRadius:15,padding:18,overflowX:'auto',boxShadow:'0 5px 22px #0f172a0b'}}><h3>💰 Salary Payments — {businessMonth}</h3><table style={tableStyle}><thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Worker</th><th style={thStyle}>Amount</th></tr></thead><tbody>{salaryMonth.map(p=><tr key={p.id}><td style={tdStyle}>{p.payment_date}</td><td style={tdStyle}>{businessWorkers.find(w=>String(w.id)===String(p.worker_id))?.worker_name||`Worker #${p.worker_id}`}</td><td style={tdStyle}>{money(p.amount)}</td></tr>)}{!salaryMonth.length&&<tr><td colSpan="3" style={tdStyle}>No salary payments for this month.</td></tr>}</tbody></table></section>
          </div>
          <p style={{fontSize:12,color:'#64748b',marginTop:20}}>Cash balance shown here is the net of all recorded Cash income minus Cash expenses. Monthly net profit subtracts recorded salary payments from income minus operating expenses.</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      
     {/* Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>NDA-PK SYSTEM (Multi-Site)</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>User: {session.user.email} {userRole.staff_id ? `(ID: ${userRole.staff_id})` : ''} | Days: <strong style={{color: '#38bdf8'}}>{totalDaysInCurrentMonth}</strong></span>
        </div>

        {/* Admin Name - Merged in Top Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <span style={{ fontSize: '16px' }}>👤</span>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Administrator</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>Muhammad Naveed</div>
          </div>
        </div>

        <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Switch System</button>
        <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Logout</button>
      </header>

      {/* Tabs Menu Bar */}
      <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', display: 'flex', overflowX: 'auto', gap: '5px' }}>
        {(userRole.is_admin || userRole.can_view_dashboard) && (
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📊 Dashboard</button>
        )}
        {(userRole.is_admin || userRole.can_use_bulk) && (
          <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'bulk' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚡ Bulk & OCR</button>
        )}
        {(userRole.is_admin || userRole.can_view_workers) && (
          <button onClick={() => setActiveTab('workers')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'workers' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>👷 Workers Directory</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && (
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet Entry</button>
        )}
      {(userRole.is_admin || userRole.can_view_timesheet) && <button
  onClick={() => setActiveTab('daily-timesheet')}
  style={{
    padding: '10px 15px',
    backgroundColor: activeTab === 'daily-timesheet' ? '#2563eb' : 'transparent',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  }}
>
  📄 Daily Timesheet
</button>}
        {(userRole.is_admin || userRole.can_view_payroll) && (
          <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💵 Payroll</button>
        )}
        <button onClick={() => setActiveTab('changepass')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'changepass' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔑 Change Password</button>
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('sites')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'sites' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏗️ Working Sites</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('departments')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'departments' ? '#7c3aed' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🏢 Departments</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'permissions' ? '#d97706' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🔐 Permissions</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('annualLeave')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'annualLeave' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🌴 Annual Leave</button>
        )}
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('data-cleanup')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'data-cleanup' ? '#dc2626' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🗑️ Data Cleanup</button>
        )}
        {(userRole.is_admin || userRole.can_view_timesheet) && <button 
          onClick={() => setShowMonthlyTimesheetModal(true)} 
          style={{ padding: '10px 15px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}
        >
          📊 Monthly Timesheet
        </button>}
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        
        {/* Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
          {userRole.is_admin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginRight: '5px' }}>Dept:</label>
                <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #2563eb' }}>
                  <option value="All">All Depts</option>
                  {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginRight: '5px' }}>Site:</label>
                <select value={selectedSiteFilter} onChange={e => setSelectedSiteFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #059669' }}>
                  <option value="All">All Sites</option>
                  {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Site: {userRole.assigned_site} | Dept: {userRole.assigned_department}</span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="AED">AED</option>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
            <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Print Page</button>
          </div>
        </div>
        
{/* TAB 1: DASHBOARD */}
{activeTab === 'dashboard' && (userRole.is_admin || userRole.can_view_dashboard) && (
  <>
    <section style={{background:'linear-gradient(120deg,#0f172a 0%,#1d4ed8 65%,#0e7490 100%)',borderRadius:18,padding:'24px clamp(16px,3vw,30px)',color:'#fff',marginBottom:20,boxShadow:'0 12px 30px #1e3a8a20',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,letterSpacing:3,fontWeight:800,color:'#bae6fd'}}>NDA-PK · HR CONTROL CENTER</div><h2 style={{fontSize:'clamp(23px,3vw,32px)',margin:'8px 0'}}>Workforce Overview</h2><p style={{margin:0,color:'#dbeafe',fontSize:14}}>Attendance, site deployment and payroll at a glance.</p></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><label style={{fontSize:12,color:'#dbeafe'}}>Dashboard Date<input type="date" value={selectedTimesheetDate} onChange={e=>setSelectedTimesheetDate(e.target.value)} style={{display:'block',marginTop:5,padding:'9px 10px',borderRadius:8,border:'1px solid #93c5fd',background:'#fff',color:'#0f172a'}}/></label><button onClick={()=>setShowMonthlyTimesheetModal(true)} style={{alignSelf:'end',padding:'10px 13px',background:'#fff',color:'#1d4ed8',border:0,borderRadius:9,fontWeight:800,cursor:'pointer'}}>📊 Monthly Report</button></div>
    </section>
    {/* Stats Grid */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '18px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '5px solid #2563eb'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>Total Workers</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
          {filteredWorkers.length}
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        padding: '18px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '5px solid #16a34a'
      }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          Present on {selectedTimesheetDate}
        </span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>
          {presentCountForDate}
        </div>
      </div>

      {(userRole.is_admin || userRole.can_view_payroll) && (
        <div style={{
          backgroundColor: '#fff',
          padding: '18px',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '5px solid #0891b2'
        }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
            {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}
          </div>
        </div>
      )}
    </div>

    {/* Department & Designation Attendance Breakdown */}
    <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#1e293b' }}>
      Workers by Trade & Site — {selectedTimesheetDate}
    </h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    }}>
     {(userRole.is_admin
  ? departmentsList
  : departmentsList.filter(dept =>
      !userRole.assigned_department ||
      userRole.assigned_department === 'All' ||
      dept.toLowerCase() === userRole.assigned_department.toLowerCase()
    )
).map(dept => {
  const deptWorkers = filteredWorkers.filter(
    w => w.department?.toLowerCase() === dept.toLowerCase()
  );
        // Workers who have an attendance record for the selected date
        const deptAttendanceWorkers = deptWorkers.filter(w =>
          Boolean(attendanceData[selectedTimesheetDate]?.[w.id])
        );

        const totalAttendanceCount = deptAttendanceWorkers.length;

        const designationsInDept = Array.from(
          new Set(deptWorkers.map(w => w.designation || 'Worker'))
        );

        return (
          <div
            key={dept}
            onClick={() => setModalDepartment(dept)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '20px',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{
              margin: '0 0 5px 0',
              color: '#1e293b',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '6px'
            }}>
              🏢 {dept}
            </h3>

            <p style={{ margin: '6px 0 12px 0', color: '#0f172a', fontSize: '14px' }}>
              Workers with attendance: <strong>{totalAttendanceCount}</strong>
            </p>

            <hr style={{
              border: '0',
              borderTop: '1px solid #e2e8f0',
              margin: '10px 0'
            }} />

            {designationsInDept.map(desig => {
              const desigWorkers = deptWorkers.filter(
                w => (w.designation || 'Worker') === desig
              );

              const desigAttendanceWorkers = desigWorkers.filter(w =>
                Boolean(attendanceData[selectedTimesheetDate]?.[w.id])
              );
            const getAttendanceStatus = (worker) =>
  attendanceData[selectedTimesheetDate]?.[worker.id]?.status || '';

const presentCount = desigWorkers.filter(w => {
  const status = getAttendanceStatus(w)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  if (status !== 'present') return false;

  const workerKey = String(w.id);

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === workerKey;

    const start = leave.start_date;
    const end = leave.actual_return;

    const isStillOnLeave =
      leave.status !== 'Returned' &&
      (!end || end === 'On Leave' || selectedTimesheetDate < end);

    return (
      sameWorker &&
      isStillOnLeave &&
      start &&
      start <= selectedTimesheetDate
    );
  });

  return !onAnnualLeave;
}).length;

const absentCount = desigWorkers.filter(w => {
  const status = getAttendanceStatus(w)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  if (status !== 'absent') return false;

  const workerKey = String(w.worker_id ?? w.id);

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker = String(leave.worker_id) === workerKey;
    const start = leave.start_date;
    const end = leave.actual_return;

    const isStillOnLeave =
      leave.status !== 'Returned' &&
      (!end || end === 'On Leave');

    return (
      sameWorker &&
      isStillOnLeave &&
      start &&
      start <= selectedTimesheetDate
    );
  });

  return !onAnnualLeave;
}).length;

const annualLeaveCount = desigWorkers.filter(w => {
  const status = getAttendanceStatus(w)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  const workerKey = String(w.worker_id ?? w.id);

  const onAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker = String(leave.worker_id) === workerKey;

    const start = leave.start_date;
    const isStillOnLeave =
      leave.status !== 'Returned' &&
      (!leave.actual_return || leave.actual_return === 'On Leave');

    return (
      sameWorker &&
      isStillOnLeave &&
      start &&
      start <= selectedTimesheetDate
    );
  });

  return status === 'annual leave' || onAnnualLeave;
}).length;
const otherLeaveCount = desigWorkers.filter(
  w => ['leave', 'sick leave', 'sick_leave', 'other leave'].includes(
    getAttendanceStatus(w).toLowerCase()
  )
).length;

              return (
                <div
                  key={desig}
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#f8fafc',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '6px'
                  }}>
                    <span>🛠️ {desig}</span>
                    <span style={{
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}>
                      {desigAttendanceWorkers.length} Attended
                    </span>
                  </div>

                  {sitesList.map(site => {
                    const siteWorkersCount = desigWorkers.filter(w => {
                      const attendanceRecord =
                        attendanceData[selectedTimesheetDate]?.[w.id];

                      return Boolean(attendanceRecord) &&
                        (attendanceRecord.site || attendanceRecord.work_site) === site;
                    }).length;

                    if (siteWorkersCount === 0) return null;

                    return (
                      <div
                        key={site}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '12px',
                          paddingLeft: '8px',
                          color: '#334155',
                          margin: '5px 0',
                          borderLeft: '3px solid #0ea5e9'
                        }}
                      >
                        <span>📍 {site}</span>
                        <strong style={{ color: '#0284c7', fontSize: '13px' }}>
                          {siteWorkersCount} Workers
                        </strong>
                      </div>
                    );
                  })}

                  <div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '10px',
  marginBottom: '10px'
}}>
  <span style={{
    background: '#dcfce7',
    color: '#166534',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Present: {presentCount}
  </span>

  <span style={{
    background: '#fee2e2',
    color: '#991b1b',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Absent: {absentCount}
  </span>

  <span style={{
    background: '#fef3c7',
    color: '#92400e',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Annual Leave: {annualLeaveCount}
  </span>

  <span style={{
    background: '#dbeafe',
    color: '#1e40af',
    padding: '5px 8px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    Other Leave: {otherLeaveCount}
  </span>
</div>
                  {desigAttendanceWorkers.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                      No attendance saved for this date
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  </>
)}

{/* Modal / Popup for Specific Department Workers */}
{modalDepartment && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}>
    <div style={{
      background: '#fff',
      padding: '25px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '750px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>
          {modalDepartment} - Workers Detail
        </h2>

        <button
          onClick={() => setModalDepartment(null)}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Close X
        </button>
      </div>

      {/* Filtered Workers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>ID</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Name</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Designation</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px' }}>Site / Location</th>
            </tr>
          </thead>

          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => w.department?.toLowerCase() === modalDepartment?.toLowerCase())
              .filter(w => {
                if (modalLocationTab === 'All') return true;

                const attendanceRecord =
                  attendanceData[selectedTimesheetDate]?.[w.id];

                return (attendanceRecord?.site || attendanceRecord?.work_site) === modalLocationTab;
              })
              
.map(worker => {
  const attendanceRecord =
    attendanceData[selectedTimesheetDate]?.[worker.id];

  const annualLeave = getAnnualLeaveForWorker(
    worker.id,
    selectedTimesheetDate
  );

  return (
           
<tr
  key={worker.id}
style={{
  backgroundColor: annualLeave ? '#fef3c7' : '#ffffff',
  color: annualLeave ? '#92400e' : '#111827',
  fontWeight: annualLeave ? 'bold' : 'normal'
}}
>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      #{worker.worker_id || worker.id}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {worker.name}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {worker.designation || 'N/A'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>
                      {attendanceRecord?.site || attendanceRecord?.work_site || 'No attendance'}
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

{/* Print Styles */}
<style>{`
  @media print {
    .print-signature {
      display: block !important;
    }
  }
`}</style>
   
{/* TAB 2: BULK & OCR */}
{activeTab === 'bulk' && (userRole.is_admin || userRole.can_use_bulk) && (
  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <h3 style={{ margin: '0 0 10px 0' }}>⚡ Bulk Overtime Only — Department / Designation</h3>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Date</label>
        <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Department</label>
        <select value={bulkDepartment} onChange={e => setBulkDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="All">All Departments</option>
          {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Designation (Steel, Carpenter etc)</label>      
<select
  value={bulkDesignation}
  onChange={e => setBulkDesignation(e.target.value)}
  style={{
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1'
  }}
>
  <option value="All">All Designations</option>
  {designationsList.map((d, idx) => (
    <option key={idx} value={d}>{d}</option>
  ))}
</select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Working Site</label>
        <select value={bulkSite} onChange={e => setBulkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Overtime Hours</label>
        <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>
      
<div>
  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Contract OT Hours</label>
  <input
    type="number"
    min="0"
    value={bulkContractOT}
    onChange={e => setBulkContractOT(e.target.value)}
    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
  />
</div>


      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button onClick={handleBulkAttendance} style={{ width: '100%', padding: '9px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply OT to Selected Workers</button>
      </div>
    </div>

    <div style={{ marginTop: '20px', padding: '18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
      <h3 style={{ margin: '0 0 8px', color: '#166534' }}>🟢 Site Attendance by Worker ID</h3>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#166534' }}>Date aur site select karein, phir sirf Present workers ki IDs comma, space ya new line se likhein. Selected site ke baqi workers Absent mark honge.</p>
      <form onSubmit={handleSaveSiteAttendance}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Attendance Date</label><input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} required style={{ ...fieldStyle, marginTop: 5 }} /></div>
          <div><label style={{ fontWeight: 'bold', fontSize: '12px' }}>Working Site</label><select value={siteAttendanceSite} onChange={e => setSiteAttendanceSite(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}>{sitesList.map(site => <option key={site} value={site}>{site}</option>)}</select></div>
        </div>
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginTop: 12 }}>Present Workers — ID No.</label>
        <textarea value={siteAttendanceIds} onChange={e => setSiteAttendanceIds(e.target.value)} rows={3} placeholder={'Example: 101, 102, 108\\n109\\n115'} style={{ ...fieldStyle, marginTop: 5, resize: 'vertical' }} />
        <button type="submit" disabled={siteAttendanceSaving} style={{ ...primaryStyle, marginTop: 12, background: '#15803d', opacity: siteAttendanceSaving ? .7 : 1 }}>{siteAttendanceSaving ? 'Saving Attendance…' : 'Save Site Attendance (Others Absent)'}</button>
      </form>
    </div>

    <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
      <h4 style={{ margin: '0 0 8px 0' }}>📸 OCR Scanner (For Date: {selectedTimesheetDate})</h4>
      <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
      {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
      {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
    </div>
    
{/* QUICK ATTENDANCE BOX */}
<div style={{
  marginTop: '20px',
  padding: '18px',
  backgroundColor: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '10px'
}}>
  <h3 style={{ margin: '0 0 15px', color: '#1d4ed8' }}>
    ⚡ Quick Bulk Attendance
  </h3>

  <form onSubmit={handleQuickAttendance}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      alignItems: 'end'
    }}>
      <div>
        <label>Worker ID No.</label>
        <input
          id="quick-worker-id"
          value={quickWorkerId}
          onChange={e => setQuickWorkerId(e.target.value)}
          placeholder="Enter Worker ID"
          autoComplete="off"
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
        />
      </div>

      <div>
        <label>Working Site</label>
        <select
          value={quickSite}
          onChange={e => setQuickSite(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px'
          }}
        >
          {sitesList.map(site => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>
      </div>

      <div>
        <label>OT Type</label>
        <select
          value={quickOTType}
          onChange={e => setQuickOTType(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px'
          }}
        >
          <option value="Normal OT">Normal OT</option>
          <option value="Contract OT">Contract OT</option>
        </select>
      </div>

      <div>
        <label>OT Hours</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={quickHours}
          onChange={e => setQuickHours(e.target.value)}
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={quickSaving}
        style={{
          padding: '11px',
          backgroundColor: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        {quickSaving ? 'Saving...' : 'Save & Enter'}
      </button>
    </div>

    <p style={{ fontSize: '12px', color: '#475569' }}>
      Date: {selectedTimesheetDate} | Status: Present
    </p>
  </form>
</div>

    {/* Individual Worker Attendance List */}
    <div style={{ marginTop: '30px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>
        👥 Individual Attendance ({bulkDepartment} - {selectedTimesheetDate})
      </h4>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>ID</th>
              <th style={{ padding: '8px' }}>Worker Name</th>
              <th style={{ padding: '8px' }}>Designation</th>
              <th style={{ padding: '8px' }}>Site</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>OT Hours</th>
              <th style={{ padding: '8px' }}>Contract OT</th>
              <th style={{ padding: '8px' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {(userRole.is_admin ? workers : filteredWorkers)
              .filter(w => bulkDepartment === 'All' || w.department === bulkDepartment)
              .map((worker) => {
                const record = attendanceData[selectedTimesheetDate]?.[worker.id] || { status: 'Present', ot: 0 };
                const currentSite = record.site || worker.work_site || sitesList[0] || 'Sharjah Mamzar';

                return (
                  <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{worker.worker_id || worker.id}</td>
                    <td style={{ padding: '8px' }}>{worker.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{worker.designation || '-'}</td>

                    <td style={{ padding: '8px' }}>
                      <select
                        value={currentSite}
                        onChange={(e) => {
                          const selectedSite = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                site: selectedSite
                              }
                            }
                          }));
                        }}
                        style={{ padding: '6px', borderRadius: '4px', minWidth: '130px' }}
                      >
                        {sitesList.map((site) => (
                          <option key={site} value={site}>{site}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <select
                        value={record.status}
                        onChange={(e) => {
                          const selectedStatus = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                status: selectedStatus
                              }
                            }
                          }));
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: record.status === 'Present' ? '#16a34a' : record.status === 'Absent' ? '#dc2626' : '#d97706' }}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        value={record.ot || 0}
                        onChange={(e) => {
                          const selectedOT = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                ot: selectedOT
                              }
                            }
                          }));
                        }}
                        style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={record.contract_ot ?? record.contract_overtime_hours ?? 0}
                        onChange={(e) => {
                          const selectedContractOT = e.target.value;
                          setAttendanceData(prev => ({
                            ...prev,
                            [selectedTimesheetDate]: {
                              ...(prev[selectedTimesheetDate] || {}),
                              [worker.id]: {
                                ...(prev[selectedTimesheetDate]?.[worker.id] || record),
                                contract_ot: selectedContractOT
                              }
                            }
                          }));
                        }}
                        style={{ width: '75px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>

                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={async () => {
                          const latestRecord = attendanceData[selectedTimesheetDate]?.[worker.id] || record;
                          const siteToSave = latestRecord.site || worker.work_site || sitesList[0] || 'Sharjah Mamzar';

                         
await handleSingleAttendanceChange(
  worker.id,
  selectedTimesheetDate,
  latestRecord.status || 'Present',
  latestRecord.ot ?? 0,
  siteToSave,
  latestRecord.contract_ot ?? latestRecord.contract_overtime_hours ?? 0
);

                          alert('Update Successful! Site, Status, OT aur Contract OT save kar diye gaye.');
                        }}
                        style={{
                          padding: '7px 11px',
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Update
                      </button>
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

       {/* TAB 3: WORKERS DIRECTORY */}
{activeTab === 'workers' && (userRole.is_admin || userRole.can_view_workers) && (
  <div>
    {(userRole.is_admin || userRole.can_add_workers || userRole.can_edit_workers) && (
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>{editingWorkerId ? `✏️ Edit Worker #${editingWorkerId}` : '➕ Add New Worker'}</h3>
        <form onSubmit={handleSaveWorker}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Worker ID</label>
              <input type="number" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} placeholder="e.g. 101" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Designation</label>
           
<select
  value={designation}
  onChange={e => setDesignation(e.target.value)}
  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
>
  {designationsList.map((d, idx) => (
    <option key={idx} value={d}>{d}</option>
  ))}
</select>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
  <input
    type="text"
    value={newDesignation}
    onChange={e => setNewDesignation(e.target.value)}
    placeholder="Add new designation"
    style={{
      flex: 1,
      padding: '8px',
      borderRadius: '6px',
      border: '1px solid #cbd5e1'
    }}
  />
<button
  type="button"
  onClick={async () => {
    const value = newDesignation.trim();

    if (!value) return;

    if (
      designationsList.some(
        d => d.toLowerCase() === value.toLowerCase()
      )
    ) {
      alert('Designation already exists!');
      return;
    }

    const { error } = await supabase
      .from('designations')
      .insert([{ name: value }]);

    if (error) {
      alert('Designation save nahi hui: ' + error.message);
      return;
    }

    setDesignationsList(prev => [...prev, value]);
    setDesignation(value);
    setNewDesignation('');
    alert('Designation successfully saved!');
  }}
  style={{
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer'
  }}
>
  + Add
</button>
</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Working Site</label>
              <select value={workSite} onChange={e => setWorkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Monthly Salary *</label>
              <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="3000" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Annual Leave Balance (Days)</label>
              <input type="number" min="0" step="0.5" value={annualLeaveBalance} onChange={e => setAnnualLeaveBalance(e.target.value)} placeholder="e.g. 30" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
      
          {/* DOCUMENTS UPLOAD SECTION */}
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1e293b' }}>📁 Worker Documents Upload</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Passport Copy</label>
                <input type="file" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const fileName = `pass_${Date.now()}.${file.name.split('.').pop()}`;
                    const { error: uploadError } = await supabase.storage.from('worker-documents').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from('worker-documents').getPublicUrl(fileName);
                    setPassportFileUrl(data.publicUrl);
                    alert('Passport uploaded successfully!');
                  } catch (err) {
                    alert('Passport upload error: ' + err.message);
                  }
                }} style={{ fontSize: '11px' }} />
              </div>

              <div>
  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ID Card</label>
  <input 
    type="file" 
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `idcard_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('worker-documents').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('worker-documents').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        setIdCardFileUrl(publicUrl);
        alert('ID Card uploaded successfully!');
      } catch (err) {
        alert('Upload Error: ' + err.message);
      }
    }} 
    style={{ fontSize: '11px' }} 
  />
  {idCardFileUrl && <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>✔ Saved & Ready</div>}
</div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Visa Copy</label>
                <input type="file" onChange={(e) => alert('Visa selected!')} style={{ fontSize: '11px' }} />
              </div>

            </div>
          </div>

          <button type="submit" style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {editingWorkerId ? 'Update Worker' : 'Save Worker'}
          </button>
        </form>
      </div>
    )}

    {/* WORKERS DIRECTORY TABLE */}
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <h3 style={{ margin: '0 0 15px 0' }}>👷 Workers Directory</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '10px' }}>ID & Name</th>
            <th style={{ padding: '10px' }}>Dept / Designation</th>
            <th style={{ padding: '10px' }}>Salary</th>
            <th style={{ padding: '10px' }}>Documents View</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredWorkers.map(w => (
            <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
              <td style={{ padding: '10px' }}>{w.department} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{w.designation || 'Worker'}</span></td>
              <td style={{ padding: '10px' }}>{w.monthly_salary} {w.currency || selectedCurrency}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {w.passport_file_url ? (
                    <a href={w.passport_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '3px 6px', borderRadius: '4px', textDecoration: 'none' }}>Passport</a>
                  ) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Passport</span>}
                </div>
              </td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(userRole.is_admin || userRole.can_edit_workers) && (
                    <button onClick={() => handleStartEditWorker(w)} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                  )}
                  {(userRole.is_admin || userRole.can_delete_workers) && (
                    <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
       
{/* TAB 4: TIMESHEET */}
{activeTab === 'attendance' &&
 (userRole.is_admin || userRole.can_view_timesheet) &&
 (() => {
   const reportWorkers = (userRole.is_admin ? workers : filteredWorkers).filter(w => {
     const deptScope = userRole.is_admin ? selectedDeptFilter : userRole.assigned_department;
     const siteScope = userRole.is_admin ? selectedSiteFilter : userRole.assigned_site;
     const deptMatch = !deptScope || deptScope === 'All' ||
       w.department?.toLowerCase() === deptScope.toLowerCase();
     const siteMatch = !siteScope || siteScope === 'All' ||
       w.work_site?.toLowerCase() === siteScope.toLowerCase();
     return deptMatch && siteMatch;
   });

   const getRecord = worker =>
     attendanceData[selectedTimesheetDate]?.[worker.id] ||
     attendance.find(a =>
       String(a.worker_id) === String(worker.id) &&
       a.date === selectedTimesheetDate
     ) || {};

   const getStatus = worker =>
     String(getRecord(worker).status || 'Absent').toLowerCase().replace(/_/g, ' ').trim();

   const getSite = worker =>
     getRecord(worker).site ||
     getRecord(worker).work_site ||
     worker.work_site ||
     'Unassigned';

  const presentCount = reportWorkers.filter(w => {
  const status = getStatus(w);

  const isOnAnnualLeave = annualLeaveList.some(leave => {
    const sameWorker =
      String(leave.worker_id) === String(w.id);

    const onLeave =
      leave.status !== 'Returned' &&
      leave.actual_return === 'On Leave';

    return (
      sameWorker &&
      onLeave &&
      leave.start_date <= selectedTimesheetDate &&
      selectedTimesheetDate <= leave.expected_return
    );
  });

  return status === 'present' && !isOnAnnualLeave;
}).length;
   const absentWorkers = reportWorkers.filter(w =>
     getStatus(w) === 'absent'
   );

   const annualLeaveCount = reportWorkers.filter(w =>
     ['annual leave', 'annual-leave'].includes(getStatus(w))
   ).length;

   const otherLeaveCount = reportWorkers.filter(w =>
     ['leave', 'sick leave', 'other leave'].includes(getStatus(w))
   ).length;

   const mamzarAbsent = absentWorkers.filter(w =>
     getSite(w).toLowerCase().includes('mamzar')
   ).length;

   const otherSiteAbsent = absentWorkers.filter(w =>
     !getSite(w).toLowerCase().includes('mamzar')
   ).length;

   return (
     <div style={{
       background: '#fff',
       padding: '20px',
       borderRadius: '10px',
       boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
     }}>
       <div style={{
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         flexWrap: 'wrap',
         gap: '12px',
         marginBottom: '18px'
       }}>
         <div>
           <h3 style={{ margin: 0 }}>📅 Daily Attendance Report</h3>
           <p style={{ color: '#64748b', fontSize: '12px', marginBottom: 0 }}>
             Department-wise and site-wise attendance
           </p>
         </div>

         <div>
           <label style={{
             fontWeight: 'bold',
             color: '#2563eb',
             marginRight: '8px'
           }}>
             Select Date:
           </label>
           <input
             type="date"
             value={selectedTimesheetDate}
             onChange={e => setSelectedTimesheetDate(e.target.value)}
             style={{
               padding: '8px',
               borderRadius: '6px',
               border: '1px solid #2563eb'
             }}
           />
         </div>
       </div>

       {userRole.is_admin && (
         <div style={{ marginBottom: '16px' }}>
           <label style={{ fontWeight: 'bold', marginRight: '8px' }}>
             Department:
           </label>
           <select
             value={selectedDeptFilter}
             onChange={e => setSelectedDeptFilter(e.target.value)}
             style={{ padding: '8px', borderRadius: '6px' }}
           >
             <option value="All">All Departments</option>
             {departmentsList.map((d, i) => (
               <option key={i} value={d}>{d}</option>
             ))}
           </select>
         </div>
       )}

       <div style={{
         display: 'grid',
         gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
         gap: '10px',
         marginBottom: '20px'
       }}>
         {[
           { label: 'Total Workers', value: reportWorkers.length, color: '#334155', bg: '#f1f5f9' },
           { label: 'Present', value: presentCount, color: '#166534', bg: '#dcfce7' },
           { label: 'Absent', value: absentWorkers.length, color: '#991b1b', bg: '#fee2e2' },
           { label: 'Annual Leave', value: annualLeaveCount, color: '#92400e', bg: '#fef3c7' },
           { label: 'Other Leave', value: otherLeaveCount, color: '#1e40af', bg: '#dbeafe' },
           { label: 'Mamzar Absent', value: mamzarAbsent, color: '#9f1239', bg: '#ffe4e6' },
           { label: 'Other Site Absent', value: otherSiteAbsent, color: '#6b21a8', bg: '#f3e8ff' }
         ].map(item => (
           <div key={item.label} style={{
             padding: '13px',
             borderRadius: '8px',
             background: item.bg,
             color: item.color
           }}>
             <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
               {item.label}
             </div>
             <div style={{ fontSize: '25px', fontWeight: 'bold', marginTop: '5px' }}>
               {item.value}
             </div>
           </div>
         ))}
       </div>

       <div style={{ overflowX: 'auto' }}>
         <table style={{
           width: '100%',
           borderCollapse: 'collapse',
           minWidth: '720px'
         }}>
           <thead>
             <tr style={{
               background: '#1e293b',
               color: '#fff',
               textAlign: 'left'
             }}>
               <th style={{ padding: '10px' }}>Worker</th>
               <th style={{ padding: '10px' }}>Department</th>
               <th style={{ padding: '10px' }}>Site</th>
               <th style={{ padding: '10px' }}>OT Hours</th>
               <th style={{ padding: '10px' }}>Status</th>
               <th style={{ padding: '10px' }}>Action</th>
             </tr>
           </thead>

           <tbody>
             {reportWorkers.map(worker => {
               const record = getRecord(worker);
               const savedStatus = record.status || 'Absent';
               const savedSite = getSite(worker);
               const savedOT = record.ot ?? record.overtime_hours ?? 0;

               return (
                 <tr key={worker.id} style={{
                   borderBottom: '1px solid #e2e8f0',
                   backgroundColor: savedStatus.toLowerCase() === 'absent' ? '#fee2e2' : 'transparent',
                   color: savedStatus.toLowerCase() === 'absent' ? '#991b1b' : 'inherit'
                 }}>
                   <td style={{ padding: '10px', fontWeight: 'bold' }}>
                     #{worker.id} - {worker.name}
                     <div style={{
                       fontSize: '11px',
                       color: '#64748b',
                       fontWeight: 'normal'
                     }}>
                       {worker.designation || 'Worker'}
                     </div>
                   </td>

                   <td style={{ padding: '10px' }}>
                     {worker.department || '-'}
                   </td>

                   <td style={{ padding: '10px' }}>
                     <select
                       value={timesheetSiteInputs[worker.id] || savedSite}
                       onChange={e => setTimesheetSiteInputs(prev => ({
                         ...prev,
                         [worker.id]: e.target.value
                       }))}
                       style={{ padding: '6px', maxWidth: '160px' }}
                     >
                       {!sitesList.includes(savedSite) && (
                         <option value={savedSite}>{savedSite}</option>
                       )}
                       {sitesList.map((site, i) => (
                         <option key={i} value={site}>{site}</option>
                       ))}
                     </select>
                   </td>

                   <td style={{ padding: '10px' }}>
                     <input
                       type="number"
                       min="0"
                       value={overtimeInputs[worker.id] ?? savedOT}
                       onChange={e => setOvertimeInputs(prev => ({
                         ...prev,
                         [worker.id]: e.target.value
                       }))}
                       style={{ width: '70px', padding: '6px' }}
                     />
                   </td>

                   <td style={{ padding: '10px' }}>
                     <select
                       id={`status-${worker.id}`}
                       key={`${worker.id}-${selectedTimesheetDate}-${savedStatus}`}
                       defaultValue={savedStatus}
                       style={{ padding: '6px', borderRadius: '4px' }}
                     >
                       <option value="Present">Present</option>
                       <option value="Absent">Absent</option>
                       <option value="Annual Leave">Annual Leave</option>
                       <option value="Sick Leave">Sick Leave</option>
                       <option value="Leave">Leave</option>
                       <option value="Other Leave">Other Leave</option>
                     </select>
                   </td>

                   <td style={{ padding: '10px' }}>
                     <button
                       onClick={() => {
                         const dropdown = document.getElementById(`status-${worker.id}`);
                         handleMarkAttendance(
                           worker.id,
                           dropdown ? dropdown.value : savedStatus
                         );
                       }}
                       style={{
                         padding: '7px 12px',
                         background: '#2563eb',
                         color: '#fff',
                         border: 'none',
                         borderRadius: '5px',
                         cursor: 'pointer',
                         fontWeight: 'bold'
                       }}
                     >
                       Update
                     </button>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>
     </div>
   );
 })()}
              
        {/* TAB 5A: DAILY TIMESHEET */}
        {activeTab === 'daily-timesheet' && (userRole.is_admin || userRole.can_view_timesheet) && (
         <div
  className="daily-timesheet-print"
  style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}
>
  <style>{dailyTimesheetPrintStyle}</style>

            <h2>📄 Daily Timesheet</h2>

            <div style={{
              display: 'flex',
              gap: '15px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={selectedTimesheetDate}
                  onChange={e => setSelectedTimesheetDate(e.target.value)}
                  style={{ padding: '9px', border: '1px solid #cbd5e1', borderRadius: '5px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Working Site
                </label>
                <select
                  value={dailyTimesheetSite}
                  onChange={e => setDailyTimesheetSite(e.target.value)}
                  style={{ padding: '9px', minWidth: '200px', border: '1px solid #cbd5e1', borderRadius: '5px' }}
                >
                 
<option value="All Workers">All Workers</option>
{sitesList.map((site, idx) => (
  <option key={idx} value={site}>{site}</option>
))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '950px'
              }}>
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>S.No</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Name</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Designation</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>ID</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Status</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Normal Hours</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Contract OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Total OT</th>
                    <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {(userRole.is_admin ? workers : filteredWorkers)
                    .filter(worker => {
                      const record =
                        attendanceData[selectedTimesheetDate]?.[worker.id] ||
                        attendance.find(a =>
                          String(a.worker_id) === String(worker.id) &&
                          a.date === selectedTimesheetDate
                        ) ||
                        {};
                    
const workerSite =
  record.site ||
  record.work_site ||
  worker.work_site ||
  '';
return (
  dailyTimesheetSite === 'All' ||
  dailyTimesheetSite === 'All Workers' ||
  workerSite.toLowerCase().trim() ===
    dailyTimesheetSite.toLowerCase().trim()
);
})
.map((worker, index) => {
                      const record =
                        attendanceData[selectedTimesheetDate]?.[worker.id] ||
                        attendance.find(a =>
                          String(a.worker_id) === String(worker.id) &&
                          a.date === selectedTimesheetDate
                        ) ||
                        {};
                  
                      const annualLeave = getAnnualLeaveForWorker(
                        worker.id,
                        selectedTimesheetDate
                      );

                      const status = annualLeave
                        ? 'Annual Leave'
                        : (record.status || 'Absent');

                      const ot = annualLeave
                        ? 0
                        : (Number(record.ot ?? record.overtime_hours ?? 0) || 0);

                      const contractOT = annualLeave
                        ? 0
                        : (Number(record.contract_ot ?? record.contract_overtime_hours ?? 0) || 0);

                      const totalOT = ot + contractOT;

                      const normalHours =
                        !annualLeave &&
                        String(status).toLowerCase() === 'present'
                          ? 8
                          : 0;

                      return (                       
<tr
  key={worker.id}
  style={{
    backgroundColor:
      String(status).trim().toLowerCase() === 'annual leave'
        ? '#fef3c7'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#fee2e2'
          : '#ffffff',
    color:
      String(status).trim().toLowerCase() === 'annual leave'
        ? '#92400e'
        : String(status).trim().toLowerCase() === 'absent'
          ? '#991b1b'
          : '#111827',
    fontWeight:
      ['annual leave', 'absent'].includes(String(status).trim().toLowerCase())
        ? 'bold'
        : 'normal'
  }}
>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.name || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{worker.designation || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{worker.id || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{status}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{normalHours}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{ot}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{contractOT}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{totalOT}</td>
                         <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>-</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px'
            }}>
              <strong>Daily Work Details / Remarks</strong>
              <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                {savedDailyWorkDetails || 'Is date aur site ke liye koi Daily Work Details save nahi hain.'}
              </p>
            </div>

            <div style={{ marginTop: '15px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>
        )}
       
{/* TAB 5: MONTHLY SHEET */}
{activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
  <div
    id="monthly-sheet-print"
    style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}
  >
<style>{`
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  @media print {
    body * {
      visibility: hidden !important;
    }

    #monthly-sheet-print,
    #monthly-sheet-print * {
      visibility: visible !important;
    }

    #monthly-sheet-print {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
    }

    #monthly-sheet-print .no-print {
      display: none !important;
    }

    #monthly-sheet-print table {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 9px !important;
    }

    #monthly-sheet-print th,
    #monthly-sheet-print td {
      border: 1px solid #555 !important;
      padding: 5px 3px !important;
      color: #000 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
    }

    #monthly-sheet-print h3 {
      color: #000 !important;
    }
  }
`}</style>
    <div
      className="no-print"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}
    >
      <h3 style={{ margin: 0 }}>📋 Monthly Sheet</h3>

      <button
        onClick={() => window.print()}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          padding: '10px 18px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        🖨️ Print / Save as PDF
      </button>
    </div>

    <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>
      Monthly Salary & Overtime Sheet
    </div>

    <div
      style={{
        overflowX: 'auto',
        width: '100%'
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: '750px',
          borderCollapse: 'collapse',
          textAlign: 'center',
          fontSize: '12px'
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#e2e8f0' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>S.No.</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px', textAlign: 'left' }}>Name</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>ID</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Present</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Overtime</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Overtime Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Salary Pay</th>
            <th style={{ border: '1px solid #94a3b8', padding: '9px' }}>Total Salary</th>
          </tr>
        </thead>

        <tbody>         
{salaryData.map((s, index) => {
  const totalOT = Number(s.totalOT || 0);
  const overtimePay = Number(s.otSalary || 0);
  const salaryPay = Number(s.baseSalary || 0);
  const totalSalary = Number(s.totalPayable || (salaryPay + overtimePay));

            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {index + 1}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>
                  {s.name}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {s.id}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {s.presentDays}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {totalOT} hrs
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(overtimePay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {Math.round(salaryPay).toLocaleString()} {selectedCurrency}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>
                  {Math.round(totalSalary).toLocaleString()} {selectedCurrency}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
            <td
              colSpan={7}
              style={{
                border: '1px solid #94a3b8',
                padding: '10px',
                textAlign: 'right'
              }}
            >
              GRAND TOTAL
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '10px' }}>
              {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
)}
        {/* TAB 6: CHANGE LOGIN DETAILS */}
        {activeTab === 'changepass' && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>🔑 Change Login Details</h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '13px' }}>
              {userRole.is_admin ? 'Admin yahan apna login email aur password dono change kar sakta hai.' : 'Staff apna password change kar sakta hai. Login email admin hi change karega.'}
            </p>
            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Current Password *</label>
                <input type="password" value={currentPassInput} onChange={e => setCurrentPassInput(e.target.value)} placeholder="Enter current password" autoComplete="current-password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              {userRole.is_admin && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Admin Login Email</label>
                  <input type="email" value={newLoginEmailInput} onChange={e => setNewLoginEmailInput(e.target.value)} placeholder={session?.user?.email || 'admin@nda.pk'} autoComplete="username" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Password {userRole.is_admin ? '(optional if changing email only)' : '*'}</label>
                <input type="password" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} placeholder="Enter new password" autoComplete="new-password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required={!userRole.is_admin} />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Update Login Details</button>
            </form>
          </div>
        )}

        {/* TAB 7: WORKING SITES MANAGEMENT */}
        {activeTab === 'sites' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🏗️ Manage Working Sites</h3>
            <form onSubmit={handleAddNewSite} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={newSiteInput} onChange={e => setNewSiteInput(e.target.value)} placeholder="e.g. Dubai Marina Site" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Site</button>
            </form>
            <h4>Current Active Sites:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sitesList.map((site, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8fafc', marginBottom: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#334155' }}>
                  <span>{site}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteSite(site)}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB: DEPARTMENTS MANAGEMENT */}
        {activeTab === 'departments' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🏢 Manage Departments</h3>
            <form onSubmit={handleAddNewDepartment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={newDeptInput} onChange={e => setNewDeptInput(e.target.value)} placeholder="e.g. Mechanical" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Dept</button>
            </form>
            <h4>Current Active Departments:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {departmentsList.map((dept, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8fafc', marginBottom: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#334155' }}>
                  <span>{dept}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteDepartment(dept)}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 9: PERMISSIONS PANEL */}
        {activeTab === 'permissions' && userRole.is_admin && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🔐 Granular Staff Permissions & Staff ID Allocation</h3>
            <form onSubmit={handleSavePermission} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#1e293b' }}>{targetEmail ? `✏️ Edit Access for: ${targetEmail}` : '➕ Add New Staff Access'}</h4>
                {targetEmail && (
                  <button type="button" onClick={() => {
                    setTargetStaffId('');
                    setTargetEmail('');
                    setTargetPassword('');
                    setTargetDept('All');
                    setTargetSite('All');
                    setPermDashboard(true);
                    setPermBulk(false);
                    setPermViewWorkers(true);
                    setPermAddWorkers(false);
                    setPermEditWorkers(false);
                    setPermDeleteWorkers(false);
                    setPermTimesheetView(true);
                    setPermTimesheetEdit(true);
                    setPermPayroll(false);
                  }} style={{ padding: '4px 10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Cancel Edit</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff ID</label>
                  <input type="text" value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} placeholder="e.g. STF-01" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Staff Email *</label>
                  <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="staff@nda.pk" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password *</label>
                  <input type="text" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Assigned Dept</label>
                  <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Depts</option>
                    {departmentsList.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Assigned Site</label>
                  <select value={targetSite} onChange={e => setTargetSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Sites</option>
                    {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Checkboxes Permissions */}
              <h4 style={{ margin: '15px 0 10px 0', fontSize: '14px', color: '#334155' }}>Select Permissions:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDashboard} onChange={e => setPermDashboard(e.target.checked)} /> Can View Dashboard
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permBulk} onChange={e => setPermBulk(e.target.checked)} /> Can Use Bulk & OCR
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permViewWorkers} onChange={e => setPermViewWorkers(e.target.checked)} /> Can View Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permAddWorkers} onChange={e => setPermAddWorkers(e.target.checked)} /> Can Add Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permEditWorkers} onChange={e => setPermEditWorkers(e.target.checked)} /> Can Edit Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permDeleteWorkers} onChange={e => setPermDeleteWorkers(e.target.checked)} /> Can Delete Workers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetView} onChange={e => setPermTimesheetView(e.target.checked)} /> Can View Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permTimesheetEdit} onChange={e => setPermTimesheetEdit(e.target.checked)} /> Can Edit Timesheet
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permPayroll} onChange={e => setPermPayroll(e.target.checked)} /> Can View Payroll
                </label>
              </div>

              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save / Update Staff Access</button>
            </form>

            <h4 style={{ margin: '20px 0 10px 0' }}>Existing Staff Access List & Active Permissions</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Staff ID & Email</th>
                    <th style={{ padding: '10px' }}>Dept / Site Scope</th>
                    <th style={{ padding: '10px' }}>Assigned Permissions Summary</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsList.filter(p => !p.is_admin).map((p, idx) => {
                    const activePerms = [];
                    if (p.can_view_dashboard) activePerms.push('Dashboard');
                    if (p.can_use_bulk) activePerms.push('Bulk/OCR');
                    if (p.can_view_workers) activePerms.push('View Workers');
                    if (p.can_add_workers) activePerms.push('Add Worker');
                    if (p.can_edit_workers) activePerms.push('Edit Worker');
                    if (p.can_delete_workers) activePerms.push('Delete Worker');
                    if (p.can_view_timesheet) activePerms.push('View Timesheet');
                    if (p.can_edit_timesheet) activePerms.push('Edit Timesheet');
                    if (p.can_view_payroll) activePerms.push('Payroll');

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>
                          <strong>{p.staff_id || 'N/A'}</strong><br/>
                          <span style={{ color: '#0284c7' }}>{p.user_email}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          Dept: <strong>{p.assigned_department}</strong><br/>
                          Site: <strong>{p.assigned_site}</strong>
                        </td>
                        <td style={{ padding: '10px', maxWidth: '300px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {activePerms.map((ap, i) => (
                              <span key={i} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{ap}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => {
                              setTargetStaffId(p.staff_id || '');
                              setTargetEmail(p.user_email || '');
                              setTargetPassword(p.user_password || '');
                              setTargetDept(p.assigned_department || 'All');
                              setTargetSite(p.assigned_site || 'All');
                              setPermDashboard(p.can_view_dashboard ?? true);
                              setPermBulk(p.can_use_bulk ?? false);
                              setPermViewWorkers(p.can_view_workers ?? true);
                              setPermAddWorkers(p.can_add_workers ?? false);
                              setPermEditWorkers(p.can_edit_workers ?? false);
                              setPermDeleteWorkers(p.can_delete_workers ?? false);
                              setPermTimesheetView(p.can_view_timesheet ?? true);
                              setPermTimesheetEdit(p.can_edit_timesheet ?? true);
                              setPermPayroll(p.can_view_payroll ?? false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                            <button onClick={() => handleDeleteUserPermission(p.user_email)} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
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
      {/* ADMIN ONLY: DATE / MONTH / RANGE TIMESHEET CLEANUP */}
        {activeTab === 'data-cleanup' && userRole.is_admin && (
          <div style={{ background:'#fff', padding:24, borderRadius:16, border:'1px solid #fecaca', maxWidth:850, boxShadow:'0 8px 28px #991b1b0b' }}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}><div style={{fontSize:30}}>🗑️</div><div><h2 style={{margin:0,color:'#991b1b'}}>Delete Timesheet Records</h2><p style={{margin:'5px 0 0',color:'#64748b',fontSize:13}}>Sirf selected day, poora month, ya custom date range delete karein.</p></div></div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0'}}>
              {[['day','One Day'],['month','Full Month'],['range','Date Range']].map(([value,label])=><button key={value} onClick={()=>setCleanupMode(value)} style={{padding:'10px 15px',borderRadius:9,border:cleanupMode===value?'1px solid #b91c1c':'1px solid #cbd5e1',background:cleanupMode===value?'#fee2e2':'#fff',color:cleanupMode===value?'#991b1b':'#334155',fontWeight:800,cursor:'pointer'}}>{label}</button>)}
            </div>
            {cleanupMode==='day'&&<label style={{display:'block',fontWeight:700,marginBottom:15}}>Select exact date to delete <input type="date" value={cleanupSelectedDate} onChange={e=>setCleanupSelectedDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',maxWidth:330,boxSizing:'border-box'}}/></label>}
            {cleanupMode==='month'&&<label style={{display:'block',fontWeight:700,marginBottom:15}}>Select month <input type="month" value={cleanupMonth} onChange={e=>setCleanupMonth(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',maxWidth:330,boxSizing:'border-box'}}/></label>}
            {cleanupMode==='range'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:15}}><label style={{fontWeight:700}}>From date<input type="date" value={cleanupStartDate} onChange={e=>setCleanupStartDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',boxSizing:'border-box'}}/></label><label style={{fontWeight:700}}>To date<input type="date" value={cleanupEndDate} onChange={e=>setCleanupEndDate(e.target.value)} style={{display:'block',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:8,width:'100%',boxSizing:'border-box'}}/></label></div>}
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',padding:13,borderRadius:10,color:'#9a3412',fontSize:13,margin:'12px 0 18px'}}><b>Important:</b> Selected date(s) bhi delete hon gi. {cleanupMode==='month'?'Selected month ke pehle se aakhri din tak tamam records delete honge.':cleanupMode==='range'?'From aur To dono dates include hain.':'Sirf isi date ki timesheet delete hogi.'} Delete hone ke baad restore nahi kar sakte.</div>
            <div style={{display:'grid',gap:12,marginBottom:20}}>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupAttendance} onChange={e=>setCleanupAttendance(e.target.checked)}/><span><b>Timesheet / Attendance</b> — status, normal OT, contract OT, site</span></label>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupDailyDetails} onChange={e=>setCleanupDailyDetails(e.target.checked)}/><span><b>Daily work details</b> — site remarks and daily work notes</span></label>
              <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={cleanupAnnualLeaves} onChange={e=>setCleanupAnnualLeaves(e.target.checked)}/><span><b>Completed annual leave records</b> — records starting inside the selected date range; active “On Leave” records are excluded</span></label>
            </div>
            <button type="button" disabled={cleanupLoading} onClick={handleDeleteOldRecords} style={{padding:'12px 18px',background:cleanupLoading?'#9ca3af':'#b91c1c',color:'#fff',border:0,borderRadius:9,fontWeight:800,cursor:cleanupLoading?'wait':'pointer'}}>{cleanupLoading?'Deleting records…':'Permanently Delete Selected Records'}</button>
          </div>
        )}

     {/* TAB 10: ANNUAL LEAVES, PENALTIES & 12-MONTH DEDUCTION */}
        {activeTab === 'annualLeave' && userRole.is_admin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}>UAE Labor Law: Annual Leave & 12-Month Overstay Deductions</h2>
              <button onClick={() => {
                setTargetStaffId('');
                setLeaveWorkerId('');
                setLeaveStartDate('');
                setLeaveExpectedReturnDate('');
                setLeaveActualReturnDate('');
                setHasDeduction(true);
                setMonthlyDeductions({});
                setLeaveModalOpen(true);
              }} style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Record Annual Leave</button>
            </div>

            {leaveModalOpen && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>{targetStaffId ? '✏️ Edit Leave & 12-Month Deduction' : 'Add Leave & Multi-Month Deduction Breakdown'}</h3>
                <form onSubmit={handleSaveAnnualLeave}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Worker</label>
                      <select value={leaveWorkerId} onChange={e => setLeaveWorkerId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required>
                        <option value="">Choose Worker...</option>
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>#{w.id} - {w.name} ({w.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Leave Start Date</label>
                      <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Expected Return Date</label>
                      <input type="date" value={leaveExpectedReturnDate} onChange={e => setLeaveExpectedReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Actual Return Date (Optional)</label>
                      <input type="date" value={leaveActualReturnDate} onChange={e => setLeaveActualReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                 
                  {/* Deduction Controls & 12-Month Breakdown Section */}
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <input type="checkbox" id="hasDeductionCheck" checked={hasDeduction} onChange={e => setHasDeduction(e.target.checked)} style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }} />
                      <label htmlFor="hasDeductionCheck" style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer' }}>Overstay Penalty / Deduction Applicable?</label>
                    </div>

                    {hasDeduction && (
                      <div>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
                          📅 Select Month-by-Month Deduction Days (Up to next 12 Months):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          {Array.from({ length: 12 }).map((_, i) => {
                            const d = new Date();
                            d.setMonth(d.getMonth() + i);
                            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });

                            return (
                              <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{monthName}</label>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  min="0"
                                  placeholder="Days (e.g. 5)" 
                                  value={monthlyDeductions[monthKey] || ''} 
                                  onChange={e => {
                                    setMonthlyDeductions({
                                      ...monthlyDeductions,
                                      [monthKey]: e.target.value
                                    });
                                  }} 
                                  style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          * Jis mahine mein jitne din deduct karne hain wahan enter karein.
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{targetStaffId ? 'Update Record' : 'Save Leave Record'}</button>
                    <button type="button" onClick={() => setLeaveModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Table View */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '12px' }}>Worker ID</th>
                    <th style={{ padding: '12px' }}>Leave Period</th>
                    <th style={{ padding: '12px' }}>Actual Return</th>
                    <th style={{ padding: '12px' }}>Deduction Breakdown / Total</th>
                    <th style={{ padding: '12px' }}>Accrued Leave Balance</th>
                    <th style={{ padding: '12px' }}>Leave Days Used</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    {userRole.is_admin && <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {annualLeaveList.length === 0 ? (
                    <tr><td colSpan={userRole.is_admin ? 8 : 7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No annual leave records found.</td></tr>
                  ) : (
                    annualLeaveList.map((leave, idx) => {
                      

let accruedDays = 0;

const today = new Date();
today.setHours(0, 0, 0, 0);

const startDate = leave.start_date
  ? new Date(leave.start_date + 'T00:00:00')
  : null;

const actualReturnDate =
  leave.actual_return && leave.actual_return !== 'On Leave'
    ? new Date(leave.actual_return + 'T00:00:00')
    : null;

let leaveDaysUsed = 0;

if (startDate) {
  const endDate = actualReturnDate || today;
  const diffDays = Math.floor(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  );
  leaveDaysUsed = Math.max(0, diffDays + 1);
}

// Is worker ke tamam leave records date ke hisaab se
// arrange karke balance calculate karein.
const workerLeaves = annualLeaveList
  .filter(
    item => String(item.worker_id) === String(leave.worker_id)
  )
  .slice()
  .sort((a, b) =>
    String(a.start_date || '').localeCompare(
      String(b.start_date || '')
    )
  );

let balance = 0;
let lastReturn = null;
let firstReturnFound = false;

for (const item of workerLeaves) {
  const s = item.start_date
    ? new Date(item.start_date + 'T00:00:00')
    : null;

  const r =
    item.actual_return && item.actual_return !== 'On Leave'
      ? new Date(item.actual_return + 'T00:00:00')
      : null;

  if (!s) continue;

  // Pehli recorded Actual Return Date se earning shuru.
  if (!firstReturnFound) {
    if (r) {
      lastReturn = r;
      firstReturnFound = true;
    }
    continue;
  }

  // Wapsi se agli annual leave tak 2.5 din per month.
  if (lastReturn) {
    const daysBetween = Math.max(
      0,
      Math.floor((s - lastReturn) / (1000 * 60 * 60 * 24))
    );

    balance += daysBetween * (30 / 365);
  }

  // Guzari hui annual leave balance se minus.
  const end = r || today;
  const usedDays = Math.max(
    0,
    Math.floor((end - s) / (1000 * 60 * 60 * 24)) + 1
  );

  balance -= usedDays;

  if (r) {
    lastReturn = r;
  } else {
    // Worker abhi leave par hai; earning ruki rahegi.
    lastReturn = null;
    break;
  }
}

// Agar worker wapas aa chuka hai, to aaj tak earning jorein.
if (lastReturn) {
  const daysSinceReturn = Math.max(
    0,
    Math.floor((today - lastReturn) / (1000 * 60 * 60 * 24))
  );

  balance += daysSinceReturn * (30 / 365);
}

accruedDays = balance.toFixed(1);
                      return (
                        <tr key={leave.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px' }}>#{leave.worker_id}</td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            <div><strong>Start:</strong> {leave.start_date}</div>
                            <div><strong>Expected:</strong> {leave.expected_return}</div>
                          </td>
                          <td style={{ padding: '12px' }}>{leave.actual_return}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: Number(leave.deduction_days) > 0 ? 'bold' : 'normal', color: Number(leave.deduction_days) > 0 ? '#dc2626' : 'inherit' }}>
                              Total: {leave.deduction_days} Days
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                              {leave.deduction_breakdown || 'No Breakdown'}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {leave.actual_return && leave.actual_return !== 'On Leave' ? (
                              <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', fontSize: '12px' }}>
                                🟢 {accruedDays} Days Accumulated
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Pending Return</span>
                            )}
                          </td>
                          
<td style={{ padding: '12px' }}>
  <span style={{
    padding: '4px 8px',
    borderRadius: '4px',
    background: '#fff7ed',
    color: '#c2410c',
    fontWeight: 'bold',
    fontSize: '12px'
  }}>
    {leaveDaysUsed} Days
  </span>
</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: leave.status === 'Returned' ? '#dcfce7' : '#fef9c3', color: leave.status === 'Returned' ? '#166534' : '#854d0e' }}>
                              {leave.status}
                            </span>
                          </td>
                          {userRole.is_admin && (
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button onClick={() => {
                                  setTargetStaffId(leave.id);
                                  setLeaveWorkerId(leave.worker_id);
                                  setLeaveStartDate(leave.start_date);
                                  setLeaveExpectedReturnDate(leave.expected_return);
                                  setLeaveActualReturnDate(leave.actual_return === 'On Leave' ? '' : leave.actual_return);
                                  setHasDeduction(leave.has_deduction ?? true);
                                  setMonthlyDeductions({});
                                  setLeaveModalOpen(true);
                                }} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                                <button onClick={async () => {
                                  if (confirm('Kya aap waqai is leave record ko delete karna chahte hain?')) {
                                    const { error } = await supabase.from('annual_leaves').delete().eq('id', leave.id);
                                    if (error) {
                                      alert('Error deleting record: ' + error.message);
                                    } else {
                                      setAnnualLeaveList(annualLeaveList.filter(l => l.id !== leave.id));
                                      alert('Record delete ho gaya!');
                                      fetchAnnualLeaves();
                                    }
                                  }
                                }} style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* 📊 MONTHLY TIMESHEET MODAL WITH SEARCH, DEPT FILTER & VIEW/PRINT OPTIONS */}
{showMonthlyTimesheetModal && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '1050px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📊 Monthly Timesheet & Worker Report</h2>
        <button 
          onClick={() => setShowMonthlyTimesheetModal(false)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✕ Close
        </button>
      </div>     
<style>{`
  @media print {
    .monthly-timesheet-filters {
      display: none !important;
    }

    .monthly-timesheet-actions {
      display: none !important;
    }
  }
`}</style>

      {/* Filters: Search, Department, Month, Year */}
    <div className="monthly-timesheet-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Search by ID or Name */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Search Worker (ID / Name)</label>
            <input 
              type="text" 
              placeholder="e.g. 101 or John..." 
              value={timesheetSearchQuery} 
              onChange={e => setTimesheetSearchQuery(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '180px' }}
            />
          </div>

          {/* Department Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Filter Department</label>
            <select 
              value={selectedDeptFilter || 'All'} 
              onChange={e => setSelectedDeptFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '150px' }}
            >
              <option value="All">All Departments</option>
              {departmentsList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Month</label>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Year</label>
            <input 
              type="number" 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '90px' }} 
            />
          </div>
        </div>

        <button 
          onClick={() => window.print()} 
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          🖨️ Print Full Report
        </button>
      </div>

      {/* Filtered & Searched Workers List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '10px' }}>Worker ID & Name</th>
              <th style={{ padding: '10px' }}>Department</th>
              <th style={{ padding: '10px' }}>Working Site</th>
              <th className="monthly-timesheet-actions" style={{ padding: '10px', textAlign: 'center' }}>Actions (View / Print / PDF)</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers
              .filter(w => {
                const matchesDept = selectedDeptFilter === 'All' || !selectedDeptFilter || w.department === selectedDeptFilter;
                const matchesSearch = !timesheetSearchQuery || 
                  String(w.id).toLowerCase().includes(timesheetSearchQuery.toLowerCase()) || 
                  w.name.toLowerCase().includes(timesheetSearchQuery.toLowerCase());
                return matchesDept && matchesSearch;
              })
              .map(w => (
              <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
                <td style={{ padding: '10px' }}>{w.department}</td>
                <td style={{ padding: '10px' }}>{w.work_site || sitesList[0]}</td>
                <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  
                  {/* View Timesheet Button */}
                  <button 
                    onClick={() => setViewingWorkerTimesheet(w)} 
                    style={{ padding: '6px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    👁️ View Timesheet
                  </button>

                  {/* Print / PDF Button */}
                  <button 
                    onClick={() => handlePrintWorkerMonthlyReport(w)} 
                    style={{ padding: '6px 10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    📄 Print / PDF
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
)}
      {/* 👁 SINGLE WORKER TIMESHEET PREVIEW MODAL */}
{viewingWorkerTimesheet && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
      
      {/* Modal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: 'bold' }}>📄 Monthly Timesheet Details</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Worker: <b>#{viewingWorkerTimesheet.id} - {viewingWorkerTimesheet.name}</b> | Dept: {viewingWorkerTimesheet.department} | Month: {selectedMonth + 1} / {selectedYear}
          </p>
        </div>
        <button 
          onClick={() => setViewingWorkerTimesheet(null)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✕ Close View
        </button>
      </div>

      {/* Worker Basic Info Card */}
      <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '13px' }}>
          <div><b>Designation:</b> {viewingWorkerTimesheet.designation || 'Worker'}</div>
          <div><b>Working Site:</b> {viewingWorkerTimesheet.work_site || 'N/A'}</div>
          <div><b>Monthly Salary:</b> {viewingWorkerTimesheet.monthly_salary || 'N/A'} {viewingWorkerTimesheet.currency || 'AED'}</div>
        </div>
      </div>

      {/* Timesheet Table Preview using real attendance data */}
      <div style={{ marginBottom: '20px', maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Date</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Status</th>
             <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Normal OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Contract OT</th>
<th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Total OT</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Site</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
        const workerAttendance = attendance.filter(
  a =>
    String(a.worker_id) ===
    String(viewingWorkerTimesheet.id)
);

const monthlyRows = workerAttendance.map(att => {
  const annualLeave = getAnnualLeaveForWorker(
    viewingWorkerTimesheet.id,
    String(att.date).slice(0, 10)
  );

  return {
    ...att,
    status: annualLeave ? 'Annual Leave' : att.status,
    overtime_hours: annualLeave ? 0 : (att.overtime_hours || 0)
  };
});

return monthlyRows.map((att, idx) => {
  const rowStatus = String(att.status || '').trim().toLowerCase();

  let rowBg = '#ffffff';
  let statusBg = '#dcfce7';
  let statusColor = '#166534';

  if (rowStatus === 'annual leave') {
    rowBg = '#fef3c7';
    statusBg = '#fef3c7';
    statusColor = '#92400e';
  } else if (rowStatus === 'absent') {
    rowBg = '#fee2e2';
    statusBg = '#fee2e2';
    statusColor = '#991b1b';
  } else if (rowStatus === 'sick leave' || rowStatus === 'other leave') {
    rowBg = '#ffedd5';
    statusBg = '#ffedd5';
    statusColor = '#9a3412';
  } else if (rowStatus === 'present') {
    rowBg = '#dcfce7';
    statusBg = '#dcfce7';
    statusColor = '#166534';
  }

  return (
    <tr
      key={idx}
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: rowBg
      }}
    >
      <td style={{ padding: '8px 10px', fontWeight: '500' }}>
        {att.date}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: statusBg,
            color: statusColor,
            fontWeight: 'bold'
          }}
        >
          {att.status}
        </span>
      </td>
     <td style={{ padding: '8px 10px', color: '#475569' }}>
  {Number(att.overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', color: '#7c3aed' }}>
  {Number(att.contract_overtime_hours) || 0} Hours
</td>
<td style={{ padding: '8px 10px', fontWeight: 'bold' }}>
  {(Number(att.overtime_hours) || 0) +
   (Number(att.contract_overtime_hours) || 0)} Hours
</td>
      <td style={{ padding: '8px 10px', color: '#64748b' }}>
        {att.work_site || viewingWorkerTimesheet.work_site || 'N/A'}
      </td>
    </tr>
  );
});
            })()}
          </tbody>
        </table>
      </div>

      {/* Action Buttons inside View Modal */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button 
          onClick={() => handlePrintWorkerMonthlyReport(viewingWorkerTimesheet)}
          style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          🖨️ Print / Download PDF
        </button>
        <button 
          onClick={() => setViewingWorkerTimesheet(null)}
          style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          Close
        </button>
      </div>

    </div>
  </div>
)}
      </main>
     
{/* Footer */}
<div
  style={{
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
    padding: '12px',
    marginTop: '20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 'bold',
    borderTop: '1px solid #cbd5e1'
  }}
>
</div>
    </div>
  );
}
