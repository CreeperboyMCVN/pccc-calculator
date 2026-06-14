// PCCC Calculator - All firefighting calculations

function $(id) {
  return document.getElementById(id);
}

function getVal(id) {
  return parseFloat($(id).value) || 0;
}

function setVal(id, val) {
  $(id).value = val;
}

function roundUp(num) {
  return Math.ceil(num);
}

function formatNum(num, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return Number(num.toFixed(decimals));
}

// ---- Preview & Export Overlay ----

let cachedDocData = null;

// Mapping from JSON param keys to input field IDs
const paramToField = {
  tbc: 'tbc',
  tcb: 'tcb',
  ttk: 'ttk',
  distL: 'distL',
  vxe: 'vxe',
  vl: 'vl',
  fdc: 'fdc',
  ict: 'ict',
  ql: 'ql',
  nlPerTruck: 'nlPerTruck',
};

// Get all current form values as an object
function getCurrentParams() {
  return {
    tbc: getVal('tbc'),
    tcb: getVal('tcb'),
    ttk: getVal('ttk'),
    distL: getVal('distL'),
    vxe: getVal('vxe'),
    vl: getVal('vl'),
    fdc: getVal('fdc'),
    ict: getVal('ict'),
    ql: getVal('ql'),
    nlPerTruck: getVal('nlPerTruck'),
  };
}

// Get all current calculated results as an object
function getCurrentResults(params) {
  const tbc = params.tbc;
  const tcb = params.tcb;
  const ttk = params.ttk;
  const distL = params.distL;
  const vxe = params.vxe;
  const vl = params.vl;
  const fdc = params.fdc;
  const ict = params.ict;
  const ql = params.ql;
  const nlPerTruck = params.nlPerTruck;

  const ttd = vxe > 0 ? (distL * 60) / vxe : 0;
  const ttdTotal = tbc + tcb + ttd + ttk;
  const ttdCapped = Math.min(ttdTotal, 10);
  const rl = (0.5 * ttdCapped * vl) + (ttdTotal * vl);
  const fcc = fdc;
  const qct = fcc * ict;
  const nlRaw = ql > 0 ? qct / ql : 0;
  const nlCeil = roundUp(nlRaw);
  const nTruck = nlPerTruck > 0 ? roundUp(nlCeil / nlPerTruck) : 0;
  const qlm = 0.5 * qct;
  const nlmNozzle = ql > 0 ? roundUp(qlm / ql) : 0;
  const nlmTruck = nlPerTruck > 0 ? roundUp(nlmNozzle / nlPerTruck) : 0;

  return {
    ttd: formatNum(ttd, 2),
    ttdTotal: formatNum(ttdTotal, 2),
    rl: formatNum(rl, 2),
    fcc: formatNum(fcc, 2),
    qct: formatNum(qct, 2),
    nl: nlCeil,
    ntruck: nTruck,
    nteam: nTruck,
    qlm: formatNum(qlm, 2),
    nlmNozzle: nlmNozzle,
    nlmTruck: nlmTruck,
    nlmTeam: nlmTruck,
    // For preview formulas
    ttdFormula: distL + ' × 60 / ' + vxe + ' = ' + formatNum(ttd, 2),
    ttdTotalFormula: tbc + ' + ' + tcb + ' + ' + formatNum(ttd, 2) + ' + ' + ttk + ' = ' + formatNum(ttdTotal, 2),
    rlFormula: '0,5 × min(' + formatNum(ttdTotal, 2) + ', 10) × ' + vl + ' + ' + formatNum(ttdTotal, 2) + ' × ' + vl + ' = ' + formatNum(rl, 2),
    qctFormula: formatNum(fcc, 2) + ' × ' + ict + ' = ' + formatNum(qct, 2),
    nlFormula: formatNum(qct, 2) + ' / ' + ql + ' → làm tròn lên = ' + nlCeil,
    ntruckFormula: nlCeil + ' / ' + nlPerTruck + ' → làm tròn lên = ' + nTruck,
    nlmFormula: '0,5 × ' + formatNum(qct, 2) + ' = ' + formatNum(qlm, 2),
    nlmNozzleFormula: formatNum(qlm, 2) + ' / ' + ql + ' → làm tròn lên = ' + nlmNozzle,
    totalNozzle: nlCeil + nlmNozzle,
  };
}

