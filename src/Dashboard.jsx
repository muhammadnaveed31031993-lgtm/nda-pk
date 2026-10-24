import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Embedded administrator portrait
const dashboardPortraitData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/6zeFSlAAAQAAAAEAADd7anVtYgAAAB5qdW1kYzJwYQARABCAAACqADibcQNjMnBhAAAAGJhqdW1iAAAAR2p1bWRjMm1hABEAEIAAAKoAOJtxA3VybjpjMnBhOmM4NWI4NTI1LTI3ZTUtYjA4Ny0xN2Y2LTRkMjg5OWEwNzdkZQAAABMBanVtYgAAAChqdW1kYzJjcwARABCAAACqADibcQNjMnBhLnNpZ25hdθυνZy...'; // Portrait base64 string

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNDAs: 0,
    pendingRequests: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch queries using Supabase
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: ndaCount } = await supabase
        .from('ndas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setStats({
        totalUsers: usersCount || 0,
        activeNDAs: ndaCount || 0,
        pendingRequests: applications ? applications.length : 0,
      });

      setRecentApplications(applications || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a202c' }}>NDA PK System Dashboard</h2>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Welcome back, Administrator</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            src={dashboardPortraitData} 
            alt="Admin Portrait" 
            style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ color: '#888', margin: '0 0 10px 0' }}>Total Users</h4>
          <h2 style={{ margin: 0, color: '#333' }}>{loading ? '...' : stats.totalUsers}</h2>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ color: '#888', margin: '0 0 10px 0' }}>Active NDAs</h4>
          <h2 style={{ margin: 0, color: '#2e7d32' }}>{loading ? '...' : stats.activeNDAs}</h2>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ color: '#888', margin: '0 0 10px 0' }}>Pending Requests</h4>
          <h2 style={{ margin: 0, color: '#d32f2f' }}>{loading ? '...' : stats.pendingRequests}</h2>
        </div>
      </div>

      {/* Recent Activity / Applications Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2d3748' }}>Recent Applications</h3>
        {loading ? (
          <p>Data load ho raha hai...</p>
        ) : recentApplications.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#4a5568' }}>
                <th style={{ padding: '12px 10px' }}>ID</th>
                <th style={{ padding: '12px 10px' }}>Applicant</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentApplications.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 10px', color: '#2d3748' }}>{app.id}</td>
                  <td style={{ padding: '12px 10px', color: '#2d3748' }}>{app.applicant_name || 'N/A'}</td>
                  <td style={{ padding: '12px 10px', color: '#2d3748' }}>{app.status}</td>
                  <td style={{ padding: '12px 10px', color: '#718096' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#718096' }}>Koi recent data nahi mila.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
