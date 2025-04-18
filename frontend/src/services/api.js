import axios from 'axios';

// Define the API base URL based on environment
const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://sti-hhljriif0-franc-egos-projects.vercel.app/api'  // Production backend URL
  : '/api';  // Local development URL

console.log('API Base URL:', apiBaseUrl);

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false,
  timeout: 15000 // 15-second timeout to avoid hanging requests
});

// Add token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`Making ${config.method.toUpperCase()} request to: ${config.baseURL}${config.url}`);
  return config;
});

// Add response interceptor to better handle errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Format the error message
    let errorMessage = 'Network error';
    if (error.response) {
      console.log('Error response:', error.response);
      if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = error.response.data.error || JSON.stringify(error.response.data);
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      }
    } else if (error.request) {
      // Request was made but no response received
      console.log('No response received:', error.request);
      errorMessage = 'Server did not respond. Please check your connection.';
      
      // Check if this is a timeout
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      }
    }
    
    return Promise.reject({ error: errorMessage });
  }
);

// Authentication
export const login = async (id, password) => {
  try {
    const response = await api.post('/login', { id, password });
    return response.data;
  } catch (error) {
    throw error;
  }
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
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
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
    const response = await api.put(`/teachers/${id}`, teacherData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const deleteTeacher = async (id) => {
  try {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const addTeacher = createTeacher; // Alias for createTeacher

// Helper function to normalize keys/transactions data
const normalizeKeyData = (data) => {
  if (!data) return data;
  
  // If it's an array, map each item
  if (Array.isArray(data)) {
    return data.map(item => normalizeKeyData(item));
  }
  
  // If it's an object, normalize the properties
  if (typeof data === 'object') {
    const normalized = { ...data };
    
    // Handle key properties
    if (data.keyid !== undefined && data.keyId === undefined) {
      normalized.keyId = data.keyid;
    }
    
    return normalized;
  }
  
  return data;
};

// Key management
export const getKeys = async () => {
  try {
    console.log('Fetching keys...');
    const response = await api.get('/keys');
    console.log('Keys response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('Error fetching keys:', error);
    throw error; // Already formatted by the interceptor
  }
};

export const createKey = async (keyData) => {
  try {
    console.log('Creating key with data:', keyData);
    const response = await api.post('/keys', keyData);
    console.log('Key creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating key:', error);
    throw error; // Already formatted by the interceptor
  }
};

export const deleteKey = async (keyId) => {
  try {
    const response = await api.delete(`/keys/${keyId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting key:', error);
    throw error; // Already formatted by the interceptor
  }
};

// Borrow and return operations
export const borrowKey = async (keyData) => {
  try {
    console.log('Initiating borrowKey API call with data:', keyData);
    const response = await api.post('/borrow', keyData);
    console.log('borrowKey API response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('borrowKey API error:', error);
    console.error('Error details:', error.response?.data || error.message || error);
    throw error; // Already formatted by the interceptor
  }
};

export const returnKey = async (keyId) => {
  try {
    console.log('Initiating returnKey API call with keyId:', keyId);
    const response = await api.post('/return', { keyId });
    console.log('returnKey API response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('returnKey API error:', error);
    console.error('Error details:', error.response?.data || error.message || error);
    throw error; // Already formatted by the interceptor
  }
};

// Transaction management
export const getTransactions = async () => {
  try {
    console.log('Initiating getTransactions API call');
    const response = await api.get('/transactions');
    console.log('getTransactions API response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('getTransactions API error:', error);
    console.error('Error details:', error.response?.data || error.message || error);
    throw error; // Already formatted by the interceptor
  }
};

export const getActiveTransactions = async () => {
  try {
    console.log('Initiating getActiveTransactions API call');
    const response = await api.get('/transactions/active');
    console.log('getActiveTransactions API response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('getActiveTransactions API error:', error);
    console.error('Error details:', error.response?.data || error.message || error);
    throw error; // Already formatted by the interceptor
  }
};

export const getActiveBorrows = getActiveTransactions; // Alias for getActiveTransactions

// Dashboard data (admin only)
export const getDashboardData = async () => {
  try {
    const response = await api.get('/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error; // Already formatted by the interceptor
  }
};

// For available keys
export const getAvailableKeys = async () => {
  try {
    console.log('Fetching available keys...');
    const response = await api.get('/keys');
    console.log('Available keys response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('Error fetching available keys:', error);
    throw error; // Already formatted by the interceptor
  }
};

// For borrowed keys
export const getBorrowedKeys = async () => {
  try {
    console.log('Fetching borrowed keys...');
    const response = await api.get('/transactions/active');
    console.log('Borrowed keys response:', response.data);
    return normalizeKeyData(response.data);
  } catch (error) {
    console.error('Error fetching borrowed keys:', error);
    throw error; // Already formatted by the interceptor
  }
};

export default api; 