function openOverlay() {
  $('docOverlay').classList.remove('hidden');
  $('overlayTitle').textContent = '📄 Xem trước & Xuất báo cáo';
  // Reset to first tab
  switchTab('tab-doc-preview');
  // Recalculate first to ensure fresh values
  recalculate();
  // Load all tabs in parallel
  loadDocxPreview();
  loadDocData();
  buildExportPreview();
}

function closeOverlay() {
  $('docOverlay').classList.add('hidden');
}

// Tab switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(function (content) {
    content.classList.toggle('active', content.id === tabId);
  });
}

function applyDocParams() {
  if (!cachedDocData || !cachedDocData.params) return;
  const params = cachedDocData.params;
  for (const [key, fieldId] of Object.entries(paramToField)) {
    if (params[key] && params[key].value !== undefined) {
      setVal(fieldId, params[key].value);
    }
  }
  recalculate();
  closeOverlay();
}

// ---- Export Preview HTML ----

function buildExportPreview() {
  const params = getCurrentParams();
  const r = getCurrentResults(params);

  var html = '';

  // Title
  html += '<h2 style="text-align:center;color:#e94560;">BÁO CÁO TÍNH TOÁN PCCC &amp; CNCH</h2>';
  html += '<p style="text-align:center;color:#888;font-style:italic;">Dữ liệu hiện tại từ form — Xem trước nội dung sẽ xuất ra file DOCX</p>';

  // Section 1
  html += '<h3>1. Thời gian cháy tự do (T<sub>td</sub>)</h3>';
  html += '<p class="formula">T<sub>td</sub> = T<sub>bc</sub> + T<sub>cb</sub> + T<sub>tđ</sub> + T<sub>tk</sub></p>';
  html += '<p>Trong đó:</p>';
  html += '<p>  • T<sub>bc</sub> = <mark class="hl-param">' + params.tbc + '</mark> phút — Thời gian từ khi cháy đến khi phát hiện.</p>';
  html += '<p>  • T<sub>cb</sub> = <mark class="hl-param">' + params.tcb + '</mark> phút — Thời gian chuẩn bị xuất xe.</p>';
  html += '<p>  • T<sub>tk</sub> = <mark class="hl-param">' + params.ttk + '</mark> phút — Thời gian triển khai lực lượng, phương tiện.</p>';
  html += '<p>  • T<sub>tđ</sub> = L × 60 / V<sub>xe</sub></p>';
  html += '<p>      + L = <mark class="hl-param">' + params.distL + '</mark> km</p>';
  html += '<p>      + V<sub>xe</sub> = <mark class="hl-param">' + params.vxe + '</mark> km/h</p>';
  html += '<p class="result-box">  => T<sub>tđ</sub> = <mark class="hl-result">' + r.ttdFormula + '</mark> phút.</p>';
  html += '<p class="result-box">* Như vậy: <strong>T<sub>td</sub> = <mark class="hl-result">' + r.ttdTotalFormula + '</mark> phút.</strong></p>';

  // Section 2
  html += '<h3>2. Bán kính lan truyền ngọn lửa (R<sub>l</sub>)</h3>';
  html += '<p class="formula">R<sub>l</sub> = 0,5 × min(T<sub>td</sub>, 10) × V<sub>l</sub> + T<sub>td</sub> × V<sub>l</sub></p>';
  html += '<p>  • V<sub>l</sub> = <mark class="hl-param">' + params.vl + '</mark> m/phút — Vận tốc lan truyền ngọn lửa.</p>';
  html += '<p>  • Trong 10 phút đầu: vận tốc = ½V<sub>l</sub>. Sau 10 phút: vận tốc = V<sub>l</sub>.</p>';
  html += '<p class="result-box">  => R<sub>l</sub> = <mark class="hl-result">' + r.rlFormula + '</mark> m.</p>';

  // Section 3
  html += '<h3>3. Diện tích đám cháy &amp; Diện tích chữa cháy</h3>';
  html += '<p>  • F<sub>đc</sub> = <mark class="hl-param">' + params.fdc + '</mark> m² — Diện tích đám cháy.</p>';
  html += '<p class="result-box">  • F<sub>cc</sub> = F<sub>đc</sub> = <mark class="hl-result">' + r.fcc + '</mark> m².</p>';

  // Section 4
  html += '<h3>4. Lưu lượng nước &amp; Số lăng chữa cháy</h3>';
  html += '<p class="formula">Q<sub>ct</sub> = F<sub>cc</sub> × i<sub>ct</sub></p>';
  html += '<p>  • i<sub>ct</sub> = <mark class="hl-param">' + params.ict + '</mark> l/s.m² — Cường độ phun nước cần thiết.</p>';
  html += '<p class="result-box">  => Q<sub>ct</sub> = <mark class="hl-result">' + r.qctFormula + '</mark> l/s.</p>';
  html += '<p class="formula">N<sub>L</sub> = Q<sub>ct</sub> / q<sub>l</sub> (làm tròn lên)</p>';
  html += '<p>  • q<sub>l</sub> = <mark class="hl-param">' + params.ql + '</mark> l/s — Lưu lượng 01 lăng B.</p>';
  html += '<p class="result-box">  => N<sub>L</sub> = <mark class="hl-result">' + r.nlFormula + '</mark> lăng B.</p>';

  // Section 5
  html += '<h3>5. Số xe &amp; Tổ chữa cháy</h3>';
  html += '<p class="formula">N<sub>cc xe</sub> = N<sub>L</sub> / n<sub>l</sub> (làm tròn lên)</p>';
  html += '<p>  • n<sub>l</sub> = <mark class="hl-param">' + params.nlPerTruck + '</mark> lăng B/xe.</p>';
  html += '<p class="result-box">  => N<sub>cc xe</sub> = <mark class="hl-result">' + r.ntruckFormula + '</mark> xe.</p>';
  html += '<p class="result-box">  => Số tổ chữa cháy = <mark class="hl-result">' + r.nteam + '</mark> tổ.</p>';

  // Section 6
  html += '<h3>6. Làm mát</h3>';
  html += '<p class="formula">Q<sub>lm</sub> = 0,5 × Q<sub>ct</sub></p>';
  html += '<p class="result-box">  => Q<sub>lm</sub> = <mark class="hl-result">' + r.nlmFormula + '</mark> l/s.</p>';
  html += '<p class="formula">N<sub>lm lăng</sub> = Q<sub>lm</sub> / q<sub>l</sub> (làm tròn lên)</p>';
  html += '<p class="result-box">  => N<sub>lm lăng</sub> = <mark class="hl-result">' + r.nlmNozzleFormula + '</mark> lăng B.</p>';
  html += '<p class="result-box">  => Số xe làm mát = <mark class="hl-result">' + r.nlmTruck + '</mark> xe.</p>';
  html += '<p class="result-box">  => Số tổ làm mát = <mark class="hl-result">' + r.nlmTeam + '</mark> tổ.</p>';

  // Section 7
  html += '<h3>7. Tổng hợp kết quả</h3>';
  html += '<table class="doc-table"><tbody>';
  html += '<tr><td>Tổng số lăng B</td><td class="val-col">' + r.totalNozzle + ' lăng</td></tr>';
  html += '<tr><td>Trong đó chữa cháy</td><td class="val-col">' + r.nl + ' lăng B</td></tr>';
  html += '<tr><td>Trong đó làm mát</td><td class="val-col">' + r.nlmNozzle + ' lăng B</td></tr>';
  html += '<tr><td>Xe chữa cháy</td><td class="val-col">' + r.ntruck + ' xe</td></tr>';
  html += '<tr><td>Xe làm mát</td><td class="val-col">' + r.nlmTruck + ' xe</td></tr>';
  html += '<tr><td>Xe cứu thương</td><td class="val-col">01 xe</td></tr>';
  html += '<tr><td>Xe bồn chở nước</td><td class="val-col">01 xe</td></tr>';
  html += '</tbody></table>';

  html += '<p style="text-align:center;color:#666;font-style:italic;margin-top:16px;">--- Bản xem trước — Nhấn 💾 Xuất file DOCX để lưu ---</p>';

  $('exportPreviewContent').innerHTML = html;
}

