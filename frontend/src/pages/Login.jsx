import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
              <Crosshair size={16} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-text">
              LIFE<span className="mx-px text-text-3">//</span>LEVEL
            </span>
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-text">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-text-2">Sign in to continue your journey.</p>
        </div>

        <form className="card space-y-4 p-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            <LogIn size={17} />
            Continue
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-2">
          New here?{' '}
          <Link to="/signup" className="font-medium text-accent transition-colors hover:text-accent-2">
            Create your account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}