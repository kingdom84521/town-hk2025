/**
 * Route Generator Module - 智能路徑規劃引擎
 * 支持 Good Points 優化和 Bad Points 避障
 */

const turf = require('@turf/turf')
const { decode } = require('@here/flexpolyline')
const fetch = require('node-fetch')

class RouteGenerator {
  constructor(options = {}) {
    this.mapboxToken = options.mapboxToken || process.env.MAPBOXAPIKEY
    this.hereApiKey = options.hereApiKey || process.env.HEREAPIKEY
    this.maxWaypoints = 23
  }

  calculateDistance(point1, point2) {
    const from = turf.point(point1)
    const to = turf.point(point2)
    return turf.distance(from, to, { units: 'meters' })
  }

  routePassesBadPoint(routeCoordinates, badPoint, radius) {
    const line = turf.lineString(routeCoordinates)
    const point = turf.point(badPoint)
    const buffered = turf.buffer(point, radius / 1000, { units: 'kilometers' })

    try {
      return turf.booleanIntersects(line, buffered)
    } catch (e) {
      for (const coord of routeCoordinates) {
        const distance = this.calculateDistance(coord, badPoint)
        if (distance < radius) {
          return true
        }
      }
      return false
    }
  }

  async getMapboxRoute(coordinates) {
    if (!this.mapboxToken) {
      throw new Error('Mapbox token 未設置')
    }

    const coordsString = coordinates.map(c => c.join(',')).join(';')
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordsString}?geometries=geojson&overview=full&steps=true&access_token=${this.mapboxToken}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.routes && data.routes.length > 0) {
      return data.routes[0]
    }
    return null
  }

  createBadPointBBox(badPoint, radius) {
    const radiusInKm = radius / 1000
    const north = turf.destination(badPoint, radiusInKm, 0, { units: 'kilometers' })
    const south = turf.destination(badPoint, radiusInKm, 180, { units: 'kilometers' })
    const east = turf.destination(badPoint, radiusInKm, 90, { units: 'kilometers' })
    const west = turf.destination(badPoint, radiusInKm, 270, { units: 'kilometers' })

    return {
      west: west.geometry.coordinates[0],
      south: south.geometry.coordinates[1],
      east: east.geometry.coordinates[0],
      north: north.geometry.coordinates[1]
    }
  }

  async getHERERoute(coordinates, avoidBBoxes = []) {
    if (!this.hereApiKey) {
      console.warn('HERE API Key 未設置')
      return null
    }

    try {
      const waypoints = coordinates.map((coord, index) => {
        if (index === 0) return `origin=${coord[1]},${coord[0]}`
        if (index === coordinates.length - 1) return `destination=${coord[1]},${coord[0]}`
        return `via=${coord[1]},${coord[0]}`
      }).join('&')

      let avoidAreasParam = ''
      if (avoidBBoxes.length > 0) {
        const avoidAreas = avoidBBoxes.map(bbox => {
          return `bbox:${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
        }).join('|')

        avoidAreasParam = `&avoid[areas]=${encodeURIComponent(avoidAreas)}`
        console.log('🚫 避障區域:', avoidBBoxes.length, '個 bbox')
      }

      const url = `https://router.hereapi.com/v8/routes?${waypoints}&transportMode=pedestrian&return=polyline,summary&routingMode=fast${avoidAreasParam}&apiKey=${this.hereApiKey}`

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

        console.log('✅ HERE API 成功，共', route.sections.length, '個 sections')

        let allCoordinates = []
        let totalDistance = 0
        let totalDuration = 0

        for (const section of route.sections) {
          if (!section.polyline) {
            console.warn('⚠️ Section 沒有 polyline')
            continue
          }

          const decoded = decode(section.polyline)
          const sectionCoordinates = decoded.polyline.map(point => [point[1], point[0]])

          if (allCoordinates.length > 0 && sectionCoordinates.length > 0) {
            const lastPoint = allCoordinates[allCoordinates.length - 1]
            const firstPoint = sectionCoordinates[0]
            if (lastPoint[0] === firstPoint[0] && lastPoint[1] === firstPoint[1]) {
              allCoordinates.push(...sectionCoordinates.slice(1))
            } else {
              allCoordinates.push(...sectionCoordinates)
            }
          } else {
            allCoordinates.push(...sectionCoordinates)
          }

          totalDistance += section.summary.length || 0
          totalDuration += section.summary.duration || 0
        }

        console.log('📍 總坐標點數:', allCoordinates.length)

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
      console.error('❌ HERE API 失敗:', e)
      throw e
    }

    return null
  }

  async calculateRoute(options) {
    const {
      start,
      end,
      goodPoints = [],
      badPoints = [],
      badPointRadius = 200,
      maxTimeIncrease = 1.3
    } = options

    try {
      if (!start || !end || start.length !== 2 || end.length !== 2) {
        throw new Error('起點和終點必須是 [lng, lat] 格式')
      }

      console.log('🚀 開始計算路徑...')

      let baseRoute = await this.getMapboxRoute([start, end])
      if (!baseRoute) {
        throw new Error('無法計算基本路徑')
      }
      const baseDuration = baseRoute.duration

      let waypoints = []
      let usedGoodPoints = 0

      if (goodPoints.length > 0) {
        const remainingGoodPoints = [...goodPoints]

        while (remainingGoodPoints.length > 0 && waypoints.length < this.maxWaypoints) {
          let bestPoint = null
          let bestIndex = -1
          let bestDuration = Infinity

          for (let i = 0; i < remainingGoodPoints.length; i++) {
            const testWaypoints = [...waypoints, remainingGoodPoints[i]]
            if (testWaypoints.length > this.maxWaypoints) continue

            const testRoute = await this.getMapboxRoute([start, ...testWaypoints, end])

            if (testRoute && testRoute.duration <= baseDuration * maxTimeIncrease) {
              if (testRoute.duration < bestDuration) {
                bestPoint = remainingGoodPoints[i]
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

      let finalRoute = null
      let badPointsAvoided = true
      let usedHEREAPI = false

      let avoidBBoxes = []
      if (badPoints.length > 0) {
        avoidBBoxes = badPoints.map(badPoint => {
          return this.createBadPointBBox(badPoint, badPointRadius)
        })
      }

      if (this.hereApiKey && avoidBBoxes.length > 0) {
        try {
          finalRoute = await this.getHERERoute([start, ...waypoints, end], avoidBBoxes)
          usedHEREAPI = true
        } catch (e) {
          console.warn('HERE API 失敗，回退 Mapbox:', e.message)
          finalRoute = await this.getMapboxRoute([start, ...waypoints, end])
        }
      } else {
        finalRoute = await this.getMapboxRoute([start, ...waypoints, end])
      }

      if (!finalRoute) {
        throw new Error('無法計算最終路徑')
      }

      if (badPoints.length > 0) {
        for (const badPoint of badPoints) {
          if (this.routePassesBadPoint(finalRoute.geometry.coordinates, badPoint, badPointRadius)) {
            badPointsAvoided = false
            break
          }
        }
      }

      return {
        success: true,
        route: {
          geometry: finalRoute.geometry,
          distance: finalRoute.distance,
          duration: finalRoute.duration
        },
        info: {
          goodPointsUsed: usedGoodPoints,
          totalGoodPoints: goodPoints.length,
          badPointsAvoided: badPointsAvoided,
          usedHEREAPI: usedHEREAPI,
          avoidAreasCount: avoidBBoxes.length,
          waypointsUsed: waypoints.length,
          waypointsLimit: this.maxWaypoints
        },
        error: null
      }

    } catch (error) {
      console.error('❌ 路徑計算失敗:', error)
      return {
        success: false,
        route: null,
        info: null,
        error: error.message
      }
    }
  }
}

module.exports = RouteGenerator
