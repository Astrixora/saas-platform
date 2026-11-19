// ============================================================
//  TigerGate Platform — Settings Page
// ============================================================

import { api, showToast, showLoading, getUser } from '../app.js';

export async function renderSettings() {
  const content = document.getElementById('content');
  const user = getUser();

  // Role check: Only admin or manager can access settings
  if (user.role !== 'admin' && user.role !== 'manager') {
    content.innerHTML = `
      <div class="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.366zm1.414-1.414L6.525 5.11a6 6 0 018.366 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
        <p class="text-sm text-gray-500 max-w-md mx-auto">
          You do not have administrative privileges to view or configure platform settings. Contact an administrator if you require elevated permissions.
        </p>
      </div>
    `;
    return;
  }

  content.innerHTML = showLoading();

  try {
    const res = await api('/settings');
    const data = res && res.ok ? await res.json() : { settings: {} };
    const settings = data.settings || {};

    const isMaintenance = settings.maintenance_mode === 'true' || settings.maintenance_mode === true;
    const isNotify = settings.enable_notifications === 'true' || settings.enable_notifications === true || settings.enable_notifications === undefined;
    const sessionTimeout = parseInt(settings.session_timeout || '480', 10);
    const maxUploadMb = Math.round(parseInt(settings.max_upload_size || '52428800', 10) / (1024 * 1024));
    const defaultRole = settings.default_role || 'viewer';

    content.innerHTML = `
      <div class="max-w-4xl space-y-6">
        <!-- Application Settings Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="border-b border-gray-200 pb-4 mb-6">
            <h3 class="text-base font-semibold text-gray-900">Application Configuration</h3>
            <p class="text-xs text-gray-500 mt-1">Manage core platform operating parameters, security timeouts, and policies.</p>
          </div>

          <form id="settings-form" class="space-y-6">
            <!-- Maintenance Mode Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">Maintenance Mode</h4>
                <p class="text-xs text-gray-500">Temporarily restrict access to administrative staff only.</p>
              </div>
              <div id="toggle-maintenance" class="toggle-track ${isMaintenance ? 'active' : ''}">
                <div class="toggle-knob"></div>
              </div>
            </div>

            <!-- Notifications Toggle -->
            <div class="flex items-center justify-between border-t border-gray-100 pt-4">
              <div>
                <h4 class="text-sm font-medium text-gray-900">System Notifications</h4>
                <p class="text-xs text-gray-500">Enable real-time event broadcasts and email alerts.</p>
              </div>
              <div id="toggle-notifications" class="toggle-track ${isNotify ? 'active' : ''}">
                <div class="toggle-knob"></div>
              </div>
            </div>

            <!-- Session Timeout -->
            <div class="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <h4 class="text-sm font-medium text-gray-900">Session Timeout</h4>
                <p class="text-xs text-gray-500">Inactivity period before user session invalidation (minutes).</p>
              </div>
              <div>
                <input type="number" id="setting-session-timeout" value="${sessionTimeout}" min="15" max="1440"
                  class="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
            </div>

            <!-- Max Upload Size -->
            <div class="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <h4 class="text-sm font-medium text-gray-900">Maximum Upload Size (MB)</h4>
                <p class="text-xs text-gray-500">Limit max size for uploaded documents and security dumps.</p>
              </div>
              <div>
                <input type="number" id="setting-upload-size" value="${maxUploadMb}" min="1" max="500"
                  class="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
            </div>

            <!-- Default Role -->
            <div class="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <h4 class="text-sm font-medium text-gray-900">Default Member Role</h4>
                <p class="text-xs text-gray-500">Base role assigned to newly invited or self-provisioned users.</p>
              </div>
              <div>
                <select id="setting-default-role" class="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm capitalize focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="viewer" ${defaultRole === 'viewer' ? 'selected' : ''}>Viewer</option>
                  <option value="analyst" ${defaultRole === 'analyst' ? 'selected' : ''}>Analyst</option>
                  <option value="manager" ${defaultRole === 'manager' ? 'selected' : ''}>Manager</option>
                  <option value="admin" ${defaultRole === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-4 border-t border-gray-200 flex justify-end">
              <button type="submit" id="save-settings-btn"
                class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm">
                Save Settings
              </button>
            </div>
          </form>
        </div>

        <!-- System Information Card (Read-only) -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="border-b border-gray-200 pb-4 mb-4">
            <h3 class="text-base font-semibold text-gray-900">System Telemetry & Environment</h3>
            <p class="text-xs text-gray-500 mt-1">Read-only diagnostics for TigerGate Core infrastructure.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span class="text-xs font-medium text-gray-400 block mb-1">App Version</span>
              <span class="text-sm font-bold text-gray-900">v2.4.1-enterprise</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span class="text-xs font-medium text-gray-400 block mb-1">Environment</span>
              <span class="text-sm font-bold text-indigo-600">Production / On-Prem</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span class="text-xs font-medium text-gray-400 block mb-1">Database Engine</span>
              <span class="text-sm font-bold text-gray-900">SQLite 3.x (WAL mode)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span class="text-xs font-medium text-gray-400 block mb-1">Server Status</span>
              <span class="inline-flex items-center gap-1.5 text-sm font-bold text-green-600">
                <span class="w-2 h-2 rounded-full bg-green-500"></span> Healthy (Port 5000)
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Toggle handlers
    let maintenanceVal = isMaintenance;
    let notifyVal = isNotify;

    const maintenanceToggle = document.getElementById('toggle-maintenance');
    maintenanceToggle.addEventListener('click', () => {
      maintenanceVal = !maintenanceVal;
      maintenanceToggle.classList.toggle('active', maintenanceVal);
    });

    const notifyToggle = document.getElementById('toggle-notifications');
    notifyToggle.addEventListener('click', () => {
      notifyVal = !notifyVal;
      notifyToggle.classList.toggle('active', notifyVal);
    });

    // Form submit
    const form = document.getElementById('settings-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-settings-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      const payload = {
        maintenance_mode: String(maintenanceVal),
        enable_notifications: String(notifyVal),
        session_timeout: document.getElementById('setting-session-timeout').value,
        max_upload_size: String(parseInt(document.getElementById('setting-upload-size').value, 10) * 1024 * 1024),
        default_role: document.getElementById('setting-default-role').value
      };

      try {
        const putRes = await api('/settings', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const putData = await putRes.json();
        if (!putRes.ok) {
          showToast(putData.error || 'Failed to update settings', 'error');
        } else {
          showToast('Settings saved successfully', 'success');
        }
      } catch (err) {
        showToast('Error saving settings: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
      }
    });

  } catch (err) {
    content.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-lg">Error loading settings: ${err.message}</div>`;
  }
}
