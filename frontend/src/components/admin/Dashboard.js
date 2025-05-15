import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard error:', error);
      setError('Failed to load dashboard data: ' + error);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh dashboard data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Dashboard Error</h4>
        <p>{error}</p>
        <hr />
        <div className="d-flex justify-content-between align-items-center">
          <p className="mb-0">This might be due to an authentication issue or server problem.</p>
          <button 
            className="btn btn-primary" 
            onClick={handleRetry} 
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry Loading'}
          </button>
        </div>
      </div>
    );
  }

  const { stats, overdueTransactions } = dashboardData || { stats: {}, overdueTransactions: [] };

  return (
    <div>
      <h2 className="mb-4">System Dashboard</h2>
      
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-white bg-primary mb-3 shadow-sm hover-shadow h-100">
            <div className="card-body">
              <h5 className="card-title">Total Keys</h5>
              <p className="card-text display-4">{stats.totalKeys || 0}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-success mb-3 shadow-sm hover-shadow h-100">
            <div className="card-body">
              <h5 className="card-title">Available Keys</h5>
              <p className="card-text display-4">{stats.availableKeys || 0}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-info mb-3 shadow-sm hover-shadow h-100">
            <div className="card-body">
              <h5 className="card-title">Borrowed Keys</h5>
              <p className="card-text display-4">{stats.borrowedKeys || 0}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-warning mb-3 shadow-sm hover-shadow h-100">
            <div className="card-body">
              <h5 className="card-title">Teachers</h5>
              <p className="card-text display-4">{stats.totalTeachers || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card mb-4 shadow-sm hover-shadow">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Overdue Keys
            {stats.overdueKeys > 0 && (
              <span className="badge bg-danger ms-2">{stats.overdueKeys}</span>
            )}
          </h5>
        </div>
        <div className="card-body">
          {overdueTransactions.length === 0 ? (
            <div className="alert alert-success" role="alert">
              No overdue keys at the moment. Everything is good!
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Key ID</th>
                    <th>Lab</th>
                    <th>Teacher</th>
                    <th>Borrowed Date</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTransactions.map((transaction) => {
                    const borrowDate = new Date(transaction.borrowDate);
                    const now = new Date();
                    const diffHours = Math.round((now - borrowDate) / (1000 * 60 * 60));
                    
                    return (
                      <tr key={transaction.id} className="table-danger">
                        <td>{transaction.keyId}</td>
                        <td>{transaction.lab}</td>
                        <td>{transaction.teacherName}</td>
                        <td>{borrowDate.toLocaleString()}</td>
                        <td>{diffHours} hours</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm hover-shadow h-100">
            <div className="card-header">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/admin/keys" className="btn btn-outline-primary nav-btn">
                  Manage Keys
                </Link>
                <Link to="/admin/teachers" className="btn btn-outline-primary nav-btn">
                  Manage Teachers
                </Link>
                <Link to="/admin/transactions" className="btn btn-outline-primary nav-btn">
                  View All Transactions
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm hover-shadow h-100">
            <div className="card-header">
              <h5 className="mb-0">System Status</h5>
            </div>
            <div className="card-body">
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Database Status
                  <span className="badge bg-success">Connected</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Server Status
                  <span className="badge bg-success">Online</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  API Status
                  <span className="badge bg-success">Operational</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Last Update
                  <span>{new Date().toLocaleTimeString()}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Our Team Full Width */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm hover-shadow">
            <div className="card-header">
              <h5 className="mb-0">Our Team</h5>
            </div>
            <div className="card-body">
              <div className="row row-cols-7 g-2 justify-content-center">
                {[
                  { id: 16, name: "Franc Egos" },
                  { id: 17, name: "Karl Sacayan" },
                  { id: 18, name: "Redd Tanabe" },
                  { id: 19, name: "Kurt Enriquez" },
                  { id: 20, name: "Euan Dematera" },
                  { id: 21, name: "Jthird Sadje" },
                  { id: 22, name: "Justin Dacula" }
                ].map((member) => (
                  <div key={member.id} className="col text-center">
                    <div className="team-image-container mb-2" style={{ cursor: 'pointer' }} onClick={() => setSelectedMember(member)}>
                      <img
                        src={`/images/${member.id}.png`}
                        alt={member.name}
                        className="img-fluid rounded-circle team-image"
                        style={{
                          width: '110px',
                          height: '110px',
                          objectFit: 'cover',
                          border: '3px solid #fff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://via.placeholder.com/110?text=${member.name.charAt(0)}`;
                        }}
                      />
                    </div>
                    <h6 className="mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>{member.name}</h6>
                    <small className="text-muted">Team Member</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Preview Modal */}
      {selectedMember && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedMember.name}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedMember(null)}
                ></button>
              </div>
              <div className="modal-body text-center">
                <img
                  src={`/images/${selectedMember.id}.png`}
                  alt={selectedMember.name}
                  className="img-fluid rounded"
                  style={{
                    maxHeight: '70vh',
                    width: 'auto',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://via.placeholder.com/400x500?text=${selectedMember.name}`;
                  }}
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedMember(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 