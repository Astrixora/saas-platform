// ============================================================
//  TigerGate Platform — Files Page
// ============================================================

import { api, formatDate, formatFileSize, showToast, showLoading, showEmpty, icons, getToken, getUser } from '../app.js';

export async function renderFiles() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Upload Zone Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">File Storage & Assets</h3>
        <p class="text-xs text-gray-500 mb-4">Upload configuration bundles, diagnostic dumps, and security artifacts.</p>

        <div id="drop-zone" class="upload-zone py-8 px-4 flex flex-col items-center justify-center cursor-pointer text-center">
          <div class="w-12 h-12 mb-3 text-indigo-500 bg-indigo-50 rounded-full flex items-center justify-center">
            ${icons.upload}
          </div>
          <p class="text-sm font-medium text-gray-700">
            Drag and drop files here, or <span class="text-indigo-600 hover:text-indigo-700 underline font-semibold">browse</span>
          </p>
          <p class="text-xs text-gray-400 mt-1">Supports any file type up to 50 MB</p>
          <input type="file" id="file-input" class="hidden">
        </div>

        <!-- Upload Status Indicator -->
        <div id="upload-status" class="hidden mt-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-3">
          <div class="spinner w-4 h-4 border-2 border-indigo-600 border-t-transparent"></div>
          <span id="upload-status-text" class="text-xs font-medium text-indigo-800">Uploading file…</span>
        </div>
      </div>

      <!-- Files Table Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 class="text-base font-semibold text-gray-900">Uploaded Files</h4>
          <button id="refresh-files-btn" class="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors" title="Refresh">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        <div id="files-table-container">
          ${showLoading()}
        </div>
      </div>
    </div>
  `;

  // Attach Drag-and-Drop & Upload listeners
  setupUploadHandlers();

  document.getElementById('refresh-files-btn').addEventListener('click', loadFiles);

  loadFiles();
}

function setupUploadHandlers() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) handleFileUpload(files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
      fileInput.value = '';
    }
  });
}

async function handleFileUpload(file) {
  const statusEl = document.getElementById('upload-status');
  const statusText = document.getElementById('upload-status-text');

  statusEl.classList.remove('hidden');
  statusText.textContent = `Uploading "${file.name}" (${formatFileSize(file.size)})…`;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to upload file', 'error');
    } else {
      showToast(`Uploaded "${file.name}" successfully!`, 'success');
      loadFiles();
    }
  } catch (err) {
    showToast('Upload error: ' + err.message, 'error');
  } finally {
    statusEl.classList.add('hidden');
  }
}

async function loadFiles() {
  const container = document.getElementById('files-table-container');
  if (!container) return;

  try {
    const res = await api('/files');
    if (!res || !res.ok) {
      container.innerHTML = `<div class="p-6 text-sm text-red-600">Failed to load files list.</div>`;
      return;
    }
    const data = await res.json();
    renderFilesTable(data.files || []);
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-sm text-red-600">Error: ${err.message}</div>`;
  }
}

function renderFilesTable(files) {
  const container = document.getElementById('files-table-container');
  if (!container) return;

  if (files.length === 0) {
    container.innerHTML = showEmpty('No files uploaded yet. Drag and drop a file above.');
    return;
  }

  const currentUser = getUser();
  const canDelete = currentUser.role === 'admin' || currentUser.role === 'manager';

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm tg-table">
        <thead class="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3.5">Filename</th>
            <th class="px-6 py-3.5">Size</th>
            <th class="px-6 py-3.5">Type</th>
            <th class="px-6 py-3.5">Uploaded By</th>
            <th class="px-6 py-3.5">Upload Date</th>
            <th class="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${files.map(f => `
            <tr>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    ${icons.file}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 truncate max-w-xs" title="${f.original_name || f.filename}">
                      ${f.original_name || f.filename}
                    </div>
                    <div class="text-xs text-gray-400 font-mono">${f.filename}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-mono">${formatFileSize(f.file_size)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                <span class="px-2 py-0.5 bg-gray-100 rounded text-gray-600">${f.mime_type || 'binary'}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">${f.uploaded_by_name || 'System'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">${formatDate(f.created_at)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="download-file-btn p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors"
                    data-id="${f.id}" data-name="${f.original_name || f.filename}" title="Download File">
                    ${icons.download}
                  </button>
                  ${canDelete ? `
                    <button class="delete-file-btn p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors"
                      data-id="${f.id}" data-name="${f.original_name || f.filename}" title="Delete File">
                      ${icons.trash}
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach download handlers
  container.querySelectorAll('.download-file-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      await downloadFileBlob(id, name);
    });
  });

  // Attach delete handlers
  container.querySelectorAll('.delete-file-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      if (confirm(`Are you sure you want to delete "${name}"?`)) {
        await deleteFileItem(id);
      }
    });
  });
}

async function downloadFileBlob(fileId, filename) {
  try {
    const token = getToken();
    const res = await fetch(`/api/files/${fileId}/download`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to download file', 'error');
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

async function deleteFileItem(fileId) {
  try {
    const res = await api(`/files/${fileId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to delete file', 'error');
      return;
    }
    showToast('File deleted successfully', 'success');
    loadFiles();
  } catch (err) {
    showToast('Error deleting file: ' + err.message, 'error');
  }
}
