import React, { useState, useEffect, useCallback } from 'react';
import { getTransactions } from '../../services/api';
import Pagination from '../common/Pagination';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debugInfo, setDebugInfo] = useState(null);
  const transactionsPerPage = 10;

  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      console.log(`Fetching transactions for page ${page}...`);
      
      const data = await getTransactions(page, transactionsPerPage);
      console.log('Raw transactions data:', data);
      
      if (!data) {
        console.error('No data received from getTransactions()');
        setDebugInfo({ 
          message: 'No data received from API',
          receivedData: data
        });
        setError('Failed to load transaction history: No data received');
        setTransactions([]);
        return;
      }
      
      // Check for expected data structure
      if (!data.transactions && !Array.isArray(data)) {
        console.error('Invalid transactions data format:', data);
        setDebugInfo({ 
          message: 'API returned invalid data format',
          receivedData: data
        });
        setError('Failed to load transaction history: Invalid data format');
        setTransactions([]);
        return;
      }
      
      // Handle both possible response formats
      const transactionList = Array.isArray(data) ? data : data.transactions || [];
      const total = data.totalPages || Math.ceil(transactionList.length / transactionsPerPage) || 1;
      
      if (!Array.isArray(transactionList)) {
        console.error('Transactions is not an array:', transactionList);
        setDebugInfo({ 
          message: 'API returned non-array transactions',
          receivedData: data,
          transactionList
        });
        setError('Failed to load transaction history: Invalid data format');
        setTransactions([]);
        return;
      }
      
      // Process and validate each transaction
      const processedTransactions = transactionList.map((transaction, index) => {
        if (!transaction) {
          console.error(`Null or undefined transaction at index ${index}`);
          return null;
        }
        
        // Handle missing properties and normalize data
        if (!transaction.keyId && !transaction.keyid) {
          console.error(`Transaction missing keyId/keyid at index ${index}:`, transaction);
        }
        
        if (!transaction.transactionDate && !transaction.date) {
          console.error(`Transaction missing date at index ${index}:`, transaction);
        }
        
        return {
          id: transaction.id || `unknown-${index}`,
          keyId: transaction.keyId || transaction.keyid || 'Unknown',
          transactionDate: transaction.transactionDate || transaction.date || new Date().toISOString(),
          returnDate: transaction.returnDate || null,
          lab: transaction.lab || 'Unknown',
          type: transaction.type || (transaction.returnDate ? 'Return' : 'Borrow')
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Processed transactions:', processedTransactions);
      console.log('Total pages:', total);
      
      setTransactions(processedTransactions);
      setTotalPages(total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
      const errorMessage = error.error || error.message || JSON.stringify(error);
      setError(`Failed to load transaction history: ${errorMessage}`);
      setDebugInfo({ 
        message: 'Error in fetchTransactions',
        error: errorMessage, 
        stack: error.stack,
        currentPage: page
      });
    } finally {
      setLoading(false);
    }
  }, [transactionsPerPage]);

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage, fetchTransactions]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading transaction history...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Transaction History</h2>
      
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
          onClick={() => fetchTransactions(currentPage)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh History'}
        </button>
      </div>
      
      {transactions.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No transaction history found.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Key ID</th>
                      <th>Lab</th>
                      <th>Type</th>
                      <th>Date & Time</th>
                      <th>Return Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.id}</td>
                        <td>{transaction.keyId}</td>
                        <td>{transaction.lab}</td>
                        <td>
                          {transaction.type === 'Borrow' ? (
                            <span className="badge bg-warning text-dark">Borrow</span>
                          ) : (
                            <span className="badge bg-success">Return</span>
                          )}
                        </td>
                        <td>{new Date(transaction.transactionDate).toLocaleString()}</td>
                        <td>
                          {transaction.returnDate 
                            ? new Date(transaction.returnDate).toLocaleString() 
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="d-flex justify-content-center mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionHistory; 