// PCCC Calculator - All firefighting calculations

function $(id) {
  return document.getElementById(id);
}

function getVal(id) {
  return parseFloat($(id).value) || 0;
}

function roundUp(num) {
  return Math.ceil(num);
}

function formatNum(num, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return Number(num.toFixed(decimals));
}

// Update all calculations
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
  // (matches document example: 0.5 * 10 * 1.2 + 8.3 * 1.2 = 15.96)
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
}

// Attach event listeners to all inputs
document.addEventListener('DOMContentLoaded', function () {
  const inputs = document.querySelectorAll('input[type="number"]');
  inputs.forEach(function (input) {
    input.addEventListener('input', recalculate);
  });

  // Initial calculation
  recalculate();
});
