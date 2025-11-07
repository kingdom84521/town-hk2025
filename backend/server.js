// backend/server.js  (CommonJS 版)
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST || 'db',
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT) || 5432,
  });
  

// 不碰資料庫的 ping（先確認路由/反代 OK）
app.get('/api/ping', (_req, res) => res.json({ ok: true, t: Date.now() }));

app.get('/api/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 AS ok');
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(port, () => console.log(`Backend listening on :${port}`));
