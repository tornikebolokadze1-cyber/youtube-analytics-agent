// ============================================================
// AI Pulse Georgia — 2026 Ultra Dashboard
// Powered by: Claude + Gemini + Kimi
// ============================================================

const ACCENT1 = '#7b61ff';
const ACCENT2 = '#00f2ff';
const ACCENT3 = '#ff2d7b';
const ACCENT4 = '#f59e0b';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const GRID = 'rgba(123, 97, 255, 0.06)';
const TEXT = '#6b6b90';
const TOOLTIP_BG = 'rgba(6, 6, 24, 0.95)';

Chart.defaults.color = TEXT;
Chart.defaults.borderColor = GRID;
Chart.defaults.font.family = "'Inter', 'Noto Sans Georgian', sans-serif";

let charts = {};

// ============================================================
// Reveal Animations (data-delay)
// ============================================================
document.querySelectorAll('.reveal').forEach(el => {
  el.style.setProperty('--delay', el.dataset.delay || '0');
});

// ============================================================
// Floating Particles
// ============================================================
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (18 + Math.random() * 25) + 's';
    p.style.animationDelay = (Math.random() * 20) + 's';
    p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
    const size = (1 + Math.random() * 2) + 'px';
    p.style.width = size;
    p.style.height = size;
    container.appendChild(p);
  }
}

// ============================================================
// Counter Animation
// ============================================================
function animateCounter(elementId, targetValue, format) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const formatted = format ? format(targetValue) : String(targetValue);
  if (typeof targetValue !== 'number' || isNaN(targetValue)) { el.textContent = formatted; return; }

  const duration = 1000;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(targetValue * eased);
    el.textContent = format ? format(current) : current.toLocaleString('ka-GE');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ============================================================
// Mini Sparkline
// ============================================================
function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || !data.length) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 50;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = canvas.width / (data.length - 1);
  const pad = 4;

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = pad + (1 - (v - min) / range) * (canvas.height - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Fill gradient
  const last = data.length - 1;
  ctx.lineTo(last * step, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, hexToRgba(color, 0.2));
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();
}

