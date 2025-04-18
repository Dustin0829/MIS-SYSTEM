import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getActiveBorrows, returnKey } from '../../services/api';

const MyBorrows = () => {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const fetchBorrows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching active borrows...');
      const data = await getActiveBorrows();
      console.log('Raw active borrows data:', data);
      
      if (!data) {
        console.error('No data received from getActiveBorrows()');
        setDebugInfo({ 
          message: 'No data received from API',
          receivedData: data
        });
        setError('Failed to load borrowed keys: No data received');
        setBorrows([]);
        return;
      }
      
      if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        setDebugInfo({ 
          message: 'API returned non-array data',
          receivedData: data
        });
        setError('Failed to load borrowed keys: Invalid data format');
        setBorrows([]);
        return;
      }
      
      // Process and validate each borrow
      const processedBorrows = data.map((borrow, index) => {
        if (!borrow) {
          console.error(`Null or undefined borrow at index ${index}`);
          return null;
        }
        
        // Handle missing properties
        if (!borrow.keyId && !borrow.keyid) {
          console.error(`Borrow missing keyId/keyid at index ${index}:`, borrow);
        }
        
        if (!borrow.borrowDate) {
          console.error(`Borrow missing borrowDate at index ${index}:`, borrow);
        }
        
        return {
          id: borrow.id || `unknown-${index}`,
          keyId: borrow.keyId || borrow.keyid || `unknown-${index}`,
          borrowDate: borrow.borrowDate || new Date().toISOString(),
          lab: borrow.lab || 'Unknown',
          isOverdue: borrow.isOverdue === true || borrow.isOverdue === 1
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Processed borrows:', processedBorrows);
      setBorrows(processedBorrows);
    } catch (error) {
      console.error('Error in fetchBorrows:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to load borrowed keys: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in fetchBorrows',
        error: errorMessage, 
        stack: error.stack 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrows();
  }, [fetchBorrows]);

  const handleReturn = async (keyId) => {
    if (!window.confirm(`Are you sure you want to return key ${keyId}?`)) {
      return;
    }
    
    try {
      setReturning(true);
      setError('');
      console.log('Returning key:', keyId);
      await returnKey(keyId);
      
      toast.success('Key returned successfully!');
      fetchBorrows();
    } catch (error) {
      console.error('Error in handleReturn:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to return key: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in handleReturn',
        error: errorMessage, 
        stack: error.stack,
        keyId 
      });
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
          <strong>Error:</strong> {error}
          <button 
            className="btn btn-sm btn-outline-danger float-end"
            onClick={() => setDebugInfo(prev => prev ? null : { hasError: true })}
          >
            {debugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </div>
      )}
      
      {debugInfo && (
        <div className="alert alert-secondary mb-3">
          <h6>Debug Information:</h6>
          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mb-3">
        <button 
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchBorrows}
        >
          Refresh Borrowed Keys
        </button>
      </div>
      
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
                    const isOverdue = borrow.isOverdue === 1 || borrow.isOverdue === true;
                    
                    return (
                      <tr key={borrow.id} className={isOverdue ? 'table-danger' : ''}>
                        <td>{borrow.keyId}</td>
                        <td>{borrow.lab}</td>
                        <td>{borrowDate.toLocaleString()}</td>
                        <td>
                          {isOverdue ? (
                            <span className="badge bg-danger">Overdue ({diffHours} hours)</span>
                          ) : (
                            <span className="badge bg-warning text-dark">Borrowed</span>
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