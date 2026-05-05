import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import AuxiliarPanel from './components/AuxiliarPanel';

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('usuario');
    if (u) setUsuario(JSON.parse(u));
  }, []);

  const handleLogin = (u) => {
    localStorage.setItem('usuario', JSON.stringify(u));
    setUsuario(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  if (!usuario) return <Login onLogin={handleLogin} />;
  if (usuario.rol === 'admin') return <AdminPanel usuario={usuario} onLogout={handleLogout} />;
  return <AuxiliarPanel usuario={usuario} onLogout={handleLogout} />;
}

export default App;
