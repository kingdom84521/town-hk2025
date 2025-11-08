<template>
  <div class="route-map-container">
    <div ref="mapContainer" class="map-container"></div>
    <div class="controls">
      <div class="control-group">
        <h3>起點</h3>
        <input v-model.number="startLng" type="number" step="0.0001" placeholder="經度" @change="onPointsChange" />
        <input v-model.number="startLat" type="number" step="0.0001" placeholder="緯度" @change="onPointsChange" />
      </div>

      <div class="control-group">
        <h3>終點</h3>
        <input v-model.number="endLng" type="number" step="0.0001" placeholder="經度" @change="onPointsChange" />
        <input v-model.number="endLat" type="number" step="0.0001" placeholder="緯度" @change="onPointsChange" />
      </div>

      <div class="control-group">
        <h3>設定</h3>
        <label>
          <input type="checkbox" v-model="autoRecalculate" />
          自動重新計算路徑
        </label>
      </div>

      <button @click="calculateRoute" :disabled="loading" class="calc-button">
        {{ loading ? '計算中...' : '規劃路徑' }}
      </button>

      <div v-if="routeInfo" class="route-info">
        <h4>路徑資訊</h4>
        <p><strong>距離:</strong> {{ (routeInfo.distance / 1000).toFixed(2) }} km</p>
        <p><strong>時間:</strong> {{ (routeInfo.duration / 60).toFixed(0) }} 分鐘</p>
        <p v-if="routeInfo.goodPointsUsed > 0">
          <strong>經過 Good Points:</strong> {{ routeInfo.goodPointsUsed }} / {{ goodPoints.length }}
        </p>
        <p v-if="routeInfo.usedHereAPI" class="success-text">
          <strong>✨ HERE API 避障:</strong> {{ routeInfo.avoidAreasCount }} 個區域
        </p>
        <p v-if="routeInfo.badPointsAvoided" class="success-text">
          <strong>避開 Bad Points:</strong> ✓
        </p>
        <p v-if="!routeInfo.usedHereAPI && badPoints.length > 0" class="info-text">
          <strong>路徑引擎:</strong> Mapbox (無避障)
        </p>
        <p :class="{'warning-text': routeInfo.waypointsUsed >= routeInfo.waypointsLimit * 0.8}">
          <strong>Waypoints 使用:</strong>
          {{ routeInfo.waypointsUsed }} / {{ routeInfo.waypointsLimit }}
          <span v-if="routeInfo.waypointsUsed >= routeInfo.waypointsLimit * 0.8" class="warning-icon">⚠️</span>
        </p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'
import { decode } from '@here/flexpolyline'
import 'mapbox-gl/dist/mapbox-gl.css'

