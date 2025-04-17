import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getKeys } from '../../services/api';

const TeacherHome = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setLoading(true);
        const data = await getKeys();
        
        // Filter for available keys only
        const availableKeys = data.filter(key => key.status === 'Available');
        setKeys(availableKeys);
      } catch (error) {
        setError('Failed to load keys: ' + error);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading available keys...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Available Lab Keys</h2>
        <Link to="/teacher/borrow" className="btn btn-primary">
          Borrow a Key
        </Link>
      </div>

      {keys.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No keys are currently available. Please check back later.
        </div>
      ) : (
        <div className="row">
          {keys.map((key) => (
            <div className="col-md-4 mb-4" key={key.keyId}>
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Key ID: {key.keyId}</h5>
                  <h6 className="card-subtitle mb-2 text-muted">Lab: {key.lab}</h6>
                  <p className="card-text">
                    <span className="badge bg-success">Available</span>
                  </p>
                </div>
                <div className="card-footer bg-transparent">
                  <Link to={`/teacher/borrow?keyId=${key.keyId}`} className="btn btn-outline-primary w-100">
                    Borrow this Key
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherHome; 