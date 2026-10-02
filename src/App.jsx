import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
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

  // Annual Leave Tracking & Penalty States
  const [annualLeaveList, setAnnualLeaveList] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveWorkerId, setLeaveWorkerId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveExpectedReturnDate, setLeaveExpectedReturnDate] = useState('');
  const [leaveActualReturnDate, setLeaveActualReturnDate] = useState('');
  const [penaltyPerMonthDays, setPenaltyPerMonthDays] = useState(5);

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

  async function fetchAnnualLeaves() {
    const { data, error } = await supabase.from('annual_leaves').select('*');
    if (error) {
      console.error('Error fetching annual leaves:', error.message);
    } else {
      setAnnualLeaveList(data || []);
    }
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

  async function handleSaveAnnualLeave(e) {
    e.preventDefault();
    if (!leaveWorkerId || !leaveStartDate || !leaveExpectedReturnDate) {
      return alert('Mukammal details enter karein!');
    }

    let deductedDays = 0;
    if (leaveActualReturnDate) {
      const expected = new Date(leaveExpectedReturnDate);
      const actual = new Date(leaveActualReturnDate);
      const diffTime = actual - expected;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        deductedDays = diffDays * (penaltyPerMonthDays / 30); 
        alert(`Worker late aya hai! ${diffDays} din overstay par UAE law / penalty ke mutabiq ${deductedDays.toFixed(1)} din ki salary deduction hogi.`);
      }
    }

    const newLeaveRecord = {
      worker_id: leaveWorkerId,
      start_date: leaveStartDate,
      expected_return: leaveExpectedReturnDate,
      actual_return: leaveActualReturnDate || 'On Leave',
      deduction_days: deductedDays.toFixed(1),
      status: leaveActualReturnDate ? 'Returned' : 'On Leave'
    };

    const { error } = await supabase.from('annual_leaves').insert([newLeaveRecord]);
    if (error) {
      alert('Error saving leave record: ' + error.message);
    } else {
      setAnnualLeaveList([...annualLeaveList, newLeaveRecord]);
      alert('Annual leave record successfully save ho gaya!');
      setLeaveWorkerId('');
      setLeaveStartDate('');
      setLeaveExpectedReturnDate('');
      setLeaveActualReturnDate('');
      setLeaveModalOpen(false);
      fetchAnnualLeaves();
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

  async function handleBulkAttendance() {
    if (!userRole.is_admin && !userRole.can_edit_timesheet) return;
    
    let deptWorkers = workers.filter(w => w.department.toLowerCase() === bulkDepartment.toLowerCase());
    if (bulkDesignation !== 'All') {
      deptWorkers = deptWorkers.filter(w => w.designation?.toLowerCase() === bulkDesignation.toLowerCase());
    }

    if (deptWorkers.length === 0) return alert(`No workers found matching department and designation!`);

    const records = deptWorkers.map(w => ({
      worker_id: w.id,
      date: selectedTimesheetDate,
      status: bulkStatus,
      overtime_hours: Number(bulkOT),
      department: w.department,
      work_site: bulkSite
    }));

    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'worker_id,date' });
    if (error) alert('Error: ' + error.message);
    else {
      alert(`Attendance saved successfully for date ${selectedTimesheetDate} (${deptWorkers.length} workers)!`);
      fetchAttendance();
    }
  }

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
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'attendance' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>📅 Timesheet</button>
        )}
        {(userRole.is_admin || userRole.can_view_payroll) && (
          <button onClick={() => setActiveTab('payroll')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'payroll' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>💰 Payroll</button>
        )}
        <button onClick={() => setActiveTab('leaves')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'leaves' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>🌴 Annual Leaves & Penalties</button>
        {userRole.is_admin && (
          <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 15px', backgroundColor: activeTab === 'settings' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>⚙️ Admin & Sites</button>
        )}
      </div>

      {/* Main Container Content */}
      <div style={{ padding: '20px', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Dashboard Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Total Workers</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a', marginTop: '5px' }}>{filteredWorkers.length}</div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Present Today ({selectedTimesheetDate})</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#16a34a', marginTop: '5px' }}>{presentCountForDate}</div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Est. Monthly Payroll</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb', marginTop: '5px' }}>{grandTotalPayroll.toFixed(2)} {selectedCurrency}</div>
              </div>
            </div>
          </div>
        )}

        {/* ANNUAL LEAVES TAB */}
        {activeTab === 'leaves' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}>UAE Labor Law: Annual Leave & Overstay Penalties</h2>
              <button onClick={() => setLeaveModalOpen(true)} style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Record Annual Leave</button>
            </div>

            {leaveModalOpen && (
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>Add Worker Leave Record</h3>
                <form onSubmit={handleSaveAnnualLeave}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
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
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Actual Return Date (Optional if returned)</label>
                      <input type="date" value={leaveActualReturnDate} onChange={e => setLeaveActualReturnDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Leave Record</button>
                    <button type="button" onClick={() => setLeaveModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '12px' }}>Worker ID</th>
                    <th style={{ padding: '12px' }}>Start Date</th>
                    <th style={{ padding: '12px' }}>Expected Return</th>
                    <th style={{ padding: '12px' }}>Actual Return</th>
                    <th style={{ padding: '12px' }}>Penalty Deduction (Days)</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {annualLeaveList.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No annual leave records found.</td></tr>
                  ) : (
                    annualLeaveList.map((leave, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>#{leave.worker_id}</td>
                        <td style={{ padding: '12px' }}>{leave.start_date}</td>
                        <td style={{ padding: '12px' }}>{leave.expected_return}</td>
                        <td style={{ padding: '12px' }}>{leave.actual_return}</td>
                        <td style={{ padding: '12px', color: Number(leave.deduction_days) > 0 ? '#dc2626' : 'inherit', fontWeight: Number(leave.deduction_days) > 0 ? 'bold' : 'normal' }}>
                          {leave.deduction_days} Days
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: leave.status === 'Returned' ? '#dcfce7' : '#fef9c3', color: leave.status === 'Returned' ? '#166534' : '#854d0e' }}>
                            {leave.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKERS DIRECTORY TAB */}
        {activeTab === 'workers' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Workers Directory & Profiles</h2>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>{editingWorkerId ? 'Edit Worker Details' : 'Add New Worker'}</h3>
              <form onSubmit={handleSaveWorker}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Worker ID No</label>
                    <input type="number" value={workerIdInput} onChange={e => setWorkerIdInput(e.target.value)} placeholder="Auto or manual ID" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Name *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Department</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {departmentsList.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Work Site</label>
                    <select value={workSite} onChange={e => setWorkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {sitesList.map(site => <option key={site} value={site}>{site}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Designation</label>
                    <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Plumber / Foreman" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Monthly Salary ({selectedCurrency}) *</label>
                    <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 2500" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {editingWorkerId ? 'Update Worker' : 'Save Worker'}
                  </button>
                  {editingWorkerId && (
                    <button type="button" onClick={resetWorkerForm} style={{ padding: '8px 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Name</th>
                    <th style={{ padding: '10px' }}>Department</th>
                    <th style={{ padding: '10px' }}>Designation</th>
                    <th style={{ padding: '10px' }}>Site</th>
                    <th style={{ padding: '10px' }}>Salary ({selectedCurrency})</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px' }}>#{w.id}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{w.name}</td>
                      <td style={{ padding: '10px' }}>{w.department}</td>
                      <td style={{ padding: '10px' }}>{w.designation}</td>
                      <td style={{ padding: '10px' }}>{w.work_site}</td>
                      <td style={{ padding: '10px' }}>{w.monthly_salary}</td>
                      <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleStartEditWorker(w)} style={{ padding: '4px 8px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                        <button onClick={() => handlePrintWorkerMonthlyReport(w)} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Report</button>
                        {(userRole.is_admin || userRole.can_delete_workers) && (
                          <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BULK & OCR SCANNER TAB */}
        {activeTab === 'bulk' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Bulk Attendance & OCR Paper Sheet Scanner</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, color: '#1e293b' }}>Upload Attendance Paper Sheet (AI OCR)</h3>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Upload a photo or scanned copy of the daily attendance sheet. GPT-4o will automatically extract records.</p>
              <input type="file" accept="image/*" onChange={handleScanPaperSheet} style={{ marginTop: '10px' }} />
              {scanning && <p style={{ color: '#2563eb', fontWeight: 'bold', marginTop: '10px' }}>{scanStatus}</p>}
              {!scanning && scanStatus && <p style={{ color: '#16a34a', fontWeight: 'bold', marginTop: '10px' }}>{scanStatus}</p>}
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ marginTop: 0, color: '#1e293b' }}>Bulk Mark Attendance by Department & Designation</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Department</label>
                  <select value={bulkDepartment} onChange={e => setBulkDepartment(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {departmentsList.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
                  <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Overtime Hours</label>
                  <input type="number" value={bulkOT} onChange={e => setBulkOT(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Work Site</label>
                  <select value={bulkSite} onChange={e => setBulkSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {sitesList.map(site => <option key={site} value={site}>{site}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleBulkAttendance} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply Bulk Attendance</button>
            </div>
          </div>
        )}

        {/* TIMESHEET TAB */}
        {activeTab === 'attendance' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Daily Timesheet & Attendance</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Timesheet Date</label>
              <input type="date" value={selectedTimesheetDate} onChange={e => setSelectedTimesheetDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Name</th>
                    <th style={{ padding: '10px' }}>Department</th>
                    <th style={{ padding: '10px' }}>Status Today</th>
                    <th style={{ padding: '10px' }}>Overtime Hours</th>
                    <th style={{ padding: '10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => {
                    const attRecord = latestAttendanceMap[w.id];
                    const currentStatus = attRecord ? attRecord.status : 'Present';
                    const currentOT = attRecord ? attRecord.overtime_hours : 0;
                    return (
                      <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>#{w.id}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{w.name}</td>
                        <td style={{ padding: '10px' }}>{w.department}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: currentStatus === 'Present' ? '#dcfce7' : '#fee2e2', color: currentStatus === 'Present' ? '#166534' : '#991b1b' }}>
                            {currentStatus}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" defaultValue={currentOT} onChange={e => setOvertimeInputs({ ...overtimeInputs, [w.id]: e.target.value })} style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        </td>
                        <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleMarkAttendance(w.id, 'Present')} style={{ padding: '4px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Present</button>
                          <button onClick={() => handleMarkAttendance(w.id, 'Absent')} style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Absent</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYROLL TAB */}
        {activeTab === 'payroll' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Payroll & Salary Summary</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Grand Total Monthly Payroll: <span style={{ color: '#2563eb' }}>{grandTotalPayroll.toFixed(2)} {selectedCurrency}</span></p>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Name</th>
                    <th style={{ padding: '10px' }}>Department</th>
                    <th style={{ padding: '10px' }}>Present Days</th>
                    <th style={{ padding: '10px' }}>Total OT Hours</th>
                    <th style={{ padding: '10px' }}>Total Payable ({selectedCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px' }}>#{item.id}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ padding: '10px' }}>{item.department}</td>
                      <td style={{ padding: '10px' }}>{item.presentDays} Days</td>
                      <td style={{ padding: '10px' }}>{item.totalOT} Hours</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>{item.totalPayable.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && userRole.is_admin && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Admin Settings & Site Management</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Add New Working Site</h3>
              <form onSubmit={handleAddNewSite} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input type="text" value={newSiteInput} onChange={e => setNewSiteInput(e.target.value)} placeholder="Site Name (e.g. Al Nahda Tower)" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Site</button>
              </form>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Add New Department</h3>
              <form onSubmit={handleAddNewDepartment} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input type="text" value={newDeptInput} onChange={e => setNewDeptInput(e.target.value)} placeholder="Department Name (e.g. Carpentry)" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Department</button>
              </form>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ marginTop: 0 }}>Change Password</h3>
              <form onSubmit={handleChangePasswordSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>New Password</label>
                    <input type="password" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} placeholder="New password" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                  </div>
                </div>
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Update Password</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
