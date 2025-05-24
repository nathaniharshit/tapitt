
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = (userData: any) => {
    // Store user data (in real app, this would be handled by auth context)
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/');
  };

  return <LoginForm onLogin={handleLogin} />;
};

export default Login;
