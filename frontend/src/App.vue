<script setup>
import RouteMap from './components/RouteMap.vue'
import { ref } from 'vue'

// Mapbox Access Token - 請設置環境變數或直接替換
const accessToken = ref(import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE')

// HERE API Key - 用於魔法避障功能
const hereApiKey = ref(import.meta.env.VITE_HERE_API_KEY || '')

// Good Points（優先經過的點）
const goodPoints = ref([
  [121.5437, 25.0375], // 台北車站
  [121.5200, 25.0408], // 西門町
])

// Bad Points（必須避開的點）
const badPoints = ref([
  [121.5310, 25.0454], // 中山區某處
])

// 新增點位的輸入
const newPointLng = ref('')
const newPointLat = ref('')

// 添加 Good Point
const addGoodPoint = () => {
  const lng = parseFloat(newPointLng.value)
  const lat = parseFloat(newPointLat.value)

  if (lng && lat) {
    goodPoints.value.push([lng, lat])
    newPointLng.value = ''
    newPointLat.value = ''
  }
}

// 添加 Bad Point
const addBadPoint = () => {
  const lng = parseFloat(newPointLng.value)
  const lat = parseFloat(newPointLat.value)

  if (lng && lat) {
    badPoints.value.push([lng, lat])
    newPointLng.value = ''
    newPointLat.value = ''
  }
}

// 刪除點位
const removeGoodPoint = (index) => {
  goodPoints.value.splice(index, 1)
}

const removeBadPoint = (index) => {
  badPoints.value.splice(index, 1)
}

// 從地圖點擊添加點位
const handleAddGoodPointFromMap = (point) => {
  goodPoints.value.push(point)
}

const handleAddBadPointFromMap = (point) => {
  badPoints.value.push(point)
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>🚶 行人智能路徑規劃系統</h1>
      <p class="subtitle">支援動態 Good/Bad Points，行人路徑自動調整</p>
    </header>

    <div v-if="accessToken === 'YOUR_MAPBOX_TOKEN_HERE'" class="warning-banner">
      <h3>⚠️ 需要設置 Mapbox Token</h3>
      <p>請設置環境變數 <code>VITE_MAPBOX_TOKEN</code> 或在 App.vue 中直接設置 accessToken</p>
      <p>獲取 Token: <a href="https://account.mapbox.com/" target="_blank">https://account.mapbox.com/</a></p>
    </div>

    <div class="info-section">
      <div class="info-card">
        <h3>📍 標記說明</h3>
        <ul>
          <li><span class="marker green">●</span> 起點</li>
          <li><span class="marker red">●</span> 終點</li>
          <li><span class="marker blue">●</span> Good Points（優先經過）</li>
          <li><span class="marker orange">●</span> Bad Points（必須避開）</li>
          <li><span class="marker purple">●</span> 繞行點（擴展的避障點）</li>
        </ul>
      </div>

      <div class="info-card">
        <h3>✨ 主要功能</h3>
        <ul>
          <li>🚶 行人專用路徑規劃</li>
          <li>✅ 動態經過 Good Points（不超時）</li>
          <li>✅ HERE API 智能避開 Bad Points</li>
          <li>✅ <strong>自動重新計算路徑</strong></li>
        </ul>
      </div>

      <div class="info-card">
        <h3>🖱️ 地圖操作</h3>
        <ul>
          <li>🎯 <strong>左鍵點擊</strong> → 新增 Good Point</li>
          <li>⚠️ <strong>右鍵點擊</strong> → 新增 Bad Point</li>
        </ul>
      </div>
    </div>

    <div class="points-manager">
      <div class="manager-section">
        <h3>🎯 管理 Good Points（優先經過）</h3>
        <div class="point-list">
          <div v-for="(point, index) in goodPoints" :key="index" class="point-item good">
            <span>{{ index + 1 }}. [{{ point[0].toFixed(4) }}, {{ point[1].toFixed(4) }}]</span>
            <button @click="removeGoodPoint(index)" class="btn-remove">刪除</button>
          </div>
          <p v-if="goodPoints.length === 0" class="empty-message">尚未添加 Good Points</p>
        </div>
        <div class="add-point">
          <input v-model="newPointLng" type="number" step="0.0001" placeholder="經度" />
          <input v-model="newPointLat" type="number" step="0.0001" placeholder="緯度" />
          <button @click="addGoodPoint" class="btn-add">+ 添加 Good Point</button>
        </div>
      </div>

      <div class="manager-section">
        <h3>⚠️ 管理 Bad Points（必須避開）</h3>
        <div class="point-list">
          <div v-for="(point, index) in badPoints" :key="index" class="point-item bad">
            <span>{{ index + 1 }}. [{{ point[0].toFixed(4) }}, {{ point[1].toFixed(4) }}]</span>
            <button @click="removeBadPoint(index)" class="btn-remove">刪除</button>
          </div>
          <p v-if="badPoints.length === 0" class="empty-message">尚未添加 Bad Points</p>
        </div>
        <div class="add-point">
          <input v-model="newPointLng" type="number" step="0.0001" placeholder="經度" />
          <input v-model="newPointLat" type="number" step="0.0001" placeholder="緯度" />
          <button @click="addBadPoint" class="btn-add-bad">+ 添加 Bad Point</button>
        </div>
      </div>
    </div>

    <RouteMap
      :access-token="accessToken"
      :here-api-key="hereApiKey"
      :good-points="goodPoints"
      :bad-points="badPoints"
      :max-time-increase="1.3"
      :bad-point-radius="200"
      @add-good-point="handleAddGoodPointFromMap"
      @add-bad-point="handleAddBadPointFromMap"
    />

    <div class="feature-note">
      <h4>🔄 動態行人路徑調整與魔法避障</h4>
      <p>
        當您添加或刪除 Good/Bad Points 時，<strong>行人路徑</strong>會自動重新計算。
        系統會嘗試在不增加太多時間的前提下經過 Good Points，同時智能避開 Bad Points。
      </p>
      <p style="margin-top: 10px;">
        <strong>✨ HERE API 魔法避障（行人模式）：</strong>系統使用 HERE Routing API 的原生 <code>avoidAreas</code> 功能，
        在每個 Bad Point 周圍創建一個長方形避障區域 (bbox)，行人路徑會自動繞過這些區域，無需手動添加繞行點！
      </p>
      <p style="margin-top: 10px;">
        <strong>🚶 行人專屬：</strong>路徑計算使用 <code>pedestrian/walking</code> 模式，
        會優先選擇人行道、步行街等適合行人的道路。
      </p>
      <p style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 6px;">
        <strong>⚙️ 設置提示：</strong>請在 <code>.env</code> 文件中添加 <code>VITE_HERE_API_KEY</code>，
        或直接在 App.vue 中設置 hereApiKey 變量。獲取免費 API Key：
        <a href="https://developer.here.com/" target="_blank">https://developer.here.com/</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 30px;
}

.app-header h1 {
  margin: 0;
  font-size: 2.5em;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 10px 0 0 0;
  font-size: 1.1em;
  color: #7f8c8d;
}

.warning-banner {
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.warning-banner h3 {
  margin-top: 0;
  color: #856404;
}

.warning-banner code {
  background: #ffeaa7;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.warning-banner a {
  color: #0066cc;
}

.info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.info-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.info-card h3 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.info-card ul {
  margin: 0;
  padding-left: 20px;
}

.info-card li {
  margin: 8px 0;
  color: #34495e;
}

.marker {
  font-size: 1.2em;
  margin-right: 8px;
}

.marker.green { color: #27ae60; }
.marker.red { color: #e74c3c; }
.marker.blue { color: #3498db; }
.marker.orange { color: #e67e22; }
.marker.purple { color: #9b59b6; }

.points-manager {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.manager-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.manager-section h3 {
  margin-top: 0;
  font-size: 1.1em;
  color: #2c3e50;
}

.point-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #3498db;
}

.point-item.good {
  border-left-color: #3498db;
}

.point-item.bad {
  border-left-color: #e67e22;
}

.point-item span {
  font-family: monospace;
  font-size: 0.9em;
  color: #2c3e50;
}

.btn-remove {
  padding: 4px 12px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.2s;
}

.btn-remove:hover {
  background: #c0392b;
}

.empty-message {
  text-align: center;
  color: #95a5a6;
  font-style: italic;
  margin: 20px 0;
}

.add-point {
  display: flex;
  gap: 8px;
}

.add-point input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.btn-add, .btn-add-bad {
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-add {
  background: #3498db;
}

.btn-add:hover {
  background: #2980b9;
}

.btn-add-bad {
  background: #e67e22;
}

.btn-add-bad:hover {
  background: #d35400;
}

.feature-note {
  margin-top: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.feature-note h4 {
  margin-top: 0;
  color: #667eea;
}

.feature-note p {
  margin-bottom: 0;
  color: #2c3e50;
  line-height: 1.6;
}
</style>
