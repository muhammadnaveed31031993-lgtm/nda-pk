import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
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
  
  // Password Change States
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');

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
  const [monthlySalary, setMonthlySalary] = useState('');
  const [religion, setReligion] = useState('Muslim');
  
  const [lastReturnDate, setLastReturnDate] = useState('');
  const [annualLeaveRate, setAnnualLeaveRate] = useState('30');

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

  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [timesheetSiteInputs, setTimesheetSiteInputs] = useState({});
  const [attendanceData, setAttendanceData] = useState({});

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

 async function handleSaveAnnualLeave(e) {
    e.preventDefault();
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
    const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    setAttendance(data || []);
  }
  async function handleUpdateExtension(workerId, newExtensionDays) {
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
    if (!newPassInput.trim()) return alert('Naya password enter karein!');

    if (session.user.email === 'admin@nda.pk') {
      alert('Admin password updated locally!');
      setNewPassInput('');
      setCurrentPassInput('');
      return;
    }

    const { error } = await supabase
      .from('user_permissions')
      .update({ user_password: newPassInput.trim() })
      .eq('user_email', session.user.email);

    if (error) alert('Error: ' + error.message);
    else {
      alert('Password successfully changed!');
      setCurrentPassInput('');
      setNewPassInput('');
    }
  }

  async function handleScanPaperSheet(event) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) {
      return alert('Aapko timesheet scan ki permission nahi hai!');
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
      if (!apiKey) throw new Error("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");

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
      // State for Annual Leave tracking
  const [annualLeaveList, setAnnualLeaveList] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveWorkerId, setLeaveWorkerId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveExpectedReturnDate, setLeaveExpectedReturnDate] = useState('');
  const [leaveActualReturnDate, setLeaveActualReturnDate] = useState('');
  const [penaltyPerMonthDays, setPenaltyPerMonthDays] = useState(5); // Default 5 days deduction per month extra

  // Fetch Annual Leaves from Supabase on load
  async function fetchAnnualLeaves() {
    const { data, error } = await supabase.from('annual_leaves').select('*');
    if (error) {
      console.error('Error fetching annual leaves:', error.message);
    } else {
      setAnnualLeaveList(data || []);
    }
  }

  // Component load hone par data fetch karne ke liye (Aap isay apne existing useEffect mein bhi call kar sakte hain)
  useEffect(() => {
    fetchAnnualLeaves();
  }, []);
  
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

    if (cleanEmail === 'admin@nda.pk' && cleanPassword === '123456') {
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
      setAuthLoading(false);
      setActiveTab('dashboard');
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
        staff_id: userPerm.staff_id || '',
        assigned_department: userPerm.assigned_department || 'All',
        assigned_site: userPerm.assigned_site || 'All',
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

      if (staffRole.assigned_department !== 'All') setSelectedDeptFilter(staffRole.assigned_department);
      if (staffRole.assigned_site !== 'All') setSelectedSiteFilter(staffRole.assigned_site);

      localStorage.setItem('nda_user_session', JSON.stringify(sessionObj));

      if (staffRole.can_view_dashboard) setActiveTab('dashboard');
      else if (staffRole.can_view_timesheet) setActiveTab('attendance');
      else if (staffRole.can_view_workers) setActiveTab('workers');

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
      return alert('Permission denied!');
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
    setPassportFileUrl('');
    setIdCardFileUrl('');
    setMedicalCardFileUrl('');
    setVisaFileUrl('');
    setLabourCardFileUrl('');
  }

  async function handleSaveWorker(e) {
    e.preventDefault();
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

  // 1. Print Individual Worker Monthly Report
  function handlePrintWorkerMonthlyReport(worker) {
    const workerAttendance = attendance.filter(a => a.worker_id === worker.id);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Overtime Report - #${worker.id} ${worker.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
            h2 { border-bottom: 2px solid #2563eb; padding-bottom: 8px; color: #1e293b; }
            .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h2>NDA-PK SYSTEM - Individual Worker Monthly Report</h2>
          <div class="box">
            <p><strong>Worker ID:</strong> #${worker.id}</p>
            <p><strong>Name:</strong> ${worker.name}</p>
            <p><strong>Department:</strong> ${worker.department} | <strong>Site:</strong> ${worker.work_site || 'N/A'}</p>
            <p><strong>Monthly Salary:</strong> ${worker.monthly_salary || (worker.daily_rate * totalDaysInCurrentMonth)} ${worker.currency || 'AED'}</p>
          </div>
          <h3>Daily Attendance & Overtime Record</h3>
          <table>
            <tr><th>Date</th><th>Status</th><th>Overtime Hours</th><th>Site</th></tr>
            ${workerAttendance.length === 0 ? '<tr><td colspan="4">No attendance records found.</td></tr>' : 
              workerAttendance.map(att => `
                <tr>
                  <td>${att.date}</td>
                  <td>${att.status}</td>
                  <td>${att.overtime_hours || 0} Hours</td>
                  <td>${att.work_site || worker.work_site || 'N/A'}</td>
                </tr>
              `).join('')}
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 2. Handle Bulk Attendance & Overtime (Supports 'All' Departments & Designations)
  async function handleBulkAttendance() {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) return;
    
    let deptWorkers = workers.filter(w => {
      const matchDept = bulkDepartment === 'All' || (w.department && w.department.toLowerCase() === bulkDepartment.toLowerCase());
      const matchDesig = bulkDesignation === 'All' || (w.designation && w.designation.toLowerCase() === bulkDesignation.toLowerCase());
      return matchDept && matchDesig;
    });

    if (deptWorkers.length === 0) {
      return alert(`No workers found matching department (${bulkDepartment}) and designation (${bulkDesignation})!`);
    }

    const records = deptWorkers.map(w => ({
      worker_id: w.id,
      date: selectedTimesheetDate,
      status: bulkStatus,
      overtime_hours: Number(bulkOT) || 0,
      department: w.department,
      work_site: bulkSite
    }));

    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Update local state instantly for UI & Monthly Timesheet
      setAttendanceData(prev => {
        const updated = { ...prev };
        if (!updated[selectedTimesheetDate]) updated[selectedTimesheetDate] = {};
        
        deptWorkers.forEach(w => {
          updated[selectedTimesheetDate][w.id] = {
            status: bulkStatus,
            ot: Number(bulkOT) || 0,
            site: bulkSite
          };
        });
        return updated;
      });

      alert(`Attendance saved successfully for date ${selectedTimesheetDate} (${deptWorkers.length} workers)!`);
      fetchAttendance();
    }
  }

  // 3. Handle Single Attendance & OT Change (Auto-saves to DB and updates Monthly Timesheet)
  async function handleSingleAttendanceChange(workerId, dateStr, newStatus, newOt) {
    setAttendanceData(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [workerId]: { 
          status: newStatus, 
          ot: Number(newOt) || 0 
        }
      }
    }));

    const worker = workers.find(w => w.id === workerId);
    const assignedSite = worker?.work_site || sitesList[0] || 'Sharjah Mamzar';

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert([
          { 
            worker_id: workerId, 
            date: dateStr, 
            status: newStatus, 
            overtime_hours: Number(newOt) || 0,
            department: worker?.department,
            work_site: assignedSite
          }
        ], { onConflict: 'worker_id,date' });

      if (error) {
        console.error('Error auto-saving attendance:', error.message);
      }
    } catch (err) {
      console.error('Exception during attendance auto-save:', err);
    }
  }

  // 4. Handle Mark Single Attendance (For timesheet table)
  async function handleMarkAttendance(workerId, status) {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) return;
    const otHours = Number(overtimeInputs[workerId] || 0);
    const worker = workers.find(w => w.id === workerId);
    const assignedSiteForToday = timesheetSiteInputs[workerId] || worker?.work_site || sitesList[0];
    
    const { error } = await supabase.from('attendance').upsert([
      { worker_id: workerId, date: selectedTimesheetDate, status, overtime_hours: otHours, department: worker?.department, work_site: assignedSiteForToday }
    ], { onConflict: 'worker_id,date' });

    if (error) alert('Error: ' + error.message);
    else fetchAttendance();
  }

  // 5. Handle Save Staff Permissions
  async function handleSavePermission(e) {
    e.preventDefault();
    if (!targetEmail || !targetPassword) return;

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

  const presentCountForDate = Object.values(latestAttendanceMap).filter(a => a.status === 'Present').length;

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
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>Sites & Staff Login</p>
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
        <button 
          onClick={() => setShowMonthlyTimesheetModal(true)} 
          style={{ padding: '10px 15px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}
        >
          📊 Monthly Timesheet
        </button>
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
  <div>
    
    {/* Stats Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
      <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #2563eb' }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>Filtered Workers</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{filteredWorkers.length}</div>
      </div>
      <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #16a34a' }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>Present on {selectedTimesheetDate}</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{presentCountForDate}</div>
      </div>
      {(userRole.is_admin || userRole.can_view_payroll) && (
        <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #0891b2' }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>Total Payroll</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}</div>
        </div>
      )}
    </div>

    {/* Department & Location Wise Boxes Grid */}
<h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#1e293b' }}>Departments, Designations & Site Locations Wise Breakdown</h3>
<p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
  Har department ke andar designations (jaise Carpenter, Helper) aur har site (jaise Sharjah Mamzar, Ajman Aaliya) ke mutabiq workers ki ginti alag alag show ho rahi hai. Kisi bhi department ke box par click kar ke aap complete list bhi dekh sakte hain.
</p>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
  {departmentsList.map(dept => {
    const deptWorkers = workers.filter(w => w.department === dept);
    const totalCount = deptWorkers.length;
    const designationsInDept = Array.from(new Set(deptWorkers.map(w => w.designation || 'Worker')));

    return (
      <div 
        key={dept} 
        style={{ 
          background: '#ffffff', 
          border: '1px solid #cbd5e1', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}
      >
        {/* Clickable Department Header to open modal */}
        <div onClick={() => setModalDepartment(dept)} style={{ cursor: 'pointer' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#1e293b', borderBottom: '2px solid #2563eb', paddingBottom: '6px' }}>
            🏢 {dept}
          </h3>
          <p style={{ margin: '6px 0 12px 0', color: '#0f172a', fontSize: '14px' }}>
            Total Workers: <strong>{totalCount}</strong>
          </p>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

        {designationsInDept.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>No workers assigned.</div>
        ) : (
          designationsInDept.map(desig => {
            const desigWorkers = deptWorkers.filter(w => (w.designation || 'Worker') === desig);
            
            return (
              <div key={desig} style={{ marginTop: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  <span>🛠️ {desig}:</span>
                  <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    {desigWorkers.length} Total
                  </span>
                </div>

                {/* Site-wise breakdown (Mamzar, Ajman, etc. alag alag) */}
                {sitesList.map(site => {
                  const siteWorkersCount = desigWorkers.filter(w => (w.work_site || sitesList[0]) === site).length;
                  if (siteWorkersCount === 0) return null;

                  return (
                    <div key={site} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingLeft: '8px', color: '#334155', margin: '3px 0', borderLeft: '3px solid #0ea5e9' }}>
                      <span>📍 {site}:</span>
                      <strong style={{ color: '#0284c7', fontSize: '13px' }}>{siteWorkersCount} Workers</strong>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    );
  })}
</div>
{/* Modal / Popup for Specific Department Workers */}
{modalDepartment && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  }}>
    <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '750px', maxHeight: '80vh', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>{modalDepartment} - Workers Detail</h2>
        <button 
          onClick={() => setModalDepartment(null)} 
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Close X
        </button>
      </div>
      {/* Modal Workers List */}
      <div style={{ marginTop: '10px' }}>
        {workers
          .filter(w => w.department === modalDepartment)
          .map(w => (
            <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>#{w.id} - {w.name}</strong> <br/>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{w.designation || 'Worker'}</span>
              </div>
              <span style={{ color: '#0284c7', fontWeight: 'bold', fontSize: '13px' }}>Site: {w.work_site || 'Not Assigned'}</span>
            </div>
          ))}
      </div>

    </div>
  </div>
)}
        
                  {/* Location Filter Tabs inside Modal */}
                  <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setModalLocationTab('All')}
                      style={{ 
                        background: modalLocationTab === 'All' ? '#2563eb' : '#e2e8f0', 
                        color: modalLocationTab === 'All' ? '#fff' : '#000', 
                        border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' 
                      }}
                    >
                      All Locations
                    </button>
                    {sitesList.map(site => (
                      <button 
                        key={site}
                        onClick={() => setModalLocationTab(site)}
                        style={{ 
                          background: modalLocationTab === site ? '#2563eb' : '#e2e8f0', 
                          color: modalLocationTab === site ? '#fff' : '#000', 
                          border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' 
                        }}
                      >
                        {site}
                      </button>
                    ))}
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
                        {workers
                          .filter(w => w.department === modalDepartment)
                          .filter(w => modalLocationTab === 'All' || w.work_site === modalLocationTab)
                          .map(worker => (
                            <tr key={worker.id}>
                              <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>#{worker.id}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>{worker.name}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>{worker.designation || 'N/A'}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '9px', fontSize: '13px' }}>{worker.work_site || 'N/A'}</td>
                           </tr>
              ))}
            </tbody>
          </table>
        </div>

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
          </div>
        )}

       {/* TAB 2: BULK & OCR */}
        {activeTab === 'bulk' && (userRole.is_admin || userRole.can_use_bulk) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>⚡ Bulk Attendance, Designation OT & Date Selection</h3>
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
                <select value={bulkDesignation} onChange={e => setBulkDesignation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="All">All Designations</option>
                  <option value="Steel Fixer">Steel Fixer</option>
                  <option value="Carpenter">Carpenter</option>
                  <option value="Plumber">Plumber</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Worker">Worker</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Working Site</label>
                <select value={bulkSite} onChange={e => setBulkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Status</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Overtime Hours</label>
                <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={handleBulkAttendance} style={{ width: '100%', padding: '9px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply Bulk & Update</button>
              </div>
            </div>

            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>📸 OCR Scanner (For Date: {selectedTimesheetDate})</h4>
              <input type="file" accept="image/*" onChange={handleScanPaperSheet} disabled={scanning} />
              {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold' }}>{scanStatus}</p>}
              {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{scanStatus}</p>}
            </div>

            {/* Individual Worker Attendance List for the Selected Date & Department */}
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
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>OT Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers && workers
                      .filter(w => bulkDepartment === 'All' || w.department === bulkDepartment)
                      .map((worker) => {
                        const record = attendanceData[selectedTimesheetDate]?.[worker.id] || { status: 'Present', ot: 0 };
                        
                        return (
                          <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{worker.worker_id || worker.id}</td>
                            <td style={{ padding: '8px' }}>{worker.name}</td>
                            <td style={{ padding: '8px', color: '#64748b' }}>{worker.designation || '-'}</td>
                            <td style={{ padding: '8px' }}>
                              <select 
                                value={record.status} 
                                onChange={(e) => handleSingleAttendanceChange(worker.id, selectedTimesheetDate, e.target.value, record.ot)}
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
                                onChange={(e) => handleSingleAttendanceChange(worker.id, selectedTimesheetDate, record.status, e.target.value)}
                                style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                              />
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
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Designation (Steel Fixer, Carpenter etc)</label>
                      <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Steel Fixer" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Working Site</label>
                      <select value={workSite} onChange={e => setWorkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Monthly Salary ({selectedCurrency}) *</label>
                      <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="3000" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                    </div>
                  </div>
                  <button type="submit" style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {editingWorkerId ? 'Update Worker' : 'Save Worker'}
                  </button>
                </form>
              </div>
            )}

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>👷 Workers Directory</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>ID & Name</th>
                    <th style={{ padding: '10px' }}>Dept / Designation</th>
                    <th style={{ padding: '10px' }}>Working Site</th>
                    <th style={{ padding: '10px' }}>Salary</th>
                    <th style={{ padding: '10px' }}>Monthly OT Report & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>#{w.id} - {w.name}</td>
                      <td style={{ padding: '10px' }}>{w.department} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{w.designation || 'Worker'}</span></td>
                      <td style={{ padding: '10px' }}><span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{w.work_site || sitesList[0]}</span></td>
                      <td style={{ padding: '10px' }}>{w.monthly_salary} {w.currency || selectedCurrency}</td>
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
        {activeTab === 'attendance' && (userRole.is_admin || userRole.can_view_timesheet) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>📅 Daily Timesheet & Past Date Correction</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>Select Attendance Date:</label>
                <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #2563eb', fontWeight: 'bold' }} />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}>Aap yahan se koi bhi pichli date select kar ke kisi bhi worker ka attendance ya overtime manually change ya update kar sakte hain. Purana record automatically update ho jayega.</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Worker & Designation</th>
                    <th style={{ padding: '10px' }}>Working Site for {selectedTimesheetDate}</th>
                    <th style={{ padding: '10px' }}>Overtime (Hrs)</th>
                    <th style={{ padding: '10px' }}>Attendance Status ({selectedTimesheetDate})</th>
                  </tr>
                </thead>
                <tbody>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
  <thead>
    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
      <th style={{ padding: '10px' }}>Worker Name</th>
      <th style={{ padding: '10px' }}>Site</th>
      <th style={{ padding: '10px' }}>Overtime (Hrs)</th>
      <th style={{ padding: '10px' }}>Status</th>
      <th style={{ padding: '10px' }}>Action</th>
    </tr>
  </thead>
  <tbody>
    {filteredWorkers.map(worker => (
      <tr key={worker.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
        
        {/* 1. Worker Name & Details */}
        <td style={{ padding: '10px', fontWeight: 'bold' }}>
          #{worker.id} - {worker.name} <br/>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
            {worker.designation || 'Worker'} ({worker.department})
          </span>
        </td>
        
        {/* 2. Site Option (Dropdown) */}
        <td style={{ padding: '10px' }}>
          <select 
            value={timesheetSiteInputs[worker.id] || worker.work_site || sitesList[0]} 
            onChange={e => setTimesheetSiteInputs({...timesheetSiteInputs, [worker.id]: e.target.value})}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0369a1' }}
          >
            {sitesList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
          </select>
        </td>

        {/* 3. Overtime Input */}
        <td style={{ padding: '10px' }}>
          <input 
            type="number" 
            placeholder="OT Hrs" 
            value={overtimeInputs[worker.id] || ''} 
            onChange={e => setOvertimeInputs({...overtimeInputs, [worker.id]: e.target.value})} 
            style={{ width: '70px', padding: '5px' }} 
          />
        </td>

        {/* 4. Status Dropdown (Present / Absent / Leave) */}
        <td style={{ padding: '10px' }}>
          <select 
            id={`status-${worker.id}`}
            defaultValue="Present"
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Leave">Leave</option>
          </select>
        </td>

        {/* 5. Row-level Update Button */}
        <td style={{ padding: '10px' }}>
          <button 
            onClick={() => {
              const statusDropdown = document.getElementById(`status-${worker.id}`);
              const selectedStatus = statusDropdown ? statusDropdown.value : 'Present';
              
              // Yeh function site, OT aur status sab ko database mein update kar dega
              handleMarkAttendance(worker.id, selectedStatus);
            }} 
            style={{ 
              padding: '6px 14px', 
              backgroundColor: '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            Update
          </button>
        </td>

      </tr>
    ))}
  </tbody>
</table>
        
        {/* TAB 5: PAYROLL */}
        {activeTab === 'payroll' && (userRole.is_admin || userRole.can_view_payroll) && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>💵 Monthly Payroll</h3>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>Grand Total: {Math.round(grandTotalPayroll).toLocaleString()} {selectedCurrency}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '10px' }}>Worker</th>
                  <th style={{ padding: '10px' }}>Site</th>
                  <th style={{ padding: '10px' }}>Present Days</th>
                  <th style={{ padding: '10px' }}>Total OT</th>
                  <th style={{ padding: '10px' }}>Payable</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>#{s.id} - {s.name} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{s.designation}</span></td>
                    <td style={{ padding: '10px' }}>{s.work_site || sitesList[0]}</td>
                    <td style={{ padding: '10px' }}>{s.presentDays}</td>
                    <td style={{ padding: '10px' }}>{s.totalOT} hrs</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>{Math.round(s.totalPayable).toLocaleString()} {selectedCurrency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: CHANGE PASSWORD */}
        {activeTab === 'changepass' && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '450px', margin: '0 auto' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>🔑 Change Password</h3>
            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Password</label>
                <input type="password" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} placeholder="Enter new password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Update Password</button>
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
                  {permissionsList.map((p, idx) => {
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
     {/* TAB 10: ANNUAL LEAVES, PENALTIES & 12-MONTH DEDUCTION */}
        {activeTab === 'annualLeave' && (
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
                    <th style={{ padding: '12px' }}>Status</th>
                    {userRole.is_admin && <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {annualLeaveList.length === 0 ? (
                    <tr><td colSpan={userRole.is_admin ? 7 : 6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No annual leave records found.</td></tr>
                  ) : (
                    annualLeaveList.map((leave, idx) => {
                      let accruedDays = 0;
                      if (leave.actual_return && leave.actual_return !== 'On Leave') {
                        const returnDate = new Date(leave.actual_return);
                        const today = new Date();
                        const diffTime = today - returnDate;
                        const diffDays = diffTime > 0 ? diffTime / (1000 * 60 * 60 * 24) : 0;
                        accruedDays = (diffDays * (30 / 365)).toFixed(1);
                      }

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

      {/* Filters: Search, Department, Month, Year */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
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
              <th style={{ padding: '10px', textAlign: 'center' }}>Actions (View / Print / PDF)</th>
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
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Overtime Hours</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Site</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const workerAttendance = attendance.filter(a => a.worker_id === viewingWorkerTimesheet.id);
              
              if (workerAttendance.length === 0) {
                return (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      No attendance records found for this worker.
                    </td>
                  </tr>
                );
              }

              return workerAttendance.map((att, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: '500' }}>{att.date}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold' }}>
                      {att.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>{att.overtime_hours || 0} Hours</td>
                  <td style={{ padding: '8px 10px', color: '#64748b' }}>{att.work_site || viewingWorkerTimesheet.work_site || 'N/A'}</td>
                </tr>
              ));
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
    </div>
  );
}
