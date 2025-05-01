import axios from 'axios';
import dataSyncService from './DataSyncService';

// Define the API base URL based on environment
const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://sti-mis.vercel.app/api'  // Production backend URL
  : '/api';  // Local development URL using proxy

console.log('API Base URL:', apiBaseUrl);

// Safe storage access
const storage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Unable to access localStorage:', error);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Unable to access localStorage:', error);
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Unable to access localStorage:', error);
      return false;
    }
  }
};

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false, // Changed to false since we're using token-based auth
  timeout: 15000 // 15-second timeout to avoid hanging requests
});

// Add token to requests if available
api.interceptors.request.use(config => {
  const token = storage.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
  return config;
});

// Handle response errors - token expiration
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If the error is due to an invalid or expired token
    if (error.response && error.response.status === 403 && 
        error.response.data.error === 'Invalid or expired token' && 
        !originalRequest._retry) {
      
      console.log('Session error detected, attempting to restore session...');
      
      // Instead of logging out, try to use the stored user data to maintain the session
      const userData = storage.get('user');
      if (userData) {
        try {
          // Keep the user logged in based on local data
          // Just redirect to root which will use the stored user data
          window.location.href = '/';
          return Promise.reject(error);
        } catch (refreshError) {
          console.error('Failed to restore session:', refreshError);
        }
      }
      
      // If we couldn't restore the session, redirect to login
      console.log('Could not restore session, redirecting to login');
      storage.remove('token');
      storage.remove('user');
      window.location.href = '/login';
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// Authentication
export const login = async (id, password) => {
  try {
    const response = await api.post('/login', { id, password });
    if (response.data.token) {
      storage.set('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = () => {
  storage.remove('token');
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/me');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

// Teacher management
export const getTeachers = async () => {
  try {
    const response = await api.get('/teachers');
    console.log('Teachers data retrieved:', response.data);
    
    // Update shared data store
    if (dataSyncService.updateTeachers) {
      dataSyncService.updateTeachers(response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching teachers:', error);
    throw error.toString();
  }
};

export const getTeacherById = async (id) => {
  try {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  } catch (error) {
    throw error.toString();
  }
};

export const createTeacher = async (teacherData) => {
  try {
    const response = await api.post('/teachers', teacherData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const updateTeacher = async (id, teacherData) => {
  try {
    console.log(`Updating teacher ${id} with data:`, teacherData);
    const response = await api.put(`/teachers/${id}`, teacherData);
    console.log('Update teacher response:', response.data);
    
    // Refresh teachers after update
    getTeachers().catch(err => console.error('Error refreshing teachers after update:', err));
    
    return response.data;
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error.toString();
  }
};

export const deleteTeacher = async (id) => {
  try {
    console.log(`Attempting to delete teacher with ID: ${id}`);
    const response = await api.delete(`/teachers/${id}`);
    console.log('Delete teacher response:', response.data);
    
    // Refresh teachers list after deletion
    getTeachers().catch(err => console.error('Error refreshing teachers after deletion:', err));
    
    return response.data;
  } catch (error) {
    console.error('Error deleting teacher:', error);
    if (error.response && error.response.status === 404) {
      throw 'Teacher not found';
    } else if (error.response && error.response.status === 400) {
      throw 'Cannot delete teacher with active key transactions';
    }
    throw error.toString();
  }
};

export const addTeacher = createTeacher; // Alias for createTeacher

// Key management
export const getKeys = async () => {
  try {
    const response = await api.get('/keys');
    console.log('Keys raw response:', response.data);
    
    // Update shared data store
    dataSyncService.updateKeys(response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching keys:', error);
    throw error.toString();
  }
};

export const getAvailableKeys = async () => {
  try {
    const response = await api.get('/keys/available');
    return response.data;
  } catch (error) {
    console.error('Error fetching available keys:', error);
    throw error.toString();
  }
};

export const createKey = async (keyData) => {
  try {
    console.log('Creating key with data:', keyData);
    const response = await api.post('/keys', keyData);
    console.log('Key creation response:', response.data);
    
    // Refresh keys after creation
    getKeys();
    
    return response.data;
  } catch (error) {
    console.error('Error creating key:', error);
    throw error.toString();
  }
};

export const deleteKey = async (keyId) => {
  try {
    const response = await api.delete(`/keys/${keyId}`);
    
    // Refresh keys after deletion
    getKeys();
    
    return response.data;
  } catch (error) {
    console.error('Error deleting key:', error); 
    throw error.toString();
  }
};

// Borrow and return operations
export const borrowKey = async (data) => {
  try {
    console.log('borrowKey API call with data:', data);
    const response = await api.post('/public/borrow', data);
    console.log('borrowKey API response:', response.data);
    
    // Refresh keys and transactions
    getKeys();
    getTransactions();
    
    return response.data;
  } catch (error) {
    console.error('Error borrowing key:', error);
    throw error.toString();
  }
};

export const returnKey = async (data) => {
  try {
    console.log('returnKey API call with data:', data);
    const response = await api.post('/public/return', data);
    console.log('returnKey API response:', response.data);
    
    // Refresh keys and transactions
    getKeys();
    getTransactions();
    
    return response.data;
  } catch (error) {
    console.error('returnKey API error:', error);
    throw error.toString();
  }
};

// Transaction management
export const getTransactions = async () => {
  try {
    const response = await api.get('/transactions');
    
    // Update shared data store
    dataSyncService.updateTransactions(response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error.toString();
  }
};

export const getActiveTransactions = async () => {
  try {
    const response = await api.get('/transactions/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active transactions:', error);
    throw error.toString();
  }
};

export const getActiveBorrows = async () => {
  try {
    const response = await api.get('/transactions/active');
    console.log('Active borrows data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching active borrows:', error);
    throw error.toString();
  }
};

export const getTeacherBorrowedKeys = async (teacherId) => {
  try {
    const response = await api.get(`/teachers/${teacherId}/borrowed`);
    return response.data;
  } catch (error) {
    console.error('Error fetching teacher borrowed keys:', error);
    throw error.toString();
  }
};

// Dashboard data (admin only)
export const getDashboardData = async () => {
  try {
    // Get the user from localStorage
    const userString = storage.get('user');
    let userRole = '';
    
    if (userString) {
      try {
        const user = JSON.parse(userString);
        userRole = user.role || '';
      } catch (err) {
        console.warn('Failed to parse user from localStorage');
      }
    }
    
    // Include the user role as a query parameter
    const response = await api.get(`/dashboard?userRole=${userRole}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error.toString();
  }
};

// Public API endpoints (no authentication required)
export const verifyTeacher = async (teacherId) => {
  try {
    const response = await axios.get(`${apiBaseUrl}/teachers/verify/${teacherId}`);
    return response.data;
  } catch (error) {
    console.error("Error verifying teacher:", error);
    throw error;
  }
};

export const publicBorrowKey = async (data, updateSharedData) => {
  try {
    console.log("Borrowing key data:", data);
    const url = `${window.location.origin}/api/public/borrow`;
    console.log("Making borrow request to:", url);
    
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Borrow response:", response.data);
    
    // Update shared data if function is provided
    if (updateSharedData && typeof updateSharedData === 'function') {
      try {
        updateSharedData();
      } catch (updateError) {
        console.error("Error updating shared data after borrow:", updateError);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error("Error borrowing key:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
      throw new Error(error.response.data.error || 'Failed to borrow key');
    }
    throw error;
  }
};

export const publicReturnKey = async (data, updateSharedData) => {
  try {
    console.log("Returning key data:", data);
    const url = `${window.location.origin}/api/public/return`;
    console.log("Making return request to:", url);
    
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Return response:", response.data);
    
    // Update shared data if function is provided
    if (updateSharedData && typeof updateSharedData === 'function') {
      try {
        updateSharedData();
      } catch (updateError) {
        console.error("Error updating shared data after return:", updateError);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error("Error returning key:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
      throw new Error(error.response.data.error || 'Failed to return key');
    }
    throw error;
  }
};

export const getAvailableKeysPublic = async () => {
  try {
    // Use cached keys from data sync service if available
    const cachedKeys = dataSyncService.getKeys();
    if (cachedKeys && cachedKeys.length > 0) {
      return cachedKeys.filter(key => key.status === 'Available');
    }
    
    // Otherwise, fetch from API
    const response = await axios.get(`${apiBaseUrl}/keys/available/public`);
    return response.data;
  } catch (error) {
    console.error('Error fetching available keys:', error);
    throw error.toString();
  }
};

export const getPublicTransactions = async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/public/transactions`);
    
    // Update shared data
    dataSyncService.updateTransactions(response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching public transactions:', error);
    throw error.toString();
  }
};

export default api;