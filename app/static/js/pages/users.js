// ============================================================
//  TigerGate Platform — Users Page
// ============================================================

import { api, formatDate, avatarCircle, showModal, hideModal, showToast, showLoading, showEmpty, icons } from '../app.js';

let debounceTimer = null;
let currentUsersList = [];

export async function renderUsers() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="space-y-6">
      <!-- Action Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Search Box -->
        <div class="relative w-full sm:w-80">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            ${icons.search}
          </div>
          <input type="text" id="user-search-input"
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            placeholder="Search by name, username, email…">
        </div>

        <!-- Add User Button -->
        <button id="add-user-btn"
          class="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          <span>Add User</span>
        </button>
      </div>

      <!-- Users Table Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div id="users-table-container">
          ${showLoading()}
        </div>
      </div>
    </div>
  `;

  // Attach search listener
  const searchInput = document.getElementById('user-search-input');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadUsers(e.target.value.trim());
    }, 300);
  });

  // Attach Add User listener
  document.getElementById('add-user-btn').addEventListener('click', () => {
    openUserModal();
  });

  // Initial load
  loadUsers();
}

async function loadUsers(query = '') {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  try {
    const url = query ? `/users/search?q=${encodeURIComponent(query)}` : '/users';
    const res = await api(url);
    if (!res || !res.ok) {
      container.innerHTML = `<div class="p-6 text-sm text-red-600">Failed to load users list.</div>`;
      return;
    }
    const data = await res.json();
    currentUsersList = data.users || [];
    renderUsersTable(currentUsersList);
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-sm text-red-600">Error: ${err.message}</div>`;
  }
}

function roleBadge(role) {
  const badges = {
    admin:   'bg-red-100 text-red-700 border border-red-200',
    manager: 'bg-blue-100 text-blue-700 border border-blue-200',
    analyst: 'bg-amber-100 text-amber-700 border border-amber-200',
    viewer:  'bg-gray-100 text-gray-700 border border-gray-200',
  };
  return `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${badges[role] || badges.viewer}">${role || 'viewer'}</span>`;
}

function statusIndicator(status) {
  const isActive = status === 'active';
  return `
    <span class="inline-flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-green-700' : 'text-red-600'}">
      <span class="w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}"></span>
      ${isActive ? 'Active' : 'Inactive'}
    </span>
  `;
}

function renderUsersTable(users) {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = showEmpty('No users found.');
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm tg-table">
        <thead class="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3.5">User</th>
            <th class="px-6 py-3.5">Role</th>
            <th class="px-6 py-3.5">Department</th>
            <th class="px-6 py-3.5">Status</th>
            <th class="px-6 py-3.5">Last Login</th>
            <th class="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${users.map(u => `
            <tr>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  ${avatarCircle(u.full_name || u.username, 'w-9 h-9 text-xs')}
                  <div>
                    <div class="font-medium text-gray-900">${u.full_name || u.username}</div>
                    <div class="text-xs text-gray-500">@${u.username} &middot; ${u.email}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">${roleBadge(u.role)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-600">${u.department || '—'}</td>
              <td class="px-6 py-4 whitespace-nowrap">${statusIndicator(u.status)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">${u.last_login ? formatDate(u.last_login) : 'Never'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="edit-user-btn p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors" data-id="${u.id}" title="Edit User">
                    ${icons.edit}
                  </button>
                  <button class="delete-user-btn p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors" data-id="${u.id}" data-name="${u.full_name || u.username}" title="Deactivate User">
                    ${icons.trash}
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach table button listeners
  container.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const user = currentUsersList.find(u => u.id === id);
      if (user) openUserModal(user);
    });
  });

  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      const name = btn.dataset.name;
      if (confirm(`Are you sure you want to deactivate user "${name}"?`)) {
        await deleteUser(id);
      }
    });
  });
}

function openUserModal(user = null) {
  const isEdit = !!user;
  const title = isEdit ? 'Edit User' : 'Add New User';
  const depts = ['Engineering', 'Sales', 'Finance', 'Marketing', 'Product', 'Security', 'HR', 'Operations'];
  const roles = ['admin', 'manager', 'analyst', 'viewer'];

  const formHtml = `
    <form id="user-form" class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
        <input type="text" id="form-full-name" required value="${user ? (user.full_name || '') : ''}"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Username</label>
          <input type="text" id="form-username" required ${isEdit ? 'disabled class="bg-gray-100 text-gray-500 cursor-not-allowed ' : 'class="'}w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value="${user ? user.username : ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input type="email" id="form-email" required value="${user ? user.email : ''}"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Password ${isEdit ? '<span class="text-gray-400 font-normal">(leave blank to keep unchanged)</span>' : ''}</label>
        <input type="password" id="form-password" ${isEdit ? '' : 'required'}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="${isEdit ? '••••••••' : 'Enter account password'}">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Role</label>
          <select id="form-role" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none capitalize">
            ${roles.map(r => `<option value="${r}" ${user && user.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Department</label>
          <select id="form-department" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            ${depts.map(d => `<option value="${d}" ${user && user.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select id="form-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="active" ${!user || user.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${user && user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onclick="hideModal()" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" id="form-submit-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          ${isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  `;

  showModal(title, formHtml);

  const form = document.getElementById('user-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('form-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const payload = {
      full_name: document.getElementById('form-full-name').value.trim(),
      email: document.getElementById('form-email').value.trim(),
      role: document.getElementById('form-role').value,
      department: document.getElementById('form-department').value,
      status: document.getElementById('form-status').value,
    };

    if (!isEdit) {
      payload.username = document.getElementById('form-username').value.trim();
    }

    const pwd = document.getElementById('form-password').value;
    if (pwd) {
      payload.password = pwd;
    }

    try {
      const endpoint = isEdit ? `/users/${user.id}` : '/users';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await api(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to save user', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Save Changes' : 'Create User';
        return;
      }

      hideModal();
      showToast(isEdit ? 'User updated successfully' : 'User created successfully', 'success');
      loadUsers(document.getElementById('user-search-input')?.value.trim() || '');
    } catch (err) {
      showToast('Error saving user: ' + err.message, 'error');
      submitBtn.disabled = false;
    }
  });
}

async function deleteUser(userId) {
  try {
    const res = await api(`/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to deactivate user', 'error');
      return;
    }
    showToast('User deactivated', 'success');
    loadUsers(document.getElementById('user-search-input')?.value.trim() || '');
  } catch (err) {
    showToast('Error deactivating user: ' + err.message, 'error');
  }
}
