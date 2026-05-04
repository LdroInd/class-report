import { useState, useEffect } from 'react';
const KELOMPOK = ['Batusari', 'Guji Baru', 'Kemanggisan Pulo', 'Kemanggisan Ilir'];
const ROLES = ['Guru', 'Admin', 'Superadmin'];

export default function Users() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', nama: '', role: 'Guru', kelompok: KELOMPOK[0] });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  async function load() { setList((await (await fetch('/api/users')).json()) || []); }

  async function handleSubmit(e) {
    e.preventDefault();
    const h = { 'Content-Type': 'application/json' };
    if (editId) {
      const res = await fetch(`/api/users/${editId}`, { method: 'PUT', headers: h, body: JSON.stringify(form) });
      if (res.ok) alert('User berhasil diupdate!');
    } else {
      const res = await fetch('/api/users', { method: 'POST', headers: h, body: JSON.stringify(form) });
      if (res.ok) alert('User berhasil ditambahkan!');
    }
    resetForm(); load();
  }

  function handleEdit(u) {
    setEditId(u.id);
    setForm({ username: u.username, password: '', nama: u.nama, role: u.role, kelompok: u.kelompok });
  }

  async function handleDelete(id) {
    if (!confirm('Hapus user ini?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' }); load();
  }

  function resetForm() { setForm({ username: '', password: '', nama: '', role: 'Guru', kelompok: KELOMPOK[0] }); setEditId(null); }

  const filtered = list.filter(u => !search || u.nama.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1>Tambah User</h1>
      <div className="form-card">
        <h2>{editId ? 'Edit User' : 'Tambah User'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Username *" required />
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              placeholder={editId ? 'Password (kosongkan jika tidak diubah)' : 'Password *'} required={!editId} />
          </div>
          <div className="form-row">
            <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} placeholder="Nama *" required />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={form.kelompok} onChange={e => setForm({...form, kelompok: e.target.value})}>
              {KELOMPOK.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-row">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Simpan'}</button>
            {editId && <button type="button" className="btn-danger" onClick={resetForm}>Batal</button>}
          </div>
        </form>
      </div>
      <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari user..." />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Kelompok</th><th>Aksi</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan="5" className="empty">Tidak ada data</td></tr> :
              filtered.map(u => (
                <tr key={u.id}>
                  <td>{u.username}</td><td>{u.nama}</td><td>{u.role}</td><td>{u.kelompok}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(u)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(u.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
