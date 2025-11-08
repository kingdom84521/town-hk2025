// backend/server.js  (CommonJS 版)
const express = require('express');
const { Pool } = require('pg');
const { twd97ToWgs84, wgs84ToTwd97, isValidWgs84, calculateDistance } = require('./utils/coordinateConverter');
const { geocodeAddress, reverseGeocode } = require('./utils/geocoder');
const { getAllLandmarks } = require('./utils/taiwanLandmarks');

const app = express();
const port = process.env.PORT || 3000;

// 解析 JSON body
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 5432,
});

// ============ 健康檢查端點 ============

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

// ============ 地圖點 CRUD API ============

// 取得所有地圖點（支援篩選）
app.get('/api/map-points', async (req, res) => {
  try {
    const { is_safe, tag, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM map_points WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // 篩選安全性
    if (is_safe !== undefined) {
      query += ` AND is_safe = $${paramCount}`;
      params.push(is_safe === 'true');
      paramCount++;
    }

    // 篩選標籤
    if (tag) {
      query += ` AND $${paramCount} = ANY(tags)`;
      params.push(tag);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取得單一地圖點
app.get('/api/map-points/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM map_points WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Map point not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 搜尋附近的地圖點
app.get('/api/map-points/nearby/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
<<<<<<< HEAD
    const { radius = 5, is_safe } = req.query; // radius 預設 5 公里
=======
    const { radius = 500, is_safe } = req.query; // radius 預設 500 公尺
>>>>>>> develop

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!isValidWgs84(latitude, longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    let query = 'SELECT * FROM map_points WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (is_safe !== undefined) {
      query += ` AND is_safe = $${paramCount}`;
      params.push(is_safe === 'true');
      paramCount++;
    }

    const result = await pool.query(query, params);

<<<<<<< HEAD
    // 計算距離並篩選
    const nearbyPoints = result.rows
      .map(point => ({
        ...point,
        distance: calculateDistance(latitude, longitude, parseFloat(point.latitude), parseFloat(point.longitude))
=======
    // 計算距離並篩選（使用公尺）
    const nearbyPoints = result.rows
      .map(point => ({
        ...point,
        distance: calculateDistance(latitude, longitude, parseFloat(point.latitude), parseFloat(point.longitude), 'm')
>>>>>>> develop
      }))
      .filter(point => point.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      center: { latitude, longitude },
      radius: parseFloat(radius),
<<<<<<< HEAD
=======
      unit: 'meters',
>>>>>>> develop
      count: nearbyPoints.length,
      data: nearbyPoints
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 新增地圖點
app.post('/api/map-points', async (req, res) => {
  try {
    let { name, description, latitude, longitude, address, is_safe = true, tags = [], metadata = {} } = req.body;

    // 驗證必要欄位
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    // 如果沒有提供經緯度，但有提供地址，則自動進行地理編碼
    if ((!latitude || !longitude) && address) {
      try {
        const geocodeResult = await geocodeAddress(address);
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;

        // 如果地理編碼返回的地址更完整，更新 address
        if (!req.body.address || geocodeResult.displayName) {
          address = geocodeResult.displayName || address;
        }
      } catch (geocodeError) {
        return res.status(400).json({
          success: false,
          error: 'Unable to geocode address. Please provide latitude and longitude, or check the address format.',
          details: geocodeError.message
        });
      }
    }

    // 驗證必須有經緯度（直接提供或透過地址轉換）
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Either (latitude and longitude) or (address) must be provided'
      });
    }

    if (!isValidWgs84(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    const result = await pool.query(
      `INSERT INTO map_points (name, description, latitude, longitude, address, is_safe, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, parseFloat(latitude), parseFloat(longitude), address, is_safe, tags, JSON.stringify(metadata)]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新地圖點
app.put('/api/map-points/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, latitude, longitude, address, is_safe, tags, metadata } = req.body;

    // 檢查地圖點是否存在
    const existing = await pool.query('SELECT * FROM map_points WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Map point not found' });
    }

    // 驗證座標（如果有提供）
    if (latitude !== undefined && longitude !== undefined) {
      if (!isValidWgs84(parseFloat(latitude), parseFloat(longitude))) {
        return res.status(400).json({ success: false, error: 'Invalid coordinates' });
      }
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount}`);
      params.push(parseFloat(latitude));
      paramCount++;
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount}`);
      params.push(parseFloat(longitude));
      paramCount++;
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      params.push(address);
      paramCount++;
    }
    if (is_safe !== undefined) {
      updates.push(`is_safe = $${paramCount}`);
      params.push(is_safe);
      paramCount++;
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      params.push(tags);
      paramCount++;
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount}`);
      params.push(JSON.stringify(metadata));
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE map_points SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 刪除地圖點
app.delete('/api/map-points/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM map_points WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Map point not found' });
    }

    res.json({ success: true, message: 'Map point deleted', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

<<<<<<< HEAD
=======
// ============ 障礙物回報 API ============

// 回報路障或維修設施（自動標記為不安全點）
app.post('/api/map-points/report-obstacle', async (req, res) => {
  try {
    let { latitude, longitude, address, obstacle_type, description, metadata = {} } = req.body;

    // 驗證必要欄位：必須提供座標或地址
    if ((!latitude || !longitude) && !address) {
      return res.status(400).json({
        success: false,
        error: 'Either (latitude and longitude) or (address) must be provided'
      });
    }

    // 如果沒有提供經緯度，但有提供地址，則自動進行地理編碼
    if ((!latitude || !longitude) && address) {
      try {
        const geocodeResult = await geocodeAddress(address);
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        address = geocodeResult.displayName || address;
      } catch (geocodeError) {
        return res.status(400).json({
          success: false,
          error: 'Unable to geocode address. Please provide latitude and longitude, or check the address format.',
          details: geocodeError.message
        });
      }
    }

    // 驗證座標
    if (!isValidWgs84(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    // 障礙物類型預設值
    const obstacleTypeValue = obstacle_type || '其他';

    // 建立障礙物名稱
    const name = `${obstacleTypeValue}回報`;

    // 設定標籤
    const tags = ['障礙物', obstacleTypeValue];

    // 儲存額外資訊到 metadata
    const obstacleMetadata = {
      ...metadata,
      obstacle_type: obstacleTypeValue,
      reported_at: new Date().toISOString()
    };

    // 插入資料庫（自動設為不安全點）
    const result = await pool.query(
      `INSERT INTO map_points (name, description, latitude, longitude, address, is_safe, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        description || `${obstacleTypeValue}回報`,
        parseFloat(latitude),
        parseFloat(longitude),
        address,
        false, // 自動標記為不安全
        tags,
        JSON.stringify(obstacleMetadata)
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Obstacle reported successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

>>>>>>> develop
// ============ 座標轉換 API ============

// TWD97 轉 WGS84
app.post('/api/convert/twd97-to-wgs84', (req, res) => {
  try {
    const { x, y } = req.body;

    if (!x || !y) {
      return res.status(400).json({ success: false, error: 'x and y coordinates are required' });
    }

    const result = twd97ToWgs84(parseFloat(x), parseFloat(y));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WGS84 轉 TWD97
app.post('/api/convert/wgs84-to-twd97', (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
    }

    if (!isValidWgs84(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    const result = wgs84ToTwd97(parseFloat(latitude), parseFloat(longitude));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 地理編碼 API ============

// 地址轉經緯度
app.post('/api/geocode/address', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, error: 'address is required' });
    }

    const result = await geocodeAddress(address);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 經緯度轉地址
app.post('/api/geocode/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
    }

    if (!isValidWgs84(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    const result = await reverseGeocode(parseFloat(latitude), parseFloat(longitude));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 地標查詢 API ============

// 取得所有台灣地標列表
app.get('/api/landmarks', (_req, res) => {
  try {
    const landmarks = getAllLandmarks();
    res.json({
      success: true,
      count: landmarks.length,
      data: landmarks
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => console.log(`Backend listening on :${port}`));
