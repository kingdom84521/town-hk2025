# 地圖點 API 文檔

## 基本資訊

- 基礎 URL: `http://localhost/api`
- 所有請求和回應都使用 JSON 格式
- 座標系統：WGS84 (國際通用經緯度)

## API 端點

### 健康檢查

#### GET /ping
簡單的健康檢查（不檢查資料庫）

**回應範例:**
```json
{
  "ok": true,
  "t": 1762568394000
}
```

#### GET /health
資料庫連線健康檢查

**回應範例:**
```json
{
  "ok": true
}
```

---

## 地圖點管理 API

### 1. 取得所有地圖點
**GET /map-points**

**查詢參數:**
- `is_safe` (boolean, optional): 篩選安全/不安全點
  - `true` - 只顯示安全點
  - `false` - 只顯示不安全點
- `tag` (string, optional): 篩選特定標籤
- `limit` (number, optional): 限制回傳筆數，預設 100
- `offset` (number, optional): 分頁偏移，預設 0

**範例:**
```bash
# 取得所有地圖點
curl http://localhost/api/map-points

# 只取得不安全的點
curl http://localhost/api/map-points?is_safe=false

# 篩選標籤為「觀光」的點
curl http://localhost/api/map-points?tag=觀光

# 分頁取得（每頁 10 筆，第 2 頁）
curl http://localhost/api/map-points?limit=10&offset=10
```

**回應範例:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "name": "台北101",
      "description": "台北地標建築",
      "latitude": "25.03396390",
      "longitude": "121.56447220",
      "address": "台北市信義區信義路五段7號",
      "is_safe": true,
      "tags": ["地標", "觀光"],
      "metadata": null,
      "created_at": "2025-11-08T04:07:57.407Z",
      "updated_at": "2025-11-08T04:07:57.407Z"
    }
  ]
}
```

### 2. 取得單一地圖點
**GET /map-points/:id**

**範例:**
```bash
curl http://localhost/api/map-points/1
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "台北101",
    "latitude": "25.03396390",
    "longitude": "121.56447220",
    "is_safe": true
  }
}
```

### 3. 搜尋附近的地圖點
**GET /map-points/nearby/:lat/:lng**

根據指定座標搜尋附近的地圖點，並計算距離。

**路徑參數:**
- `lat`: 緯度
- `lng`: 經度

**查詢參數:**
- `radius` (number, optional): 搜尋半徑（公里），預設 5 公里
- `is_safe` (boolean, optional): 篩選安全性

**範例:**
```bash
# 搜尋 25.04, 121.55 附近 2 公里內的點
curl "http://localhost/api/map-points/nearby/25.04/121.55?radius=2"

# 搜尋附近的安全點
curl "http://localhost/api/map-points/nearby/25.04/121.55?is_safe=true"
```

**回應範例:**
```json
{
  "success": true,
  "center": {
    "latitude": 25.04,
    "longitude": 121.55
  },
  "radius": 2,
  "count": 2,
  "data": [
    {
      "id": 3,
      "name": "測試不安全點",
      "latitude": "25.05000000",
      "longitude": "121.55000000",
      "is_safe": false,
      "distance": 1.111949266445761
    }
  ]
}
```

### 4. 新增地圖點
**POST /map-points**

**重要功能：支援三種新增方式**
1. **提供經緯度** - 直接使用座標
2. **只提供地址** - 自動進行地理編碼轉換成座標
3. **同時提供** - 使用提供的座標，地址僅作為資訊儲存

**請求 Body:**
```json
{
  "name": "地點名稱",
  "description": "描述",
  "latitude": 25.0339639,
  "longitude": 121.5644722,
  "address": "地址",
  "is_safe": true,
  "tags": ["標籤1", "標籤2"],
  "metadata": {
    "custom_field": "value"
  }
}
```

**必填欄位:**
- `name`: 地點名稱
- **必須提供以下其中之一：**
  - `latitude` + `longitude`: 經緯度座標 (-90 到 90, -180 到 180)
  - `address`: 地址（將自動轉換為座標）

**選填欄位:**
- `description`: 描述
- `is_safe`: 是否安全（預設 true）
- `tags`: 標籤陣列
- `metadata`: 自訂 JSON 資料

**範例 1: 使用經緯度**
```bash
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新地點",
    "description": "測試新增地點",
    "latitude": 25.05,
    "longitude": 121.54,
    "address": "台北市某地址",
    "is_safe": true,
    "tags": ["測試", "新增"]
  }'
