import EntryNav from '../components/landing/EntryNav';
import SignupSection from '../components/landing/SignupSection';
import '../styles/landing.css';

export default function Signup() {
  return (
    <div className="entry entry-page">
      <SignupSection heading="h1" />
      <EntryNav />
    </div>
  );
}