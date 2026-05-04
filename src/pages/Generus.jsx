import { useState, useEffect } from 'react';
const KELOMPOK = ['Batusari', 'Guji Baru', 'Kemanggisan Pulo', 'Kemanggisan Ilir'];

export default function Generus() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ nama: '', kelompok: KELOMPOK[0], tanggal_lahir: '', nama_orang_tua: '', nomer_telp_ortu: '' });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  useEffect(() => { load(); }, []);
  async function load() { setList((await (await fetch('/api/generus')).json()) || []); }

  async function handleSubmit(e) {
    e.preventDefault();
    const h = { 'Content-Type': 'application/json' };
    if (editId) {
      await fetch(`/api/generus/${editId}`, { method: 'PUT', headers: h, body: JSON.stringify(form) });
      alert('Data berhasil diupdate!');
    } else {
      await fetch('/api/generus', { method: 'POST', headers: h, body: JSON.stringify(form) });
      alert('Data berhasil ditambahkan!');
    }
    resetForm(); load();
  }

  function handleEdit(g) {
    setEditId(g.id);
    setForm({ nama: g.nama, kelompok: g.kelompok, tanggal_lahir: g.tanggal_lahir, nama_orang_tua: g.nama_orang_tua, nomer_telp_ortu: g.nomer_telp_ortu || '' });
  }

  async function handleDelete(id) {
    if (!confirm('Hapus data ini?')) return;
    await fetch(`/api/generus/${id}`, { method: 'DELETE' }); load();
  }

  function resetForm() { setForm({ nama: '', kelompok: KELOMPOK[0], tanggal_lahir: '', nama_orang_tua: '', nomer_telp_ortu: '' }); setEditId(null); }

  const grades = [...new Set(list.map(g => g.grade))].sort();
  const filtered = list.filter(g => {
    const matchSearch = !search || g.nama.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !filterGrade || g.grade === filterGrade;
    return matchSearch && matchGrade;
  });

  return (
    <div>
      <h1>Pendataan Generus</h1>
      <div className="form-card">
        <h2>{editId ? 'Edit Generus' : 'Tambah Generus'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} placeholder="Nama *" required />
            <select value={form.kelompok} onChange={e => setForm({...form, kelompok: e.target.value})}>
              {KELOMPOK.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-row">
            <input type="date" value={form.tanggal_lahir} onChange={e => setForm({...form, tanggal_lahir: e.target.value})} required />
            <input value={form.nama_orang_tua} onChange={e => setForm({...form, nama_orang_tua: e.target.value})} placeholder="Nama Orang Tua" />
            <input value={form.nomer_telp_ortu} onChange={e => setForm({...form, nomer_telp_ortu: e.target.value})} placeholder="No. Telp Orang Tua" />
          </div>
          <div className="form-row">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Simpan'}</button>
            {editId && <button type="button" className="btn-danger" onClick={resetForm}>Batal</button>}
          </div>
        </form>
      </div>
      <div className="filter-row">
        <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari nama..." />
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
          <option value="">-- Semua Grade --</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nama</th><th>Kelompok</th><th>Tgl Lahir</th><th>Orang Tua</th><th>No. Telp Ortu</th><th>Grade</th><th>Aksi</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan="7" className="empty">Tidak ada data</td></tr> :
              filtered.map(g => (
                <tr key={g.id}>
                  <td>{g.nama}</td><td>{g.kelompok}</td><td>{g.tanggal_lahir}</td><td>{g.nama_orang_tua}</td>
                  <td>{g.nomer_telp_ortu}</td>
                  <td><span className="badge">{g.grade}</span></td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(g)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(g.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
