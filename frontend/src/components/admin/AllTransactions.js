import React, { useState, useEffect } from 'react';
import { getTransactions } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const AllTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await getTransactions();
        setTransactions(data);
        setFilteredTransactions(data);
      } catch (error) {
        setError('Failed to load transactions: ' + error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    // Apply filters when search term or filter status changes
    let filtered = transactions;
    
    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(transaction => !transaction.returnDate);
    } else if (filterStatus === 'returned') {
      filtered = filtered.filter(transaction => transaction.returnDate);
    } else if (filterStatus === 'overdue') {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(transaction => {
        const borrowDate = new Date(transaction.borrowDate);
        return !transaction.returnDate && borrowDate < oneDayAgo;
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.keyId.toLowerCase().includes(term) || 
        transaction.teacherName?.toLowerCase().includes(term)
      );
    }
    
    setFilteredTransactions(filtered);
  }, [searchTerm, filterStatus, transactions]);

  // Function to export transactions to XLSX (Excel) format
  // This function will create an XLSX file from the filtered transactions and trigger a download
  const exportXLSX = () => {
    const now = new Date();
    const rows = filteredTransactions.map(transaction => {
      const borrowDate = new Date(transaction.borrowDate);
      const returnDate = transaction.returnDate ? new Date(transaction.returnDate) : null;
      const isActive = !returnDate;
  
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const isOverdue = isActive && borrowDate < oneDayAgo;
  
      // Duration calculation
      let duration;
      if (isActive) {
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
  
      const status = isOverdue ? 'Overdue' : (isActive ? 'Active' : 'Returned');
  
      return {
        ID: transaction.teacherId,
        Teacher: transaction.teacherName,
        'Key ID': transaction.keyId,
        'Borrowed Date': borrowDate.toLocaleString(),
        'Returned Date': returnDate ? returnDate.toLocaleString() : '-',
        Status: status,
        Duration: duration,
      };
    });
  
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'LebronJamesLoveCurry.xlsx');
  };

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

  return (
    <div>
      <h2 className="mb-4">All Transactions</h2>
      
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="searchInput" className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                id="searchInput"
                placeholder="Search by key ID or teacher name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="statusFilter" className="form-label">Filter by Status</label>
              <select
                className="form-select"
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Transactions</option>
                <option value="active">Active Borrows</option>
                <option value="returned">Returned Keys</option>
                <option value="overdue">Overdue Keys</option>
              </select>
            </div>
          </div>
          
          <div className="d-flex justify-content-end mt-3">
            <button 
                className="btn btn-success ms-2" 
                onClick={exportXLSX}
            >
               <i className="bi bi-file-earmark-excel"></i> Export XLSX
            </button>
          </div>
        </div>
      </div>
      
      {filteredTransactions.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No transactions found with the current filters. Try adjusting your search or filters.
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
                  {filteredTransactions.map((transaction) => {
                    const borrowDate = new Date(transaction.borrowDate);
                    const returnDate = transaction.returnDate ? new Date(transaction.returnDate) : null;
                    const isActive = !returnDate;
                    
                    // Check if it's overdue
                    const now = new Date();
                    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    const isOverdue = isActive && borrowDate < oneDayAgo;
                    
                    // Calculate duration
                    let duration;
                    if (isActive) {
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
                      <tr 
                        key={transaction.id} 
                        className={isOverdue ? 'table-danger' : (isActive ? 'table-warning' : '')}
                      >
                        <td>{transaction.teacherId}</td>
                        <td>{transaction.teacherName}</td>
                        <td>{transaction.keyId}</td>
                        <td>{borrowDate.toLocaleString()}</td>
                        <td>{returnDate ? returnDate.toLocaleString() : '-'}</td>
                        <td>
                          {isOverdue ? (
                            <span className="badge bg-danger">Overdue</span>
                          ) : isActive ? (
                            <span className="badge bg-warning text-dark">Active</span>
                          ) : (
                            <span className="badge bg-primary">Returned</span>
                          )}
                        </td>
                        <td>{duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <small className="text-muted">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </small>
            </div>
          </div>
        </div>
      )}
      
      <style jsx="true">{`
        @media print {
          .navbar, footer, button, .btn, select, input, label, .mt-3 {
            display: none !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          .card-body:first-of-type {
            padding: 0 !important;
          }
          table {
            width: 100% !important;
          }
          .table-responsive {
            overflow: visible !important;
          }
          h2, .table, .table-responsive, tbody, td, th, tr {
            display: table !important;
          }
          .table {
            display: table !important;
            width: 100% !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            display: table-row !important;
          }
          td, th {
            display: table-cell !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AllTransactions; 