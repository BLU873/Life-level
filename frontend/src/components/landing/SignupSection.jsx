import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EntryField from './EntryField';
import EntryButton from './EntryButton';

export default function SignupSection({ heading = 'h2' }) {
  const Heading = heading === 'h1' ? 'h1' : 'h2';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(username, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="entry-section">
      <div className="entry-panel">
        <div className="entry-panel__head">
          <span className="entry-panel__brand">
            <span className="ln-brand__mark" aria-hidden="true">//</span>
            LIFE//LEVEL
          </span>
          <Heading className="entry-heading">Create your character</Heading>
          <p className="entry-sub">Start building your real-life progression.</p>
        </div>

        <form className="entry-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="entry-form__error" role="alert">
              {error}
            </div>
          )}

          <EntryField
            label="Username"
            type="text"
            autoComplete="username"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

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
            autoComplete="new-password"
            placeholder="At least 6 characters"
            hint="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <EntryField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <EntryButton type="submit" fullWidth loading={loading}>
            Create account
            <span aria-hidden="true">→</span>
          </EntryButton>
        </form>

        <p className="entry-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}