```

**範例 2: 只使用地址（自動地理編碼）**
```bash
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "台灣大學",
    "description": "頂尖大學",
    "address": "National Taiwan University, Taipei",
    "is_safe": true,
    "tags": ["教育", "大學"]
  }'
```

**範例 3: 同時提供（優先使用座標）**
```bash
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "自訂點",
    "latitude": 25.04,
    "longitude": 121.54,
    "address": "自訂地址",
    "is_safe": true
  }'
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "台灣大學",
    "description": "頂尖大學",
    "latitude": "25.01681750",
    "longitude": "121.53845710",
    "address": "國立臺灣大學, 1, 羅斯福路四段, 學府里, 大安區, 公館, 臺北市, 106319, 臺灣",
    "is_safe": true,
    "tags": ["教育", "大學"],
    "created_at": "2025-11-08T06:39:40.988Z"
  }
}
```

**錯誤處理:**

如果只提供地址但地理編碼失敗：
```json
{
  "success": false,
  "error": "Unable to geocode address. Please provide latitude and longitude, or check the address format.",
  "details": "Address not found"
}
```

如果既沒提供座標也沒提供地址：
```json
{
  "success": false,
  "error": "Either (latitude and longitude) or (address) must be provided"
}
```

**注意事項:**
- 地理編碼使用 OpenStreetMap Nominatim API
- 建議使用英文地址以獲得更好的地理編碼準確度
- 台灣地址建議直接提供經緯度座標，或使用英文地名
- 地理編碼成功後，系統會自動將完整地址填入 `address` 欄位

### 5. 更新地圖點
**PUT /map-points/:id**

**請求 Body:**（所有欄位都是選填，只更新提供的欄位）
```json
{
  "name": "更新的名稱",
  "description": "更新的描述",
  "latitude": 25.05,
  "longitude": 121.54,
  "address": "更新的地址",
  "is_safe": false,
  "tags": ["新標籤"],
  "metadata": {"key": "value"}
}
```

**範例:**
```bash
# 只更新安全性標記
curl -X PUT http://localhost/api/map-points/1 \
  -H "Content-Type: application/json" \
  -d '{"is_safe": false}'
