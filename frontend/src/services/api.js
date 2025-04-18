import axios from 'axios';

// Define the API base URL based on environment
const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://sti-hhljrjf0-franc-egos-projects.vercel.app/api'  // Production backend URL
  : '/api';  // Local development URL

console.log('API Base URL:', apiBaseUrl);

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
  timeout: 15000 // 15-second timeout to avoid hanging requests
});

// Add token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
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

// Key management
export const getKeys = async () => {
  try {
    const response = await api.get('/keys');
    return response.data;
  } catch (error) {
    console.error('Error fetching keys:', error);
    throw error;
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
    const errorMsg = error.error || 'Network error';
    throw { error: errorMsg };
  }
};

export const deleteKey = async (keyId) => {
  try {
    const response = await api.delete(`/keys/${keyId}`);
    return response.data;
  } catch (error) {
    // Properly format the error message
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
    throw errorMessage;
  }
};

// Borrow and return operations
export const borrowKey = async (keyId) => {
  try {
    const response = await api.post('/borrow', { keyId });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

export const returnKey = async (keyId) => {
  try {
    const response = await api.post('/return', { keyId });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
  }
};

// Transaction management
export const getTransactions = async () => {
  try {
    const response = await api.get('/transactions');
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getActiveTransactions = async () => {
  try {
    const response = await api.get('/transactions/active');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: 'Network error' };
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
    throw error;
  }
};

export default api; 