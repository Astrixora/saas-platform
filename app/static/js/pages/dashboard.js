// ============================================================
//  TigerGate Platform — Dashboard Page
// ============================================================

import { api, formatCurrency, formatDate, timeAgo, avatarCircle, showToast, showLoading } from '../app.js';

let monthlyChart = null;
let categoryChart = null;

export function destroyCharts() {
  if (monthlyChart) {
    monthlyChart.destroy();
    monthlyChart = null;
  }
  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }
}

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = showLoading();

  try {
    const res = await api('/dashboard/metrics');
    if (!res || !res.ok) {
      content.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-lg">Failed to load dashboard metrics.</div>`;
      return;
    }
    const data = await res.json();

    content.innerHTML = `
      <div class="space-y-6">
        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Total Revenue -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 class="text-3xl font-bold text-gray-900 mt-2">${formatCurrency(data.total_revenue || 0)}</h3>
              <p class="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <span>↑</span> +12.5% from last month
              </p>
            </div>
            <div class="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 flex-shrink-0">
              <svg class="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 2v16"/><path d="M14 6c-1-1.5-3-2-4.5-2S6 5 6 6.5 7.5 9 10 9.5s4 1.5 4 3S12.5 15 10.5 15 7 14 6 13"/></svg>
            </div>
          </div>

          <!-- Active Users -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Active Users</p>
              <h3 class="text-3xl font-bold text-gray-900 mt-2">${data.active_users || 0}</h3>
              <p class="text-xs text-gray-500 font-medium mt-1">
                of ${data.total_users || 0} total
              </p>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
              <svg class="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="3"/><path d="M2 17c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="15" cy="7" r="2"/><path d="M15 11c2 0 4 1.5 4 4"/></svg>
            </div>
          </div>

          <!-- Churn Rate -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Churn Rate</p>
              <h3 class="text-3xl font-bold text-gray-900 mt-2">${(data.churn_rate || 0).toFixed(1)}%</h3>
              <p class="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                <span>↓</span> last 90 days
              </p>
            </div>
            <div class="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0">
              <svg class="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 8 11 11 8 17 14"/><polyline points="13 14 17 14 17 10"/></svg>
            </div>
          </div>

          <!-- Total Files -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Total Files</p>
              <h3 class="text-3xl font-bold text-gray-900 mt-2">${data.total_files || 0}</h3>
              <p class="text-xs text-purple-600 font-medium mt-1">
                uploaded
              </p>
            </div>
            <div class="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 flex-shrink-0">
              <svg class="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5a1 1 0 011-1h4l2 2h6a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5z"/></svg>
            </div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Monthly Revenue -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h4 class="text-base font-semibold text-gray-900 mb-4">Monthly Revenue</h4>
            <div class="chart-container">
              <canvas id="monthly-chart"></canvas>
            </div>
          </div>

          <!-- Revenue by Category -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h4 class="text-base font-semibold text-gray-900 mb-4">Revenue by Category</h4>
            <div class="chart-container">
              <canvas id="category-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Panels Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <!-- Recent Activity (col-span-3) -->
          <div class="lg:col-span-3 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h4 class="text-base font-semibold text-gray-900 mb-4">Recent Activity</h4>
            <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              ${(data.recent_activity && data.recent_activity.length > 0) ? data.recent_activity.map(act => `
                <div class="py-3 flex items-center gap-3">
                  ${avatarCircle(act.full_name || 'System', 'w-8 h-8 text-xs')}
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-800 font-medium truncate">${act.action || 'Activity'}</p>
                    <p class="text-xs text-gray-500">${act.details || (act.full_name ? 'By ' + act.full_name : '')}</p>
                  </div>
                  <span class="text-xs text-gray-400 whitespace-nowrap">${timeAgo(act.created_at)}</span>
                </div>
              `).join('') : '<p class="text-sm text-gray-400 py-4">No recent activity recorded.</p>'}
            </div>
          </div>

          <!-- Quick Calculator (col-span-2) -->
          <div class="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h4 class="text-base font-semibold text-gray-900 mb-2">Quick Calculator</h4>
              <p class="text-xs text-gray-500 mb-4">Evaluate custom metrics against current platform telemetry.</p>
              
              <div class="space-y-3">
                <label class="block text-xs font-medium text-gray-700">Formula</label>
                <textarea id="calc-formula" rows="3"
                  class="w-full text-sm font-mono p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="revenue / active_users">revenue / active_users</textarea>
                <p class="text-xs text-gray-400 italic">Available variables: revenue, active_users, churn_rate, total_users</p>
                
                <button id="calc-submit-btn"
                  class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                  <span>Calculate</span>
                </button>
              </div>
            </div>

            <!-- Result Box -->
            <div id="calc-result-box" class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span class="text-xs font-medium text-gray-500 block mb-1">Result:</span>
              <div id="calc-result" class="text-lg font-bold font-mono text-gray-800">—</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize Calculator logic
    const calcBtn = document.getElementById('calc-submit-btn');
    const calcFormula = document.getElementById('calc-formula');
    const calcResult = document.getElementById('calc-result');

    calcBtn.addEventListener('click', async () => {
      const formula = calcFormula.value.trim();
      if (!formula) {
        showToast('Please enter a formula', 'error');
        return;
      }
      calcBtn.disabled = true;
      calcBtn.textContent = 'Calculating…';
      try {
        const cRes = await api('/dashboard/calculate', {
          method: 'POST',
          body: JSON.stringify({ formula })
        });
        const cData = await cRes.json();
        if (cRes.ok) {
          calcResult.textContent = typeof cData.result === 'number' ? cData.result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(cData.result);
          calcResult.className = 'text-lg font-bold font-mono text-indigo-600';
        } else {
          calcResult.textContent = cData.error || 'Evaluation failed';
          calcResult.className = 'text-sm font-medium font-mono text-red-600';
        }
      } catch (err) {
        calcResult.textContent = 'Calculation error';
        calcResult.className = 'text-sm font-medium font-mono text-red-600';
      } finally {
        calcBtn.disabled = false;
        calcBtn.textContent = 'Calculate';
      }
    });

    // Initialize Charts
    initCharts(data);

  } catch (err) {
    content.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-lg">Error rendering dashboard: ${err.message}</div>`;
  }
}

function initCharts(data) {
  destroyCharts();

  // 1. Monthly Revenue Bar Chart
  const monthlyCanvas = document.getElementById('monthly-chart');
  if (monthlyCanvas) {
    const monthlyData = data.monthly_revenue || [];
    const labels = monthlyData.map(d => d.month);
    const amounts = monthlyData.map(d => d.amount);

    monthlyChart = new Chart(monthlyCanvas, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [{
          label: 'Revenue ($)',
          data: amounts.length ? amounts : [0],
          backgroundColor: '#4F46E5',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => formatCurrency(context.parsed.y)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => '$' + value.toLocaleString()
            },
            grid: { color: '#F3F4F6' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // 2. Revenue by Category Doughnut Chart
  const catCanvas = document.getElementById('category-chart');
  if (catCanvas) {
    const catData = data.revenue_by_category || [];
    const catLabels = catData.map(d => d.category);
    const catAmounts = catData.map(d => d.amount);

    const colors = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    categoryChart = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: catLabels.length ? catLabels : ['No Data'],
        datasets: [{
          data: catAmounts.length ? catAmounts : [1],
          backgroundColor: catLabels.length ? colors.slice(0, catLabels.length) : ['#E5E7EB'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${formatCurrency(context.raw)}`
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}
