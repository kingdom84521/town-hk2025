# HERE API 魔法避障設置指南 ✨

## 🎯 功能說明

使用 HERE Routing API 的原生 `avoidAreas` 功能實現智能避障，專為**行人路徑**優化！無需手動添加繞行點！

### 🚶 行人專屬特性
- 使用 `pedestrian` 模式（HERE）和 `walking` 模式（Mapbox）
- 優先選擇人行道、步行街等適合行人的道路
- 避障區域使用 bbox（長方形）格式，符合 HERE API 規範
- 使用官方 `@here/flexpolyline` 包解碼路徑，獲取完整路線

## 📝 設置步驟

### 1. 獲取 HERE API Key

1. 訪問 [HERE Developer Portal](https://developer.here.com/)
2. 註冊免費賬戶
3. 創建新項目
4. 生成 API Key（選擇 REST API）
5. 複製 API Key

### 2. 配置環境變量

```bash
# 複製環境變量範例文件
cp .env.example .env

# 編輯 .env 文件，添加你的 API Keys
nano .env
```

在 `.env` 中添加：
```env
# Mapbox Token（用於地圖顯示）
VITE_MAPBOX_TOKEN=你的_mapbox_token

# HERE API Key（用於避障路徑規劃）
VITE_HERE_API_KEY=你的_here_api_key
```

### 3. 安裝依賴（如果需要）

系統已包含 HERE 官方 polyline 解碼器：
```bash
npm install
```

依賴項：
- `@here/flexpolyline` - HERE 官方 polyline 解碼器

### 4. 重啟開發服務器

```bash
npm run dev
```

## 🔧 工作原理

### 避障機制

1. **創建避障區域（BBox 格式）**
   - 在每個 Bad Point 周圍創建長方形避障區域 (bounding box)
   - 格式：`bbox:west,south,east,north`
   - 半徑：200 米（可在 App.vue 中配置 `badPointRadius`）
   - 視覺化：地圖上顯示 16 邊形圓圈（僅供參考）

2. **API 調用流程**
   ```
   用戶添加 Bad Point
   ↓
   系統計算 bbox (west, south, east, north)
   ↓
   調用 HERE API (pedestrian 模式) 並傳入 avoid[areas] 參數
   ↓
   HERE API 自動繞過這些 bbox 區域
   ↓
   返回行人避障路徑
   ```

3. **自動回退機制**
   - 如果 HERE API 失敗，自動回退到 Mapbox（無避障）
   - 控制台會顯示回退信息

## 📊 路徑信息顯示

成功使用 HERE API 時，路徑信息會顯示：

```
✨ HERE API 避障: 3 個區域
避開 Bad Points: ✓
```

未使用 HERE API 時：
```
路徑引擎: Mapbox (無避障)
```

## 🐛 調試

打開瀏覽器控制台（F12），查看詳細日誌：

```
🎯 準備避開 3 個 bbox 區域
✨ 使用 HERE API 魔法避障（行人模式）...
🚫 避障區域: 3 個長方形 bbox
📡 調用 HERE API...
✅ HERE API 路徑獲取成功
🎉 HERE API 避障路徑計算成功！
✅ 成功避開所有 Bad Points！
```

### 實際 API 調用範例

```
GET https://router.hereapi.com/v8/routes?
  origin=25.0330,121.5654&
  destination=25.0478,121.5297&
  transportMode=pedestrian&
  avoid[areas]=bbox:121.5290,25.0434,121.5330,25.0474&
  return=polyline,summary&
  apiKey=YOUR_KEY
```

## ⚙️ 配置選項

在 `App.vue` 中調整參數：

```vue
<RouteMap
  :here-api-key="hereApiKey"
  :bad-point-radius="200"    <!-- 避障半徑（米） -->
  :max-time-increase="1.3"    <!-- Good Points 最大時間增加 -->
/>
```

## 🚀 API 限制

- **HERE Free Plan**:
  - 每月 250,000 次路徑查詢
  - 每秒 5 次請求
  - 最多 150 個 waypoints

- **Mapbox Free Plan**:
  - 每月 100,000 次路徑查詢
  - 最多 25 個 waypoints（含起終點）

## 💡 使用建議

1. **避障優先使用 HERE API（行人模式）**
   - HERE API 原生支持 avoidAreas (bbox 格式)
   - 無需手動添加繞行點
   - 行人路徑更自然合理

2. **Good Points 使用 Mapbox Walking**
   - Good Points 已經用貪婪算法優化
   - Mapbox Walking 模式路徑質量也很好

3. **混合使用（自動選擇）**
   - 系統會自動選擇最佳 API
   - 有 Bad Points 且有 HERE API Key → 使用 HERE
   - 無 Bad Points 或無 API Key → 使用 Mapbox
   - 兩者都使用行人/步行模式

4. **BBox 避障區域**
   - 每個 Bad Point 周圍創建正方形 bbox
   - 半徑默認 200 米，可調整
   - 格式符合 HERE API 要求：`bbox:west,south,east,north`

## 🔗 相關鏈接

- [HERE Routing API 文檔](https://developer.here.com/documentation/routing-api/dev_guide/index.html)
- [HERE avoidAreas 參數](https://developer.here.com/documentation/routing-api/dev_guide/topics/route-parameters.html#avoid-areas)
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)

## 🎉 完成！

現在你可以享受魔法避障功能了！右鍵點擊地圖添加 Bad Point，路徑會自動繞開！
