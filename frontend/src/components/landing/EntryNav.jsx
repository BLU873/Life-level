import { Link } from 'react-router-dom';

export default function EntryNav() {
  return (
    <nav className="ln-nav" aria-label="Primary">
      <Link to="/" className="ln-brand">
        <span className="ln-brand__mark" aria-hidden="true">//</span>
        <span className="ln-brand__name">LIFE//LEVEL</span>
      </Link>
      <div className="ln-nav__actions">
        <Link to="/login" className="ln-nav__signin">Sign in</Link>
      </div>
    </nav>
  );
}