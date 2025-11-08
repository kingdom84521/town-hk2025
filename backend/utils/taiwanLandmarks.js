// 台灣常見地標座標資料庫
// 當地理編碼 API 無法找到地址時，可以從這裡查詢

const landmarks = {
  // 台北市
  '台北101': { latitude: 25.0339639, longitude: 121.5644722, address: '台北市信義區信義路五段7號' },
  '台北車站': { latitude: 25.0478, longitude: 121.517, address: '台北市中正區北平西路3號' },
  '中正紀念堂': { latitude: 25.0408578, longitude: 121.5180173, address: '台北市中正區中山南路21號' },
  '國立台灣大學': { latitude: 25.0173405, longitude: 121.5397518, address: '台北市大安區羅斯福路四段1號' },
  '台北小巨蛋': { latitude: 25.0517, longitude: 121.5496, address: '台北市松山區南京東路四段2號' },
  '士林夜市': { latitude: 25.0879, longitude: 121.5240, address: '台北市士林區基河路101號' },
  '西門町': { latitude: 25.0422, longitude: 121.5071, address: '台北市萬華區成都路' },
  '陽明山': { latitude: 25.1622, longitude: 121.5491, address: '台北市北投區陽明山' },
  '故宮博物院': { latitude: 25.1024, longitude: 121.5485, address: '台北市士林區至善路二段221號' },
  '龍山寺': { latitude: 25.0369, longitude: 121.4999, address: '台北市萬華區廣州街211號' },

  // 新北市
  '淡水老街': { latitude: 25.1678, longitude: 121.4401, address: '新北市淡水區中正路' },
  '九份老街': { latitude: 25.1093, longitude: 121.8448, address: '新北市瑞芳區基山街' },
  '平溪天燈': { latitude: 25.0259, longitude: 121.7405, address: '新北市平溪區' },
  '烏來溫泉': { latitude: 24.8619, longitude: 121.5494, address: '新北市烏來區' },

  // 桃園市
  '桃園國際機場': { latitude: 25.0797, longitude: 121.2342, address: '桃園市大園區航站南路9號' },
  '中壢夜市': { latitude: 24.9655, longitude: 121.2237, address: '桃園市中壢區中央西路二段' },

  // 台中市
  '台中火車站': { latitude: 24.1369, longitude: 120.6856, address: '台中市中區台灣大道一段1號' },
  '逢甲夜市': { latitude: 24.1791, longitude: 120.6446, address: '台中市西屯區文華路' },
  '高美濕地': { latitude: 24.3126, longitude: 120.5497, address: '台中市清水區高美路' },
  '彩虹眷村': { latitude: 24.1255, longitude: 120.6177, address: '台中市南屯區春安路56巷' },

  // 台南市
  '台南火車站': { latitude: 22.9970, longitude: 120.2127, address: '台南市東區北門路二段4號' },
  '赤崁樓': { latitude: 22.9974, longitude: 120.2025, address: '台南市中西區民族路二段212號' },
  '安平古堡': { latitude: 23.0011, longitude: 120.1608, address: '台南市安平區國勝路82號' },
  '花園夜市': { latitude: 23.0101, longitude: 120.1795, address: '台南市北區海安路三段' },

  // 高雄市
  '高雄火車站': { latitude: 22.6395, longitude: 120.3016, address: '高雄市三民區建國二路318號' },
  '駁二藝術特區': { latitude: 22.6199, longitude: 120.2817, address: '高雄市鹽埕區大勇路1號' },
  '美麗島站': { latitude: 22.6310, longitude: 120.3021, address: '高雄市新興區中山一路115號B1' },
  '六合夜市': { latitude: 22.6314, longitude: 120.3021, address: '高雄市新興區六合二路' },
  '旗津': { latitude: 22.6106, longitude: 120.2685, address: '高雄市旗津區' },
  '蓮池潭': { latitude: 22.6834, longitude: 120.2936, address: '高雄市左營區蓮潭路' },

  // 其他縣市
  '日月潭': { latitude: 23.8667, longitude: 120.9167, address: '南投縣魚池鄉' },
  '阿里山': { latitude: 23.5105, longitude: 120.8027, address: '嘉義縣阿里山鄉' },
  '墾丁': { latitude: 21.9414, longitude: 120.8006, address: '屏東縣恆春鎮墾丁路' },
  '花蓮火車站': { latitude: 23.9933, longitude: 121.6010, address: '花蓮縣花蓮市國聯一路100號' },
  '太魯閣': { latitude: 24.1940, longitude: 121.4911, address: '花蓮縣秀林鄉' },
  '清境農場': { latitude: 24.0458, longitude: 121.1633, address: '南投縣仁愛鄉' },
  '溪頭': { latitude: 23.6706, longitude: 120.7958, address: '南投縣鹿谷鄉' },
};

/**
 * 從地標資料庫中搜尋地址
 * @param {string} address - 地址或地標名稱
 * @returns {object|null} 座標資訊，如果找不到則返回 null
 */
function findLandmark(address) {
  if (!address) return null;

  const cleanAddress = address.trim();

  // 精確匹配
  if (landmarks[cleanAddress]) {
    return landmarks[cleanAddress];
  }

  // 模糊匹配 - 查找包含關鍵字的地標
  const matchedKey = Object.keys(landmarks).find(key =>
    cleanAddress.includes(key) || key.includes(cleanAddress)
  );

  if (matchedKey) {
    return landmarks[matchedKey];
  }

  return null;
}

/**
 * 取得所有地標列表
 * @returns {Array} 地標列表
 */
function getAllLandmarks() {
  return Object.keys(landmarks).map(name => ({
    name,
    ...landmarks[name]
  }));
}

module.exports = {
  findLandmark,
  getAllLandmarks,
  landmarks
};
