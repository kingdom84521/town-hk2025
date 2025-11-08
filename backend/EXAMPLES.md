# 地圖點 API 使用範例

## 快速開始

### 1. 新增地圖點的三種方式

#### 方式 1: 使用經緯度座標（最精確）
```bash
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的地點",
    "latitude": 25.0339639,
    "longitude": 121.5644722,
    "is_safe": true,
    "tags": ["測試"]
  }'
```

#### 方式 2: 只提供地址（自動轉換座標）
```bash
# 建議使用英文地址以獲得更好的準確度
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "National Taiwan University",
    "address": "National Taiwan University, Taipei",
    "is_safe": true,
    "tags": ["education"]
  }'
```

#### 方式 3: 同時提供座標和地址
```bash
# 系統會使用提供的座標，地址僅作為資訊儲存
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "台北101",
    "latitude": 25.0339639,
    "longitude": 121.5644722,
    "address": "台北市信義區信義路五段7號",
    "is_safe": true,
    "tags": ["landmark", "tourist"]
  }'
```

---

## 常用操作範例

### 查詢所有安全點
```bash
curl "http://localhost/api/map-points?is_safe=true"
```

### 查詢所有不安全點
```bash
curl "http://localhost/api/map-points?is_safe=false"
```

### 查詢特定標籤的點
```bash
curl "http://localhost/api/map-points?tag=tourist"
```

### 搜尋附近的點（3公里內）
```bash
# 搜尋台北101附近3公里的點
curl "http://localhost/api/map-points/nearby/25.0339639/121.5644722?radius=3"
```

### 搜尋附近的安全點
```bash
curl "http://localhost/api/map-points/nearby/25.04/121.55?radius=5&is_safe=true"
```

### 更新地圖點的安全性
```bash
# 將 ID=1 的點標記為不安全
curl -X PUT http://localhost/api/map-points/1 \
  -H "Content-Type: application/json" \
  -d '{"is_safe": false}'
```

### 刪除地圖點
```bash
curl -X DELETE http://localhost/api/map-points/1
```

---

## 座標轉換範例

### TWD97 轉 WGS84（台灣座標轉國際座標）
```bash
curl -X POST http://localhost/api/convert/twd97-to-wgs84 \
  -H "Content-Type: application/json" \
  -d '{
    "x": 306962.7438328624,
    "y": 2769658.213347427
  }'

# 回應:
# {
#   "success": true,
#   "data": {
#     "latitude": 25.0339639,
#     "longitude": 121.5644722
#   }
# }
```

### WGS84 轉 TWD97（國際座標轉台灣座標）
```bash
curl -X POST http://localhost/api/convert/wgs84-to-twd97 \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 25.0339639,
    "longitude": 121.5644722
  }'

# 回應:
# {
#   "success": true,
#   "data": {
#     "x": 306962.7438328624,
#     "y": 2769658.213347427
#   }
# }
```

---

## 地理編碼範例

### 地址轉經緯度
```bash
# 使用英文地址效果較佳
curl -X POST http://localhost/api/geocode/address \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Taipei 101, Taiwan"
  }'

# 回應:
# {
#   "success": true,
#   "data": {
#     "latitude": 25.0339639,
#     "longitude": 121.5644722,
#     "displayName": "台北101, 信義區, 台北市, 台灣"
#   }
# }
```

### 經緯度轉地址（反向地理編碼）
```bash
curl -X POST http://localhost/api/geocode/reverse \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 25.0339639,
    "longitude": 121.5644722
  }'

# 回應:
# {
#   "success": true,
#   "data": {
#     "address": {
#       "road": "信義路五段",
#       "suburb": "信義區",
#       "city": "台北市",
#       "country": "台灣"
#     },
#     "displayName": "7, 信義路五段, 信義區, 台北市, 110, 台灣"
#   }
# }
```

---

## 完整流程範例

### 使用地址建立安全點並查詢附近的點

```bash
# 步驟 1: 使用地址建立新地點
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Shelter",
    "description": "Safe place during emergency",
    "address": "Taipei Main Station, Taiwan",
    "is_safe": true,
    "tags": ["shelter", "emergency", "safe"]
  }'

# 步驟 2: 取得建立的點位座標（從回應中）
# 假設回傳: latitude: 25.0478, longitude: 121.5170

# 步驟 3: 搜尋附近 2 公里內的所有安全點
curl "http://localhost/api/map-points/nearby/25.0478/121.5170?radius=2&is_safe=true"

# 步驟 4: 如果需要，可以更新標記
curl -X PUT http://localhost/api/map-points/5 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated: Safe shelter with medical supplies",
    "tags": ["shelter", "emergency", "safe", "medical"]
  }'
```

---

## 批次操作腳本範例

### Bash 腳本：批次新增多個地點

```bash
#!/bin/bash

# 定義地點陣列
declare -a points=(
  '{"name":"Safe Zone A","latitude":25.05,"longitude":121.55,"is_safe":true,"tags":["safe"]}'
  '{"name":"Safe Zone B","latitude":25.06,"longitude":121.56,"is_safe":true,"tags":["safe"]}'
  '{"name":"Danger Zone","latitude":25.04,"longitude":121.54,"is_safe":false,"tags":["danger"]}'
)

# 批次新增
for point in "${points[@]}"; do
  echo "Adding: $point"
  curl -X POST http://localhost/api/map-points \
    -H "Content-Type: application/json" \
    -d "$point"
  echo ""
  sleep 1  # 避免 API 限速
done

echo "All points added!"
```

### 查詢並匯出所有點

```bash
#!/bin/bash

# 取得所有地圖點並儲存為 JSON 檔案
curl -s "http://localhost/api/map-points?limit=1000" > all_points.json

echo "All points exported to all_points.json"

# 取得所有不安全點
curl -s "http://localhost/api/map-points?is_safe=false&limit=1000" > unsafe_points.json

echo "Unsafe points exported to unsafe_points.json"
```

---

## 注意事項

### 地理編碼限制
- OpenStreetMap Nominatim API 有使用限制：每秒最多 1 次請求
- 建議在批次操作時加入延遲（sleep）

### 台灣地址建議
由於地理編碼對中文地址支援度有限，建議：
1. 直接提供經緯度座標（最精確）
2. 使用英文地名或地標名稱
3. 使用知名景點或建築物名稱

### 座標系統
- 資料庫儲存：WGS84（國際標準）
- 提供轉換：支援 TWD97 ↔ WGS84 雙向轉換

### 安全性標記最佳實踐
```bash
# 建立安全點時加上詳細標籤
curl -X POST http://localhost/api/map-points \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Assembly Point",
    "latitude": 25.05,
    "longitude": 121.55,
    "is_safe": true,
    "tags": ["assembly", "emergency", "outdoor", "open-space"],
    "metadata": {
      "capacity": 500,
      "facilities": ["water", "first-aid"],
      "contact": "0912-345-678"
    }
  }'
```
