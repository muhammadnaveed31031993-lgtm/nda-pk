import './index.css'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Calendar, FileText, Settings, LogOut, Plus, Search, 
  Printer, ShieldAlert, CheckCircle2, Clock, DollarSign, UserPlus 
} from 'lucide-react';

const SUPABASE_URL = "https://your-supabase-url.supabase.co"; 
const SUPABASE_ANON_KEY = "your-anon-key";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [dbConnected, setDbConnected] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* Header */}
      <header className="bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">NDA-PK HR & Timekeeping System</h1>
          <p className="text-sm text-slate-500">Live Database Connected Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dbConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Database: {dbConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-sm font-medium text-slate-600">Super Admin: Admin</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <Clock className="w-4 h-4" /> Daily Attendance & OT
        </button>
        <button 
          onClick={() => setActiveTab('workers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'workers' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <Users className="w-4 h-4" /> Worker Directory
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'payroll' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <DollarSign className="w-4 h-4" /> Payroll & Payslips
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="bg-white p-6 rounded-lg shadow-sm">
        {activeTab === 'attendance' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Daily Attendance & Overtime</h2>
            <p className="text-slate-600">System is ready for attendance logs.</p>
          </div>
        )}
        {activeTab === 'workers' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Worker Directory</h2>
            <p className="text-slate-600">Manage all registered staff and workers here.</p>
          </div>
        )}
        {activeTab === 'payroll' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Payroll System</h2>
            <p className="text-slate-600">Calculations and monthly payslips module.</p>
          </div>
        )}
      </main>
    </div>
  );
}
