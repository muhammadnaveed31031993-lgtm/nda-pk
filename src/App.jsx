import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [dailyRate, setDailyRate] = useState('');

  // Overtime state per worker: { [workerId]: hours }
  const [overtimeInputs, setOvertimeInputs] = useState({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchWorkers();
    fetchAttendance();
  }, []);

  async function fetchWorkers() {
    setLoading(true);
    const { data, error } = await supabase.from('workers').select('*').order('id', { ascending: true });
    if (error) console.error('Error fetching workers:', error);
    else setWorkers(data || []);
    setLoading(false);
  }

  async function fetchAttendance() {
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (error) console.error('Error fetching attendance:', error);
    else setAttendance(data || []);
  }

  async function handleAddWorker(e) {
    e.preventDefault();
    if (!name.trim() || !dailyRate) return alert('Name and Daily Rate are required!');

    const newWorker = {
      name: name.trim(),
      designation: designation.trim() || 'Worker',
      daily_rate: Number(dailyRate)
    };

    const { error } = await supabase.from('workers').insert([newWorker]);

    if (error) {
      alert('Error adding worker: ' + error.message);
    } else {
      setName('');
      setDesignation('');
      setDailyRate('');
      fetchWorkers();
    }
  }

  async function handleMarkAttendance(workerId, status) {
    const otHours = Number(overtimeInputs[workerId] || 0);

    const { error } = await supabase.from('attendance').insert([
      { worker_id: workerId, date: today, status, overtime_hours: otHours }
    ]);

    if (error) {
      alert('Error logging attendance: ' + error.message);
    } else {
      fetchAttendance();
    }
  }

  async function handleDeleteWorker(id) {
    if (window.confirm('Kya aap is worker ko delete karna chahte hain?')) {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) alert('Error deleting worker: ' + error.message);
      else fetchWorkers();
    }
  }

  // Exact calculations for active workers today
  const activeWorkerIds = new Set(workers.map(w => w.id));
  const todayAttendance = attendance.filter(a => a.date === today && activeWorkerIds.has(a.worker_id));
  
  // Latest attendance record per worker today
  const latestAttendanceMap = {};
  todayAttendance.forEach(a => {
    latestAttendanceMap[a.worker_id] = a;
  });

  const presentTodayCount = Object.values(latestAttendanceMap).filter(a => a.status === 'Present').length;
  
  // Total overtime hours marked today
  const totalOvertimeToday = Object.values(latestAttendanceMap).reduce((acc, curr) => acc + Number(curr.overtime_hours || 0), 0);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: '30px 20px', color: '#1e293b' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', color: '#0f172a', fontWeight: '700' }}>NDA-PK HR & Timekeeping System</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Worker Database, Attendance & Overtime Tracker</p>
          </div>
          <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '14px' }}>
            📅 {today}
          </div>
        </header>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #2563eb' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Total Workers</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '5px' }}>{workers.length}</div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #16a34a' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Present Today</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginTop: '5px' }}>{presentTodayCount}</div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #d97706' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Today's Overtime</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706', marginTop: '5px' }}>{totalOvertimeToday} hrs</div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '5px solid #0891b2' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Total Daily Payroll</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '5px' }}>
              PKR {workers.reduce((acc, curr) => acc + Number(curr.daily_rate || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Add Worker Form */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0, fontSize: '18px', color: '#334155', marginBottom: '20px' }}>➕ Register New Worker</h2>
          <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <input
              type="text"
              placeholder="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
              required
            />
            <input
              type="text"
              placeholder="Designation (e.g., Mason, Helper)"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
            />
            <input
              type="number"
              placeholder="Daily Rate (PKR) *"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
              required
            />
            <button
              type="submit"
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
            >
              Add Worker
            </button>
          </form>
        </div>

        {/* Workers List & Attendance Table */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, fontSize: '18px', color: '#334155', marginBottom: '20px' }}>📋 Workers & Attendance Log</h2>
          
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading dashboard data...</p>
          ) : workers.length === 0 ? (
            <p style={{ color: '#64748b' }}>No workers registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>ID</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Designation</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Daily Rate</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Today's Status</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Overtime (Hrs)</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Mark Attendance</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => {
                    const record = latestAttendanceMap[worker.id];
                    const currentStatus = record ? record.status : 'Not Marked';
                    const currentOT = record ? record.overtime_hours : 0;

                    return (
                      <tr key={worker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b' }}>#{worker.id}</td>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#0f172a' }}>{worker.name}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{worker.designation || 'Worker'}</td>
                        <td style={{ padding: '12px', fontWeight: '500' }}>PKR {worker.daily_rate}</td>
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
                            min="0"
                            max="24"
                            placeholder="0"
                            value={overtimeInputs[worker.id] ?? ''}
                            onChange={(e) => setOvertimeInputs({ ...overtimeInputs, [worker.id]: e.target.value })}
                            style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleMarkAttendance(worker.id, 'Present')}
                            style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px', fontSize: '12px', fontWeight: '600' }}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(worker.id, 'Absent')}
                            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            Absent
                          </button>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteWorker(worker.id)}
                            style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
