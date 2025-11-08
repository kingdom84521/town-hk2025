// 座標轉換工具
const proj4 = require('proj4');

// 定義台灣常用座標系統
// TWD97 (EPSG:3826) - 台灣二度分帶座標系統 (TM2)
// WGS84 (EPSG:4326) - 國際通用經緯度座標系統

// TWD97 TM2 121 定義 (台灣本島常用)
const TWD97_TM2_121 = '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

// WGS84 定義
const WGS84 = 'EPSG:4326';

/**
 * 將 TWD97 座標轉換為 WGS84 (經緯度)
 * @param {number} x - TWD97 X 座標 (橫座標)
 * @param {number} y - TWD97 Y 座標 (縱座標)
 * @returns {{latitude: number, longitude: number}} WGS84 經緯度
 */
function twd97ToWgs84(x, y) {
  try {
    const [longitude, latitude] = proj4(TWD97_TM2_121, WGS84, [x, y]);
    return { latitude, longitude };
  } catch (error) {
    throw new Error(`TWD97 to WGS84 conversion failed: ${error.message}`);
  }
}

/**
 * 將 WGS84 (經緯度) 轉換為 TWD97 座標
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 * @returns {{x: number, y: number}} TWD97 座標
 */
function wgs84ToTwd97(latitude, longitude) {
  try {
    const [x, y] = proj4(WGS84, TWD97_TM2_121, [longitude, latitude]);
    return { x, y };
  } catch (error) {
    throw new Error(`WGS84 to TWD97 conversion failed: ${error.message}`);
  }
}

/**
 * 驗證經緯度是否有效
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 * @returns {boolean}
 */
function isValidWgs84(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * 計算兩點之間的距離 - Haversine formula
 * @param {number} lat1 - 第一點緯度
 * @param {number} lon1 - 第一點經度
 * @param {number} lat2 - 第二點緯度
 * @param {number} lon2 - 第二點經度
 * @param {string} unit - 距離單位 ('km' 或 'm'，預設為 'm')
 * @returns {number} 距離 (公尺或公里)
 */
function calculateDistance(lat1, lon1, lat2, lon2, unit = 'm') {
  const R = 6371; // 地球半徑 (公里)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return unit === 'km' ? distanceKm : distanceKm * 1000; // 預設回傳公尺
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  twd97ToWgs84,
  wgs84ToTwd97,
  isValidWgs84,
  calculateDistance
};