// ============================================================
// Color Helpers
// ============================================================
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================
// Helpers
// ============================================================
function getPeriod() { return document.getElementById('periodSelector').value; }

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('ka-GE');
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function setTrend(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const isUp = value >= 0;
  el.textContent = (isUp ? '\u2191 ' : '\u2193 ') + Math.abs(value).toFixed(1) + '%';
  el.className = 'kpi-trend ' + (isUp ? 'up' : 'down');
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function sanitizeThumbUrl(url) {
  return /^https:\/\/i\.ytimg\.com\//.test(url) ? url : '';
}

async function fetchAPI(endpoint) {
  try {
    const res = await fetch(endpoint);
    if (res.status === 401) { window.location.href = '/login.html'; return null; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Fetch ${endpoint}:`, err);
    return null;
  }
}

function chartTooltip() {
  return { backgroundColor: TOOLTIP_BG, borderColor: 'rgba(123, 97, 255, 0.15)', borderWidth: 1, padding: 12, cornerRadius: 10, titleFont: { weight: '600', size: 12 }, bodyFont: { size: 11 } };
}

// ============================================================
// Widget State Management
// ============================================================
function setWidgetState(sectionId, state, retryFn) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  // Remove any existing overlay
  const existing = section.querySelector('.widget-overlay');
  if (existing) existing.remove();

  if (state === 'ready') return;

  const overlay = document.createElement('div');
  overlay.className = 'widget-overlay';

  if (state === 'loading') {
    overlay.classList.add('widget-loading');
  } else if (state === 'error') {
    overlay.classList.add('widget-error');
    overlay.innerHTML = 'მონაცემები ვერ ჩაიტვირთა';
    if (retryFn) {
      const btn = document.createElement('button');
      btn.className = 'widget-retry';
      btn.textContent = 'სცადეთ თავიდან';
      btn.addEventListener('click', retryFn);
      overlay.appendChild(document.createElement('br'));
      overlay.appendChild(btn);
    }
  } else if (state === 'empty') {
    overlay.textContent = 'მონაცემები არ მოიძებნა';
  }

  section.appendChild(overlay);
}

function engagementClass(rate) {
  if (rate >= 5) return 'engagement-high';
  if (rate >= 2) return 'engagement-mid';
  return 'engagement-low';
}

// ============================================================
// KPI Overview
// ============================================================
async function loadOverview() {
  try {
    const data = await fetchAPI(`/api/overview?period=${getPeriod()}`);
    if (!data) return;

    animateCounter('kpiViews', data.current.views, formatNum);
    animateCounter('kpiWatchTime', data.current.watchTimeHours, formatNum);
    document.getElementById('kpiSubscribers').textContent = (data.current.netSubscribers >= 0 ? '+' : '') + data.current.netSubscribers.toLocaleString('ka-GE');
    document.getElementById('kpiDuration').textContent = formatDuration(data.current.averageViewDuration);
    animateCounter('kpiLikes', data.current.likes, formatNum);
    animateCounter('kpiComments', data.current.comments, formatNum);
    document.getElementById('kpiShares').textContent = formatNum(data.current.shares || 0);

    setTrend('kpiViewsTrend', data.trends.views);
    setTrend('kpiWatchTimeTrend', data.trends.watchTime);
    setTrend('kpiSubscribersTrend', data.trends.subscribers);
    setTrend('kpiDurationTrend', data.trends.avgDuration);
    if (data.trends.likes != null) setTrend('kpiLikesTrend', data.trends.likes);
    if (data.trends.comments != null) setTrend('kpiCommentsTrend', data.trends.comments);
    if (data.trends.shares != null) setTrend('kpiSharesTrend', data.trends.shares);
  } catch (err) {
    console.error('loadOverview:', err);
  }
}

// ============================================================
// Daily Charts (Views, Watch Time, Subscribers)
// ============================================================
let dailyData = null;

async function loadDailyChart() {
  setWidgetState('dailySection', 'loading');
  try {
    dailyData = await fetchAPI(`/api/daily?period=${getPeriod()}`);
    if (!dailyData) { setWidgetState('dailySection', 'error', loadDailyChart); return; }
    if (!dailyData.length) { setWidgetState('dailySection', 'empty'); return; }

    const labels = dailyData.map(d => d.date.substring(5));
    const views = dailyData.map(d => d.views);
    const watchTime = dailyData.map(d => d.watchTimeHours);

    // Sparklines
    drawSparkline('sparkViews', views, ACCENT1);
    drawSparkline('sparkSubs', dailyData.map(d => d.subscribersGained), SUCCESS);

    // Main chart
    if (charts.views) charts.views.destroy();
    const ctx = document.getElementById('viewsChart').getContext('2d');
    const vg = ctx.createLinearGradient(0, 0, 0, 360);
    vg.addColorStop(0, 'rgba(123, 97, 255, 0.2)'); vg.addColorStop(1, 'rgba(123, 97, 255, 0)');
    const wg = ctx.createLinearGradient(0, 0, 0, 360);
    wg.addColorStop(0, 'rgba(0, 242, 255, 0.15)'); wg.addColorStop(1, 'rgba(0, 242, 255, 0)');

    charts.views = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'ნახვები', data: views, borderColor: ACCENT1, backgroundColor: vg, fill: true, tension: 0.4, yAxisID: 'y', pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: ACCENT1, borderWidth: 2 },
          { label: 'ყურების დრო (სთ)', data: watchTime, borderColor: ACCENT2, backgroundColor: wg, fill: true, tension: 0.4, yAxisID: 'y1', pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: ACCENT2, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } }, tooltip: chartTooltip() },
        scales: {
          y: { type: 'linear', position: 'left', grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } },
          y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: TEXT, font: { size: 10 } } },
          x: { grid: { color: 'rgba(123,97,255,0.03)' }, ticks: { color: TEXT, maxRotation: 45, font: { size: 10 } } },
        },
      },
    });
    setWidgetState('dailySection', 'ready');
  } catch (err) {
    console.error('loadDailyChart:', err);
    setWidgetState('dailySection', 'error', loadDailyChart);
  }
}

// ============================================================
// Subscribers Growth Chart
// ============================================================
async function loadSubsChart() {
  try {
    if (!dailyData || !dailyData.length) return;
    if (charts.subs) charts.subs.destroy();

    const labels = dailyData.map(d => d.date.substring(5));
    const gained = dailyData.map(d => d.subscribersGained);

    const ctx = document.getElementById('subsChart').getContext('2d');
    const sg = ctx.createLinearGradient(0, 0, 0, 300);
    sg.addColorStop(0, 'rgba(16, 185, 129, 0.2)'); sg.addColorStop(1, 'rgba(16, 185, 129, 0)');

    charts.subs = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'ახალი გამომწერი', data: gained, backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: SUCCESS, borderWidth: 1, borderRadius: 4, barPercentage: 0.7 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: chartTooltip() },
        scales: {
          y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: TEXT, maxRotation: 45, font: { size: 10 } } },
        },
      },
    });
  } catch (err) {
    console.error('loadSubsChart:', err);
  }
}

// ============================================================
// Monthly Historical Chart
// ============================================================
async function loadMonthlyChart() {
  try {
    const data = await fetchAPI('/api/daily?period=365');
    if (!data || !data.length) return;
    if (charts.monthly) charts.monthly.destroy();

    // Aggregate by month
    const byMonth = new Map();
    for (const d of data) {
      const key = d.date.substring(0, 7);
      const e = byMonth.get(key) || { views: 0, watchHours: 0, subs: 0 };
      e.views += d.views;
      e.watchHours += d.watchTimeHours;
      e.subs += d.subscribersGained;
      byMonth.set(key, e);
    }

    const months = [...byMonth.keys()].sort();
    const monthNames = { '01': 'იან', '02': 'თებ', '03': 'მარ', '04': 'აპრ', '05': 'მაი', '06': 'ივნ', '07': 'ივლ', '08': 'აგვ', '09': 'სექ', '10': 'ოქტ', '11': 'ნოე', '12': 'დეკ' };
    const labels = months.map(m => { const [y, mo] = m.split('-'); return (monthNames[mo] || mo) + ' ' + y.substring(2); });
    const viewsData = months.map(m => byMonth.get(m).views);
    const subsData = months.map(m => byMonth.get(m).subs);
    const watchData = months.map(m => Math.round(byMonth.get(m).watchHours));

    charts.monthly = new Chart(document.getElementById('monthlyChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'ნახვები', data: viewsData, backgroundColor: ACCENT1 + '80', borderColor: ACCENT1, borderWidth: 1, borderRadius: 6, yAxisID: 'y', order: 2 },
          { label: 'გამომწერები', data: subsData, backgroundColor: SUCCESS + '80', borderColor: SUCCESS, borderWidth: 1, borderRadius: 6, yAxisID: 'y', order: 3 },
          { label: 'ყურება (სთ)', data: watchData, type: 'line', borderColor: ACCENT2, backgroundColor: 'transparent', tension: 0.4, pointRadius: 4, pointBackgroundColor: ACCENT2, borderWidth: 2.5, yAxisID: 'y1', order: 1 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: chartTooltip() },
        scales: {
          y: { type: 'linear', position: 'left', grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } },
          y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: TEXT, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } },
        },
      },
    });
  } catch (err) {
    console.error('loadMonthlyChart:', err);
  }
}

// ============================================================
// Trends Grid
// ============================================================
async function loadTrends() {
  setWidgetState('trendsSection', 'loading');
  try {
    const data = await fetchAPI(`/api/trends?period=${getPeriod()}`);
    if (!data) { setWidgetState('trendsSection', 'error', loadTrends); return; }
    if (!data.length) { setWidgetState('trendsSection', 'empty'); return; }

    document.getElementById('trendsGrid').innerHTML = data.map((t, i) => {
      const arrow = t.direction === 'up' ? '\u2191' : t.direction === 'down' ? '\u2193' : '\u2192';
      const cls = t.direction === 'up' ? 'up' : t.direction === 'down' ? 'down' : '';
      return `<div class="trend-item" style="animation: revealUp 0.5s ${0.06 * i}s both">
        <div class="trend-label">${escapeHtml(t.metric)}</div>
        <div class="trend-value">${formatNum(t.current)}</div>
        <div class="trend-change ${cls}">${arrow} ${Math.abs(t.changePercent)}%</div>
      </div>`;
    }).join('');
    setWidgetState('trendsSection', 'ready');
  } catch (err) {
    console.error('loadTrends:', err);
    setWidgetState('trendsSection', 'error', loadTrends);
  }
}

// ============================================================
// Top Videos
// ============================================================
async function loadVideos() {
  try {
    const filter = document.getElementById('videoTypeFilter')?.value || 'all';

    // Use extended videos if available (for type badges & filtering)
    if (extendedVideos && extendedVideos.length) {
      let videos = [...extendedVideos];
      if (filter === 'shorts') videos = videos.filter(v => v.isShort);
      else if (filter === 'long') videos = videos.filter(v => !v.isShort);

      const top = videos.sort((a, b) => b.views - a.views).slice(0, 50);
      document.getElementById('videosBody').innerHTML = top.map((v, i) => {
        const title = escapeHtml(v.title.length > 35 ? v.title.substring(0, 32) + '...' : v.title);
        const ec = engagementClass(v.engagementRate);
        const typeBadge = v.isShort
          ? '<span class="type-badge type-short">S</span>'
          : '<span class="type-badge type-long">V</span>';
        return `<tr style="animation: revealUp 0.35s ${0.04 * i}s both">
          <td class="rank">${i + 1}</td>
          <td class="video-title" title="${escapeHtml(v.title)}">${typeBadge}${title}</td>
          <td>${formatNum(v.views)}</td>
          <td>${v.watchTimeHours}სთ</td>
          <td><span class="engagement-badge ${ec}">${(v.engagementRate ?? 0).toFixed(1)}%</span></td>
        </tr>`;
      }).join('');
      return;
    }

    // Fallback to basic API
    const data = await fetchAPI(`/api/videos?limit=50&sort=views&period=${getPeriod()}`);
    if (!data || !data.length) return;

    document.getElementById('videosBody').innerHTML = data.map((v, i) => {
      const title = escapeHtml(v.title.length > 35 ? v.title.substring(0, 32) + '...' : v.title);
      const ec = engagementClass(v.engagementRate);
      return `<tr style="animation: revealUp 0.35s ${0.04 * i}s both">
        <td class="rank">${i + 1}</td>
        <td class="video-title" title="${escapeHtml(v.title)}">${title}</td>
        <td>${formatNum(v.views)}</td>
        <td>${v.watchTimeHours}სთ</td>
        <td><span class="engagement-badge ${ec}">${(v.engagementRate ?? 0).toFixed(1)}%</span></td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('loadVideos:', err);
  }
}

// ============================================================
// Traffic Sources
// ============================================================
const TRAFFIC_LABELS = {
  'ADVERTISING': 'რეკლამა',
  'ANNOTATION': 'ანოტაცია',
  'CAMPAIGN_CARD': 'კამპანიის ბარათი',
  'END_SCREEN': 'ბოლო ეკრანი',
  'EXT_URL': 'გარე ბმული',
  'NOTIFICATION': 'შეტყობინება',
  'NO_LINK_EMBEDDED': 'ჩაშენებული',
  'NO_LINK_OTHER': 'სხვა (პირდაპირი)',
  'PLAYLIST': 'პლეილისტი',
  'PROMOTED': 'პრომოტირებული',
  'RELATED_VIDEO': 'რეკომენდაცია',
  'SUBSCRIBER': 'გამომწერი',
  'YT_CHANNEL': 'არხის გვერდი',
  'YT_OTHER_PAGE': 'YouTube სხვა',
  'YT_PLAYLIST_PAGE': 'პლეილისტის გვ.',
  'YT_SEARCH': 'YouTube ძებნა',
};

async function loadTraffic() {
  try {
    const data = await fetchAPI(`/api/traffic?period=${getPeriod()}`);
    if (!data || !data.length) return;
    if (charts.traffic) charts.traffic.destroy();

    const colors = [ACCENT1, ACCENT2, ACCENT3, '#a78bfa', '#818cf8', '#6d28d9', '#4f46e5'];
    const trafficCanvas = document.getElementById('trafficChart');
    charts.traffic = new Chart(trafficCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.map(d => TRAFFIC_LABELS[d.source] || d.source),
        datasets: [{ data: data.map(d => d.views), backgroundColor: data.map((_, i) => colors[i % colors.length]), borderRadius: 6, barThickness: 16 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        onClick: async (_e, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const sourceType = data[idx].source;
          const detailEl = document.getElementById('trafficDetail');
          detailEl.style.display = 'block';
          detailEl.innerHTML = '<div class="widget-overlay widget-loading"></div>';
          const detail = await fetchAPI(`/api/traffic-detail/${sourceType}?period=${getPeriod()}`);
          if (!detail || !detail.length) { detailEl.innerHTML = '<div class="traffic-detail"><em>დეტალები არ მოიძებნა</em></div>'; return; }
          detailEl.innerHTML = `<div class="traffic-detail"><strong>${TRAFFIC_LABELS[sourceType] || sourceType} — დეტალები:</strong>${detail.slice(0, 10).map(d =>
            `<div class="traffic-detail-item"><span class="traffic-detail-name" title="${escapeHtml(d.detail)}">${escapeHtml(d.detail)}</span><span class="traffic-detail-views">${formatNum(d.views)} (${d.percentage}%)</span></div>`
          ).join('')}</div>`;
        },
        plugins: { legend: { display: false }, tooltip: { ...chartTooltip(), callbacks: { label: (item) => `${formatNum(item.raw)} (${data[item.dataIndex].percentage}%) — დააკლიკეთ დეტალებისთვის` } } },
        scales: { x: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } } },
      },
    });
    document.getElementById('trafficDetail').style.display = 'none';
  } catch (err) {
    console.error('loadTraffic:', err);
  }
}

