import './index.css'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Calendar, FileText, Settings, LogOut, Plus, Search, 
  Printer, ShieldAlert, CheckCircle2, Clock, DollarSign, UserPlus
} from 'lucide-react';

// Supabase Credentials
const SUPABASE_URL = 'https://qzyvoiugvmytiozxntft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7Mbn7QdW0dSb6gpEOM9Eww_L2si0vGS';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [currentUser, setCurrentUser] = useState({ name: 'Admin', role: 'Super Admin' });
  const [activeTab, setActiveTab] = useState('attendance');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Naveed');
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  
  const [supervisors, setSupervisors] = useState(['Naveed', 'Ali', 'Kamran']);
  const [designations, setDesignations] = useState(['Steel Fixer', 'Carpenter', 'Mason', 'Electrician', 'Helper']);

  const [bulkOT, setBulkOT] = useState('');
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('workers').select('*');
    if (error) {
      console.error('Error fetching workers:', error);
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  };

  const handleAddWorker = async (newWorker) => {
    const { data, error } = await supabase.from('workers').insert([newWorker]).select();
    if (error) {
      alert('Error adding worker: ' + error.message);
    } else if (data) {
      setWorkers([...workers, ...data]);
      alert('Worker saved to Database!');
    }
  };

  const applyBulkOTToDesignation = async (targetDesignation) => {
    if (!bulkOT) return;
    
    const updates = [];
    const updatedLocalAttendance = { ...attendanceData };

    workers.forEach(w => {
      if (w.team === selectedTeam && (targetDesignation === 'All' || w.designation === targetDesignation)) {
        const ot = parseFloat(bulkOT) || 0;
        updatedLocalAttendance[w.id] = { ...(updatedLocalAttendance[w.id] || {}), otHours: ot };
        updates.push({
          worker_id: w.id,
          ot_hours: ot,
          status: 'Present'
        });
      }
    });

    setAttendanceData(updatedLocalAttendance);

    const { error } = await supabase.from('attendance').insert(updates);
    if (error) {
      alert('Database Save Error: ' + error.message);
    } else {
      alert(`${bulkOT} Hours Overtime saved to Database for ${targetDesignation}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">NDA-PK</div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">NDA-PK HR & Timekeeping System</h1>
            <p className="text-xs text-slate-400">Live Database Connected Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium border border-emerald-500/30">
            Database: Connected
          </span>
          <span className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full font-medium border border-blue-500/30">
            {currentUser.role}: {currentUser.name}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-800/50 border-r border-slate-700 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Clock size={18} />
            <span>Daily Attendance & OT</span>
          </button>

          <button 
            onClick={() => setActiveTab('workers')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'workers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Users size={18} />
            <span>Worker Directory</span>
          </button>

          <button 
            onClick={() => setActiveTab('payroll')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'payroll' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <DollarSign size={18} />
            <span>Payroll & Payslips</span>
          </button>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Supervisor Team</label>
                    <select 
                      value={selectedTeam} 
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                      {supervisors.map(s => <option key={s} value={s}>Team {s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Trade Filter</label>
                    <select 
                      value={selectedDesignation} 
                      onChange={(e) => setSelectedDesignation(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="All">All Designations</option>
                      {designations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-700">
                  <input 
                    type="number" 
                    placeholder="OT Hours" 
                    value={bulkOT}
                    onChange={(e) => setBulkOT(e.target.value)}
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                  />
                  <button 
                    onClick={() => applyBulkOTToDesignation('Steel Fixer')}
                    className="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-2 rounded text-white font-medium"
                  >
                    Save OT (Steel Fixer)
                  </button>
                  <button 
                    onClick={() => applyBulkOTToDesignation('Carpenter')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-2 rounded text-white font-medium"
                  >
                    Save OT (Carpenter)
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {loading ? (
                  <p className="p-4 text-center text-slate-400">Loading Workers from Supabase...</p>
                ) : (
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase border-b border-slate-700">
                      <tr>
                        <th className="p-3">Worker ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Designation</th>
                        <th className="p-3">Team</th>
                        <th className="p-3">Duty Hours</th>
                        <th className="p-3">OT Hours</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {workers
                        .filter(w => w.team === selectedTeam && (selectedDesignation === 'All' || w.designation === selectedDesignation))
                        .map(w => (
                          <tr key={w.id} className="hover:bg-slate-700/40">
                            <td className="p-3 font-mono font-bold text-blue-400">{w.id}</td>
                            <td className="p-3 font-medium text-slate-100">{w.name}</td>
                            <td className="p-3"><span className="bg-slate-700 px-2 py-1 rounded text-xs">{w.designation}</span></td>
                            <td className="p-3">{w.team}</td>
                            <td className="p-3">{w.duty_hours || 8} hrs</td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                value={attendanceData[w.id]?.otHours || ''}
                                onChange={(e) => setAttendanceData({
                                  ...attendanceData,
                                  [w.id]: { ...(attendanceData[w.id] || {}), otHours: e.target.value }
                                })}
                                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-3">
                              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs">Present</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workers' && (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
              <h2 className="text-xl font-bold text-slate-100">Worker Directory & Quick Registration</h2>
              <div className="p-4 bg-slate-900/60 border border-slate-700 rounded-lg">
                <h3 className="text-sm font-bold text-slate-300 mb-3">Add New Worker To Database</h3>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target;
                    handleAddWorker({
                      id: form.workerId.value,
                      name: form.workerName.value,
                      designation: form.designation.value,
                      team: form.team.value,
                      religion: form.religion.value,
                      phone: form.phone.value,
                      duty_hours: parseInt(form.dutyHours.value),
                      base_salary: parseInt(form.baseSalary.value)
                    });
                    form.reset();
                  }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"
                >
                  <input name="workerId" required placeholder="Worker ID (e.g. W001)" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100" />
                  <input name="workerName" required placeholder="Full Name" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100" />
                  <select name="designation" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100">
                    {designations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select name="team" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100">
                    {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select name="religion" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100">
                    <option value="Muslim">Muslim</option>
                    <option value="Non-Muslim">Non-Muslim</option>
                  </select>
                  <input name="phone" placeholder="Phone Number" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100" />
                  <input name="dutyHours" type="number" defaultValue={8} placeholder="Duty Hours" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100" />
                  <input name="baseSalary" type="number" placeholder="Base Salary" className="bg-slate-800 border border-slate-700 p-2 rounded text-slate-100" />
                  
                  <button type="submit" className="col-span-2 md:col-span-4 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold">
                    Save Worker to Database
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
              <h2 className="text-xl font-bold text-slate-100">Monthly Payroll & Payslips</h2>
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="p-3">Worker ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Base Salary</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {workers.map(w => (
                    <tr key={w.id}>
                      <td className="p-3 font-mono text-blue-400">{w.id}</td>
                      <td className="p-3 font-medium text-slate-100">{w.name}</td>
                      <td className="p-3">Rs. {w.base_salary || 0}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => alert(`Printing Payslip for ${w.name}`)}
                          className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                        >
                          <Printer size={14} />
                          <span>Print Payslip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
