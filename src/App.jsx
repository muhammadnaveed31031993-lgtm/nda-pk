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

  // Fetch initial data
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
    if (!name || !dailyRate) return alert('Name and Daily Rate are required!');

    const { error } = await supabase.from('workers').insert([
      { name, designation, daily_rate: parseFloat(dailyRate) }
    ]);

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
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('attendance').insert([
      { worker_id: workerId, date: today, status, overtime_hours: 0 }
    ]);

    if (error) alert('Error logging attendance: ' + error.message);
    else fetchAttendance();
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>NDA-PK HR & Timekeeping System</h1>

      {/* Add Worker Form */}
      <section style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Add New Worker</h2>
        <form onSubmit={handleAddWorker} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Worker Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '8px', flex: '1' }}
            required
          />
          <input
            type="text"
            placeholder="Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            style={{ padding: '8px', flex: '1' }}
          />
          <input
            type="number"
            placeholder="Daily Rate (PKR)"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            style={{ padding: '8px', flex: '1' }}
            required
          />
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Add Worker
          </button>
        </form>
      </section>

      {/* Workers & Attendance Management */}
      <section>
        <h2>Workers List & Today's Attendance</h2>
        {loading ? (
          <p>Loading workers data...</p>
        ) : workers.length === 0 ? (
          <p>No workers added yet.</p>
        ) : (
          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#eaeaea' }}>
                <th>ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Daily Rate</th>
                <th>Mark Today's Attendance</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td>{worker.id}</td>
                  <td>{worker.name}</td>
                  <td>{worker.designation || 'N/A'}</td>
                  <td>PKR {worker.daily_rate}</td>
                  <td>
                    <button
                      onClick={() => handleMarkAttendance(worker.id, 'Present')}
                      style={{ marginRight: '5px', backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(worker.id, 'Absent')}
                      style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                    >
                      Absent
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