// ============================================================
// Search Terms
// ============================================================
async function loadSearchTerms() {
  try {
    const data = await fetchAPI(`/api/search-terms?period=${getPeriod()}`);
    if (!data || !data.length) return;
    document.getElementById('searchList').innerHTML = data.slice(0, 10).map((t, i) =>
      `<li style="animation: revealUp 0.3s ${0.04 * i}s both"><span class="term">"${escapeHtml(t.term)}"</span><span class="count">${formatNum(t.views)}</span></li>`
    ).join('');
  } catch (err) {
    console.error('loadSearchTerms:', err);
  }
}

// ============================================================
// Demographics
// ============================================================
async function loadDemographics() {
  try {
    const data = await fetchAPI(`/api/demographics?period=${getPeriod()}`);
    if (!data || !data.length) return;
    if (charts.demographics) charts.demographics.destroy();

    const ageGroups = [...new Set(data.map(d => d.ageGroup))].sort();
    const maleData = ageGroups.map(age => (data.find(d => d.ageGroup === age && d.gender === 'male') || {}).viewerPercentage || 0);
    const femaleData = ageGroups.map(age => (data.find(d => d.ageGroup === age && d.gender === 'female') || {}).viewerPercentage || 0);

    charts.demographics = new Chart(document.getElementById('demographicsChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ageGroups,
        datasets: [
          { label: 'მამრობითი', data: maleData, backgroundColor: ACCENT1 + 'b0', borderRadius: 5, barPercentage: 0.65 },
          { label: 'მდედრობითი', data: femaleData, backgroundColor: ACCENT3 + 'b0', borderRadius: 5, barPercentage: 0.65 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: { ...chartTooltip(), callbacks: { label: (item) => `${item.dataset.label}: ${item.raw.toFixed(1)}%` } } },
        scales: { x: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } }, y: { grid: { color: GRID }, ticks: { color: TEXT, callback: v => v + '%', font: { size: 10 } } } },
      },
    });
  } catch (err) {
    console.error('loadDemographics:', err);
  }
}

