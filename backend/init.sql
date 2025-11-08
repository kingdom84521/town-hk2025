-- 地圖點資訊表
CREATE TABLE IF NOT EXISTS map_points (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- 國際座標 (WGS84)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    -- 地址資訊
    address TEXT,
    -- 安全性標記
    is_safe BOOLEAN NOT NULL DEFAULT true,
    -- 額外資訊
    tags TEXT[], -- 標籤陣列
    metadata JSONB, -- 彈性欄位
    -- 時間戳記
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立地理空間索引（用於快速查詢附近的點）
CREATE INDEX IF NOT EXISTS idx_map_points_location ON map_points (latitude, longitude);

-- 建立安全性索引
CREATE INDEX IF NOT EXISTS idx_map_points_is_safe ON map_points (is_safe);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_map_points_updated_at
    BEFORE UPDATE ON map_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入一些範例資料
INSERT INTO map_points (name, description, latitude, longitude, address, is_safe, tags) VALUES
    ('台北101', '台北地標建築', 25.0339639, 121.5644722, '台北市信義區信義路五段7號', true, ARRAY['地標', '觀光']),
    ('中正紀念堂', '歷史紀念建築', 25.0408578, 121.5180173, '台北市中正區中山南路21號', true, ARRAY['歷史', '觀光']),
    ('測試不安全點', '測試用不安全區域', 25.0500000, 121.5500000, '測試地址', false, ARRAY['測試'])
ON CONFLICT DO NOTHING;
