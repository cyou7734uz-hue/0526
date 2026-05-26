const rainApiUrl = 'https://wic.gov.taipei/OpenData/API/Rain/Get?stationNo=&loginId=open_rain&dataKey=85452C1D';
const coordApiUrl = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0002-001?Authorization=rdec-key-123-45678-011121314';
const proxyUrl = 'https://api.allorigins.win/raw?url=';
const taipeiCounty = '臺北市';

let map;
let markersLayer;

window.addEventListener('load', () => {
  createMap();
  document.getElementById('refreshBtn').addEventListener('click', loadData);
  loadData();
});

function createMap() {
  map = L.map('map').setView([25.0330, 121.5654], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

async function loadData() {
  setStatus('資料載入中，請稍候...');

  try {
    const [rainData, stationData] = await Promise.all([
      fetchRainData(),
      fetchStationCoords()
    ]);

    const taipeiStations = stationData.filter(s => s.GeoInfo?.CountyName === taipeiCounty);

    renderMap(rainData, taipeiStations);
    renderList(rainData, taipeiStations);
    setStatus(`資料已更新：${new Date().toLocaleString()}，臺北市站點 ${taipeiStations.length} 筆`);
  } catch (error) {
    console.error(error);
    setStatus(`載入失敗：${error.message}`);
  }
}

async function fetchRainData() {
  const response = await fetch(proxyUrl + encodeURIComponent(rainApiUrl));
  if (!response.ok) {
    throw new Error(`雨量資料取得失敗（${response.status}）`);
  }

  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchStationCoords() {
  try {
    const response = await fetch(coordApiUrl);
    if (!response.ok) {
      throw new Error(`座標資料取得失敗（${response.status}）`);
    }
    const json = await response.json();
    return Array.isArray(json.records?.Station) ? json.records.Station : [];
  } catch (error) {
    console.warn('直接讀取座標資料失敗，改用代理：', error);
    const response = await fetch(proxyUrl + encodeURIComponent(coordApiUrl));
    if (!response.ok) {
      throw new Error(`座標資料代理取得失敗（${response.status}）`);
    }
    const json = await response.json();
    return Array.isArray(json.records?.Station) ? json.records.Station : [];
  }
}

function renderMap(rainData, stationData) {
  markersLayer.clearLayers();

  const stationByName = new Map();
  stationData.forEach(station => {
    const latlng = getStationLatLng(station);
    if (latlng) {
      stationByName.set(station.StationName, { station, latlng });
    }
  });

  let matchedCount = 0;
  rainData.forEach(item => {
    const match = stationByName.get(item.stationName);
    if (!match) return;

    matchedCount += 1;
    const rainValue = parseFloat(item.rain) || 0;
    const marker = L.circleMarker([match.latlng.lat, match.latlng.lng], {
      radius: Math.max(6, Math.min(18, 6 + rainValue * 0.35)),
      color: '#ff2222',
      fillColor: '#ff2222',
      fillOpacity: 0.85,
      weight: 1
    });

    const tooltip = `<strong>${item.stationName}</strong><br>` +
      `雨量：${item.rain} mm<br>` +
      `更新時間：${formatRecTime(item.recTime)}<br>` +
      `測站編號：${item.stationNo || 'N/A'}<br>` +
      `行政區：${match.station.GeoInfo?.TownName || '未知'}`;

    marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -6], sticky: true });
    marker.addTo(markersLayer);
  });

  if (matchedCount === 0) {
    setStatus('目前無法將任何雨量測站與臺北市座標對應，請檢查資料來源是否一致。');
  }
}

function renderList(rainData, stationData) {
  const listElement = document.getElementById('list');
  const stationByName = new Map(stationData.map(station => [station.StationName, station]));

  const rows = rainData
    .filter(item => stationByName.has(item.stationName))
    .map(item => {
      const station = stationByName.get(item.stationName);
      return {
        name: item.stationName,
        rain: item.rain,
        recTime: item.recTime,
        town: station?.GeoInfo?.TownName || '',
      };
    })
    .sort((a, b) => parseFloat(b.rain) - parseFloat(a.rain) || a.name.localeCompare(b.name));

  listElement.innerHTML = `
    <div class="list-header">臺北市雨量測站清單 (${rows.length})</div>
    <table>
      <thead>
        <tr>
          <th>測站</th>
          <th>雨量</th>
          <th>更新</th>
          <th>區域</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr class="matched">
            <td>${row.name}</td>
            <td>${row.rain} mm</td>
            <td>${formatRecTime(row.recTime)}</td>
            <td>${row.town}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function getStationLatLng(station) {
  const coords = station.GeoInfo?.Coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const wgs = coords.find(c => c.CoordinateName === 'WGS84') || coords[0];
  const lat = parseFloat(wgs.StationLatitude);
  const lng = parseFloat(wgs.StationLongitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function formatRecTime(recTime) {
  if (!recTime || typeof recTime !== 'string') return recTime || '未知';
  if (recTime.length === 12) {
    return `${recTime.slice(0, 4)}/${recTime.slice(4, 6)}/${recTime.slice(6, 8)} ${recTime.slice(8, 10)}:${recTime.slice(10, 12)}`;
  }
  return recTime;
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}
