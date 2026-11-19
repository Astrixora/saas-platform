// ============================================================
//  TigerGate Platform — Reports Page
// ============================================================

import { api, formatDate, showToast, showLoading, showEmpty, icons, getToken } from '../app.js';

export async function renderReports() {
  const content = document.getElementById('content');
  
  // Default dates: last 30 days to today
  const todayStr = new Date().toISOString().split('T')[0];
  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);
  const lastMonthStr = lastMonth.toISOString().split('T')[0];

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Generate Report Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">Generate Security & Telemetry Report</h3>
        <p class="text-xs text-gray-500 mb-5">Select report parameters to compile compliance, audit, and platform analytics.</p>

        <form id="generate-report-form" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Report Type</label>
            <select id="report-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="summary">Summary Report</option>
              <option value="financial">Financial Audit</option>
              <option value="user-activity">User Activity</option>
              <option value="security-audit">Security Audit</option>
              <option value="compliance">Compliance (SOC2 / ISO)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" id="report-start-date" value="${lastMonthStr}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" id="report-end-date" value="${todayStr}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
          </div>

          <div>
            <button type="submit" id="gen-report-btn"
              class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              <span>Generate Report</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Reports History Table Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 class="text-base font-semibold text-gray-900">Generated Reports</h4>
          <button id="refresh-reports-btn" class="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors" title="Refresh">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        <div id="reports-table-container">
          ${showLoading()}
        </div>
      </div>
    </div>
  `;

  // Attach Generate Form listener
  const form = document.getElementById('generate-report-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('gen-report-btn');
    const type = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner w-4 h-4 border-2 mr-2"></span> Generating…`;

    try {
      const typeLabels = {
        'summary': 'Summary Report',
        'financial': 'Financial Audit',
        'user-activity': 'User Activity Report',
        'security-audit': 'Security Audit Report',
        'compliance': 'Compliance Assessment'
      };

      const res = await api('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          type,
          name: typeLabels[type] || `${type} Report`,
          start_date: startDate,
          end_date: endDate,
          format: 'pdf'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to generate report', 'error');
      } else {
        showToast('Report generated successfully!', 'success');
        loadReports();
      }
    } catch (err) {
      showToast('Error generating report: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg><span>Generate Report</span>`;
    }
  });

  document.getElementById('refresh-reports-btn').addEventListener('click', loadReports);

  loadReports();
}

async function loadReports() {
  const container = document.getElementById('reports-table-container');
  if (!container) return;

  try {
    const res = await api('/reports');
    if (!res || !res.ok) {
      container.innerHTML = `<div class="p-6 text-sm text-red-600">Failed to load reports.</div>`;
      return;
    }
    const data = await res.json();
    renderReportsTable(data.reports || []);
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-sm text-red-600">Error: ${err.message}</div>`;
  }
}

function typeBadge(type) {
  const badges = {
    'summary':        'bg-indigo-50 text-indigo-700 border-indigo-200',
    'financial':      'bg-green-50 text-green-700 border-green-200',
    'user-activity':  'bg-blue-50 text-blue-700 border-blue-200',
    'security-audit': 'bg-purple-50 text-purple-700 border-purple-200',
    'compliance':     'bg-amber-50 text-amber-700 border-amber-200',
  };
  return `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${badges[type] || 'bg-gray-50 text-gray-700 border-gray-200'}">${type || 'report'}</span>`;
}

function statusBadge(status) {
  if (status === 'completed') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
      <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Completed
    </span>`;
  }
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Generating
  </span>`;
}

function renderReportsTable(reports) {
  const container = document.getElementById('reports-table-container');
  if (!container) return;

  if (reports.length === 0) {
    container.innerHTML = showEmpty('No reports found. Generate your first report above.');
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm tg-table">
        <thead class="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3.5">Report Name</th>
            <th class="px-6 py-3.5">Type</th>
            <th class="px-6 py-3.5">Date Range</th>
            <th class="px-6 py-3.5">Created At</th>
            <th class="px-6 py-3.5">Status</th>
            <th class="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${reports.map(r => `
            <tr>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    ${icons.document}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">${r.name}</div>
                    <div class="text-xs text-gray-400 font-mono">${r.format ? r.format.toUpperCase() : 'PDF'}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">${typeBadge(r.type)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                ${r.start_date && r.end_date ? `${formatDate(r.start_date)} &mdash; ${formatDate(r.end_date)}` : 'All time'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">${formatDate(r.created_at)}</td>
              <td class="px-6 py-4 whitespace-nowrap">${statusBadge(r.status)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button class="download-report-btn p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors"
                  data-id="${r.id}" data-name="${r.name}" data-format="${r.format || 'pdf'}" title="Download Report">
                  ${icons.download}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach download handlers
  container.querySelectorAll('.download-report-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const format = btn.dataset.format;
      await downloadReportFile(id, `${name}.${format}`);
    });
  });
}

async function downloadReportFile(reportId, filename) {
  try {
    const token = getToken();
    const res = await fetch(`/api/reports/${reportId}/download`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to download report', 'error');
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    showToast('Download started', 'info');
  } catch (err) {
    showToast('Download error: ' + err.message, 'error');
  }
}
