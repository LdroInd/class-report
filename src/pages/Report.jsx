import { useState, useEffect } from 'react';
const GRADES = ['', 'Paud', 'Caberawit 1', 'Caberawit 2', 'Generus Pra-Remaja', 'Generus Remaja', 'Usia Mandiri'];

export default function Report() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [grade, setGrade] = useState('');
  const [generusId, setGenerusId] = useState('');
  const [generusList, setGenerusList] = useState([]);
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (grade) {
      fetch(`/api/generus/by-grade?grade=${encodeURIComponent(grade)}`)
        .then(r => r.json()).then(d => setGenerusList(d || []));
    } else {
      setGenerusList([]);
      setGenerusId('');
    }
  }, [grade]);

  async function handleSearch() {
    if (!from || !to) { alert('Tanggal from dan to wajib diisi'); return; }
    let url = `/api/report?from=${from}&to=${to}`;
    if (grade) url += `&grade=${encodeURIComponent(grade)}`;
    if (generusId) url += `&generus_id=${generusId}`;
    const res = await fetch(url);
    setData((await res.json()) || []);
    setLoaded(true);
  }

  function handlePrint() {
    const rows = data.map(r =>
      `<tr><td>${r.tanggal}</td><td>${r.jam_mulai}</td><td>${r.guru_nama}</td><td>${r.nama_kbm}</td><td>${r.grade}</td><td>${r.nama_generus}</td><td>${r.keterangan}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Report Generus</title>
      <style>body{font-family:Segoe UI,sans-serif;padding:20px}h2{margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}th{background:#f5f5f5}.meta{font-size:13px;color:#666;margin-bottom:4px}</style></head><body>
      <h2>Report Kegiatan Belajar Generus</h2>
      <p class="meta">Periode: ${from} s/d ${to}</p>
      ${grade ? `<p class="meta">Grade: ${grade}</p>` : ''}
      <table><thead><tr><th>Tanggal</th><th>Jam</th><th>Guru</th><th>KBM</th><th>Grade</th><th>Nama</th><th>Keterangan</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center">Tidak ada data</td></tr>'}</tbody></table>
      <p style="margin-top:16px;font-size:11px;color:#999">Dicetak: ${new Date().toLocaleString('id-ID')}</p></body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div>
      <h1>Cetak Report</h1>
      <div className="form-card">
        <div className="form-row">
          <label>Dari: <input type="date" value={from} onChange={e => setFrom(e.target.value)} required /></label>
          <label>Sampai: <input type="date" value={to} onChange={e => setTo(e.target.value)} required /></label>
        </div>
        <div className="form-row">
          <select value={grade} onChange={e => { setGrade(e.target.value); setGenerusId(''); }}>
            <option value="">-- Semua Grade --</option>
            {GRADES.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={generusId} onChange={e => setGenerusId(e.target.value)} disabled={!grade}>
            <option value="">-- Semua Generus --</option>
            {generusList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </div>
        <div className="form-row">
          <button className="btn-primary" onClick={handleSearch}>🔍 Cari</button>
          {loaded && data.length > 0 && <button className="btn-print" onClick={handlePrint}>🖨️ Print</button>}
        </div>
      </div>

      {loaded && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Jam</th><th>Guru</th><th>KBM</th><th>Grade</th><th>Nama</th><th>Keterangan</th></tr></thead>
            <tbody>
              {data.length === 0 ? <tr><td colSpan="7" className="empty">Tidak ada data</td></tr> :
                data.map((r, i) => (
                  <tr key={i}>
                    <td>{r.tanggal}</td><td>{r.jam_mulai}</td><td>{r.guru_nama}</td><td>{r.nama_kbm}</td>
                    <td>{r.grade}</td><td>{r.nama_generus}</td><td>{r.keterangan}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