// ============================================================
// Geography
// ============================================================
async function loadGeography() {
  try {
    const data = await fetchAPI(`/api/geography?period=${getPeriod()}`);
    if (!data || !data.length) return;
    if (charts.geography) charts.geography.destroy();

    const top = data.slice(0, 10);
    const grad = top.map((_, i) => `hsl(${260 - i * 6}, ${70 + i * 2}%, ${58 - i * 2}%)`);

    charts.geography = new Chart(document.getElementById('geographyChart').getContext('2d'), {
      type: 'bar',
      data: { labels: top.map(d => d.country), datasets: [{ data: top.map(d => d.views), backgroundColor: grad, borderRadius: 6, barThickness: 18 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { ...chartTooltip(), callbacks: { label: (item) => `${formatNum(item.raw)} (${top[item.dataIndex].percentage}%)` } } },
        scales: { x: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } } },
      },
    });
  } catch (err) {
    console.error('loadGeography:', err);
  }
}

// ============================================================
// Devices + OS + Playback Locations
// ============================================================
const DONUT_COLORS = [ACCENT1, ACCENT2, SUCCESS, ACCENT4, ACCENT3, '#06b6d4', '#ec4899', '#8b5cf6'];

function donutOpts(tooltipCb) {
  return {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { position: 'right', labels: { padding: 10, usePointStyle: true, font: { size: 11 } } },
      tooltip: { ...chartTooltip(), callbacks: { label: tooltipCb } },
    },
  };
}

const OS_LABELS = {
  'ANDROID': 'Android',
  'IOS': 'iOS',
  'WINDOWS': 'Windows',
  'MACINTOSH': 'macOS',
  'LINUX': 'Linux',
  'CHROMECAST': 'Chromecast',
  'FIRE_TV': 'Fire TV',
  'GAME_CONSOLE': 'კონსოლი',
  'KAIOS': 'KaiOS',
  'NINTENDO_SWITCH': 'Nintendo Switch',
  'PLAYSTATION': 'PlayStation',
  'ROKU': 'Roku',
  'TIZEN': 'Tizen (Samsung TV)',
  'WEBOS': 'WebOS (LG TV)',
  'XBOX': 'Xbox',
};

async function loadDevices() {
  try {
    const data = await fetchAPI(`/api/devices?period=${getPeriod()}`);
    if (!data) return;

    if (data.devices && data.devices.length) {
      if (charts.devices) charts.devices.destroy();
      charts.devices = new Chart(document.getElementById('devicesChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: data.devices.map(d => d.deviceType), datasets: [{ data: data.devices.map(d => d.views), backgroundColor: DONUT_COLORS, borderWidth: 0, hoverOffset: 8 }] },
        options: donutOpts((item) => `${item.label}: ${formatNum(item.raw)} (${data.devices[item.dataIndex].percentage}%)`),
      });
    }

    if (data.os && data.os.length) {
      if (charts.os) charts.os.destroy();
      charts.os = new Chart(document.getElementById('osChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: data.os.map(d => OS_LABELS[d.operatingSystem] || d.operatingSystem), datasets: [{ data: data.os.map(d => d.views), backgroundColor: DONUT_COLORS, borderWidth: 0, hoverOffset: 8 }] },
        options: donutOpts((item) => `${item.label}: ${formatNum(item.raw)} (${data.os[item.dataIndex].percentage}%)`),
      });
    }
  } catch (err) {
    console.error('loadDevices:', err);
  }
}

// ============================================================
// Playback Locations
// ============================================================
async function loadPlaybackLocations() {
  try {
    const data = await fetchAPI('/api/playback-locations');
    if (!data || !data.length) return;
    if (charts.playback) charts.playback.destroy();

    charts.playback = new Chart(document.getElementById('playbackChart').getContext('2d'), {
      type: 'doughnut',
      data: { labels: data.map(d => d.location), datasets: [{ data: data.map(d => d.views), backgroundColor: DONUT_COLORS, borderWidth: 0, hoverOffset: 8 }] },
      options: donutOpts((item) => `${item.label}: ${formatNum(item.raw)} (${data[item.dataIndex].percentage}%)`),
    });
  } catch (err) {
    console.error('loadPlaybackLocations:', err);
  }
}

// ============================================================
// Subscriber Sources
// ============================================================
async function loadSubSources() {
  try {
    const data = await fetchAPI('/api/subscriber-sources');
    if (!data || !data.length) return;
    if (charts.subSources) charts.subSources.destroy();

    const labels = data.map(d => d.status);
    const gained = data.map(d => d.subscribersGained);
    const lost = data.map(d => d.subscribersLost);

    charts.subSources = new Chart(document.getElementById('subSourcesChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'მოპოვებული', data: gained, backgroundColor: SUCCESS + '90', borderRadius: 5, barPercentage: 0.6 },
          { label: 'დაკარგული', data: lost, backgroundColor: DANGER + '90', borderRadius: 5, barPercentage: 0.6 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: chartTooltip() },
        scales: { x: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } }, y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } } },
      },
    });
  } catch (err) {
    console.error('loadSubSources:', err);
  }
}

// ============================================================
// Engagement Over Time
// ============================================================
async function loadEngagement() {
  try {
    if (!dailyData || !dailyData.length) return;
    if (charts.engagement) charts.engagement.destroy();

    const labels = dailyData.map(d => d.date.substring(5));

    charts.engagement = new Chart(document.getElementById('engagementChart').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'მოწონება', data: dailyData.map(d => d.likes), borderColor: ACCENT3, backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
          { label: 'კომენტარი', data: dailyData.map(d => d.comments || 0), borderColor: ACCENT4, backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
          { label: 'გაზიარება', data: dailyData.map(d => d.shares || 0), borderColor: ACCENT2, backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: chartTooltip() },
        scales: {
          y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: TEXT, maxRotation: 45, font: { size: 10 } } },
        },
      },
    });
  } catch (err) {
    console.error('loadEngagement:', err);
  }
}

