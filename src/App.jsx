import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Check Login Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAttendance();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAttendance();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login Function
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  // Logout Function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAttendance([]);
  };

  // Fetch Attendance Records
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gemini AI Scan Function
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Photo scan ho rahi hai, please wait...');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Image = reader.result;
        const base64Data = base64Image.split(',')[1];
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Extract table data from this daily attendance sheet. Return ONLY a valid JSON object with key 'rows' containing an array of objects. Each object must have: 'id_no' (number from ID No column), 'working_days' (number: 1 if Working Days is 'ONE' or marked present, 0 if absent), and 'overtime' (number from Total Overtime column, if empty then 0). Ignore blank rows."
                    },
                    {
                      inline_data: {
                        mime_type: file.type || 'image/jpeg',
                        data: base64Data
                      }
                    }
                  ]
                }
              ],
              generationConfig: { response_mime_type: 'application/json' }
            })
          }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const rawText = data.candidates[0].content.parts[0].text;
        const parsedContent = JSON.parse(rawText);
        const rows = parsedContent.rows || parsedContent;

        setScanStatus('Data extract ho gaya, Database mein save ho raha hai...');

        const today = new Date().toISOString().split('T')[0];
        const recordsToInsert = rows.map((item) => ({
          worker_id: Number(item.id_no),
          date: today,
          status: item.working_days > 0 ? 'Present' : 'Absent',
          overtime_hours: Number(item.overtime || 0)
        }));

        const { error } = await supabase
          .from('attendance')
          .upsert(recordsToInsert, { onConflict: 'worker_id,date' });

        if (error) throw error;

        setScanStatus(`Zabardast! Total ${recordsToInsert.length} workers ka data auto save ho gaya.`);
        fetchAttendance();
      } catch (err) {
        console.error(err);
        setScanStatus('Error: ' + err.message);
      } finally {
        setScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // 1. Agar User Logged In Nahi Hai To Login Screen Dikhayein
  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif', background: '#f3f4f6' }}>
        <form onSubmit={handleLogin} style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '300px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>ERP Login</h2>
          {authError && <p style={{ color: 'red', fontSize: '14px' }}>{authError}</p>}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={authLoading} style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {authLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  // 2. Main ERP Dashboard (Login Hone Ke Baad)
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Daily Attendance Management ERP</h2>
        <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Upload Section */}
      <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Scan Attendance Sheet</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={scanning}
        />
        {scanStatus && (
          <p style={{ marginTop: '10px', fontWeight: 'bold', color: scanning ? '#d97706' : '#16a34a' }}>
            {scanStatus}
          </p>
        )}
      </div>

      {/* Attendance Table */}
      <h3>Attendance Records</h3>
      {loading ? (
        <p>Loading data...</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th>Worker ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Overtime Hours</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>No attendance records found.</td>
              </tr>
            ) : (
              attendance.map((record, idx) => (
                <tr key={record.id || idx}>
                  <td>{record.worker_id}</td>
                  <td>{record.date}</td>
                  <td>{record.status}</td>
                  <td>{record.overtime_hours}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
