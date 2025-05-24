
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = (userData: any) => {
    // In a real app, this would send data to backend
    console.log('New user registered:', userData);
    
    toast({
      title: "Registration Successful!",
      description: "Your account has been created. Please login to continue.",
    });

    // Redirect to login page after successful registration
    navigate('/login');
  };

  return <RegisterForm onRegister={handleRegister} />;
};

export default Register;
