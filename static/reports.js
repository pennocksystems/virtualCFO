// ---------- Baseline demo data (mirror dashboard) ----------
const BASE_LABELS_12 = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
const BASE_REVENUE_12 = [45000,52000,48000,60000,58000,61000,64000,63000,65000,67000,68000,70000];
const BASE_EXPENSES_12 = [38000,40000,42000,45000,50000,51000,52000,54000,55000,56000,57000,59000];

const VENDOR_LABELS = ['AWS','Salesforce','Office Lease','Insurance','Google Workspace'];
const VENDOR_SPEND  = [5200,2100,8000,2500,600];

const PAYROLL_PARTS = ['Salaries','Benefits','Taxes'];
const PAYROLL_AMTS  = [32000,6000,2000];

const START_CASH = 120000;

// ---------- State ----------
let state = {
  span: 12,
  report: 'revexp',          // 'revexp' | 'cash' | 'vendors' | 'payroll'
  // rev/exp/cash knobs
  revAdjPct: 0,
  expAdjPct: 0,
  hireCost: 0,
  hireStartOffset: 0,
  // vendors
  vendorAdjPct: 0,
  // payroll
  payrollAdjPct: { sal: 0, ben: 0, tax: 0 }
};

const fmt = n => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const money = n => `$${fmt(n)}`;

function sliceData(span) {
  const start = Math.max(0, BASE_LABELS_12.length - span);
  return {
    labels: BASE_LABELS_12.slice(start),
    revenue: BASE_REVENUE_12.slice(start),
    expenses: BASE_EXPENSES_12.slice(start)
  };
}

function applyRevExpWhatIf({labels, revenue, expenses}) {
  const r = revenue.map(v => Math.round(v * (1 + state.revAdjPct / 100)));
  const e = expenses.map(v => Math.round(v * (1 + state.expAdjPct / 100)));
  for (let i = state.hireStartOffset; i < e.length; i++) {
    e[i] += Number(state.hireCost || 0);
  }
  return { labels, revenue: r, expenses: e };
}

function cashForecast({revenue, expenses}, startCash) {
  const cash = [];
  let c = startCash;
  for (let i = 0; i < revenue.length; i++) {
    c += revenue[i] - expenses[i];
    cash.push(c);
  }
  return cash;
}

function runwayInfo(labels, cashBalances) {
  let idx = cashBalances.findIndex(v => v <= 0);
  if (idx === -1) return { text: `Runway: > ${labels.length} months`, month: null };
  return { text: `Runway: ~${idx + 1} months (≈ ${labels[idx]})`, month: labels[idx] };
}

// ---------- Chart ----------
let chart;
const ctx = document.getElementById('reportChart').getContext('2d');

