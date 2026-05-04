export default function Sidebar({ active, onNavigate, user, onLogout, isOpen, onToggle }) {
  const role = user.role;

  const allMenus = [
    { key: 'users', label: 'Tambah User', icon: '👥', roles: ['Superadmin'] },
    { key: 'generus', label: 'Pendataan Generus', icon: '📋', roles: ['Admin', 'Superadmin'] },
    { key: 'kelas', label: 'Jadwal Kelas', icon: '🏫', roles: ['Guru', 'Admin', 'Superadmin'] },
    { key: 'report', label: 'Cetak Report', icon: '🖨️', roles: ['Guru', 'Admin', 'Superadmin'] },
  ];

  const menus = allMenus.filter(m => m.roles.includes(role));

  return (
    <>
      {isOpen && <div className="overlay" onClick={onToggle} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>📚 Generus</h2>
          <button className="sidebar-close" onClick={onToggle}>✕</button>
        </div>
        <nav>
          {menus.map(m => (
            <button key={m.key} className={`sidebar-item ${active === m.key ? 'active' : ''}`}
              onClick={() => { onNavigate(m.key); onToggle(); }}>
              <span className="sidebar-icon">{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">👤 {user.nama} <small>({user.role})</small></div>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </aside>
    </>
  );
}
