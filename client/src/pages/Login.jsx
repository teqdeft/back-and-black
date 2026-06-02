import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { apiError } from '../lib/api';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('S-99');
  const [password, setPassword] = useState('owner123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) navigate('/', { replace: true });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-top">
          <div className="brand">Ashtang <small>Ayurveda</small></div>
          <p style={{ margin: '10px 0 0', opacity: 0.8, fontSize: 14 }}>Admin & Network Console</p>
        </div>
        <form className="login-body" onSubmit={submit}>
          {error && <div className="error-box">{error}</div>}
          <div className="field">
            <label>Code, email or phone</label>
            <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-forest" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="hint">
            Demo accounts:<br />
            Owner — <b>S-99</b> / owner123<br />
            Staff — <b>STAFF-01</b> / demo1234<br />
            Participant — <b>BA-0000101</b> / demo1234
          </p>
        </form>
      </div>
    </div>
  );
}
