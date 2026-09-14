import { Link } from 'react-router-dom';

export default function EntryNav({ marker = null }) {
  return (
    <nav className="ln-nav" aria-label="Primary">
      <Link to="/" className="ln-brand">
        <span className="ln-brand__mark" aria-hidden="true">//</span>
        <span className="ln-brand__name">LIFE//LEVEL</span>
      </Link>
      <div className="ln-nav__actions">
        {marker && (
          <span className="ln-nav__marker" aria-hidden="true">
            {marker}
          </span>
        )}
        <Link to="/login" className="ln-nav__signin">Sign in</Link>
      </div>
    </nav>
  );
}