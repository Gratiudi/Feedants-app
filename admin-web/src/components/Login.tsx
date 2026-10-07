import { useState } from 'react';

// ──────────────────────────────────────────────────────────────
// STEP 1: Define the shape of the props this component accepts.
// The parent component (App.tsx) will pass an "onLogin" callback
// so that after a successful login, we can hand the JWT token
// back up to the parent to store and use for future API calls.
// ──────────────────────────────────────────────────────────────
interface LoginProps {
  onLogin: (token: string) => void;
}

// ──────────────────────────────────────────────────────────────
// STEP 2: Define the backend URL as a constant.
// During development, the Express backend runs on port 5000.
// In production, you'd swap this for an environment variable.
// ──────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5000';

export default function Login({ onLogin }: LoginProps) {
  // ────────────────────────────────────────────────────────────
  // STEP 3: Create state variables for the form.
  // - email & password: the user's input
  // - loading: disables the button while the request is in flight
  // - error: stores any error message from the backend
  // ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ────────────────────────────────────────────────────────────
  // STEP 4: The form submission handler.
  // This is an async function because we need to "await" the
  // network request to the backend.
  // ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.SyntheticEvent) => {
    // Prevent the browser from refreshing the page on form submit
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ──────────────────────────────────────────────────────────
      // STEP 5: Make a POST request to the backend login endpoint.
      // This is the EXACT same endpoint the mobile app uses.
      // We send JSON with { email, password } in the body.
      // The backend responds with { token, user } on success.
      // ──────────────────────────────────────────────────────────
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      // ──────────────────────────────────────────────────────────
      // STEP 6: Handle errors from the backend.
      // If res.ok is false, the backend returned 401 or 400,
      // meaning invalid credentials or missing fields.
      // ──────────────────────────────────────────────────────────
      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      // ──────────────────────────────────────────────────────────
      // STEP 7: Check that the user is an admin.
      // Regular competitors should NOT be able to access the
      // admin dashboard. We check the role from the response.
      // ──────────────────────────────────────────────────────────
      if (data.user.role !== 'admin') {
        setError('Access denied. Admin accounts only.');
        return;
      }

      // ──────────────────────────────────────────────────────────
      // STEP 8: Persist the token in localStorage.
      // Unlike the mobile app (which uses expo-secure-store),
      // web apps use localStorage. The token survives page
      // refreshes so the admin stays logged in.
      // ──────────────────────────────────────────────────────────
      localStorage.setItem('token', data.token);

      // ──────────────────────────────────────────────────────────
      // STEP 9: Notify the parent component.
      // Calling onLogin(token) tells App.tsx "we're logged in now,
      // show the Dashboard instead of the Login screen."
      // ──────────────────────────────────────────────────────────
      onLogin(data.token);

    } catch {
      // Network error (backend not running, no internet, etc.)
      setError('Unable to connect to server');
    } finally {
      // Always stop the loading spinner, whether success or failure
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // STEP 10: The JSX — a simple, clean login form.
  // This is standard HTML: a <form> with two <input> fields
  // and a <button>. No React Native here — just plain web HTML.
  // ────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Feedants Admin</h1>
        <p style={styles.subtitle}>Sign in to manage competitions</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@feedants.com"
          required
          style={styles.input}
        />

        <label style={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={styles.input}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// STEP 11: Inline styles.
// On the web we use regular CSS properties (camelCase).
// This keeps the component self-contained for now.
// You can move these to a .css file later if you prefer.
// ──────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2d45 100%)',
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: '40px 32px',
    width: 380,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#0d1b2a',
    textAlign: 'center',
  },
  subtitle: {
    margin: '8px 0 24px',
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    marginTop: 24,
    borderRadius: 10,
    border: 'none',
    background: '#0f766e',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  errorBox: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
};