export default {
  name: 'RouteMap',
  props: {
    accessToken: {
      type: String,
      required: true
    },
    hereApiKey: {
      type: String,
      default: '' // HERE API Key（用於避障路徑規劃）
    },
    goodPoints: {
      type: Array,
      default: () => []
    },
    badPoints: {
      type: Array,
      default: () => []
    },
    maxTimeIncrease: {
      type: Number,
      default: 1.3 // 最多增加30%的時間
    },
    badPointRadius: {
      type: Number,
      default: 200 // bad point 的避障半徑（米）
    }
  },
  emits: ['add-good-point', 'add-bad-point'],
  setup(props, { emit }) {
    const mapContainer = ref(null)
    const map = ref(null)
    const startLng = ref(121.5654)
    const startLat = ref(25.0330)
    const endLng = ref(121.5297)
    const endLat = ref(25.0478)
    const loading = ref(false)
    const routeInfo = ref(null)
    const error = ref(null)
    const autoRecalculate = ref(true)
    const currentDetourWaypoints = ref([]) // 保存當前使用的繞行點

    let startMarker = null
    let endMarker = null
    const goodPointMarkers = []
    const badPointMarkers = []

    onMounted(() => {
      mapboxgl.accessToken = props.accessToken

      map.value = new mapboxgl.Map({
        container: mapContainer.value,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [121.5654, 25.0330], // 台北
        zoom: 11
      })

      map.value.on('load', () => {
        // 添加路徑圖層
        map.value.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        })

        map.value.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3887be',
            'line-width': 5,
            'line-opacity': 0.75
          }
        })

        // 添加 bad points 範圍圓圈（16邊形）
        map.value.addSource('bad-circles', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.value.addLayer({
          id: 'bad-circles',
          type: 'fill',
          source: 'bad-circles',
          paint: {
            'fill-color': '#ff6b6b',
            'fill-opacity': 0.2
          }
        })

        map.value.addLayer({
          id: 'bad-circles-outline',
          type: 'line',
          source: 'bad-circles',
          paint: {
            'line-color': '#ff6b6b',
            'line-width': 2,
            'line-opacity': 0.8
          }
        })

        // 添加 16 邊形的頂點標記圖層
        map.value.addSource('bad-polygon-vertices', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.value.addLayer({
          id: 'bad-polygon-vertices',
          type: 'circle',
          source: 'bad-polygon-vertices',
          paint: {
            'circle-radius': 3,
            'circle-color': '#ff6b6b',
            'circle-opacity': 0.6
          }
        })

        // 添加擴展後的繞行點標記（實際使用的 waypoints）
        map.value.addSource('detour-waypoints', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.value.addLayer({
          id: 'detour-waypoints',
          type: 'circle',
          source: 'detour-waypoints',
          paint: {
            'circle-radius': 5,
            'circle-color': '#9b59b6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
          }
        })

        // 添加地圖點擊事件監聽器
        // 左鍵點擊：添加 good point
        map.value.getCanvas().addEventListener('click', (e) => {
          if (e.target !== map.value.getCanvas()) return

          const rect = map.value.getCanvas().getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top

          const lngLat = map.value.unproject([x, y])
          const point = [lngLat.lng, lngLat.lat]

          // 左鍵：添加 good point
          emit('add-good-point', point)
        })

        // 右鍵點擊：添加 bad point
        map.value.getCanvas().addEventListener('contextmenu', (e) => {
          e.preventDefault() // 阻止右鍵選單彈出

          const rect = map.value.getCanvas().getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top

          const lngLat = map.value.unproject([x, y])
          const point = [lngLat.lng, lngLat.lat]

          // 右鍵：添加 bad point
          emit('add-bad-point', point)
        })
      })
    })

    onBeforeUnmount(() => {
      if (map.value) {
        map.value.remove()
      }
    })

    // 監聽 props 變化，自動重新計算路徑
    watch([() => props.goodPoints, () => props.badPoints], () => {
      if (autoRecalculate.value && map.value) {
        updateMarkers()
        calculateRoute()
      }
    }, { deep: true })

    // 當點位改變時的處理
    const onPointsChange = () => {
      if (autoRecalculate.value) {
        calculateRoute()
      }
    }

    // 計算兩點之間的距離
    const calculateDistance = (point1, point2) => {
      const from = turf.point(point1)
      const to = turf.point(point2)
      return turf.distance(from, to, { units: 'meters' })
    }

    // 檢查路徑是否經過 bad point
    const routePassesBadPoint = (routeCoordinates, badPoint, radius) => {
      const line = turf.lineString(routeCoordinates)
      const point = turf.point(badPoint)
      const buffered = turf.buffer(point, radius / 1000, { units: 'kilometers' })

      try {
        const intersects = turf.booleanIntersects(line, buffered)
        return intersects
      } catch (e) {
        // 如果出錯，使用簡單的距離檢查
        for (const coord of routeCoordinates) {
          const distance = calculateDistance(coord, badPoint)
          if (distance < radius) {
            return true
          }
        }
        return false
      }
    }

    // 獲取路徑（使用 Mapbox Directions API，行人模式）
    const getRoute = async (coordinates) => {
      const coordsString = coordinates.map(c => c.join(',')).join(';')
      // 使用 walking 模式（行人）
      let url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordsString}?geometries=geojson&overview=full&steps=true&access_token=${props.accessToken}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        return data.routes[0]
      }
      return null
    }

    // 為 bad point 創建避障區域的 bounding box
    const createBadPointBBox = (badPoint) => {
      // 創建正方形 bbox
      const radiusInKm = props.badPointRadius / 1000

      // 計算四個方向的點
      const north = turf.destination(badPoint, radiusInKm, 0, { units: 'kilometers' })
      const south = turf.destination(badPoint, radiusInKm, 180, { units: 'kilometers' })
      const east = turf.destination(badPoint, radiusInKm, 90, { units: 'kilometers' })
      const west = turf.destination(badPoint, radiusInKm, 270, { units: 'kilometers' })

      // 返回 bbox: [west, south, east, north] (經度，緯度順序)
      return {
        west: west.geometry.coordinates[0],
        south: south.geometry.coordinates[1],
        east: east.geometry.coordinates[0],
        north: north.geometry.coordinates[1]
      }
    }

    // 為 bad point 創建 16 邊形（僅用於視覺化顯示）
    const createBadPointPolygon = (badPoint) => {
      const circle = turf.circle(badPoint, props.badPointRadius / 1000, {
        units: 'kilometers',
        steps: 16
      })
      // 返回頂點座標（去掉最後一個重複的點）
      const coordinates = circle.geometry.coordinates[0]
      return coordinates.slice(0, -1) // 移除最後一個重複點
    }

    // HERE Routing API - 支持原生避障功能 🎯
    const getRouteWithHERE = async (coordinates, avoidBBoxes = []) => {
      if (!props.hereApiKey) {
        console.warn('HERE API Key 未設置，無法使用避障功能')
        return null
      }

      try {
        // 構建 waypoints
        const waypoints = coordinates.map((coord, index) => {
          if (index === 0) return `origin=${coord[1]},${coord[0]}`
          if (index === coordinates.length - 1) return `destination=${coord[1]},${coord[0]}`
          return `via=${coord[1]},${coord[0]}`
        }).join('&')

        // 構建 avoidAreas 參數（魔法避障！）
        // HERE API 格式: bbox:west,south,east,north
        // 多個區域使用 | 分隔
        let avoidAreasParam = ''
        if (avoidBBoxes.length > 0) {
          const avoidAreas = avoidBBoxes.map(bbox => {
            return `bbox:${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
          }).join('|')

          avoidAreasParam = `&avoid[areas]=${encodeURIComponent(avoidAreas)}`
          console.log('🚫 避障區域:', avoidBBoxes.length, '個長方形 bbox')
        }

        // 使用 pedestrian 模式（行人路徑）
        // 返回 polyline 格式，使用官方解碼器
        const url = `https://router.hereapi.com/v8/routes?${waypoints}&transportMode=pedestrian&return=polyline,summary&routingMode=fast${avoidAreasParam}&apiKey=${props.hereApiKey}`

        console.log('📡 調用 HERE API...')
        const response = await fetch(url)
        const data = await response.json()

        if (!response.ok) {
          console.error('HERE API 錯誤:', data)
          throw new Error(data.title || 'HERE API 請求失敗')
        }

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0]

          if (!route.sections || route.sections.length === 0) {
            throw new Error('HERE API 返回的路徑沒有 sections')
          }

          console.log('✅ HERE API 路徑獲取成功，共', route.sections.length, '個 sections')

          // 解碼並合併所有 sections 的 polyline
          let allCoordinates = []
          let totalDistance = 0
          let totalDuration = 0

          for (const section of route.sections) {
            if (!section.polyline) {
              console.warn('⚠️ Section 沒有 polyline，跳過')
              continue
            }

            // 使用官方 flexpolyline 解碼器
            // decode 返回: { polyline: [[lat, lng, ...], ...], ... }
            const decoded = decode(section.polyline)

            // 轉換為 GeoJSON 格式: [lng, lat]
            const sectionCoordinates = decoded.polyline.map(point => [point[1], point[0]])

            // 合併坐標（避免重複點）
            if (allCoordinates.length > 0 && sectionCoordinates.length > 0) {
              // 檢查最後一個點是否與當前 section 的第一個點重複
              const lastPoint = allCoordinates[allCoordinates.length - 1]
              const firstPoint = sectionCoordinates[0]
              if (lastPoint[0] === firstPoint[0] && lastPoint[1] === firstPoint[1]) {
                // 跳過重複的第一個點
                allCoordinates.push(...sectionCoordinates.slice(1))
              } else {
                allCoordinates.push(...sectionCoordinates)
              }
            } else {
              allCoordinates.push(...sectionCoordinates)
            }

            // 累加距離和時間
            totalDistance += section.summary.length || 0
            totalDuration += section.summary.duration || 0
          }

          console.log('📍 解碼總坐標點數:', allCoordinates.length)

          return {
            geometry: {
              type: 'LineString',
              coordinates: allCoordinates
            },
            distance: totalDistance,
            duration: totalDuration
          }
        }
      } catch (e) {
        console.error('❌ HERE API 調用失敗:', e)
        throw e
      }

      return null
    }

    // HERE API Polyline 解碼
    // 使用官方 @here/flexpolyline 包進行解碼，獲取完整路徑


    // Mapbox/HERE API waypoints 限制參考
    const MAX_WAYPOINTS = 23 // Mapbox: 總共 25 個點（起點 + 23 個中間點 + 終點）
                             // HERE: 支持更多 waypoints，且原生支持 avoidAreas

    // 計算路徑主函數
    const calculateRoute = async () => {
      loading.value = true
      error.value = null
      routeInfo.value = null

      try {
        const start = [parseFloat(startLng.value), parseFloat(startLat.value)]
        const end = [parseFloat(endLng.value), parseFloat(endLat.value)]

        if (!start[0] || !start[1] || !end[0] || !end[1]) {
          throw new Error('請輸入有效的起點和終點座標')
        }

        // 步驟 1: 計算基本路徑（不考慮 good/bad points）
        let baseRoute = await getRoute([start, end])
        if (!baseRoute) {
          throw new Error('無法計算基本路徑')
        }
        const baseDuration = baseRoute.duration

        // 步驟 2: 加入 good points（貪婪算法）
        let waypoints = []
        let usedGoodPoints = 0

        if (props.goodPoints.length > 0) {
          const remainingGoodPoints = [...props.goodPoints]

          while (remainingGoodPoints.length > 0 && waypoints.length < MAX_WAYPOINTS) {
            let bestPoint = null
            let bestRoute = null
            let bestIndex = -1
            let bestDuration = Infinity

            // 嘗試每個 good point
            for (let i = 0; i < remainingGoodPoints.length; i++) {
              const testWaypoints = [...waypoints, remainingGoodPoints[i]]

              // 檢查是否會超過配額
              if (testWaypoints.length > MAX_WAYPOINTS) {
                continue
              }

              const testRoute = await getRoute([start, ...testWaypoints, end])

              if (testRoute && testRoute.duration <= baseDuration * props.maxTimeIncrease) {
                if (testRoute.duration < bestDuration) {
                  bestPoint = remainingGoodPoints[i]
                  bestRoute = testRoute
                  bestIndex = i
                  bestDuration = testRoute.duration
                }
              }
            }

            if (bestPoint) {
              waypoints.push(bestPoint)
              usedGoodPoints++
              remainingGoodPoints.splice(bestIndex, 1)
            } else {
              break
            }
          }
        }

        // 步驟 3: 獲取最終路徑（使用 HERE API 魔法避障！）
        let finalWaypoints = [...waypoints]
        let finalRoute = null
        let badPointsAvoided = true
        let usedHereAPI = false

        // 準備 bad points bbox 避障區域
        let avoidBBoxes = []
        if (props.badPoints && props.badPoints.length > 0) {
          avoidBBoxes = props.badPoints.map(badPoint => {
            return createBadPointBBox(badPoint)
          })
          console.log('🎯 準備避開', avoidBBoxes.length, '個 bbox 區域')
        }

        // 優先使用 HERE API（如果有 API Key 且需要避障）
        if (props.hereApiKey && avoidBBoxes.length > 0) {
          try {
            console.log('✨ 使用 HERE API 魔法避障（行人模式）...')
            finalRoute = await getRouteWithHERE([start, ...finalWaypoints, end], avoidBBoxes)
            usedHereAPI = true
            console.log('🎉 HERE API 避障路徑計算成功！')
          } catch (e) {
            console.warn('HERE API 失敗，回退到 Mapbox:', e.message)
            // 回退到 Mapbox（行人模式）
            finalRoute = await getRoute([start, ...finalWaypoints, end])
          }
        } else {
          // 使用 Mapbox（行人模式）
          finalRoute = await getRoute([start, ...finalWaypoints, end])
        }

        if (!finalRoute) {
          throw new Error('無法計算最終路徑')
        }

        // 驗證路徑是否真的避開了 bad points
        if (props.badPoints && props.badPoints.length > 0) {
          for (const badPoint of props.badPoints) {
            if (routePassesBadPoint(finalRoute.geometry.coordinates, badPoint, props.badPointRadius)) {
              badPointsAvoided = false
              if (!error.value) {
                if (usedHereAPI) {
                  error.value = '警告：部分路段可能接近 Bad Points（道路網絡限制）'
                } else {
                  error.value = '提示：未使用 HERE API，路徑可能經過 Bad Points'
                }
              }
              break
            }
          }

          // 如果成功避障
          if (badPointsAvoided && usedHereAPI) {
            console.log('✅ 成功避開所有 Bad Points！')
          }
        }

        // 清空繞行點顯示（等待 HERE API 集成）
        currentDetourWaypoints.value = []

        // 更新地圖
        updateMap(start, end, finalRoute)

        // 更新路徑資訊
        routeInfo.value = {
          distance: finalRoute.distance,
          duration: finalRoute.duration,
          goodPointsUsed: usedGoodPoints,
          badPointsAvoided: badPointsAvoided,
          waypointsUsed: finalWaypoints.length,
          waypointsLimit: MAX_WAYPOINTS,
          usedHereAPI: usedHereAPI,
          avoidAreasCount: avoidBBoxes.length
        }

      } catch (err) {
        console.error('路徑計算失敗:', err)
        error.value = err.message || '路徑計算失敗，請檢查座標是否正確'
      } finally {
        loading.value = false
      }
    }

    // 更新地圖顯示
    const updateMap = (start, end, route) => {
      if (!map.value) return

      // 更新路徑
      map.value.getSource('route').setData({
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      })

      // 調整視圖
      const coordinates = route.geometry.coordinates
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord)
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]))

      map.value.fitBounds(bounds, { padding: 50 })

      // 更新標記
      if (startMarker) startMarker.remove()
      if (endMarker) endMarker.remove()

      startMarker = new mapboxgl.Marker({ color: 'green' })
        .setLngLat(start)
        .setPopup(new mapboxgl.Popup().setHTML('<strong>起點</strong>'))
        .addTo(map.value)

      endMarker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat(end)
        .setPopup(new mapboxgl.Popup().setHTML('<strong>終點</strong>'))
        .addTo(map.value)

      updateMarkers()
    }

    // 更新 good/bad points 標記
    const updateMarkers = () => {
      if (!map.value) return

      // 清除舊標記
      goodPointMarkers.forEach(m => m.remove())
      goodPointMarkers.length = 0
      badPointMarkers.forEach(m => m.remove())
      badPointMarkers.length = 0

      // 添加 good points 標記
      props.goodPoints.forEach((point, index) => {
        const marker = new mapboxgl.Marker({ color: 'blue' })
          .setLngLat(point)
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Good Point ${index + 1}</strong>`))
          .addTo(map.value)
        goodPointMarkers.push(marker)
      })

      // 添加 bad points 標記和範圍圓圈
      props.badPoints.forEach((point, index) => {
        const marker = new mapboxgl.Marker({ color: 'orange' })
          .setLngLat(point)
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Bad Point ${index + 1}</strong>`))
          .addTo(map.value)
        badPointMarkers.push(marker)
      })

      // 更新 bad points 範圍圓圈（16邊形）
      const polygons = props.badPoints.map(point => {
        return turf.circle(point, props.badPointRadius / 1000, {
          units: 'kilometers',
          steps: 16  // 使用 16 邊形
        })
      })

      if (map.value.getSource('bad-circles')) {
        map.value.getSource('bad-circles').setData({
          type: 'FeatureCollection',
          features: polygons
        })
      }

      // 更新 16 邊形的頂點
      const vertices = []
      props.badPoints.forEach(point => {
        const polygonVertices = createBadPointPolygon(point)
        polygonVertices.forEach(vertex => {
          vertices.push(turf.point(vertex))
        })
      })

      if (map.value.getSource('bad-polygon-vertices')) {
        map.value.getSource('bad-polygon-vertices').setData({
          type: 'FeatureCollection',
          features: vertices
        })
      }

      // 更新繞行點（擴展後的 waypoints）
      const detourPoints = currentDetourWaypoints.value.map(point => turf.point(point))
      if (map.value.getSource('detour-waypoints')) {
        map.value.getSource('detour-waypoints').setData({
          type: 'FeatureCollection',
          features: detourPoints
        })
      }
    }

    return {
      mapContainer,
      startLng,
      startLat,
      endLng,
      endLat,
      loading,
      routeInfo,
      error,
      autoRecalculate,
      calculateRoute,
      onPointsChange
    }
  }
}
</script>

<style scoped>
.route-map-container {
  display: flex;
  height: 600px;
  gap: 20px;
}

.map-container {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.controls {
  width: 320px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.control-group {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #dee2e6;
}

.control-group:last-of-type {
  border-bottom: none;
}

.control-group h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #495057;
}

.control-group input[type="number"] {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.control-group input[type="number"]:focus {
  outline: none;
  border-color: #3887be;
  box-shadow: 0 0 0 3px rgba(56, 135, 190, 0.1);
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
}

.control-group input[type="checkbox"] {
  cursor: pointer;
}

.calc-button {
  width: 100%;
  padding: 12px;
  background: #3887be;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background 0.2s;
}

.calc-button:hover:not(:disabled) {
  background: #2c6a99;
}

.calc-button:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

.route-info {
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #3887be;
}

.route-info h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #3887be;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.route-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #495057;
}

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  color: #856404;
  font-size: 14px;
  line-height: 1.4;
}

.warning-text {
  color: #ff6b00;
  font-weight: 500;
}

.success-text {
  color: #27ae60;
  font-weight: 500;
}

.info-text {
  color: #3498db;
  font-weight: 500;
}

.warning-icon {
  margin-left: 4px;
  font-size: 16px;
}
</style>