function renderChart() {
  const titleEl = document.getElementById('reportTitle');
  const kpiRow = document.getElementById('kpiRow');
  const insights = document.getElementById('insightsList');

  let data, type = 'bar';
  kpiRow.innerHTML = '';
  insights.innerHTML = '';

  if (state.report === 'revexp') {
    const base = sliceData(state.span);
    const adj = applyRevExpWhatIf(base);

    titleEl.textContent = 'Revenue vs Expenses';
    type = 'bar';
    data = {
      labels: adj.labels,
      datasets: [
        { label: 'Revenue', data: adj.revenue, backgroundColor: '#2563eb' },
        { label: 'Expenses', data: adj.expenses, backgroundColor: '#ef4444' }
      ]
    };

    // KPIs
    const netNow = adj.revenue.at(-1) - adj.expenses.at(-1);
    const avgRev = Math.round(adj.revenue.reduce((a,b)=>a+b,0) / adj.revenue.length);
    const avgExp = Math.round(adj.expenses.reduce((a,b)=>a+b,0) / adj.expenses.length);
    kpiRow.innerHTML = `
      <span class="kpi">Avg Rev: <strong>${money(avgRev)}</strong></span>
      <span class="kpi">Avg Exp: <strong>${money(avgExp)}</strong></span>
      <span class="kpi">Last Net: <strong>${money(netNow)}</strong></span>
    `;

    const negatives = adj.revenue.map((v,i)=>v - adj.expenses[i]).filter(v=>v<0).length;
    insights.innerHTML = `<li>Months in loss: <strong>${negatives}</strong> of ${adj.labels.length}</li>`;

  } else if (state.report === 'cash') {
    const base = sliceData(state.span);
    const adj = applyRevExpWhatIf(base);
    const cashLine = cashForecast(adj, START_CASH);

    titleEl.textContent = 'Cash Balance Forecast';
    type = 'line';
    data = {
      labels: adj.labels,
      datasets: [
        { label: 'Cash Balance', data: cashLine, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)', tension: 0.3, fill: true }
      ]
    };

    const runway = runwayInfo(adj.labels, cashLine);
    kpiRow.innerHTML = `<span class="kpi">${runway.text}</span>`;
    insights.innerHTML = `<li>Starting cash: <strong>${money(START_CASH)}</strong></li>`;

  } else if (state.report === 'vendors') {
    titleEl.textContent = 'Top Vendors';
    type = 'bar';

    const spends = VENDOR_SPEND.map(v => Math.round(v * (1 + state.vendorAdjPct/100)));
    data = {
      labels: VENDOR_LABELS,
      datasets: [{ label: 'Monthly Spend ($)', data: spends, backgroundColor: '#f59e0b' }]
    };

    const total = spends.reduce((a,b)=>a+b,0);
    const maxIdx = spends.indexOf(Math.max(...spends));
    kpiRow.innerHTML = `
      <span class="kpi">Total Vendors: <strong>${money(total)}</strong></span>
      <span class="kpi">Top: <strong>${VENDOR_LABELS[maxIdx]}</strong> (${money(spends[maxIdx])})</span>
    `;
    insights.innerHTML = `<li>Adjustment applied: <strong>${state.vendorAdjPct}%</strong> across all vendors.</li>`;

  } else if (state.report === 'payroll') {
    titleEl.textContent = 'Payroll Insights';
    type = 'doughnut';

    const adj = [
      Math.round(PAYROLL_AMTS[0] * (1 + state.payrollAdjPct.sal/100)),
      Math.round(PAYROLL_AMTS[1] * (1 + state.payrollAdjPct.ben/100)),
      Math.round(PAYROLL_AMTS[2] * (1 + state.payrollAdjPct.tax/100))
    ];

    data = {
      labels: PAYROLL_PARTS,
      datasets: [{ data: adj, backgroundColor: ['#2563eb','#10b981','#f43f5e'] }]
    };

    const total = adj.reduce((a,b)=>a+b,0);
    const pct = adj.map(x => Math.round(x/total*100));
    kpiRow.innerHTML = `
      <span class="kpi">Total: <strong>${money(total)}</strong></span>
      <span class="kpi">Split: <strong>${pct[0]}%</strong>/<strong>${pct[1]}%</strong>/<strong>${pct[2]}%</strong></span>
    `;
    insights.innerHTML = `
      <li>Adj → Salaries: <strong>${state.payrollAdjPct.sal}%</strong>, Benefits: <strong>${state.payrollAdjPct.ben}%</strong>, Taxes: <strong>${state.payrollAdjPct.tax}%</strong></li>
    `;
  }

  // Draw or update chart
  if (chart) {
    chart.config.type = type;
    chart.data = data;
    chart.update();
  } else {
    chart = new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false } });
  }

  // Scenario summary
  const sumEl = document.getElementById('scenarioSummary');
  const bits = [];
  if (state.report === 'revexp' || state.report === 'cash') {
    if (state.revAdjPct) bits.push(`Revenue ${state.revAdjPct>0?'+':''}${state.revAdjPct}%`);
    if (state.expAdjPct) bits.push(`Expenses ${state.expAdjPct>0?'+':''}${state.expAdjPct}%`);
    if (state.hireCost) bits.push(`New hire $${fmt(state.hireCost)}/mo (starts in ${state.hireStartOffset+1} mo)`);
  }
  if (state.report === 'vendors' && state.vendorAdjPct) bits.push(`Vendors ${state.vendorAdjPct>0?'+':''}${state.vendorAdjPct}%`);
  if (state.report === 'payroll') {
    const p = state.payrollAdjPct;
    if (p.sal||p.ben||p.tax) bits.push(`Payroll adj S:${p.sal}% B:${p.ben}% T:${p.tax}%`);
  }
  sumEl.textContent = bits.length ? bits.join(' • ') : 'No adjustments applied.';
}

// ---------- UI wiring ----------