// ---- Export DOCX ----

async function exportDocx() {
  // Ensure fresh calculation
  recalculate();
  var params = getCurrentParams();
  var r = getCurrentResults(params);

  // Show save dialog
  var saveResult;
  if (window.docAPI) {
    saveResult = await window.docAPI.showSaveDialog('Bao_cao_PCCC.docx');
  } else {
    alert('docAPI không khả dụng. Không thể xuất file.');
    return;
  }

  if (saveResult.canceled || !saveResult.filePath) {
    return; // user cancelled
  }

  // Prepare data for Python export
  var exportData = {
    outputPath: saveResult.filePath,
    meta: {
      title: 'Tính toán lực lượng, phương tiện chữa cháy và cứu nạn, cứu hộ',
    },
    params: params,
    results: r,
  };

  // Call Python to generate docx
  $('exportPreviewContent').innerHTML = '<p class="loading-text">⏳ Đang tạo file DOCX...</p>';
  switchTab('tab-export-preview');

  var result;
  if (window.docAPI) {
    result = await window.docAPI.exportDocx(exportData);
  } else {
    result = { success: false, error: 'docAPI không khả dụng' };
  }

  if (result.success) {
    $('exportPreviewContent').innerHTML = '<p style="color:#4ecca3;text-align:center;padding:40px;">✅ Đã xuất thành công:<br><strong>' + saveResult.filePath + '</strong></p>';
    // Rebuild the preview after a short delay
    setTimeout(function () { buildExportPreview(); }, 1500);
  } else {
    $('exportPreviewContent').innerHTML = '<p class="doc-error">❌ Lỗi xuất file: ' + (result.error || 'Unknown error') + '</p>';
  }
}

