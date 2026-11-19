// ============================================================
//  TigerGate Platform — Main Application Module
// ============================================================

import { renderDashboard, destroyCharts } from './pages/dashboard.js';
import { renderUsers }     from './pages/users.js';
import { renderReports }   from './pages/reports.js';
import { renderFiles }     from './pages/files.js';
import { renderSettings }  from './pages/settings.js';

// --------------- API helpers ---------------
const API_BASE = '/api';
export const getToken = () => localStorage.getItem('tg_token');
export const getUser  = () => JSON.parse(localStorage.getItem('tg_user') || '{}');

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Remove Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) delete headers['Content-Type'];
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) { logout(); return; }
  return res;
}

// --------------- Formatters ---------------
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B','KB','MB','GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
export { timeAgo };

// --------------- SVG Icons ---------------
export const icons = {
  home: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l7-7 7 7"/><path d="M5 8.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8.5"/></svg>`,
  users: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="3"/><path d="M2 17c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="15" cy="7" r="2"/><path d="M15 11c2 0 4 1.5 4 4"/></svg>`,
  document: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h7l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M12 3v4h4"/><line x1="7" y1="10" x2="13" y2="10"/><line x1="7" y1="13" x2="13" y2="13"/></svg>`,
  folder: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5a1 1 0 011-1h4l2 2h6a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5z"/></svg>`,
  cog: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="2.5"/><path d="M10 1.5l1 2.1a5.5 5.5 0 011.7 1L15 3.6l1.4 1.4-1 2.3a5.5 5.5 0 011 1.7l2.1 1v2l-2.1 1a5.5 5.5 0 01-1 1.7l1 2.3-1.4 1.4-2.3-1a5.5 5.5 0 01-1.7 1l-1 2.1h-2l-1-2.1a5.5 5.5 0 01-1.7-1l-2.3 1-1.4-1.4 1-2.3a5.5 5.5 0 01-1-1.7L1.5 12v-2l2.1-1a5.5 5.5 0 011-1.7l-1-2.3L5 3.6l2.3 1a5.5 5.5 0 011.7-1l1-2.1h2z"/></svg>`,
  logout: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3"/><path d="M14 14l4-4-4-4"/><path d="M18 10H8"/></svg>`,
  dollar: `<svg class="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 2v16"/><path d="M14 6c-1-1.5-3-2-4.5-2S6 5 6 6.5 7.5 9 10 9.5s4 1.5 4 3S12.5 15 10.5 15 7 14 6 13"/></svg>`,
  trendDown: `<svg class="w-6 h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 8 11 11 8 17 14"/><polyline points="13 14 17 14 17 10"/></svg>`,
  upload: `<svg class="w-10 h-10" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"/><polyline points="10 12 10 3"/><polyline points="6 7 10 3 14 7"/></svg>`,
  download: `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"/><polyline points="10 3 10 12"/><polyline points="6 9 10 13 14 9"/></svg>`,
  trash: `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h10l-1 11H6L5 6z"/><path d="M3 6h14"/><path d="M8 6V4h4v2"/></svg>`,
  edit: `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3l4 4-9 9H4v-4l9-9z"/></svg>`,
  search: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></svg>`,
  file: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h7l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M12 3v4h4"/></svg>`,
};

// --------------- UI Helpers ---------------
export function showLoading() {
  return `<div class="flex items-center justify-center py-20"><div class="spinner"></div></div>`;
}

export function showEmpty(message) {
  return `<div class="flex flex-col items-center justify-center py-16 text-gray-400">
    <svg class="w-12 h-12 mb-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 8h6M7 11h4"/></svg>
    <p class="text-sm">${message}</p>
  </div>`;
}