// Helper: toggle by adding/removing the `hidden` class
function setVisible(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

function toggleControls() {
  const showTime = (state.report==='revexp' || state.report==='cash');

  setVisible('ctrlTimeRange', showTime);
  setVisible('ctrlRevExp',  (state.report==='revexp' || state.report==='cash'));
  setVisible('ctrlVendors', (state.report==='vendors'));
  setVisible('ctrlPayroll', (state.report==='payroll'));
}

function bindUI() {
  const reportSelect = document.getElementById('reportSelect');
  const timeRange = document.getElementById('timeRange');

  const revGrowth = document.getElementById('revGrowth');
  const expGrowth = document.getElementById('expGrowth');
  const revGrowthVal = document.getElementById('revGrowthVal');
  const expGrowthVal = document.getElementById('expGrowthVal');
  const hireCost = document.getElementById('hireCost');
  const hireStart = document.getElementById('hireStart');

  const vendorAdj = document.getElementById('vendorAdj');
  const vendorAdjVal = document.getElementById('vendorAdjVal');

  const payrollSal = document.getElementById('payrollSal');
  const payrollBen = document.getElementById('payrollBen');
  const payrollTax = document.getElementById('payrollTax');
  const payrollSalVal = document.getElementById('payrollSalVal');
  const payrollBenVal = document.getElementById('payrollBenVal');
  const payrollTaxVal = document.getElementById('payrollTaxVal');

  const runBtn = document.getElementById('runScenario');
  const resetBtn = document.getElementById('resetScenario');

  reportSelect.addEventListener('change', () => {
    state.report = reportSelect.value;
    toggleControls();
    renderChart();
  });

  timeRange.addEventListener('change', () => {
    state.span = Number(timeRange.value);
    renderChart();
  });

  // Shared (rev/exp)
  revGrowth.addEventListener('input', () => {
    state.revAdjPct = Number(revGrowth.value);
    revGrowthVal.textContent = state.revAdjPct;
  });
  expGrowth.addEventListener('input', () => {
    state.expAdjPct = Number(expGrowth.value);
    expGrowthVal.textContent = state.expAdjPct;
  });
  hireCost.addEventListener('input', () => {
    state.hireCost = Number(hireCost.value || 0);
  });
  hireStart.addEventListener('change', () => {
    state.hireStartOffset = Number(hireStart.value);
  });

  // Vendors
  vendorAdj.addEventListener('input', () => {
    state.vendorAdjPct = Number(vendorAdj.value);
    vendorAdjVal.textContent = state.vendorAdjPct;
  });

  // Payroll
  function updatePayrollVals() {
    payrollSalVal.textContent = state.payrollAdjPct.sal = Number(payrollSal.value);
    payrollBenVal.textContent = state.payrollAdjPct.ben = Number(payrollBen.value);
    payrollTaxVal.textContent = state.payrollAdjPct.tax = Number(payrollTax.value);
  }
  payrollSal.addEventListener('input', updatePayrollVals);
  payrollBen.addEventListener('input', updatePayrollVals);
  payrollTax.addEventListener('input', updatePayrollVals);

  runBtn.addEventListener('click', (e) => { e.preventDefault(); renderChart(); });

  resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // reset shared
    state.revAdjPct = 0; state.expAdjPct = 0; state.hireCost = 0; state.hireStartOffset = 0;
    document.getElementById('revGrowth').value = 0; document.getElementById('revGrowthVal').textContent = 0;
    document.getElementById('expGrowth').value = 0; document.getElementById('expGrowthVal').textContent = 0;
    document.getElementById('hireCost').value = 0; document.getElementById('hireStart').value = 0;
    // vendors
    state.vendorAdjPct = 0; document.getElementById('vendorAdj').value = 0; document.getElementById('vendorAdjVal').textContent = 0;
    // payroll
    state.payrollAdjPct = { sal:0, ben:0, tax:0 };
    document.getElementById('payrollSal').value = 0; document.getElementById('payrollSalVal').textContent = 0;
    document.getElementById('payrollBen').value = 0; document.getElementById('payrollBenVal').textContent = 0;
    document.getElementById('payrollTax').value = 0; document.getElementById('payrollTaxVal').textContent = 0;
    renderChart();
  });
}

bindUI();
toggleControls();
renderChart();
