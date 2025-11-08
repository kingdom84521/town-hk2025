// 地理編碼服務 - 地址轉經緯度
const https = require('https');
const { findLandmark } = require('./taiwanLandmarks');

/**
 * 使用混合策略進行地理編碼
 * 1. 優先從台灣地標資料庫查詢
 * 2. 若找不到，再使用 OpenStreetMap Nominatim API
 * 支援中文地址，會自動加上台灣限定參數以提高準確度
 * @param {string} address - 地址（支援中文）
 * @returns {Promise<{latitude: number, longitude: number, displayName: string}>}
 */
async function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    if (!address || typeof address !== 'string') {
      return reject(new Error('Invalid address'));
    }

    // 預處理地址，移除多餘空格
    const cleanAddress = address.trim();

    // 策略 1: 先從台灣地標資料庫查詢
    const landmark = findLandmark(cleanAddress);
    if (landmark) {
      return resolve({
        latitude: landmark.latitude,
        longitude: landmark.longitude,
        displayName: landmark.address,
        source: 'landmark_db'
      });
    }

    // 策略 2: 使用 OpenStreetMap Nominatim API
    const encodedAddress = encodeURIComponent(cleanAddress);

    // 加上台灣國家碼，提高中文地址的準確度
    // countrycodes=tw 限定在台灣搜尋
    // accept-language=zh-TW 優先使用繁體中文結果
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=tw&limit=3&accept-language=zh-TW`;

    https.get(url, {
      headers: {
        'User-Agent': 'TownHK2025-MapApp/1.0',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const results = JSON.parse(data);

          if (!results || results.length === 0) {
            return reject(new Error('Address not found. Try using landmark names (e.g., 台北101, 台中火車站) or provide coordinates directly.'));
          }

          // 取得第一個結果（最相關的）
          const result = results[0];
          resolve({
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            displayName: result.display_name,
            source: 'nominatim'
          });
        } catch (error) {
          reject(new Error(`Geocoding failed: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Geocoding request failed: ${error.message}`));
    });
  });
}

/**
 * 反向地理編碼 - 將經緯度轉換為地址
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 * @returns {Promise<{address: string, displayName: string}>}
 */
async function reverseGeocode(latitude, longitude) {
  return new Promise((resolve, reject) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return reject(new Error('Invalid coordinates'));
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    https.get(url, {
      headers: {
        'User-Agent': 'TownHK2025-MapApp/1.0'
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (!result || result.error) {
            return reject(new Error('Location not found'));
          }

          resolve({
            address: result.address,
            displayName: result.display_name
          });
        } catch (error) {
          reject(new Error(`Reverse geocoding failed: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Reverse geocoding request failed: ${error.message}`));
    });
  });
}

module.exports = {
  geocodeAddress,
  reverseGeocode
};
