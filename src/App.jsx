import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Users from './pages/Users';
import Generus from './pages/Generus';
import Kelas from './pages/Kelas';
import Report from './pages/Report';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('generus');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem('rg_user');
    if (s) {
      const u = JSON.parse(s);
      setUser(u);
      if (u.role === 'Guru') setPage('kelas');
      else if (u.role === 'Admin') setPage('generus');
    }
  }, []);

  function handleLogin(u) {
    setUser(u);
    sessionStorage.setItem('rg_user', JSON.stringify(u));
    // Default page per role
    if (u.role === 'Guru') setPage('kelas');
    else if (u.role === 'Admin') setPage('generus');
    else setPage('generus');
  }

  function handleLogout() {
    setUser(null);
    sessionStorage.removeItem('rg_user');
    setPage('kelas');
  }

  if (!user) return <Login onLogin={handleLogin} />;

  // Access control per role
  const access = {
    Guru: ['kelas', 'report'],
    Admin: ['generus', 'kelas', 'report'],
    Superadmin: ['users', 'generus', 'kelas', 'report'],
  };
  const allowed = access[user.role] || [];
  const currentPage = allowed.includes(page) ? page : allowed[0] || 'kelas';

  const titles = { users: 'Tambah User', generus: 'Pendataan Generus', kelas: 'Jadwal Kelas', report: 'Cetak Report' };

  return (
    <div className="layout">
      <Sidebar active={currentPage} onNavigate={setPage} user={user} onLogout={handleLogout}
        isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar-title">{titles[currentPage] || ''}</span>
          <span className="topbar-user">👤 {user.nama}</span>
        </header>
        <div className="content">
          {currentPage === 'users' && <Users />}
          {currentPage === 'generus' && <Generus />}
          {currentPage === 'kelas' && <Kelas user={user} />}
          {currentPage === 'report' && <Report />}
        </div>
      </main>
    </div>
  );
}
