import { useState } from 'react';
import LoginForm from '../components/Auth/LoginForm';
import ProfessionalLoginForm from '../components/Auth/ProfessionalLoginForm';

type LoginMode = 'admin' | 'professional';

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<LoginMode>('admin');

  const handleSwitchToAdmin = () => {
    setLoginMode('admin');
  };

  const handleSwitchToProfessional = () => {
    setLoginMode('professional');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loginMode === 'admin' ? (
        <LoginForm onSwitchToProfessional={handleSwitchToProfessional} />
      ) : (
        <ProfessionalLoginForm onSwitchToAdmin={handleSwitchToAdmin} />
      )}
    </div>
  );
}