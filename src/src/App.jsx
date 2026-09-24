import './index.css'
import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <header className="bg-white p-4 rounded-lg shadow mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">NDA-PK HR & Timekeeping System</h1>
          <p className="text-sm text-green-600 font-semibold">✓ Live Deployment Active</p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Welcome to NDA-PK System</h2>
        <p className="text-slate-600">Aapka Vercel deployment successfully live ho chuka hai!</p>
      </div>
    </div>
  );
}
