import React, { useState, useEffect } from 'react';
import { getPublicTransactions } from '../../services/api';

const PublicTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await getPublicTransactions();
        setTransactions(data);
      } catch (error) {
        setError('Failed to load transactions: ' + error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading transactions...</p>
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

  // Calculate duration between borrow and return dates or current time
  const calculateDuration = (borrowDate, returnDate) => {
    const bDate = new Date(borrowDate);
    const rDate = returnDate ? new Date(returnDate) : new Date();
    
    const diffMs = rDate - bDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} minutes`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${diffHours} hours ${remainingMins > 0 ? `${remainingMins} minutes` : ''}`;
    }
  };

  return (
    <div>
      <h2 className="mb-4">Transaction History</h2>
      
      {transactions.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No transactions found.
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Teacher</th>
                    <th>Key ID</th>
                    <th>Borrowed Date</th>
                    <th>Returned Date</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => {
                    const duration = calculateDuration(transaction.borrowDate, transaction.returnDate);
                    return (
                      <tr key={transaction.id}>
                        <td>{transaction.teacherId}</td>
                        <td>{transaction.teacherName}</td>
                        <td>{transaction.keyId}</td>
                        <td>{new Date(transaction.borrowDate).toLocaleString()}</td>
                        <td>{transaction.returnDate ? new Date(transaction.returnDate).toLocaleString() : '-'}</td>
                        <td>
                          <span className={`badge ${transaction.returnDate ? 'bg-primary' : 'bg-warning text-dark'}`}>
                            {transaction.returnDate ? 'Returned' : 'Borrowed'}
                          </span>
                        </td>
                        <td>{duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTransactions; 