// ---- Build data tables for overlay ----

function buildOverlayContent(data) {
  if (!data || !data.params) {
    return '<p class="doc-error">Không thể tải dữ liệu từ tài liệu.</p>';
  }

  let html = '';

  // Params table
  html += '<div class="doc-section"><h3>🔢 Thông số đầu vào từ tài liệu</h3>';
  html += '<table class="doc-table"><thead><tr><th>Thông số</th><th>Giá trị</th><th>Đơn vị</th><th>Mô tả</th></tr></thead><tbody>';
  for (const [key, p] of Object.entries(data.params)) {
    html += '<tr>';
    html += '<td><strong>' + key + '</strong></td>';
    html += '<td class="val-col">' + p.value + '</td>';
    html += '<td class="unit-col">' + p.unit + '</td>';
    html += '<td>' + (p.desc || '') + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';

  // Results table
  html += '<div class="doc-section"><h3>📊 Kết quả tính toán từ tài liệu</h3>';
  html += '<table class="doc-table"><thead><tr><th>Kết quả</th><th>Giá trị</th><th>Đơn vị</th><th>Công thức</th></tr></thead><tbody>';
  for (const [key, r] of Object.entries(data.results)) {
    html += '<tr>';
    html += '<td><strong>' + key + '</strong></td>';
    html += '<td class="val-col">' + r.value + '</td>';
    html += '<td class="unit-col">' + r.unit + '</td>';
    html += '<td class="formula-col" title="' + r.formula + '">' + r.formula + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';

  if (data.description) {
    html += '<div class="doc-section"><p style="color:#888;font-style:italic">📝 ' + data.description + '</p></div>';
  }

  return html;
}

async function loadDocData() {
  $('overlayBody').innerHTML = '<p class="loading-text">Đang tải dữ liệu từ tài liệu...</p>';

  let result;
  if (window.docAPI) {
    result = await window.docAPI.loadDocumentData();
  } else {
    result = { success: false, error: 'docAPI not available' };
  }

  if (result.success && result.data) {
    cachedDocData = result.data;
    $('overlayBody').innerHTML = buildOverlayContent(result.data);
  } else {
    $('overlayBody').innerHTML = '<p class="doc-error">❌ Lỗi tải dữ liệu: ' + (result.error || 'Unknown error') + '</p>';
  }
}

async function loadDocxPreview() {
  $('docPreviewContent').innerHTML = '<p class="loading-text">Đang tải tài liệu...</p>';

  if (!window.docAPI) {
    $('docPreviewContent').innerHTML = '<p class="doc-error">❌ docAPI không khả dụng</p>';
    return;
  }

  const result = await window.docAPI.renderDocx();
  if (result.success && result.html) {
    $('docPreviewContent').innerHTML = result.html;
  } else {
    $('docPreviewContent').innerHTML = '<p class="doc-error">❌ Lỗi hiển thị tài liệu: ' + (result.error || 'Unknown error') + '</p>';
  }
}

// ---- Recalculate All ----

function recalculate() {
  // --- Section 1: Free Burning Time ---
  const tbc = getVal('tbc');
  const tcb = getVal('tcb');
  const ttk = getVal('ttk');
  const distL = getVal('distL');
  const vxe = getVal('vxe');

  // Ttđ = L * 60 / Vxe
  const ttd = vxe > 0 ? (distL * 60) / vxe : 0;
  $('ttdDisplay').textContent = formatNum(ttd, 2);

  // Ttd = Tbc + Tcb + Ttđ + Ttk
  const ttdTotal = tbc + tcb + ttd + ttk;
  $('ttdTotal').textContent = formatNum(ttdTotal, 2);

  // --- Section 2: Flame Spread Radius ---
  const vl = getVal('vl');
  // Rl = 0.5 * min(Ttd, 10) * Vl + Ttd * Vl
  const ttdCapped = Math.min(ttdTotal, 10);
  const rl = (0.5 * ttdCapped * vl) + (ttdTotal * vl);
  $('rlDisplay').textContent = formatNum(rl, 2);

  // --- Section 3: Fire Area ---
  const fdc = getVal('fdc');
  const fcc = fdc;
  $('fccDisplay').textContent = formatNum(fcc, 2);

  // --- Section 4: Water Flow & Nozzles ---
  const ict = getVal('ict');
  const ql = getVal('ql');

  // Qct = Fcc * ict
  const qct = fcc * ict;
  $('qctDisplay').textContent = formatNum(qct, 2);

  // NL = Qct / ql (rounded up)
  const nlRaw = ql > 0 ? qct / ql : 0;
  const nlCeil = roundUp(nlRaw);
  $('nlDisplay').textContent = nlCeil;

  // --- Section 5: Fire Trucks ---
  const nlPerTruck = getVal('nlPerTruck');

  // Nccxe = NL / nl (rounded up)
  const nTruck = nlPerTruck > 0 ? roundUp(nlCeil / nlPerTruck) : 0;
  $('ntruckDisplay').textContent = nTruck;

  // Number of teams = Nccxe
  const nTeam = nTruck;
  $('nteamDisplay').textContent = nTeam;

  // --- Section 6: Cooling ---
  // Qlm = 0.5 * Qct
  const qlm = 0.5 * qct;
  $('qlmDisplay').textContent = formatNum(qlm, 2);

  // Nlm nozzle = Qlm / ql (rounded up)
  const nlmNozzle = ql > 0 ? roundUp(qlm / ql) : 0;
  $('nlmNozzleDisplay').textContent = nlmNozzle;

  // Cooling truck = NlmNozzle / nlPerTruck (rounded up)
  const nlmTruck = nlPerTruck > 0 ? roundUp(nlmNozzle / nlPerTruck) : 0;
  $('nlmTruckDisplay').textContent = nlmTruck;

  // Cooling team = cooling truck
  const nlmTeam = nlmTruck;
  $('nlmTeamDisplay').textContent = nlmTeam;

  // --- Section 7: Summary ---
  const totalNozzles = nlCeil + nlmNozzle;
  $('sumNozzle').textContent = totalNozzles;
  $('sumFight').textContent = nlCeil;
  $('sumCool').textContent = nlmNozzle;
  $('sumTruck').textContent = nTruck;
  $('sumCoolTruck').textContent = nlmTruck;

  // Update export preview if overlay is open
  if (!$('docOverlay').classList.contains('hidden')) {
    buildExportPreview();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Recalculate on input change
  const inputs = document.querySelectorAll('input[type="number"]');
  inputs.forEach(function (input) {
    input.addEventListener('input', recalculate);
  });

  // Overlay buttons
  $('btnLoadDoc').addEventListener('click', openOverlay);
  $('btnCloseOverlay').addEventListener('click', closeOverlay);
  $('btnCloseOverlay2').addEventListener('click', closeOverlay);
  $('btnApplyDoc').addEventListener('click', applyDocParams);
  $('btnApplyFromOverlay').addEventListener('click', applyDocParams);

  // Export buttons
  $('btnExportDocx').addEventListener('click', exportDocx);
  $('btnExportFromOverlay').addEventListener('click', exportDocx);

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.dataset.tab);
    });
  });

  // Click backdrop to close
  $('docOverlay').querySelector('.overlay-backdrop').addEventListener('click', closeOverlay);

  // ESC to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('docOverlay').classList.contains('hidden')) {
      closeOverlay();
    }
  });

  // Initial calculation
  recalculate();
});