export function showModal(title, bodyHtml) {
  document.getElementById('modal-content').innerHTML = `
    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
      <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="text-gray-400 hover:text-gray-600 p-1">
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l10 10M15 5L5 15"/></svg>
      </button>
    </div>
    <div class="p-6">${bodyHtml}</div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

export function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  const toastIcons = {
    success: `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
    error:   `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`,
    info:    `<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
  };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium toast-enter max-w-sm`;
  el.innerHTML = `${toastIcons[type] || toastIcons.info}<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-exit'); setTimeout(() => el.remove(), 300); }, 3500);
}

// Make modal-close global
window.hideModal = hideModal;

// --------------- Avatar helper ---------------
export function avatarCircle(name, size = 'w-8 h-8 text-xs') {
  const colors = ['bg-indigo-500','bg-blue-500','bg-green-500','bg-amber-500','bg-red-500','bg-purple-500','bg-pink-500'];
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = colors[Math.abs([...initials].reduce((s, c) => s + c.charCodeAt(0), 0)) % colors.length];
  return `<div class="${size} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">${initials}</div>`;
}

// --------------- Navigation / Routing ---------------
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: icons.home },
  { id: 'users',     label: 'Users',     icon: icons.users },
  { id: 'reports',   label: 'Reports',   icon: icons.document },
  { id: 'files',     label: 'Files',     icon: icons.folder },
  { id: 'settings',  label: 'Settings',  icon: icons.cog },
];

const pageRenderers = {
  dashboard: renderDashboard,
  users:     renderUsers,
  reports:   renderReports,
  files:     renderFiles,
  settings:  renderSettings,
};

function renderSidebar() {
  const nav = document.getElementById('nav');
  const user = getUser();
  const currentPage = (location.hash || '#dashboard').slice(1);

  nav.innerHTML = navItems.map(item => {
    const active = item.id === currentPage;
    return `<a href="#${item.id}" data-page="${item.id}"
      class="px-4 py-3 rounded-lg cursor-pointer flex items-center gap-3 text-sm font-medium transition-colors
        ${active ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}">
      ${item.icon}<span>${item.label}</span>
    </a>`;
  }).join('');

  // User info at bottom
  document.getElementById('sidebar-user').innerHTML = `
    <div class="flex items-center gap-3">
      ${avatarCircle(user.full_name || user.username || 'U', 'w-9 h-9 text-sm')}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">${user.full_name || user.username || 'User'}</p>
        <p class="text-xs text-gray-400 capitalize">${user.role || 'user'}</p>
      </div>
      <button id="logout-btn" class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Sign out">
        ${icons.logout}
      </button>
    </div>`;

  document.getElementById('logout-btn').addEventListener('click', logout);
}

function renderHeader(title) {
  document.getElementById('page-title').textContent = title;
  const user = getUser();
  document.getElementById('header-user').innerHTML = `
    ${avatarCircle(user.full_name || user.username || 'U', 'w-8 h-8 text-xs')}
    <span class="text-sm font-medium text-gray-700 hidden sm:inline">${user.full_name || user.username || 'User'}</span>`;
}

function navigate(page) {
  if (!page || !pageRenderers[page]) page = 'dashboard';
  destroyCharts(); // clean up any Chart.js instances
  const content = document.getElementById('content');
  content.innerHTML = showLoading();
  content.className = 'flex-1 overflow-y-auto p-6 page-enter';

  // Update sidebar active state
  document.querySelectorAll('#nav a').forEach(a => {
    const isActive = a.dataset.page === page;
    a.className = `px-4 py-3 rounded-lg cursor-pointer flex items-center gap-3 text-sm font-medium transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`;
  });

  const labels = { dashboard: 'Dashboard', users: 'Users', reports: 'Reports', files: 'Files', settings: 'Settings' };
  renderHeader(labels[page] || 'Dashboard');
  pageRenderers[page]();
}

function logout() {
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_user');
  window.location.href = '/';
}

// --------------- Init ---------------
function initApp() {
  if (!getToken()) { window.location.href = '/'; return; }
  renderSidebar();
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  navigate(location.hash.slice(1) || 'dashboard');

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') hideModal();
  });
}

initApp();
