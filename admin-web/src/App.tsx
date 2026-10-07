import { useState } from 'react'
import Login from './components/Login'
import './App.css'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
};
if (!token) {
  return <Login onLogin={setToken} />;
}
  return (
    <div className="App" style = {{padding: 32}}>
      <h1>Feedant Admin Dashboard</h1>
      <button onClick={handleLogout} style={{marginTop: 16, padding: 16, cursor: 'pointer'}}>Logout</button>
    </div>
  );
}

export default App