```

### 6. 刪除地圖點
**DELETE /map-points/:id**

**範例:**
```bash
curl -X DELETE http://localhost/api/map-points/4
```

**回應範例:**
```json
{
  "success": true,
  "message": "Map point deleted",
  "data": {
    "id": 4,
    "name": "新地點"
  }
}
```

---

## 座標轉換 API

### 1. TWD97 轉 WGS84
**POST /convert/twd97-to-wgs84**

將台灣二度分帶座標（TWD97）轉換為國際經緯度（WGS84）。

**請求 Body:**
```json
{
  "x": 250000,
  "y": 2750000
}
```

**範例:**
```bash
curl -X POST http://localhost/api/convert/twd97-to-wgs84 \
  -H "Content-Type: application/json" \
  -d '{"x": 250000, "y": 2750000}'
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "latitude": 24.857552755303114,
    "longitude": 121
  }
}
```

### 2. WGS84 轉 TWD97
**POST /convert/wgs84-to-twd97**

將國際經緯度（WGS84）轉換為台灣二度分帶座標（TWD97）。

**請求 Body:**
```json
{
  "latitude": 25.0339639,
  "longitude": 121.5644722
}
```

**範例:**
```bash
curl -X POST http://localhost/api/convert/wgs84-to-twd97 \
  -H "Content-Type: application/json" \
  -d '{"latitude": 25.0339639, "longitude": 121.5644722}'
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "x": 306962.7438328624,
    "y": 2769658.213347427
  }
}
```

---

## 地理編碼 API

### 1. 地址轉經緯度
**POST /geocode/address**

將地址轉換為經緯度座標（使用 OpenStreetMap Nominatim）。

**請求 Body:**
```json
{
  "address": "台北市信義區信義路五段7號"
}
```

**範例:**
```bash
curl -X POST http://localhost/api/geocode/address \
  -H "Content-Type: application/json" \
  -d '{"address": "台北市信義區信義路五段7號"}'
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "latitude": 25.0339639,
    "longitude": 121.5644722,
    "displayName": "7, 信義路五段, 信義區, 台北市, 110, 台灣"
  }
}
```

**注意事項:**
- 此服務依賴 OpenStreetMap Nominatim API
- 請遵守使用限制（每秒最多 1 次請求）
- 地址格式越詳細，準確度越高

### 2. 經緯度轉地址（反向地理編碼）
**POST /geocode/reverse**

將經緯度座標轉換為地址資訊。

**請求 Body:**
```json
{
  "latitude": 25.0339639,
  "longitude": 121.5644722
}
```

**範例:**
```bash
curl -X POST http://localhost/api/geocode/reverse \
  -H "Content-Type: application/json" \
  -d '{"latitude": 25.0339639, "longitude": 121.5644722}'
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "address": {
      "road": "信義路五段",
      "suburb": "信義區",
      "city": "台北市",
      "country": "台灣",
      "postcode": "110"
    },
    "displayName": "7, 信義路五段, 信義區, 台北市, 110, 台灣"
  }
}
```

---

## 錯誤處理

所有錯誤回應格式：

```json
{
  "success": false,
  "error": "錯誤訊息"
}
```

常見錯誤狀態碼：
- `400` - 請求參數錯誤
- `404` - 資源不存在
- `500` - 伺服器錯誤

---

## 資料庫結構

### map_points 表結構

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL | 主鍵 |
| name | VARCHAR(255) | 地點名稱 |
| description | TEXT | 描述 |
| latitude | DECIMAL(10,8) | 緯度（WGS84） |
| longitude | DECIMAL(11,8) | 經度（WGS84） |
| address | TEXT | 地址 |
| is_safe | BOOLEAN | 安全性標記 |
| tags | TEXT[] | 標籤陣列 |
| metadata | JSONB | 自訂 JSON 資料 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

索引：
- `idx_map_points_location` - 位置索引（latitude, longitude）
- `idx_map_points_is_safe` - 安全性索引

---

## 使用範例

### 完整流程範例

```bash
# 1. 使用地址建立新地圖點
ADDRESS_RESULT=$(curl -s -X POST http://localhost/api/geocode/address \
  -H "Content-Type: application/json" \
  -d '{"address": "台北市大安區羅斯福路四段1號"}')

# 2. 取得經緯度並建立地圖點
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "國立台灣大學",
    "description": "台灣頂尖大學",
    "latitude": 25.0173405,
    "longitude": 121.5397518,
    "address": "台北市大安區羅斯福路四段1號",
    "is_safe": true,
    "tags": ["教育", "大學"]
  }'

# 3. 搜尋附近的地圖點
curl "http://localhost/api/map-points/nearby/25.0173405/121.5397518?radius=3"

# 4. 更新地圖點的安全性
curl -X PUT http://localhost/api/map-points/1 \
  -H "Content-Type: application/json" \
  -d '{"is_safe": false}'

# 5. 取得所有不安全的點
curl "http://localhost/api/map-points?is_safe=false"
```
