<template>
  <div class="container mx-auto px-2 h-full">
    <GoogleMap ref="locationMap" :api-key="ApiKey" :map-id="MapId" style="width: 100%; height: 100%" :center="center"
      :zoom="15" gesture-handling="greedy" :disable-default-ui="true" :libraries="['visualization', 'marker']"
      @center_changed="mapCenterChanged">
      <AdvancedMarker :options="markerOptions">
      </AdvancedMarker>
      <!-- <Polyline v-if="pathCoordinates.length > 1" :options="{
        path: pathCoordinates,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 3
      }" /> -->
      <!-- 路燈網格熱圖層 -->
      <!-- <Rectangle v-for="cell in heatmapData" v-show="isHeatmapVisible" :key="cell.gridKey" :options="{
        bounds: cell.bounds,
        fillColor: cell.color,
        strokeColor: parseColorValue(cell.color),
        strokeOpacity: 0.3,
        strokeWeight: 1,
        clickable: true
      }" @click="showGridInfo(cell)" /> -->
      <!-- 報告標記由 JavaScript 直接管理 -->
    </GoogleMap>

    <!-- 路燈熱圖控制 -->
    <!-- <StreetlightHeatmap ref="heatmapRef" @toggle="isHeatmapVisible = $event" /> -->

    <!-- 浮動按鈕和回報表單 -->
    <FloatingButton @click="openReportSheet" />
    <ReportSheet :is-open="isReportSheetOpen" :latitude="center.lat" :longitude="center.lng" @close="closeReportSheet"
      @submit="handleReportSubmit" />
  </div>
</template>

<script setup>
import { ref, defineModel, watchEffect, watch, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { GoogleMap, Polyline, Rectangle, AdvancedMarker } from 'vue3-google-map';

import FloatingButton from './components/FloatingButton.vue';
import ReportSheet from './components/ReportSheet.vue';
import StreetlightHeatmap from './components/StreetlightHeatmap.vue';
import { useConnectionMessage } from './composables/useConnectionMessage';
import { useHandleConnectionData } from './composables/useHandleConnectionData';

const ApiKey = import.meta.env.VITE_GOOGLE_API_KEY
const MapId = import.meta.env.VITE_GOOGLE_MAP_ID


const center = reactive({ lat: 25.0376146, lng: 121.563844 });
const markerOptions = ref({ position: { lat: 25.0376146, lng: 121.563844 } })
const locationMap = ref(null);
const heatmapRef = ref(null);
const isPanning = ref(false);
const pathCoordinates = ref([]); // 儲存路徑座標
const gpsRecords = ref([]); // 儲存所有 GPS 紀錄
let gpsInterval = null; // 定時器
let simulationInterval = null; // 模擬定時器
const isSimulating = ref(false);
let simulationLat = 25.0376146; // 模擬起始緯度
let simulationLng = 121.563844; // 模擬起始經度
const isReportSheetOpen = ref(false); // 回報 Sheet 開啟狀態
const reports = ref([]); // 儲存所有回報
const reportMarkers = ref([]); // 儲存標記引用
const isHeatmapVisible = ref(false); // 熱圖顯示狀態
const heatmapData = ref([]); // 熱圖數據

// 計算最近 10 筆紀錄
const recentGpsRecords = computed(() => {
  return gpsRecords.value.slice(-10).reverse();
});

// 載入路燈熱圖數據
const loadHeatmapData = async () => {
  try {
    const { createGridHeatmap } = await import('./utils/gridHeatmap');
    heatmapData.value = createGridHeatmap(100); // 使用 50 米網格
    console.log('Grid heatmap data loaded:', heatmapData.value.length, 'grid cells');
  } catch (error) {
    console.error('Error loading heatmap data:', error);
  }
};


const handleLocation = async (event) => {
  console.log('handleLocation')
  const result = JSON.parse(
    event.data
  );

  console.log('handleLocation', result)

  if (result.data.longitude && result.data.latitude) {
    const lat = result.data.latitude;
    const lng = result.data.longitude;

    // 設置 isPanning 避免觸發 mapCenterChanged
    isPanning.value = true;

    // 更新地圖中心點
    center.lat = lat;
    center.lng = lng;

    // 手動移動地圖到新位置
    if (locationMap.value && locationMap.value.map) {
      locationMap.value.map.panTo({ lat, lng });
    }

    // 添加到路徑座標陣列
    pathCoordinates.value.push({ lat, lng });

    // 添加到 GPS 紀錄
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    gpsRecords.value.push({
      index: gpsRecords.value.length + 1,
      lat: lat.toFixed(7),
      lng: lng.toFixed(7),
      time: timeString
    });

    const position = {
      lat,
      lng
    }
    markerOptions.value = { position }

    console.log('已添加路徑點:', { lat, lng, pathLength: pathCoordinates.value.length });
  }
};

// 每 10 秒請求 GPS 位置
onMounted(async () => {
  // 載入熱圖數據
  await loadHeatmapData();

  // 立即請求一次
  useConnectionMessage('location', null);

  // 設置定時器每 10 秒請求一次
  gpsInterval = setInterval(() => {
    console.log('定時請求 GPS 位置...');
    useConnectionMessage('location', null);
  }, 10000); // 10000 毫秒 = 10 秒
});

// 清理定時器
onUnmounted(() => {
  if (gpsInterval) {
    clearInterval(gpsInterval);
    gpsInterval = null;
  }
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
});

// 模擬 GPS 位置移動（向東）
const addSimulatedPoint = () => {
  // 向東移動：經度增加約 0.0001 度（約 10 公尺）
  simulationLng += 0.0001;
  // 稍微變化緯度，讓路徑不是完全直線
  simulationLat += (Math.random() - 0.5) * 0.00002;

  const lat = simulationLat;
  const lng = simulationLng;

  // 設置 isPanning 避免觸發 mapCenterChanged
  isPanning.value = true;

  // 更新地圖中心點
  center.lat = lat;
  center.lng = lng;

  // 手動移動地圖到新位置
  if (locationMap.value && locationMap.value.map) {
    locationMap.value.map.panTo({ lat, lng });
  }

  // 添加到路徑座標陣列
  pathCoordinates.value.push({ lat, lng });

  // 添加到 GPS 紀錄
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  gpsRecords.value.push({
    index: gpsRecords.value.length + 1,
    lat: lat.toFixed(7),
    lng: lng.toFixed(7),
    time: timeString
  });

  console.log('模擬路徑點:', { lat, lng, pathLength: pathCoordinates.value.length });
};

// 開始模擬
const startSimulation = () => {
  if (isSimulating.value) return;

  isSimulating.value = true;

  // 如果沒有路徑，從初始位置開始
  if (pathCoordinates.value.length === 0) {
    simulationLat = 25.0376146;
    simulationLng = 121.563844;
  } else {
    // 從最後一個點繼續
    const lastPoint = pathCoordinates.value[pathCoordinates.value.length - 1];
    simulationLat = lastPoint.lat;
    simulationLng = lastPoint.lng;
  }

  // 立即添加第一個點
  addSimulatedPoint();

  // 每 2 秒添加一個新點
  simulationInterval = setInterval(() => {
    addSimulatedPoint();
  }, 2000);

  console.log('開始向東模擬移動');
};

// 停止模擬
const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isSimulating.value = false;
  console.log('停止模擬');
};