// ============================================================
// Content Performance Funnel
// ============================================================
async function loadFunnel() {
  setWidgetState('funnelSection', 'loading');
  try {
    const data = await fetchAPI(`/api/overview?period=${getPeriod()}`);
    if (!data || !data.current) { setWidgetState('funnelSection', data === null ? 'error' : 'empty', loadFunnel); return; }

    const views = data.current.views;
    const avgDuration = data.current.averageViewDuration;
    const subs = data.current.subscribersGained || 0;
    // Estimate engaged views: fraction of viewers who watched meaningfully
    // Use avgDuration relative to a 4-minute content benchmark
    const benchmarkSeconds = 240;
    const engagementRatio = Math.min(0.85, Math.max(0.15, avgDuration / benchmarkSeconds));
    const engaged = Math.round(views * engagementRatio);
    const estImpressions = Math.round(views / 0.05); // assume ~5% CTR

    document.getElementById('funnelImpressions').textContent = formatNum(estImpressions);
    document.getElementById('funnelViews').textContent = formatNum(views);
    document.getElementById('funnelEngaged').textContent = formatNum(engaged);
    document.getElementById('funnelSubs').textContent = formatNum(subs);

    const ctr = estImpressions > 0 ? ((views / estImpressions) * 100).toFixed(1) + '%' : '—';
    const engRate = views > 0 ? ((engaged / views) * 100).toFixed(1) + '%' : '—';
    const subRate = engaged > 0 ? ((subs / engaged) * 100).toFixed(2) + '%' : '—';

    document.getElementById('funnelCTR').textContent = ctr;
    document.getElementById('funnelEngageRate').textContent = engRate;
    document.getElementById('funnelSubRate').textContent = subRate;
    setWidgetState('funnelSection', 'ready');
  } catch (err) {
    console.error('loadFunnel:', err);
    setWidgetState('funnelSection', 'error', loadFunnel);
  }
}

// ============================================================
// Extended Videos Data (shared)
// ============================================================
let extendedVideos = null;

async function loadExtendedVideos() {
  extendedVideos = await fetchAPI(`/api/videos-extended?period=${getPeriod()}&limit=200`);
  return extendedVideos;
}

