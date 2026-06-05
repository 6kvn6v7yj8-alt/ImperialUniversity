import axios from 'axios';

const API = axios.create({
  baseURL: 'http://YOUR_BACKEND_IP:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token automatically
API.interceptors.request.use(
  async config => {
    // لو هتستخدم AsyncStorage للتوكن
    // const token = await AsyncStorage.getItem('token');

    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  error => Promise.reject(error)
);

export default API;