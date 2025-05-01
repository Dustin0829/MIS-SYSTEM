    import { Subject } from 'rxjs';

// Central data store for sharing between components
class DataSyncService {
  constructor() {
    // Create observable subjects for different data types
    this.keyUpdates = new Subject();
    this.transactionUpdates = new Subject();
    this.teacherUpdates = new Subject();
    
    // In-memory cache
    this.cache = {
      keys: [],
      transactions: [],
      activeTransactions: [],
      teachers: []
    };
  }

  // Key methods
  updateKeys(keys) {
    this.cache.keys = keys;
    this.keyUpdates.next(keys);
  }

  getKeys() {
    return this.cache.keys;
  }

  onKeyUpdates(callback) {
    return this.keyUpdates.subscribe(callback);
  }

  // Transaction methods
  updateTransactions(transactions) {
    this.cache.transactions = transactions;
    
    // Also update active transactions
    const activeTransactions = transactions.filter(t => 
      t.status === 'Borrowed' || t.returnDate === null
    );
    this.cache.activeTransactions = activeTransactions;
    
    this.transactionUpdates.next(transactions);
  }

  getTransactions() {
    return this.cache.transactions;
  }

  getActiveTransactions() {
    return this.cache.activeTransactions;
  }

  onTransactionUpdates(callback) {
    return this.transactionUpdates.subscribe(callback);
  }

  // Teacher methods
  updateTeachers(teachers) {
    this.cache.teachers = teachers;
    this.teacherUpdates.next(teachers);
  }

  getTeachers() {
    return this.cache.teachers;
  }

  onTeacherUpdates(callback) {
    return this.teacherUpdates.subscribe(callback);
  }
}

// Create a singleton instance
const dataSyncService = new DataSyncService();

export default dataSyncService; 