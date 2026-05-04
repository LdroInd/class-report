import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function json(code, body) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

function calcGrade(tglLahir) {
  const t = new Date(tglLahir);
  if (isNaN(t)) return '';
  const age = (Date.now() - t.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const y = Math.floor(age);
  if (y < 3) return 'Bayi Bawah Tiga Tahun';
  if (y < 6) return 'Paud';
  if (y < 9) return 'Caberawit 1';
  if (y < 12) return 'Caberawit 2';
  if (y < 15) return 'Generus Pra-Remaja';
  if (y < 18) return 'Generus Remaja';
  return 'Usia Mandiri';
}

function formatPhone(phone) {
  let p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  if (!p.startsWith('62')) p = '62' + p;
  return p;
}

function parseBody(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  const path = (event.path || '').replace('/.netlify/functions/api', '').replace(/^\/api/, '') || '/';
  const method = event.httpMethod;
  const body = parseBody(event);
  const qs = event.queryStringParameters || {};

  console.log(`[API] ${method} ${path}`);

  try {

    // ===== AUTH =====
    if (path === '/login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) return json(400, { error: 'Username dan password wajib diisi' });
      const r = await pool.query(`SELECT id, username, nama, role, kelompok FROM rg_users WHERE username=$1 AND password=md5($2)`, [username, password]);
      if (r.rows.length === 0) return json(401, { error: 'Username atau password salah' });
      return json(200, r.rows[0]);
    }

    // ===== USERS =====
    if (path === '/users/guru' && method === 'GET') {
      const r = await pool.query(`SELECT id, nama FROM rg_users WHERE role='Guru' ORDER BY nama`);
      return json(200, r.rows);
    }
    if (path === '/users' && method === 'GET') {
      const r = await pool.query(`SELECT id, username, nama, role, kelompok, TO_CHAR(created_at,'YYYY-MM-DD') as created_at FROM rg_users ORDER BY id`);
      return json(200, r.rows);
    }
    if (path === '/users' && method === 'POST') {
      const { username, password, nama, role, kelompok } = body;
      if (!username || !password || !nama) return json(400, { error: 'Username, password, nama wajib diisi' });
      const r = await pool.query(`INSERT INTO rg_users (username,password,nama,role,kelompok) VALUES ($1,md5($2),$3,$4,$5) RETURNING id`,
        [username, password, nama, role || 'Guru', kelompok || '']);
      return json(201, { id: r.rows[0].id, message: 'User created' });
    }
    const userM = path.match(/^\/users\/(\d+)$/);
    if (userM && method === 'PUT') {
      const { username, password, nama, role, kelompok } = body;
      if (password) {
        await pool.query(`UPDATE rg_users SET username=$1, password=md5($2), nama=$3, role=$4, kelompok=$5 WHERE id=$6`, [username, password, nama, role, kelompok, userM[1]]);
      } else {
        await pool.query(`UPDATE rg_users SET username=$1, nama=$2, role=$3, kelompok=$4 WHERE id=$5`, [username, nama, role, kelompok, userM[1]]);
      }
      return json(200, { message: 'User updated' });
    }
    if (userM && method === 'DELETE') {
      await pool.query(`DELETE FROM rg_users WHERE id=$1`, [userM[1]]);
      return json(200, { message: 'User deleted' });
    }

    // ===== GENERUS =====
    if (path === '/generus/by-grade' && method === 'GET') {
      const grade = qs.grade || '';
      const r = await pool.query(`SELECT id, nama, kelompok, TO_CHAR(tanggal_lahir,'YYYY-MM-DD') as tanggal_lahir FROM rg_generus ORDER BY nama`);
      const list = r.rows.map(g => ({ ...g, grade: calcGrade(g.tanggal_lahir) })).filter(g => !grade || g.grade === grade);
      return json(200, list);
    }
    if (path === '/generus' && method === 'GET') {
      const r = await pool.query(`SELECT id, nama, kelompok, TO_CHAR(tanggal_lahir,'YYYY-MM-DD') as tanggal_lahir, COALESCE(nama_orang_tua,'') as nama_orang_tua, COALESCE(nomer_telp_ortu,'') as nomer_telp_ortu FROM rg_generus ORDER BY nama`);
      const list = r.rows.map(g => ({ ...g, grade: calcGrade(g.tanggal_lahir) }));
      return json(200, list);
    }
    if (path === '/generus' && method === 'POST') {
      const { nama, kelompok, tanggal_lahir, nama_orang_tua, nomer_telp_ortu } = body;
      if (!nama || !tanggal_lahir) return json(400, { error: 'Nama dan tanggal lahir wajib diisi' });
      const r = await pool.query(`INSERT INTO rg_generus (nama,kelompok,tanggal_lahir,nama_orang_tua,nomer_telp_ortu) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [nama, kelompok, tanggal_lahir, nama_orang_tua || '', nomer_telp_ortu || '']);
      return json(201, { id: r.rows[0].id });
    }
    const genM = path.match(/^\/generus\/(\d+)$/);
    if (genM && method === 'PUT') {
      const { nama, kelompok, tanggal_lahir, nama_orang_tua, nomer_telp_ortu } = body;
      await pool.query(`UPDATE rg_generus SET nama=$1, kelompok=$2, tanggal_lahir=$3, nama_orang_tua=$4, nomer_telp_ortu=$5 WHERE id=$6`,
        [nama, kelompok, tanggal_lahir, nama_orang_tua || '', nomer_telp_ortu || '', genM[1]]);
      return json(200, { message: 'Updated' });
    }
    if (genM && method === 'DELETE') {
      await pool.query(`DELETE FROM rg_generus WHERE id=$1`, [genM[1]]);
      return json(200, { message: 'Deleted' });
    }

    // ===== KELAS =====
    // Kelas detail item routes (must be before /kelas/:id)
    const detailItemM = path.match(/^\/kelas\/detail\/(\d+)$/);
    if (detailItemM && method === 'PUT') {
      const { generus_id, nama_generus, keterangan } = body;
      await pool.query(`UPDATE rg_kelas_detail SET generus_id=$1, nama_generus=$2, keterangan=$3 WHERE id=$4`, [generus_id, nama_generus, keterangan || '', detailItemM[1]]);
      return json(200, { message: 'Updated' });
    }
    if (detailItemM && method === 'DELETE') {
      await pool.query(`DELETE FROM rg_kelas_detail WHERE id=$1`, [detailItemM[1]]);
      return json(200, { message: 'Deleted' });
    }

    // Kelas absent
    const absentM = path.match(/^\/kelas\/(\d+)\/absent$/);
    if (absentM && method === 'GET') {
      const gr = await pool.query(`SELECT grade FROM rg_kelas_header WHERE id=$1`, [absentM[1]]);
      if (gr.rows.length === 0) return json(404, { error: 'Kelas tidak ditemukan' });
      const grade = gr.rows[0].grade;
      const r = await pool.query(`SELECT id, nama, COALESCE(nomer_telp_ortu,'') as nomer_telp_ortu, kelompok, TO_CHAR(tanggal_lahir,'YYYY-MM-DD') as tanggal_lahir
        FROM rg_generus WHERE id NOT IN (SELECT generus_id FROM rg_kelas_detail WHERE kelas_id=$1) ORDER BY nama`, [absentM[1]]);
      const list = r.rows.map(g => ({ ...g, grade: calcGrade(g.tanggal_lahir) })).filter(g => g.grade === grade && g.nomer_telp_ortu);
      return json(200, list);
    }

    // Kelas detail add
    const detailAddM = path.match(/^\/kelas\/(\d+)\/detail$/);
    if (detailAddM && method === 'POST') {
      const { generus_id, nama_generus, keterangan } = body;
      const r = await pool.query(`INSERT INTO rg_kelas_detail (kelas_id,generus_id,nama_generus,keterangan) VALUES ($1,$2,$3,$4) RETURNING id`,
        [detailAddM[1], generus_id, nama_generus, keterangan || '']);
      return json(201, { id: r.rows[0].id });
    }

    // Kelas CRUD
    if (path === '/kelas' && method === 'GET') {
      const r = await pool.query(`SELECT id, TO_CHAR(tanggal_kelas,'YYYY-MM-DD') as tanggal_kelas, jam_mulai, guru_id, guru_nama, nama_kbm, grade,
        TO_CHAR(created_at,'YYYY-MM-DD') as created_at FROM rg_kelas_header ORDER BY tanggal_kelas DESC, jam_mulai DESC`);
      return json(200, r.rows);
    }
    if (path === '/kelas' && method === 'POST') {
      const { tanggal_kelas, jam_mulai, guru_id, guru_nama, nama_kbm, grade } = body;
      if (!tanggal_kelas || !nama_kbm || !grade) return json(400, { error: 'Tanggal, nama KBM, dan grade wajib diisi' });
      const r = await pool.query(`INSERT INTO rg_kelas_header (tanggal_kelas,jam_mulai,guru_id,guru_nama,nama_kbm,grade) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [tanggal_kelas, jam_mulai, guru_id || 0, guru_nama || '', nama_kbm, grade]);
      return json(201, { id: r.rows[0].id });
    }
    const kelasM = path.match(/^\/kelas\/(\d+)$/);
    if (kelasM && method === 'GET') {
      const hr = await pool.query(`SELECT id, TO_CHAR(tanggal_kelas,'YYYY-MM-DD') as tanggal_kelas, jam_mulai, guru_id, guru_nama, nama_kbm, grade,
        TO_CHAR(created_at,'YYYY-MM-DD') as created_at FROM rg_kelas_header WHERE id=$1`, [kelasM[1]]);
      if (hr.rows.length === 0) return json(404, { error: 'Kelas tidak ditemukan' });
      const dr = await pool.query(`SELECT id, kelas_id, generus_id, nama_generus, COALESCE(keterangan,'') as keterangan FROM rg_kelas_detail WHERE kelas_id=$1 ORDER BY id`, [kelasM[1]]);
      return json(200, { header: hr.rows[0], details: dr.rows });
    }
    if (kelasM && method === 'PUT') {
      const { tanggal_kelas, jam_mulai, guru_id, guru_nama, nama_kbm, grade } = body;
      await pool.query(`UPDATE rg_kelas_header SET tanggal_kelas=$1, jam_mulai=$2, guru_id=$3, guru_nama=$4, nama_kbm=$5, grade=$6 WHERE id=$7`,
        [tanggal_kelas, jam_mulai, guru_id, guru_nama, nama_kbm, grade, kelasM[1]]);
      return json(200, { message: 'Updated' });
    }
    if (kelasM && method === 'DELETE') {
      await pool.query(`DELETE FROM rg_kelas_header WHERE id=$1`, [kelasM[1]]);
      return json(200, { message: 'Deleted' });
    }

    // ===== REPORT =====
    if (path === '/report' && method === 'GET') {
      const { from, to, grade, generus_id, kelompok } = qs;
      if (!from || !to) return json(400, { error: 'Tanggal from dan to wajib diisi' });
      let query = `SELECT kh.id as kelas_id, TO_CHAR(kh.tanggal_kelas,'YYYY-MM-DD') as tanggal, kh.jam_mulai, kh.guru_nama, kh.nama_kbm, kh.grade,
        kd.id as detail_id, kd.nama_generus, COALESCE(kd.keterangan,'') as keterangan,
        COALESCE(rg.kelompok,'') as kelompok
        FROM rg_kelas_header kh JOIN rg_kelas_detail kd ON kd.kelas_id = kh.id
        LEFT JOIN rg_generus rg ON rg.id = kd.generus_id
        WHERE kh.tanggal_kelas >= $1 AND kh.tanggal_kelas <= $2`;
      const args = [from, to];
      let idx = 3;
      if (grade) { query += ` AND kh.grade = $${idx}`; args.push(grade); idx++; }
      if (generus_id) { query += ` AND kd.generus_id = $${idx}`; args.push(generus_id); idx++; }
      if (kelompok) { query += ` AND rg.kelompok = $${idx}`; args.push(kelompok); idx++; }
      query += ` ORDER BY kh.tanggal_kelas, kh.jam_mulai, kd.nama_generus`;
      const r = await pool.query(query, args);
      return json(200, r.rows);
    }

    // ===== WHATSAPP =====
    if (path === '/wa/send' && method === 'POST') {
      const { numbers, message } = body;
      if (!numbers?.length || !message) return json(400, { error: 'Nomor dan pesan wajib diisi' });

      const WA_URL = process.env.WA_API_URL || 'https://api.fonnte.com/send';
      const WA_TOKEN = process.env.WA_API_TOKEN || '';

      const results = [];
      let success = 0;
      for (let i = 0; i < numbers.length; i++) {
        const { phone, nama } = numbers[i];
        const p = formatPhone(phone);
        const msg = message.replace(/\{nama\}/g, nama);
        try {
          const params = new URLSearchParams({ target: p, message: msg });
          const res = await fetch(WA_URL, {
            method: 'POST', body: params,
            headers: { Authorization: WA_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          const text = await res.text();
          const status = res.ok ? 'success' : 'failed';
          if (res.ok) success++;
          results.push({ phone: p, nama, status, message: text });
        } catch (e) {
          results.push({ phone: p, nama, status: 'error', message: e.message });
        }
        if (i < numbers.length - 1) await new Promise(r => setTimeout(r, 10000));
      }
      return json(200, { total: numbers.length, success, results });
    }

    return json(404, { error: 'Route not found: ' + path });

  } catch (err) {
    console.error('API Error:', err);
    return json(500, { error: err.message });
  }
};