// ============================================================
// Video Performance Scorecard
// ============================================================
async function loadScorecard() {
  if (!extendedVideos || !extendedVideos.length) { setWidgetState('scorecardSection', 'empty'); return; }
  setWidgetState('scorecardSection', 'loading');
  try {
    const typeFilter = document.getElementById('scorecardType')?.value || 'all';
    const sortBy = document.getElementById('scorecardSort').value;
    let sorted = [...extendedVideos];
    if (typeFilter === 'shorts') sorted = sorted.filter(v => v.isShort);
    else if (typeFilter === 'long') sorted = sorted.filter(v => !v.isShort);
    if (sortBy === 'engagement') sorted.sort((a, b) => b.engagementRate - a.engagementRate);
    else if (sortBy === 'watchtime') sorted.sort((a, b) => b.watchTimeHours - a.watchTimeHours);
    else if (sortBy === 'recent') sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    else sorted.sort((a, b) => b.views - a.views);

    const top = sorted.slice(0, 50);
    document.getElementById('scorecardGrid').innerHTML = top.map((v, i) => {
      const engClass = v.engagementRate >= 8 ? 'engagement-high' : v.engagementRate >= 4 ? 'engagement-mid' : 'engagement-low';
      const durMin = Math.floor((v.durationSeconds || 0) / 60);
      const durSec = (v.durationSeconds || 0) % 60;
      const durStr = durMin + ':' + String(durSec).padStart(2, '0');
      const pubDate = v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('ka-GE') : '';
      const typeBadge = v.isShort ? '<span class="scorecard-metric badge-short">Short</span>' : '<span class="scorecard-metric badge-long">Video</span>';

      return `<div class="scorecard-item" style="animation: revealUp 0.35s ${0.05 * i}s both">
        <img class="scorecard-thumb" src="${sanitizeThumbUrl(v.thumbnailUrl)}" alt="" loading="lazy">
        <div class="scorecard-info">
          <div class="scorecard-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</div>
          <div class="scorecard-meta">${pubDate} &bull; ${durStr}</div>
          <div class="scorecard-metrics">
            ${typeBadge}
            <span class="scorecard-metric">${formatNum(v.views)} ნახვა</span>
            <span class="scorecard-metric">${v.watchTimeHours}სთ</span>
            <span class="scorecard-metric ${engClass}">${(v.engagementRate ?? 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll('#scorecardGrid .scorecard-thumb').forEach(img => {
      img.addEventListener('error', () => { img.style.display = 'none'; });
    });
    setWidgetState('scorecardSection', 'ready');
  } catch (err) {
    console.error('loadScorecard:', err);
    setWidgetState('scorecardSection', 'error', loadScorecard);
  }
}

// ============================================================
// Audience Retention Deep Dive
// ============================================================
async function populateRetentionDropdown() {
  if (!extendedVideos || !extendedVideos.length) return;
  const sel = document.getElementById('retentionVideoSelect');
  const existing = sel.options.length;
  if (existing > 1) return; // already populated

  extendedVideos.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.videoId;
    opt.textContent = v.title.length > 50 ? v.title.substring(0, 47) + '...' : v.title;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', loadRetention);
}

async function loadRetention() {
  const videoId = document.getElementById('retentionVideoSelect').value;
  if (!videoId) return;
  setWidgetState('retentionSection', 'loading');
  try {
  const data = await fetchAPI(`/api/retention/${videoId}`);
  if (!data) { setWidgetState('retentionSection', 'error', loadRetention); return; }
  if (!data.retention || !data.retention.length) { setWidgetState('retentionSection', 'empty'); return; }

  if (charts.retention) charts.retention.destroy();
  const labels = data.retention.map(r => Math.round(r.elapsedRatio * 100) + '%');
  const values = data.retention.map(r => r.watchRatio);

  const ctx = document.getElementById('retentionChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 280);
  grad.addColorStop(0, 'rgba(0, 242, 255, 0.2)');
  grad.addColorStop(1, 'rgba(0, 242, 255, 0)');

  charts.retention = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Watch Ratio', data: values, borderColor: ACCENT2, backgroundColor: grad, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...chartTooltip(), callbacks: { label: (item) => `${(item.raw * 100).toFixed(1)}%` } } },
      scales: { y: { min: 0, max: 1, grid: { color: GRID }, ticks: { color: TEXT, callback: v => (v * 100) + '%', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: TEXT, maxRotation: 0, maxTicksLimit: 10, font: { size: 10 } } } },
    },
  });

  // Calculate retention stats
  const hookIdx = data.retention.findIndex(r => r.elapsedRatio >= 0.1);
  const hookVal = hookIdx >= 0 ? data.retention[hookIdx].watchRatio : 0;
  document.getElementById('retHook').textContent = (hookVal * 100).toFixed(1) + '%';

  const endIdx = data.retention.findIndex(r => r.elapsedRatio >= 0.9);
  const endVal = endIdx >= 0 ? data.retention[endIdx].watchRatio : 0;
  document.getElementById('retEnd').textContent = (endVal * 100).toFixed(1) + '%';

  // Find biggest drop in middle 60%
  let maxDrop = 0;
  for (let i = 1; i < values.length; i++) {
    const ratio = data.retention[i].elapsedRatio;
    if (ratio >= 0.2 && ratio <= 0.8) {
      const drop = values[i - 1] - values[i];
      if (drop > maxDrop) maxDrop = drop;
    }
  }
  document.getElementById('retMidDrop').textContent = (maxDrop * 100).toFixed(1) + '%';

  const rating = hookVal > 0.7 && endVal > 0.3 ? 'Strong' : hookVal > 0.5 && endVal > 0.15 ? 'Average' : 'Weak';
  const ratingEl = document.getElementById('retRating');
  ratingEl.textContent = rating;
  ratingEl.style.color = rating === 'Strong' ? SUCCESS : rating === 'Average' ? ACCENT4 : DANGER;
  setWidgetState('retentionSection', 'ready');
  } catch (err) {
    console.error('loadRetention:', err);
    setWidgetState('retentionSection', 'error', loadRetention);
  }
}

// ============================================================
// Shorts vs Long-form
// ============================================================
async function loadShortsComparison() {
  if (!extendedVideos || !extendedVideos.length) { setWidgetState('shortsSection', 'empty'); return; }
  setWidgetState('shortsSection', 'loading');
  try {
  const shorts = extendedVideos.filter(v => v.isShort);
  const longform = extendedVideos.filter(v => !v.isShort);

  function calcMetrics(vids) {
    const count = vids.length;
    const totalViews = vids.reduce((s, v) => s + v.views, 0);
    const totalWH = vids.reduce((s, v) => s + v.watchTimeHours, 0);
    const totalEng = vids.reduce((s, v) => s + v.engagementRate, 0);
    return {
      count,
      totalViews,
      avgViews: count > 0 ? Math.round(totalViews / count) : 0,
      totalWatchTime: Math.round(totalWH * 10) / 10,
      avgEngagement: count > 0 ? Math.round((totalEng / count) * 10) / 10 : 0,
    };
  }

  const sm = calcMetrics(shorts);
  const lm = calcMetrics(longform);

  function renderMetrics(data) {
    return `
      <div class="shorts-metric-row"><span class="shorts-metric-label">ვიდეო რაოდენობა</span><span class="shorts-metric-value">${data.count}</span></div>
      <div class="shorts-metric-row"><span class="shorts-metric-label">ჯამ. ნახვები</span><span class="shorts-metric-value">${formatNum(data.totalViews)}</span></div>
      <div class="shorts-metric-row"><span class="shorts-metric-label">საშ. ნახვები</span><span class="shorts-metric-value">${formatNum(data.avgViews)}</span></div>
      <div class="shorts-metric-row"><span class="shorts-metric-label">ყურების დრო</span><span class="shorts-metric-value">${data.totalWatchTime}სთ</span></div>
      <div class="shorts-metric-row"><span class="shorts-metric-label">საშ. ჩართულობა</span><span class="shorts-metric-value">${data.avgEngagement}%</span></div>
    `;
  }

  document.getElementById('shortsMetrics').innerHTML = renderMetrics(sm);
  document.getElementById('longformMetrics').innerHTML = renderMetrics(lm);

  // Normalize each metric so the larger value = 100%
  function normPair(a, b) { const mx = Math.max(a, b, 1); return [Math.round(a / mx * 100), Math.round(b / mx * 100)]; }
  const [sViews, lViews] = normPair(sm.totalViews, lm.totalViews);
  const [sAvg, lAvg] = normPair(sm.avgViews, lm.avgViews);
  const [sWT, lWT] = normPair(sm.totalWatchTime, lm.totalWatchTime);
  const [sEng, lEng] = normPair(sm.avgEngagement, lm.avgEngagement);

  // Chart
  if (charts.shorts) charts.shorts.destroy();
  charts.shorts = new Chart(document.getElementById('shortsChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['ნახვები', 'საშ. ნახვა', 'ყურება (სთ)', 'ჩართულობა %'],
      datasets: [
        { label: 'Shorts', data: [sViews, sAvg, sWT, sEng], backgroundColor: ACCENT3 + '90', borderRadius: 6, barPercentage: 0.5 },
        { label: 'Long-form', data: [lViews, lAvg, lWT, lEng], backgroundColor: ACCENT1 + '90', borderRadius: 6, barPercentage: 0.5 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: { ...chartTooltip(), callbacks: { label: (item) => `${item.dataset.label}: ${item.raw}%` } } },
      scales: { x: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } }, y: { max: 100, grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 }, callback: v => v + '%' } } },
    },
  });
  setWidgetState('shortsSection', 'ready');
  } catch (err) {
    console.error('loadShortsComparison:', err);
    setWidgetState('shortsSection', 'error', loadShortsComparison);
  }
}

// ============================================================
// Growth Velocity
// ============================================================
async function loadVelocity() {
  setWidgetState('velocitySection', 'loading');
  try {
  const data = await fetchAPI(`/api/velocity?period=90`);
  if (!data) { setWidgetState('velocitySection', 'error', loadVelocity); return; }
  if (!data.length) { setWidgetState('velocitySection', 'empty'); return; }

  const labels = data.map(d => d.date.substring(5));

  // Calculate 7-day moving average
  function movingAvg(arr, window) {
    return arr.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = arr.slice(start, i + 1);
      return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 10) / 10;
    });
  }

  const netSubs = data.map(d => d.netSubscribers);
  const views = data.map(d => d.views);
  const subsMA = movingAvg(netSubs, 7);
  const viewsMA = movingAvg(views, 7);

  // Traffic light
  const last7 = subsMA.slice(-7);
  const prev7 = subsMA.slice(-14, -7);
  const last7Avg = last7.reduce((s, v) => s + v, 0) / 7;
  const prev7Avg = prev7.length >= 7 ? prev7.reduce((s, v) => s + v, 0) / 7 : last7Avg;
  const accel = prev7Avg > 0 ? ((last7Avg - prev7Avg) / prev7Avg) * 100 : 0;

  const indEl = document.getElementById('velocityIndicators');
  if (accel > 10) {
    indEl.innerHTML = '<span class="velocity-light accelerating">&#x1F7E2; აჩქარება +'+ Math.round(accel) +'%</span>';
  } else if (accel < -10) {
    indEl.innerHTML = '<span class="velocity-light decelerating">&#x1F534; შენელება '+ Math.round(accel) +'%</span>';
  } else {
    indEl.innerHTML = '<span class="velocity-light stable">&#x1F7E1; სტაბილური</span>';
  }

  // Subscriber velocity chart
  if (charts.velocitySubs) charts.velocitySubs.destroy();
  charts.velocitySubs = new Chart(document.getElementById('velocitySubsChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'წმინდა გამომწერი', data: netSubs, backgroundColor: netSubs.map(v => v >= 0 ? SUCCESS + '50' : DANGER + '50'), borderRadius: 3, barPercentage: 0.6, order: 2 },
        { label: '7-დღიანი საშუალო', data: subsMA, type: 'line', borderColor: SUCCESS, backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, borderWidth: 2, order: 1 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 10, font: { size: 10 } } }, tooltip: chartTooltip() },
      scales: { y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 9 } } }, x: { grid: { display: false }, ticks: { color: TEXT, maxRotation: 45, maxTicksLimit: 15, font: { size: 9 } } } },
    },
  });

  // Views velocity chart
  if (charts.velocityViews) charts.velocityViews.destroy();
  charts.velocityViews = new Chart(document.getElementById('velocityViewsChart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'დღიური ნახვები', data: views, borderColor: ACCENT1 + '60', backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, borderWidth: 1 },
        { label: '7-დღიანი საშუალო', data: viewsMA, borderColor: ACCENT1, backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, borderWidth: 2.5 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 10, font: { size: 10 } } }, tooltip: chartTooltip() },
      scales: { y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 9 } } }, x: { grid: { display: false }, ticks: { color: TEXT, maxRotation: 45, maxTicksLimit: 15, font: { size: 9 } } } },
    },
  });

  // Milestone prediction — use real subscriber baseline from channel info
  const predEl = document.getElementById('velocityPrediction');
  const channelInfo = await fetchAPI('/api/channel-info');
  if (channelInfo && channelInfo.subscriberCount > 0 && last7Avg > 0) {
    const currentSubs = channelInfo.subscriberCount;
    const milestones = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];
    const target = milestones.find(m => m > currentSubs) || currentSubs + 50000;
    const daysToTarget = Math.ceil((target - currentSubs) / last7Avg);
    if (daysToTarget > 0 && daysToTarget < 3650) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysToTarget);
      predEl.textContent = `${formatNum(currentSubs)} გამომწერი — ამ ტემპით ${formatNum(target)} სავარაუდოდ: ${targetDate.toLocaleDateString('ka-GE')}`;
    } else {
      predEl.textContent = '';
    }
  } else {
    predEl.textContent = '';
  }
  setWidgetState('velocitySection', 'ready');
  } catch (err) {
    console.error('loadVelocity:', err);
    setWidgetState('velocitySection', 'error', loadVelocity);
  }
}

// ============================================================
// Content Topic Analysis
// ============================================================
async function loadTopics() {
  setWidgetState('topicsSection', 'loading');
  try {
  const data = await fetchAPI('/api/topics');
  if (!data) { setWidgetState('topicsSection', 'error', loadTopics); return; }
  if (!data.length) { setWidgetState('topicsSection', 'empty'); return; }

  const top = data.slice(0, 15);

  if (charts.topics) charts.topics.destroy();
  charts.topics = new Chart(document.getElementById('topicsChart').getContext('2d'), {
    type: 'bubble',
    data: {
      datasets: top.map((t, i) => ({
        label: t.topic,
        data: [{ x: t.avgViews, y: t.avgEngagement, r: Math.max(6, Math.min(30, t.videoCount * 5)) }],
        backgroundColor: [ACCENT1, ACCENT2, ACCENT3, SUCCESS, ACCENT4, '#a78bfa', '#818cf8', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#e879f9', '#6366f1', '#22d3ee'][i % 15] + '80',
        borderColor: 'transparent',
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...chartTooltip(), callbacks: { label: (item) => `${item.dataset.label}: ${formatNum(item.raw.x)} ნახვა, ${item.raw.y}% ჩართ., ${data[item.datasetIndex].videoCount} ვიდეო` } },
      },
      scales: {
        x: { title: { display: true, text: 'საშ. ნახვები', color: TEXT, font: { size: 10 } }, grid: { color: GRID }, ticks: { color: TEXT, font: { size: 9 } } },
        y: { title: { display: true, text: 'საშ. ჩართულობა %', color: TEXT, font: { size: 10 } }, grid: { color: GRID }, ticks: { color: TEXT, font: { size: 9 } } },
      },
    },
  });

  // Top 5 topic cards
  document.getElementById('topicsCards').innerHTML = data.slice(0, 5).map((t, i) =>
    `<div class="topic-card" style="animation: revealUp 0.3s ${0.06 * i}s both">
      <div class="topic-card-name">${escapeHtml(t.topic)}</div>
      <div class="topic-card-stat">${t.videoCount} ვიდეო &bull; ${formatNum(t.totalViews)} ნახვა</div>
      <div class="topic-card-stat">${t.avgEngagement}% ჩართ. &bull; ${t.totalWatchTimeHours}სთ</div>
    </div>`
  ).join('');
  setWidgetState('topicsSection', 'ready');
  } catch (err) {
    console.error('loadTopics:', err);
    setWidgetState('topicsSection', 'error', loadTopics);
  }
}

// ============================================================
// Viewer Loyalty
// ============================================================
async function loadLoyalty() {
  setWidgetState('loyaltySection', 'loading');
  try {
  // Use real subscriber-status endpoint for accurate data
  const subStatus = await fetchAPI(`/api/subscriber-status?period=${getPeriod()}`);
  if (subStatus && subStatus.length) {
    const subRow = subStatus.find(s => s.status === 'SUBSCRIBED') || { views: 0 };
    const nonSubRow = subStatus.find(s => s.status === 'UNSUBSCRIBED') || { views: 0 };

    if (charts.loyalty) charts.loyalty.destroy();
    charts.loyalty = new Chart(document.getElementById('loyaltyChart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['გამომწერები', 'არაგამომწერები'],
        datasets: [{ data: [subRow.views, nonSubRow.views], backgroundColor: [SUCCESS, ACCENT1], borderWidth: 0, hoverOffset: 8 }],
      },
      options: donutOpts((item) => `${item.label}: ${formatNum(item.raw)} ნახვა`),
    });
  } else {
    // Fallback: infer from traffic sources
    const traffic = await fetchAPI(`/api/traffic?period=${getPeriod()}`);
    if (!traffic || !traffic.length) { setWidgetState('loyaltySection', 'error', loadLoyalty); return; }
    const subSource = traffic.find(t => t.source === 'SUBSCRIBER') || { views: 0 };
    const totalViews = traffic.reduce((s, t) => s + t.views, 0);
    if (charts.loyalty) charts.loyalty.destroy();
    charts.loyalty = new Chart(document.getElementById('loyaltyChart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['გამომწერები (სავარაუდო)', 'სხვა წყაროები'],
        datasets: [{ data: [subSource.views, totalViews - subSource.views], backgroundColor: [SUCCESS, ACCENT1], borderWidth: 0, hoverOffset: 8 }],
      },
      options: donutOpts((item) => `${item.label}: ${formatNum(item.raw)} ნახვა`),
    });
  }

  // Bar: Shorts vs Long-form engagement
  if (!extendedVideos || !extendedVideos.length) { setWidgetState('loyaltySection', 'ready'); return; }

  const shorts = extendedVideos.filter(v => v.isShort);
  const longform = extendedVideos.filter(v => !v.isShort);

  const sLikes = shorts.reduce((s, v) => s + v.likes, 0);
  const sComments = shorts.reduce((s, v) => s + v.comments, 0);
  const sShares = shorts.reduce((s, v) => s + v.shares, 0);
  const lLikes = longform.reduce((s, v) => s + v.likes, 0);
  const lComments = longform.reduce((s, v) => s + v.comments, 0);
  const lShares = longform.reduce((s, v) => s + v.shares, 0);

  if (charts.loyaltyEng) charts.loyaltyEng.destroy();
  charts.loyaltyEng = new Chart(document.getElementById('loyaltyEngagementChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['მოწონება', 'კომენტარი', 'გაზიარება'],
      datasets: [
        { label: 'Shorts', data: [sLikes, sComments, sShares], backgroundColor: ACCENT3 + '90', borderRadius: 6, barPercentage: 0.5 },
        { label: 'Long-form', data: [lLikes, lComments, lShares], backgroundColor: ACCENT1 + '90', borderRadius: 6, barPercentage: 0.5 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: chartTooltip() },
      scales: { x: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } }, y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } } },
    },
  });
  setWidgetState('loyaltySection', 'ready');
  } catch (err) {
    console.error('loadLoyalty:', err);
    setWidgetState('loyaltySection', 'error', loadLoyalty);
  }
}

// ============================================================
// Period Comparison
// ============================================================
async function loadCompare() {
  setWidgetState('compareSection', 'loading');
  try {
  const periodA = document.getElementById('compareA').value;
  const periodB = document.getElementById('compareB').value;

  const data = await fetchAPI(`/api/compare?periodA=${periodA}&periodB=${periodB}`);
  if (!data) { setWidgetState('compareSection', 'error', loadCompare); return; }

  if (charts.compare) charts.compare.destroy();

  const metricsLabels = ['ნახვები', 'ყურება (სთ)', 'გამომწერი', 'მოწონება', 'კომენტარი', 'გაზიარება'];
  const aData = [data.periodA.views, data.periodA.watchTimeHours, data.periodA.subscribers, data.periodA.likes, data.periodA.comments, data.periodA.shares];
  const bData = [data.periodB.views, data.periodB.watchTimeHours, data.periodB.subscribers, data.periodB.likes, data.periodB.comments, data.periodB.shares];

  charts.compare = new Chart(document.getElementById('compareChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: metricsLabels,
      datasets: [
        { label: data.periodA.label, data: aData, backgroundColor: ACCENT2 + '90', borderRadius: 6, barPercentage: 0.45 },
        { label: data.periodB.label, data: bData, backgroundColor: ACCENT1 + '90', borderRadius: 6, barPercentage: 0.45 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } }, tooltip: chartTooltip() },
      scales: { x: { grid: { display: false }, ticks: { color: TEXT, font: { size: 10 } } }, y: { grid: { color: GRID }, ticks: { color: TEXT, font: { size: 10 } } } },
    },
  });
  setWidgetState('compareSection', 'ready');
  } catch (err) {
    console.error('loadCompare:', err);
    setWidgetState('compareSection', 'error', loadCompare);
  }
}

// ============================================================
// Chatbot
// ============================================================
function toggleChat() { document.getElementById('chatbot').classList.toggle('open'); }

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  const messages = document.getElementById('chatMessages');
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = msg;
  messages.appendChild(userDiv);
  input.value = '';

  const loadDiv = document.createElement('div');
  loadDiv.className = 'chat-msg bot loading';
  loadDiv.innerHTML = 'Gemini ფიქრობს<span class="typing-dots"></span>';
  messages.appendChild(loadDiv);
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    loadDiv.className = 'chat-msg bot';
    loadDiv.textContent = data.reply || 'პასუხი ვერ მოიძებნა.';
  } catch {
    loadDiv.className = 'chat-msg bot';
    loadDiv.textContent = 'შეცდომა მოხდა. სცადეთ თავიდან.';
  }
  messages.scrollTop = messages.scrollHeight;
}

// ============================================================
// Load All (with overlap guard)
// ============================================================
let loadingInProgress = false;

async function loadAll() {
  if (loadingInProgress) return;
  loadingInProgress = true;

  document.getElementById('lastUpdated').textContent = 'განახლდება...';

  try {
    // Phase 1: Load daily data + extended videos first (needed by dependents)
    await Promise.all([
      loadDailyChart(),
      loadExtendedVideos(),
    ]);

    // Phase 2: All independent loads in parallel
    await Promise.all([
      loadOverview(),
      loadSubsChart(),
      loadMonthlyChart(),
      loadTrends(),
      loadVideos(),
      loadTraffic(),
      loadSearchTerms(),
      loadDemographics(),
      loadGeography(),
      loadDevices(),
      loadPlaybackLocations(),
      loadSubSources(),
      loadEngagement(),
      // New sections
      loadFunnel(),
      loadScorecard(),
      loadShortsComparison(),
      loadVelocity(),
      loadTopics(),
      loadLoyalty(),
      loadCompare(),
    ]);

    // Phase 3: Sections that need extended videos to be loaded
    populateRetentionDropdown();

    document.getElementById('lastUpdated').textContent = 'განახლდა ' + new Date().toLocaleTimeString('ka-GE');
  } finally {
    loadingInProgress = false;
  }
}

// ============================================================
// Init
// ============================================================
createParticles();
document.getElementById('periodSelector').addEventListener('change', loadAll);
document.getElementById('scorecardSort').addEventListener('change', () => { if (!loadingInProgress) loadScorecard(); });
document.getElementById('scorecardType').addEventListener('change', () => { if (!loadingInProgress) loadScorecard(); });
document.getElementById('videoTypeFilter').addEventListener('change', () => { if (!loadingInProgress) loadVideos(); });
document.getElementById('btnCompare').addEventListener('click', loadCompare);
document.getElementById('btnRefresh').addEventListener('click', loadAll);
document.getElementById('chatToggle').addEventListener('click', toggleChat);
document.getElementById('chatClose').addEventListener('click', toggleChat);
document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
document.getElementById('btnSendChat').addEventListener('click', sendChat);
loadAll();
setInterval(loadAll, 5 * 60 * 1000);
