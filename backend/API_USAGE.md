# Route API 使用指南

## 設置

### 1. 環境變數

複製 `.env.example` 到 `.env` 並填入你的 API Keys：

```bash
cp .env.example .env
```

編輯 `.env`：
```bash
# API Keys for Route Generation
MAPBOX_TOKEN=pk.eyJ1...  # 你的 Mapbox Token
HERE_API_KEY=YOUR_KEY    # 你的 HERE API Key（可選）
```

### 2. 啟動服務器

```bash
npm start
# 或
npm run dev
```

## API 端點

### 1. 路徑規劃健康檢查

檢查 API Keys 是否配置正確。

**請求:**
```bash
GET /api/route/status
```

**回應:**
```json
{
  "success": true,
  "mapboxConfigured": true,
  "hereConfigured": true,
  "features": {
    "basicRouting": true,
    "badPointAvoidance": true
  }
}
```

### 2. 計算智能路徑

計算從起點到終點的最優路徑，支持 Good Points 和 Bad Points。

**請求:**
```bash
POST /api/route/calculate
Content-Type: application/json
```

**請求 Body:**
```json
{
  "start": [121.5654, 25.0330],           // 必填: [經度, 緯度]
  "end": [121.5297, 25.0478],             // 必填: [經度, 緯度]
  "goodPoints": [                         // 可選: 嘗試經過的點
    [121.5500, 25.0400],
    [121.5400, 25.0450]
  ],
  "badPoints": [                          // 可選: 要避開的點
    [121.5300, 25.0450],
    [121.5350, 25.0420]
  ],
  "badPointRadius": 200,                  // 可選: 避障半徑（米），預設 200
  "maxTimeIncrease": 1.3                  // 可選: 最多增加時間比例，預設 1.3 (30%)
}
```

**成功回應:**
```json
{
  "success": true,
  "route": {
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [121.5654, 25.0330],
        [121.5652, 25.0332],
        // ... 更多坐標點
        [121.5297, 25.0478]
      ]
    },
    "distance": 5234,                     // 距離（米）
    "duration": 1200                      // 時間（秒）
  },
  "info": {
    "goodPointsUsed": 2,                  // 使用的 Good Points 數量
    "totalGoodPoints": 2,                 // 總 Good Points 數量
    "badPointsAvoided": true,             // 是否成功避開 Bad Points
    "usedHEREAPI": true,                  // 是否使用 HERE API
    "avoidAreasCount": 2,                 // 避障區域數量
    "waypointsUsed": 2,                   // 使用的 waypoints 數量
    "waypointsLimit": 23                  // Waypoints 上限
  },
  "error": null
}
```

**失敗回應:**
```json
{
  "success": false,
  "route": null,
  "info": null,
  "error": "無法計算基本路徑"
}
```

## 使用範例

### cURL

**基本路徑:**
```bash
curl -X POST http://localhost:3000/api/route/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "start": [121.5654, 25.0330],
    "end": [121.5297, 25.0478]
  }'
```

**帶 Good Points 和 Bad Points:**
```bash
curl -X POST http://localhost:3000/api/route/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "start": [121.5654, 25.0330],
    "end": [121.5297, 25.0478],
    "goodPoints": [[121.5500, 25.0400], [121.5400, 25.0450]],
    "badPoints": [[121.5300, 25.0450]],
    "badPointRadius": 200,
    "maxTimeIncrease": 1.3
  }'
```

### JavaScript (fetch)

```javascript
const calculateRoute = async () => {
  const response = await fetch('http://localhost:3000/api/route/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      start: [121.5654, 25.0330],
      end: [121.5297, 25.0478],
      goodPoints: [
        [121.5500, 25.0400],
        [121.5400, 25.0450]
      ],
      badPoints: [
        [121.5300, 25.0450]
      ],
      badPointRadius: 200
    })
  })

  const result = await response.json()

  if (result.success) {
    console.log('距離:', (result.route.distance / 1000).toFixed(2), 'km')
    console.log('時間:', (result.route.duration / 60).toFixed(0), '分鐘')
    console.log('使用 Good Points:', result.info.goodPointsUsed)
    console.log('避開 Bad Points:', result.info.badPointsAvoided)

    // 路徑座標可用於繪製地圖
    console.log('路徑:', result.route.geometry.coordinates)
  } else {
    console.error('錯誤:', result.error)
  }
}

calculateRoute()
```

### Python

```python
import requests

def calculate_route():
    url = 'http://localhost:3000/api/route/calculate'
    payload = {
        'start': [121.5654, 25.0330],
        'end': [121.5297, 25.0478],
        'goodPoints': [
            [121.5500, 25.0400],
            [121.5400, 25.0450]
        ],
        'badPoints': [
            [121.5300, 25.0450]
        ],
        'badPointRadius': 200,
        'maxTimeIncrease': 1.3
    }

    response = requests.post(url, json=payload)
    result = response.json()

    if result['success']:
        print(f"距離: {result['route']['distance'] / 1000:.2f} km")
        print(f"時間: {result['route']['duration'] / 60:.0f} 分鐘")
        print(f"使用 Good Points: {result['info']['goodPointsUsed']}")
        print(f"避開 Bad Points: {result['info']['badPointsAvoided']}")

        # 路徑座標
        coordinates = result['route']['geometry']['coordinates']
        print(f"路徑點數: {len(coordinates)}")
    else:
        print(f"錯誤: {result['error']}")

calculate_route()
```

## 錯誤處理

### 常見錯誤

1. **"start and end coordinates are required"**
   - 缺少必要的起點或終點座標

2. **"start and end must be [longitude, latitude] arrays"**
   - 座標格式錯誤，必須是 [經度, 緯度] 陣列

3. **"無法計算基本路徑"**
   - Mapbox API 調用失敗，檢查 MAPBOX_TOKEN 是否正確

4. **"Mapbox token 未設置"**
   - 環境變數 MAPBOX_TOKEN 未設置

5. **"HERE API Key 未設置，無法使用避障功能"**
   - 如果需要避開 Bad Points，必須設置 HERE_API_KEY

## 整合到前端

### Vue.js 範例

```vue
<template>
  <div>
    <button @click="calculateRoute">計算路徑</button>
    <div v-if="result">
      <p>距離: {{ (result.route.distance / 1000).toFixed(2) }} km</p>
      <p>時間: {{ (result.route.duration / 60).toFixed(0) }} 分鐘</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const result = ref(null)

const calculateRoute = async () => {
  const response = await fetch('/api/route/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start: [121.5654, 25.0330],
      end: [121.5297, 25.0478],
      goodPoints: [[121.5500, 25.0400]],
      badPoints: [[121.5300, 25.0450]]
    })
  })

  result.value = await response.json()
}
</script>
```

## 性能考量

- **Good Points 選擇**: 每個 Good Point 會觸發一次 Mapbox API 調用，建議限制在 5-10 個以內
- **API 配額**: 注意 Mapbox 和 HERE API 的免費配額限制
- **快取**: 考慮在生產環境中實作路徑快取機制

## 授權

MIT
