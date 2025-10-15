import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // For demo purposes, just navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-8 py-10">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/logo.png" alt="Optimus Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
                Optimus
              </span>
            </div>
            <h2 className="text-xl font-normal text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
            </h2>
            <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
              Log in to your account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <input
                type="email"
                placeholder="Email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700"
                style={{ fontFamily: 'Inter' }}
                onClick={() => console.log('Forgot password clicked')}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              style={{ fontFamily: 'Inter' }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}