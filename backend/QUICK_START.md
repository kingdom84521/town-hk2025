# Backend Route Generator - 快速開始

## ✅ 已完成的設置

1. **✅ 依賴安裝完成**
   - @turf/turf (地理計算)
   - @here/flexpolyline (HERE API polyline 解碼)
   - node-fetch (HTTP 請求)
   - dotenv (環境變數管理)

2. **✅ 核心模組已創建**
   - `routeGenerator.js` - 路徑規劃引擎
   - 與前端 RouteMap.vue 邏輯完全一致
   - 修復了所有已知問題（| 分隔符、sections 合併）

3. **✅ Server.js 已整合**
   - 添加了 `/api/route/calculate` 端點
   - 添加了 `/api/route/status` 健康檢查端點
   - 自動載入 dotenv 環境變數

4. **✅ 文檔完成**
   - API_USAGE.md - 完整 API 使用文檔
   - .env.example - 環境變數範例

## 🚀 快速開始

### 1. 設置環境變數

```bash
# 複製範例文件
cp .env.example .env

# 編輯 .env 並填入你的 API Keys
nano .env
```

必須填入：
```
MAPBOX_TOKEN=你的_mapbox_token
HERE_API_KEY=你的_here_api_key   # 可選，用於避障
```

### 2. 啟動服務器

```bash
npm start
```

### 3. 測試 API

**檢查狀態：**
```bash
curl http://localhost:3000/api/route/status
```

**計算路徑：**
```bash
curl -X POST http://localhost:3000/api/route/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "start": [121.5654, 25.0330],
    "end": [121.5297, 25.0478],
    "goodPoints": [[121.5500, 25.0400]],
    "badPoints": [[121.5300, 25.0450]],
    "badPointRadius": 200
  }'
```

## 📦 在代碼中使用

### 方式 1: 直接使用模組

```javascript
const RouteGenerator = require('./routeGenerator')

const generator = new RouteGenerator({
  mapboxToken: process.env.MAPBOX_TOKEN,
  hereApiKey: process.env.HERE_API_KEY
})

const result = await generator.calculateRoute({
  start: [121.5654, 25.0330],
  end: [121.5297, 25.0478],
  goodPoints: [[121.5500, 25.0400]],
  badPoints: [[121.5300, 25.0450]]
})

console.log(result)
```

### 方式 2: 使用 HTTP API

```javascript
const response = await fetch('http://localhost:3000/api/route/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start: [121.5654, 25.0330],
    end: [121.5297, 25.0478]
  })
})

const result = await response.json()
```

## 📋 API 端點

### GET /api/route/status
檢查 API keys 配置狀態

### POST /api/route/calculate
計算智能路徑

**參數：**
- `start` (必填): [lng, lat]
- `end` (必填): [lng, lat]
- `goodPoints` (可選): [[lng, lat], ...]
- `badPoints` (可選): [[lng, lat], ...]
- `badPointRadius` (可選): 數字，預設 200
- `maxTimeIncrease` (可選): 數字，預設 1.3

**回傳：**
```json
{
  "success": true,
  "route": {
    "geometry": { "type": "LineString", "coordinates": [...] },
    "distance": 1234,
    "duration": 567
  },
  "info": {
    "goodPointsUsed": 2,
    "badPointsAvoided": true,
    "usedHEREAPI": true
  }
}
```

## ⚙️ Package.json Scripts

```bash
npm start      # 啟動服務器
npm run dev    # 開發模式（同 start）
npm run test   # 運行測試
```

## 🔧 故障排除

**問題：Module not found**
```bash
npm install
```

**問題：Cannot read environment variables**
- 確保 `.env` 文件存在
- 確保 API keys 已填入

**問題：HERE API 返回 400**
- 檢查避障區域格式
- 確保使用 `|` 分隔多個區域
- 確保座標順序正確 [經度, 緯度]

## 📖 更多文檔

- 詳細 API 文檔: `API_USAGE.md`
- 模組原理: 查看 `routeGenerator.js` 內的註釋

## ✨ 特性

- ✅ Good Points 優化（貪婪算法）
- 🚫 Bad Points 避障（HERE API）
- 🚶 行人模式路徑規劃
- ⚡ 雙 API 支持（Mapbox + HERE）
- 🔄 自動降級（HERE 失敗時回退 Mapbox）
- 📊 完整的路徑信息統計
