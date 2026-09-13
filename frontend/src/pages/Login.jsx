import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import EntryNav from '../components/landing/EntryNav';
import EntryField from '../components/landing/EntryField';
import EntryButton from '../components/landing/EntryButton';
import '../styles/landing.css';

const EASE = [0.16, 1, 0.3, 1];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

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

  const rise = (delay) =>
    reduced
      ? { initial: false }
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: EASE, delay },
        };

  return (
    <div className="entry entry-page">
      <section className="entry-section">
        <motion.div {...rise(0.1)} className="entry-panel">
          <div className="entry-panel__head">
            <span className="entry-panel__brand">
              <span className="ln-brand__mark" aria-hidden="true">//</span>
              LIFE//LEVEL
            </span>
            <h1 className="entry-heading">Welcome back</h1>
            <p className="entry-sub">Continue your progression.</p>
          </div>

          <form className="entry-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="entry-form__error" role="alert">
                {error}
              </div>
            )}

            <EntryField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <EntryField
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <EntryButton type="submit" fullWidth loading={loading}>
              Sign in
              <span aria-hidden="true">→</span>
            </EntryButton>
          </form>

          <p className="entry-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </motion.div>

        <EntryNav />
      </section>
    </div>
  );
}