import React, { useState, useEffect } from 'react';
import { getTransactions } from '../../services/api';

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await getTransactions();
        console.log('Transaction history data:', data);
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        setError('Failed to load transaction history: ' + (error.error || error.message || JSON.stringify(error)));
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
        <p className="mt-2">Loading transaction history...</p>
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
      <h2 className="mb-4">Transaction History</h2>
      
      {transactions.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No transaction history found. Once you borrow and return keys, your history will appear here.
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
                    <th>Returned Date</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const borrowDate = new Date(transaction.borrowDate);
                    const returnDate = transaction.returnDate ? new Date(transaction.returnDate) : null;
                    const isActive = !returnDate;
                    
                    // Calculate duration
                    let duration;
                    if (isActive) {
                      const now = new Date();
                      const diffHours = Math.round((now - borrowDate) / (1000 * 60 * 60));
                      duration = `${diffHours} hours (ongoing)`;
                    } else {
                      const diffHours = Math.round((returnDate - borrowDate) / (1000 * 60 * 60));
                      if (diffHours < 1) {
                        const diffMinutes = Math.round((returnDate - borrowDate) / (1000 * 60));
                        duration = `${diffMinutes} minutes`;
                      } else {
                        duration = `${diffHours} hours`;
                      }
                    }
                    
                    return (
                      <tr key={transaction.id}>
                        <td>{transaction.keyId}</td>
                        <td>{transaction.lab || 'Unknown'}</td>
                        <td>{borrowDate.toLocaleString()}</td>
                        <td>{returnDate ? returnDate.toLocaleString() : '-'}</td>
                        <td>
                          {isActive ? (
                            <span className="badge bg-warning text-dark">Active</span>
                          ) : (
                            <span className="badge bg-success">Returned</span>
                          )}
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

export default History; 