// 清除路徑
const clearPath = () => {
  pathCoordinates.value = [];
  gpsRecords.value = [];
  simulationLat = 25.0376146;
  simulationLng = 121.563844;
  center.lat = 25.0376146;
  center.lng = 121.563844;
  console.log('已清除所有路徑');
};

// 開啟回報表單
const openReportSheet = () => {
  isReportSheetOpen.value = true;
};

// 關閉回報表單
const closeReportSheet = () => {
  isReportSheetOpen.value = false;
};

// 直接在地圖上創建標記
const createMapMarker = (report) => {
  if (!locationMap.value?.map || !window.google) {
    console.warn('Map not ready for marker creation');
    return null;
  }

  try {
    const map = locationMap.value.map;

    // 信息窗口內容
    const infoContent = `
      <div style="padding: 12px; font-size: 13px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        <strong style="color: #FF0000; font-size: 14px;">狀況：${getStatusLabel(report.status)}</strong><br>
        <strong>位置：</strong> ${report.latitude.toFixed(7)}, ${report.longitude.toFixed(7)}<br>
        <strong>時間：</strong> ${new Date(report.timestamp).toLocaleString('zh-TW')}<br>
        ${report.notes ? `<strong>備註：</strong> ${report.notes}` : ''}
      </div>
    `;

    const infowindow = new google.maps.InfoWindow({
      content: infoContent
    });

    // 建立標記
    const marker = new google.maps.Marker({
      position: {
        lat: parseFloat(report.latitude),
        lng: parseFloat(report.longitude)
      },
      map: map,
      title: `${getStatusLabel(report.status)} - ${new Date(report.timestamp).toLocaleTimeString('zh-TW')}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#FF0000',
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      },
      clickable: true
    });

    // 點擊標記顯示信息窗口
    marker.addListener('click', () => {
      // 關閉其他打開的窗口
      reportMarkers.value.forEach((markerInfo) => {
        if (markerInfo && markerInfo.infowindow && markerInfo.infowindow !== infowindow) {
          markerInfo.infowindow.close();
        }
      });
      // 打開當前窗口
      infowindow.open(map, marker);
    });

    console.log('Marker created at', report.latitude, report.longitude);
    return { marker, infowindow };
  } catch (error) {
    console.error('Error creating marker:', error);
    return null;
  }
};

// 處理回報提交
const handleReportSubmit = (report) => {
  console.log('收到回報：', report);

  // 保存報告到前端存儲
  const reportWithId = {
    id: Date.now(),
    ...report,
    position: {
      lat: report.latitude,
      lng: report.longitude
    }
  };
  reports.value.push(reportWithId);

  // 直接在地圖上創建標記
  const markerData = createMapMarker(reportWithId);
  if (markerData) {
    reportMarkers.value.push(markerData);
  }

  // 顯示確認訊息
  alert(`已回報狀況：${getStatusLabel(report.status)}\n位置：${report.latitude.toFixed(7)}, ${report.longitude.toFixed(7)}`);
};

// 獲取狀況標籤文字
const getStatusLabel = (status) => {
  const statusMap = {
    normal: '正常',
    crowded: '擁擠',
    accident: '意外',
    blocked: '受阻',
    emergency: '緊急情況',
    other: '其他'
  };
  return statusMap[status] || status;
};

// 從顏色字符串提取 RGB 值用於邊框
const parseColorValue = (colorStr) => {
  // 從 rgba 或 rgb 字符串中提取 RGB 值
  if (colorStr.includes('rgba')) {
    return colorStr.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, 'rgb($1, $2, $3)');
  }
  return colorStr;
};

// 顯示網格信息
const showGridInfo = (cell) => {
  if (!window.google) return;

  const map = locationMap.value?.map;
  if (!map) return;

  const wattLabel = cell.totalWatt <= 5 ? '紅(1-5W)' : cell.totalWatt <= 10 ? '黃(6-10W)' : '綠(11+W)';

  const infoContent = `
    <div style="padding: 12px; font-size: 13px; font-family: system-ui, -apple-system, sans-serif;">
      <strong style="color: #333; font-size: 14px;">網格信息</strong><br>
      <strong>顏色等級：</strong> ${wattLabel}<br>
      <strong>總功率：</strong> ${cell.totalWatt} W<br>
      <strong>路燈數：</strong> ${cell.count}<br>
      <strong>平均功率：</strong> ${cell.avgWatt.toFixed(2)} W<br>
      <strong>網格ID：</strong> ${cell.gridKey}
    </div>
  `;

  const infowindow = new google.maps.InfoWindow({
    content: infoContent,
    position: {
      lat: (cell.bounds.north + cell.bounds.south) / 2,
      lng: (cell.bounds.east + cell.bounds.west) / 2
    }
  });

  infowindow.open(map);
};


const mapCenterChanged = useDebounceFn(async () => {
  console.log('mapCenterChanged...')
  if (locationMap.value) {
    if (isPanning.value) {
      isPanning.value = false;
      return;
    }

    const gmap = locationMap.value.map;
    const newCenter = gmap.getCenter();
    const lat = parseFloat(newCenter.lat().toFixed(7));
    const lng = parseFloat(newCenter.lng().toFixed(7));

    // const { data } = await axios.get(
    //   `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=`
    // );

    center.lat = lat;
    center.lng = lng;

    // markerOptions.value = position

    // if (data.results.length) {
    //   center.lat = lat;
    //   center.lng = lng;
    //   addressText.value = data.results[0]?.formatted_address;
    // } else {
    //   isNoResultModalShow.value = true;
    // }
  }
}, 1000);



useConnectionMessage('location', null);
useHandleConnectionData(handleLocation);
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  width: 500px;
}

.sim-button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
}

.sim-button:not(:disabled) {
  background: #FF0000;
  color: white;
}

.sim-button:not(:disabled):hover {
  background: #cc0000;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 0, 0, 0.3);
}

.sim-button:disabled {
  background: #ccc;
  color: #666;
  cursor: not-allowed;
}

.sim-button.stop:not(:disabled) {
  background: #ff9800;
}

.sim-button.stop:not(:disabled):hover {
  background: #e68900;
  box-shadow: 0 4px 8px rgba(255, 152, 0, 0.3);
}

.sim-button.clear:not(:disabled) {
  background: #555;
}

.sim-button.clear:not(:disabled):hover {
  background: #333;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.debug-info {
  width: 500px;
  background: #e3f2fd;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 14px;
  color: #1976d2;
}

.debug-info p {
  margin: 5px 0;
}

.gps-records {
  width: 500px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.gps-records h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #FF0000;
  padding-bottom: 8px;
}

.no-records {
  text-align: center;
  color: #999;
  padding: 20px;
  font-size: 14px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid #FF0000;
  font-size: 14px;
}

.record-index {
  font-weight: bold;
  color: #FF0000;
  min-width: 40px;
}

.record-coords {
  flex: 1;
  color: #555;
  font-family: monospace;
}

.record-time {
  color: #888;
  font-size: 13px;
  min-width: 70px;
  text-align: right;
}
</style>