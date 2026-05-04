import { useState, useEffect } from 'react';
const GRADES = ['Paud', 'Caberawit 1', 'Caberawit 2', 'Generus Pra-Remaja'];

export default function Kelas({ user }) {
  const [kelasList, setKelasList] = useState([]);
  const [gurus, setGurus] = useState([]);
  const [form, setForm] = useState({ tanggal_kelas: '', jam_mulai: '', guru_id: 0, guru_nama: '', nama_kbm: '', grade: GRADES[0] });
  const [editId, setEditId] = useState(null);
  const [viewKelas, setViewKelas] = useState(null);
  const [generusList, setGenerusList] = useState([]);
  const [detailForm, setDetailForm] = useState({ generus_id: 0, nama_generus: '', keterangan: '' });
  const [editDetailId, setEditDetailId] = useState(null);
  const [searchGenerus, setSearchGenerus] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWaPanel, setShowWaPanel] = useState(false);
  const [absentList, setAbsentList] = useState([]);
  const [waMessage, setWaMessage] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waProgress, setWaProgress] = useState({ current: 0, total: 0, nama: '' });

  useEffect(() => { loadKelas(); loadGurus(); }, []);

  async function loadKelas() { setKelasList((await (await fetch('/api/kelas')).json()) || []); }
  async function loadGurus() { setGurus((await (await fetch('/api/users/guru')).json()) || []); }

  async function loadGenerusByGrade(grade) {
    const res = await fetch(`/api/generus/by-grade?grade=${encodeURIComponent(grade)}`);
    setGenerusList((await res.json()) || []);
  }

  // Auto-set guru for role Guru
  useEffect(() => {
    if (user.role === 'Guru' && !editId) {
      setForm(f => ({ ...f, guru_id: user.id, guru_nama: user.nama }));
    }
  }, [user, editId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const h = { 'Content-Type': 'application/json' };
    const payload = { ...form, guru_id: Number(form.guru_id) };
    if (editId) {
      await fetch(`/api/kelas/${editId}`, { method: 'PUT', headers: h, body: JSON.stringify(payload) });
      alert('Kelas berhasil diupdate!');
    } else {
      await fetch('/api/kelas', { method: 'POST', headers: h, body: JSON.stringify(payload) });
      alert('Kelas berhasil dibuat!');
    }
    resetForm(); loadKelas();
  }

  function handleEditKelas(k) {
    setEditId(k.id);
    setForm({ tanggal_kelas: k.tanggal_kelas, jam_mulai: k.jam_mulai, guru_id: k.guru_id, guru_nama: k.guru_nama, nama_kbm: k.nama_kbm, grade: k.grade });
  }

  async function handleDeleteKelas(id) {
    if (!confirm('Hapus kelas ini?')) return;
    await fetch(`/api/kelas/${id}`, { method: 'DELETE' });
    if (viewKelas?.header?.id === id) setViewKelas(null);
    loadKelas();
  }

  async function handleViewKelas(id) {
    const res = await fetch(`/api/kelas/${id}`);
    const data = await res.json();
    setViewKelas(data);
    loadGenerusByGrade(data.header.grade);
    setDetailForm({ generus_id: 0, nama_generus: '', keterangan: '' });
    setEditDetailId(null);
  }

  function resetForm() {
    setForm({ tanggal_kelas: '', jam_mulai: '', guru_id: user.role === 'Guru' ? user.id : 0, guru_nama: user.role === 'Guru' ? user.nama : '', nama_kbm: '', grade: GRADES[0] });
    setEditId(null);
  }

  async function handleAddDetail(e) {
    e.preventDefault();
    if (!detailForm.generus_id) { alert('Pilih murid'); return; }
    const h = { 'Content-Type': 'application/json' };
    if (editDetailId) {
      await fetch(`/api/kelas/detail/${editDetailId}`, { method: 'PUT', headers: h, body: JSON.stringify(detailForm) });
    } else {
      await fetch(`/api/kelas/${viewKelas.header.id}/detail`, { method: 'POST', headers: h, body: JSON.stringify(detailForm) });
    }
    setDetailForm({ generus_id: 0, nama_generus: '', keterangan: '' });
    setEditDetailId(null);
    setSearchGenerus('');
    handleViewKelas(viewKelas.header.id);
  }

  function handleEditDetail(d) {
    setEditDetailId(d.id);
    setDetailForm({ generus_id: d.generus_id, nama_generus: d.nama_generus, keterangan: d.keterangan });
    setSearchGenerus(d.nama_generus);
  }

  async function handleDeleteDetail(id) {
    if (!confirm('Hapus murid ini dari kelas?')) return;
    await fetch(`/api/kelas/detail/${id}`, { method: 'DELETE' });
    handleViewKelas(viewKelas.header.id);
  }

  const filteredGenerus = generusList.filter(g =>
    !searchGenerus || g.nama.toLowerCase().includes(searchGenerus.toLowerCase())
  );

  function handleGuruChange(e) {
    const id = Number(e.target.value);
    const guru = gurus.find(g => g.id === id);
    setForm({ ...form, guru_id: id, guru_nama: guru ? guru.nama : '' });
  }

  async function handleOpenWaPanel() {
    if (!viewKelas) return;
    const res = await fetch(`/api/kelas/${viewKelas.header.id}/absent`);
    const data = await res.json();
    setAbsentList(data || []);
    setShowWaPanel(true);
    setWaMessage(`Assalamualaikum Wr Wb,
kami informasikan bahwa anak Bapak/Ibu belum hadir pada kelas ${viewKelas.header.nama_kbm} tanggal ${viewKelas.header.tanggal_kelas}. 
Mohon konfirmasinya, atas amal solehnya disyukuri Alhamdulillah Jaza kumullahu khairo.
Semoga Allah paring aman selamat lancar barokah`);
  }

  function formatPhone(phone) {
    let p = phone.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  async function handleSendWa() {
    if (!waMessage.trim()) { alert('Pesan tidak boleh kosong'); return; }
    if (absentList.length === 0) { alert('Tidak ada nomor untuk dikirim'); return; }
    if (!confirm(`Kirim pesan WA ke ${absentList.length} orang tua? Pesan akan dikirim otomatis setiap 10 detik.`)) return;

    setWaSending(true);
    setWaProgress({ current: 0, total: absentList.length, nama: 'Memulai...' });

    try {
      const res = await fetch('/api/wa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numbers: absentList.map(g => ({ phone: g.nomer_telp_ortu, nama: g.nama })),
          message: waMessage,
        }),
      });
      const result = await res.json();

      if (res.ok) {
        alert(`Selesai! ${result.success}/${result.total} pesan berhasil terkirim.`);
      } else {
        alert(result.error || 'Gagal mengirim');
      }
    } catch (err) {
      alert('Gagal terhubung ke server');
    }

    setWaSending(false);
  }

  return (
    <div>
      <h1>Jadwal Kelas</h1>

      <div className="form-card">
        <h2>{editId ? 'Edit Kelas' : 'Buat Kelas Baru'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input type="date" value={form.tanggal_kelas} onChange={e => setForm({...form, tanggal_kelas: e.target.value})} required />
            <input type="time" value={form.jam_mulai} onChange={e => setForm({...form, jam_mulai: e.target.value})} required />
          </div>
          <div className="form-row">
            {user.role === 'Guru' ? (
              <input value={user.nama} disabled />
            ) : (
              <select value={form.guru_id} onChange={handleGuruChange}>
                <option value="0">-- Pilih Guru --</option>
                {gurus.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
              </select>
            )}
            <input value={form.nama_kbm} onChange={e => setForm({...form, nama_kbm: e.target.value})} placeholder="Nama KBM *" required />
            <select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-row">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Simpan'}</button>
            {editId && <button type="button" className="btn-danger" onClick={resetForm}>Batal</button>}
          </div>
        </form>
      </div>

      {/* Kelas List */}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Jam</th><th>Guru</th><th>KBM</th><th>Grade</th><th>Aksi</th></tr></thead>
          <tbody>
            {kelasList.length === 0 ? <tr><td colSpan="6" className="empty">Belum ada kelas</td></tr> :
              kelasList.map(k => (
                <tr key={k.id}>
                  <td>{k.tanggal_kelas}</td><td>{k.jam_mulai}</td><td>{k.guru_nama}</td><td>{k.nama_kbm}</td>
                  <td><span className="badge">{k.grade}</span></td>
                  <td className="actions">
                    <button className="btn-view" onClick={() => handleViewKelas(k.id)}>Detail</button>
                    <button className="btn-edit" onClick={() => handleEditKelas(k)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDeleteKelas(k.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail Kelas */}
      {viewKelas && (
        <div className="detail-section">
          <h2>Detail Kelas: {viewKelas.header.nama_kbm} — {viewKelas.header.grade}</h2>
          <p>Tanggal: {viewKelas.header.tanggal_kelas} | Jam: {viewKelas.header.jam_mulai} | Guru: {viewKelas.header.guru_nama}</p>

          <form onSubmit={handleAddDetail} className="detail-form">
            <div className="form-row">
              <div className="autocomplete-wrap">
                <input value={searchGenerus} onChange={e => { setSearchGenerus(e.target.value); setShowDropdown(true); setDetailForm({...detailForm, generus_id: 0, nama_generus: ''}); }}
                  onFocus={() => setShowDropdown(true)} placeholder="Cari murid..." autoComplete="off" />
                {showDropdown && searchGenerus && (
                  <ul className="autocomplete-list">
                    {filteredGenerus.map(g => (
                      <li key={g.id} className="autocomplete-item" onMouseDown={() => {
                        setDetailForm({...detailForm, generus_id: g.id, nama_generus: g.nama});
                        setSearchGenerus(g.nama); setShowDropdown(false);
                      }}>{g.nama} <small>({g.kelompok})</small></li>
                    ))}
                    {filteredGenerus.length === 0 && <li className="autocomplete-item empty">Tidak ditemukan</li>}
                  </ul>
                )}
              </div>
              <input value={detailForm.keterangan} onChange={e => setDetailForm({...detailForm, keterangan: e.target.value})} placeholder="Keterangan belajar" style={{flex:2}} />
              <button type="submit" className="btn-primary">{editDetailId ? 'Update' : 'Tambah'}</button>
              {editDetailId && <button type="button" className="btn-danger" onClick={() => { setEditDetailId(null); setDetailForm({generus_id:0,nama_generus:'',keterangan:''}); setSearchGenerus(''); }}>Batal</button>}
            </div>
          </form>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Nama Murid</th><th>Keterangan</th><th>Aksi</th></tr></thead>
              <tbody>
                {(viewKelas.details || []).length === 0 ? <tr><td colSpan="3" className="empty">Belum ada murid</td></tr> :
                  viewKelas.details.map(d => (
                    <tr key={d.id}>
                      <td>{d.nama_generus}</td><td>{d.keterangan}</td>
                      <td className="actions">
                        <button className="btn-edit" onClick={() => handleEditDetail(d)}>Edit</button>
                        <button className="btn-del" onClick={() => handleDeleteDetail(d.id)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <button className="btn-secondary" onClick={() => setViewKelas(null)} style={{marginTop:12}}>Tutup Detail</button>
          <button className="btn-wa" onClick={handleOpenWaPanel} style={{marginTop:12, marginLeft:8}}>📱 WA Tidak Hadir</button>

          {showWaPanel && (
            <div className="wa-panel">
              <h3>📱 Kirim WA ke Orang Tua (Tidak Hadir)</h3>
              <p className="wa-info">Ditemukan <strong>{absentList.length}</strong> generus tidak hadir yang punya nomor telp ortu.</p>

              {absentList.length > 0 && (
                <>
                  <div className="wa-absent-list">
                    {absentList.map(g => (
                      <div key={g.id} className="wa-absent-item">
                        <span>{g.nama}</span>
                        <span className="wa-phone">{g.nomer_telp_ortu}</span>
                      </div>
                    ))}
                  </div>

                  <p className="wa-hint">Gunakan <code>{'{nama}'}</code> di pesan untuk otomatis diganti nama generus.</p>
                  <textarea className="wa-textarea" value={waMessage} onChange={e => setWaMessage(e.target.value)}
                    rows={4} placeholder="Tulis pesan..." disabled={waSending} />

                  {waSending && (
                    <div className="wa-progress">
                      Mengirim {waProgress.current}/{waProgress.total} — {waProgress.nama}...
                    </div>
                  )}

                  <div className="form-row" style={{marginTop:8}}>
                    <button className="btn-wa" onClick={handleSendWa} disabled={waSending}>
                      {waSending ? '⏳ Mengirim...' : `📤 Kirim ke ${absentList.length} Nomor`}
                    </button>
                    <button className="btn-secondary" onClick={() => setShowWaPanel(false)} disabled={waSending}>Tutup</button>
                  </div>
                </>
              )}

              {absentList.length === 0 && (
                <p className="empty">Semua generus hadir atau tidak ada nomor telp ortu.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
