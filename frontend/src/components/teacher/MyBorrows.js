import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getActiveBorrows, returnKey } from '../../services/api';

const MyBorrows = () => {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState(false);

  const fetchBorrows = async () => {
    try {
      setLoading(true);
      const data = await getActiveBorrows();
      setBorrows(data);
    } catch (error) {
      setError('Failed to load borrowed keys: ' + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrows();
  }, []);

  const handleReturn = async (keyId) => {
    if (!window.confirm(`Are you sure you want to return key ${keyId}?`)) {
      return;
    }
    
    try {
      setReturning(true);
      console.log('Attempting to return key with ID:', keyId);
      
      // Make sure keyId is a string
      const keyIdString = String(keyId);
      console.log('Using keyId (as string):', keyIdString);
      
      const response = await returnKey(keyIdString);
      console.log('Return key response:', response);
      
      toast.success('Key returned successfully!');
      fetchBorrows();
    } catch (error) {
      console.error('Error returning key:', error);
      const errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
      setError(`Failed to return key: ${errorMessage}`);
      toast.error(`Failed to return key: ${errorMessage}`);
    } finally {
      setReturning(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading your borrowed keys...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">My Borrowed Keys</h2>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {borrows.length === 0 ? (
        <div className="alert alert-info" role="alert">
          You don't have any borrowed keys at the moment.
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Key ID</th>
                    <th>Lab</th>
                    <th>Borrowed Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {borrows.map((borrow) => {
                    const borrowDate = new Date(borrow.borrowDate);
                    const now = new Date();
                    const diffHours = Math.round((now - borrowDate) / (1000 * 60 * 60));
                    const isOverdue = borrow.isOverdue === 1;
                    
                    return (
                      <tr key={borrow.id} className={isOverdue ? 'table-danger' : ''}>
                        <td>{borrow.keyId}</td>
                        <td>{borrow.lab}</td>
                        <td>{borrowDate.toLocaleString()}</td>
                        <td>
                          {isOverdue ? (
                            <span className="badge bg-danger">Overdue ({diffHours} hours)</span>
                          ) : (
                            <span className="badge bg-danger">Borrowed</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReturn(borrow.keyId)}
                            disabled={returning}
                          >
                            {returning ? 'Returning...' : 'Return Key'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Key Return Policy</h5>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              <li className="list-group-item">Keys should be returned within 24 hours of borrowing.</li>
              <li className="list-group-item">Overdue keys are highlighted in red.</li>
              <li className="list-group-item">Please return keys promptly when you're finished using the lab.</li>
              <li className="list-group-item">If you need to keep a key longer, please contact IT staff.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBorrows; 