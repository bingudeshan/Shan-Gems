'use strict';

/**
 * SHAN GEMS — admin.js (Full Rebuild)
 * Complete Admin Dashboard Logic
 */

/* ─── SEED DATA (Used only for one-time Cloud Sync) ────── */
const SEED_PRODUCTS = [
  { id: 'sg-001', name: 'Ceylon Blue Sapphire', category: 'sapphire', shape: 'round', carat: 4.82, price: 4850, origin: 'Rathnapura, Sri Lanka', emoji: '💎', details: '4.82 ct · Heat Treated · Oval Cut', badges: ['GIA Certified'] },
  { id: 'sg-002', name: 'Alexandrite', category: 'alexandrite', shape: 'oval', carat: 2.15, price: 12500, origin: 'Okkampitiya, Sri Lanka', emoji: '🟣', details: '2.15 ct · Natural · Cushion Cut', badges: ['AGL Certified', 'Rare'] },
  { id: 'sg-003', name: 'Padparadscha Sapphire', category: 'padparadscha', shape: 'round', carat: 1.87, price: 9200, origin: 'Elahera, Sri Lanka', emoji: '🟠', details: '1.87 ct · Unheated · Oval Cut', badges: ['Lotus Certified'] },
  { id: 'sg-004', name: 'Star Ruby', category: 'ruby', shape: 'oval', carat: 5.30, price: 6750, origin: 'Monaragala, Sri Lanka', emoji: '🔴', details: '5.30 ct · Natural Star · Cabochon', badges: ['Internationally Recognized Certificates'] },
  { id: 'sg-005', name: 'Tsavorite Garnet', category: 'garnet', shape: 'round', carat: 3.44, price: 3100, origin: 'Ratnapura, Sri Lanka', emoji: '💚', details: '3.44 ct · Natural · Round Brilliant', badges: ['GIA Certified'] },
  { id: 'sg-006', name: 'Yellow Sapphire', category: 'sapphire', shape: 'round', carat: 6.12, price: 5400, origin: 'Ratnapura, Sri Lanka', emoji: '💛', details: '6.12 ct · Heat Treated · Cushion Cut', badges: ['GIA Certified'] },
  { id: 'sg-007', name: 'Rare Emerald', category: 'emerald', shape: 'emerald-cut', carat: 2.50, price: 15400, origin: 'Colombia', emoji: '💚', details: '2.50 ct · Emerald Cut', badges: ['Investment Grade'] },
  { id: 'sg-008', name: 'Diamond', category: 'diamond', shape: 'round', carat: 1.20, price: 18200, origin: 'Botswana', emoji: '💎', details: '1.20 ct · Round Brilliant', badges: ['GIA Certified'] },
  { id: 'sg-009', name: 'Aquamarine', category: 'aquamarine', shape: 'oval', carat: 8.40, price: 2800, origin: 'Sri Lanka', emoji: '❄️', details: '8.40 ct · Oval Cut', badges: ['NGJA Certified'] },
  { id: 'sg-010', name: 'Amethyst', category: 'amethyst', shape: 'round', carat: 12.50, price: 1200, origin: 'Madagascar', emoji: '🟣', details: '12.50 ct · Oval Cut', badges: ['Shan Certified'] },
  { id: 'sg-011', name: 'Pearl', category: 'pearl', shape: 'sphere', carat: 0.0, price: 4200, origin: 'Philippines', emoji: '🐚', details: '14mm · Sphere', badges: ['Rare Color'] },
  { id: 'sg-012', name: 'Black Agate', category: 'agate', shape: 'oval', carat: 25.0, price: 450, origin: 'India', emoji: '🌑', details: '25.0 ct · Cabochon', badges: ['Hand Carved'] },
  { id: 'sg-013', name: 'Tourmaline', category: 'tourmaline', shape: 'emerald-cut', carat: 4.15, price: 3100, origin: 'Afghanistan', emoji: '🍉', details: '4.15 ct · Emerald Cut', badges: ['Unique Specimen'] },
  { id: 'sg-014', name: 'Lapis Lazuli', category: 'lapis', shape: 'emerald-cut', carat: 50.0, price: 850, origin: 'Afghanistan', emoji: '🟦', details: '50 ct · Rectangular', badges: ['Traditional Sourcing'] },
  { id: 'sg-015', name: 'Rainbow Opal', category: 'opal', shape: 'oval', carat: 3.80, price: 2400, origin: 'Ethiopia', emoji: '🌈', details: '3.80 ct · Cabochon', badges: ['Investment Grade'] }
];



/* ─── STATE ─────────────────────────────────────────────── */
const state = {
  products: [],
  orders: [],
  inquiries: [],
  editingProductId: null
};

const API_BASE = window.location.origin;

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setAdminUser();
  updateClock();
  setInterval(updateClock, 30000);
  initHamburger();
  initProductForm();
  loadAll();
});

function checkAuth() {
  const token = localStorage.getItem('shangems_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }
}

function setAdminUser() {
  const user = JSON.parse(localStorage.getItem('shangems_admin_user') || '{}');
  if (user.name) document.getElementById('adminUserName').textContent = user.name;
}

function handleLogout() {
  localStorage.removeItem('shangems_admin_token');
  localStorage.removeItem('shangems_admin_user');
  window.location.href = 'admin-login.html';
}

function updateClock() {
  const el = document.getElementById('topbarTime');
  if (el) el.textContent = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── PAGE SWITCHING ────────────────────────────────────── */
function switchPage(pageId, btn) {
  // Update active link
  document.querySelectorAll('.sidebar-nav__link').forEach(l => l.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Update pages
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Update breadcrumb
  const labels = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', inquiries: 'Inquiries', analytics: 'Analytics', settings: 'Settings' };
  document.getElementById('breadcrumbCurrent').textContent = labels[pageId] || pageId;

  // Close mobile sidebar
  document.getElementById('adminSidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* ─── LOAD DATA ─────────────────────────────────────────── */
async function loadAll() {
  await loadProducts();
  await loadStats();
  await loadInquiries();
  await loadOrders();
  initCharts();
  renderTopPerformers();
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('shangems_admin_token')}` }
    });
    const stats = await res.json();
    
    document.getElementById('statTotal').textContent = stats.totalGems || 0;
    document.getElementById('statOrders').textContent = stats.activeOrders || 0;
    document.getElementById('statInquiries').textContent = stats.totalInquiries || 0;
    document.getElementById('statRevenue').textContent = `$${(stats.totalRevenue || 0).toLocaleString()}`;
    
    // Analytics Page
    const conv = document.getElementById('statConversion');
    if (conv) conv.textContent = stats.totalOrders > 0 ? ((stats.totalOrders / (stats.totalOrders + 10)) * 100).toFixed(1) + '%' : '0%';
    
    const reach = document.getElementById('statReach');
    if (reach) reach.textContent = stats.countriesReached || 0;

  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

async function loadProducts() {
  const syncBtn = document.getElementById('syncCloudBtn');
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();
    state.products = Array.isArray(data) ? data : [];
    
    // Show sync button only if DB is empty
    if (syncBtn) {
      syncBtn.style.display = state.products.length === 0 ? 'inline-flex' : 'none';
    }
  } catch (err) {
    console.error("Failed to load products from API:", err);
    state.products = [];
    if (syncBtn) syncBtn.style.display = 'inline-flex';
  }
  renderProductTable(state.products);
  renderDashProductTable(state.products);
  document.getElementById('statTotal').textContent = state.products.length;
}

async function loadInquiries() {
  try {
    const res = await fetch(`${API_BASE}/api/inquiries`);
    const data = await res.json();
    state.inquiries = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to load inquiries:", err);
    state.inquiries = [];
  }
  renderInquiries();
  const pending = state.inquiries.filter(i => i.status === 'new').length;
  document.getElementById('inquiryCountBadge').textContent = pending;
  document.getElementById('statInquiries').textContent = pending;
}

async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('shangems_admin_token')}` }
    });
    const data = await res.json();
    state.orders = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to load orders:", err);
    state.orders = [];
  }
  renderOrders();
  document.getElementById('statOrders').textContent = state.orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  document.getElementById('ordersCountBadge').textContent = state.orders.filter(o => o.status === 'pending').length;
}

/* ─── RENDER PRODUCTS ───────────────────────────────────── */
function renderProductTable(list) {
  const tbody = document.getElementById('productTableBody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state__icon">💎</div><p class="empty-state__text">No gemstones yet. Add your first stone!</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div class="gem-preview">
          ${p.image ? `<img src="${p.image}" class="gem-icon" style="object-fit: cover;">` : `<div class="gem-icon">${p.emoji || '💎'}</div>`}
          <div>
            <div class="gem-name">${p.name}</div>
            <div class="gem-origin">${p.origin || ''}</div>
          </div>
        </div>
      </td>
      <td style="text-transform:capitalize; font-size:0.8rem;">${p.category}</td>
      <td style="font-size:0.8rem; color:var(--grey);">${p.carat ? p.carat + ' ct' : (p.details || '--')}</td>
      <td style="font-weight:600;">$${(p.price || 0).toLocaleString()}</td>
      <td><span class="status-pill status-pill--available">Available</span></td>
      <td>
        <div class="action-group">
          <button class="action-btn" onclick="editProduct('${p._id || p.id}')">Edit</button>
          <button class="action-btn action-btn--danger" onclick="deleteProduct('${p._id || p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderDashProductTable(list) {
  const tbody = document.getElementById('dashProductBody');
  if (!tbody) return;
  const recent = list.slice(0, 5);
  tbody.innerHTML = recent.map(p => `
    <tr>
      <td>
        <div class="gem-preview">
          ${p.image ? `<img src="${p.image}" class="gem-icon" style="object-fit: cover;">` : `<div class="gem-icon">${p.emoji || '💎'}</div>`}
          <div><div class="gem-name">${p.name}</div></div>
        </div>
      </td>
      <td style="text-transform:capitalize; font-size:0.8rem;">${p.category}</td>
      <td style="font-weight:600;">$${(p.price || 0).toLocaleString()}</td>
      <td><span class="status-pill status-pill--available">Available</span></td>
    </tr>
  `).join('');
}

/* ─── SEARCH & FILTER ───────────────────────────────────── */
function filterProductTable() {
  const search = document.getElementById('productSearch').value.toLowerCase();
  const cat = document.getElementById('productCatFilter').value;

  const filtered = state.products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || (p.origin || '').toLowerCase().includes(search);
    const matchCat = !cat || p.category === cat;
    return matchSearch && matchCat;
  });

  renderProductTable(filtered);
}

/* ─── RENDER ORDERS ─────────────────────────────────────── */
function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  tbody.innerHTML = state.orders.map(o => `
    <tr>
      <td style="font-weight:600; color:var(--gold);">${o.id}</td>
      <td>${o.customer}<br><span style="font-size:0.72rem; color:var(--grey);">${o.country}</span></td>
      <td style="font-size:0.82rem;">${o.product}</td>
      <td style="font-weight:600;">$${o.amount.toLocaleString()}</td>
      <td><span class="status-pill status-pill--${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
      <td style="font-size:0.78rem; color:var(--grey);">${new Date(o.date).toLocaleDateString()}</td>
      <td>
        <div class="action-group">
          <button class="action-btn" onclick="updateOrderStatus('${o.id}')">Update</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateOrderStatus(id) {
  const order = state.orders.find(o => o.id === id);
  if (!order) return;
  const next = { pending: 'processing', processing: 'shipped', shipped: 'completed', completed: 'completed' };
  order.status = next[order.status] || order.status;
  renderOrders();
  showToast(`✓ Order ${id} updated to ${order.status}`);
}

/* ─── RENDER INQUIRIES ──────────────────────────────────── */
function renderInquiries() {
  const container = document.getElementById('inquiryListFull');
  if (!container) return;
  if (!state.inquiries.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">💬</div><p class="empty-state__text">No inquiries yet.</p></div>`;
    return;
  }
  container.innerHTML = state.inquiries.map(i => `
    <div class="inquiry-card">
      <div class="inquiry-card__header">
        <span class="inquiry-card__name">${i.name} <span style="font-size:0.72rem; font-weight:400; color:var(--grey);">· ${i.gemstone || 'General Inquiry'}</span></span>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <span class="status-pill status-pill--${i.status}">${i.status === 'new' ? 'New' : 'Replied'}</span>
          <span class="inquiry-card__time">${new Date(i.date).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="inquiry-card__email">${i.email}</div>
      <div class="inquiry-card__message">${i.message}</div>
      <div style="display:flex; gap:0.5rem; margin-top:1rem;">
        <a class="action-btn" href="mailto:${i.email}">Reply via Email</a>
        <button class="action-btn" onclick="markReplied('${i.id}')">Mark as Replied</button>
      </div>
    </div>
  `).join('');
}

function markReplied(id) {
  const inq = state.inquiries.find(i => i.id === id);
  if (inq) {
    inq.status = 'replied';
    renderInquiries();
    const pending = state.inquiries.filter(i => i.status === 'new').length;
    document.getElementById('inquiryCountBadge').textContent = pending;
    showToast('✓ Inquiry marked as replied');
  }
}

/* ─── PRODUCT MODAL ─────────────────────────────────────── */
function openProductModal(editId = null) {
  const modal = document.getElementById('productModalOverlay');
  const title = document.getElementById('productModalTitle');

  if (editId) {
    const p = state.products.find(x => (x._id || x.id) === editId);
    if (p) {
      title.textContent = 'Edit Gemstone';
      document.getElementById('p-id').value = editId;
      document.getElementById('p-name').value = p.name;
      document.getElementById('p-category').value = p.category;
      document.getElementById('p-carat').value = p.carat || '';
      document.getElementById('p-price').value = p.price;
      document.getElementById('p-origin').value = p.origin || '';
      document.getElementById('p-cert').value = (p.badges && p.badges[0]) || '';
      document.getElementById('p-details').value = p.details || '';
      document.getElementById('p-emoji').value = p.emoji || '💎';
      document.getElementById('p-shape').value = p.shape || 'round';
      state.editingProductId = editId;
    }
  } else {
    title.textContent = 'Add New Gemstone';
    document.getElementById('productForm').reset();
    document.getElementById('p-id').value = '';
    state.editingProductId = null;
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function editProduct(id) {
  openProductModal(id);
}

function initProductForm() {
  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('productSaveBtn');
    btn.textContent = 'SAVING...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('name', document.getElementById('p-name').value);
    formData.append('category', document.getElementById('p-category').value);
    formData.append('carat', parseFloat(document.getElementById('p-carat').value) || 0);
    formData.append('price', parseInt(document.getElementById('p-price').value));
    formData.append('origin', document.getElementById('p-origin').value);
    formData.append('details', document.getElementById('p-details').value);
    formData.append('emoji', document.getElementById('p-emoji').value || '💎');
    formData.append('badges', document.getElementById('p-cert').value);
    formData.append('shape', document.getElementById('p-shape').value || 'round');

    const imageFile = document.getElementById('p-image').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const editId = state.editingProductId;
    const isDummy = editId && editId.toString().startsWith('sg-');
    const token = localStorage.getItem('shangems_admin_token');

    try {
      let res;
      if (editId && !isDummy) {
        res = await fetch(`${API_BASE}/api/products/${editId}`, { 
          method: 'PUT', 
          headers: { 'Authorization': `Bearer ${token}` }, 
          body: formData 
        });
      } else {
        // If it's a new product OR a dummy product (no real _id yet), use POST
        res = await fetch(`${API_BASE}/api/products`, { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}` }, 
          body: formData 
        });
      }

      if (res.ok) {
        await loadProducts();
        closeProductModal();
        showToast(`✓ Gemstone saved successfully`);
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      console.error(err);
      showToast('✕ Network error. Check server console.');
    } finally {
      btn.textContent = 'SAVE GEMSTONE →';
      btn.disabled = false;
    }
  });
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to remove this gemstone from the collection?')) return;

  try {
    const res = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) { await loadProducts(); showToast('✓ Gemstone deleted'); return; }
    throw new Error();
  } catch {
    state.products = state.products.filter(p => (p._id || p.id) !== id);
    renderProductTable(state.products);
    renderDashProductTable(state.products);
    document.getElementById('statTotal').textContent = state.products.length;
    showToast('✓ Gemstone removed');
  }
}

/* ─── SYNC TO CLOUD ─────────────────────────────────────── */
async function syncToCloud() {
  const btn = document.getElementById('syncCloudBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '⌛ Syncing...';
  btn.disabled = true;

  const token = localStorage.getItem('shangems_admin_token');
  let successCount = 0;

  try {
    for (const p of SEED_PRODUCTS) {
      const formData = new FormData();
      formData.append('name', p.name);
      formData.append('category', p.category);
      formData.append('carat', p.carat);
      formData.append('price', p.price);
      formData.append('origin', p.origin);
      formData.append('details', p.details);
      formData.append('emoji', p.emoji);
      formData.append('shape', p.shape || 'round');
      formData.append('badges', (p.badges || []).join(', '));
      
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) successCount++;
    }

    showToast(`✓ Successfully synced ${successCount} stones to MongoDB`);
    await loadProducts(); // Refresh and hide button
  } catch (err) {
    console.error(err);
    showToast('✕ Sync failed. Check console.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/* ─── CHARTS ────────────────────────────────────────────── */
function initCharts() {
  const fontColor = 'rgba(255,255,255,0.5)';
  const gridColor = 'rgba(255,255,255,0.05)';

  const chartDefaults = {
    plugins: { legend: { labels: { color: fontColor, font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: fontColor }, grid: { color: gridColor } },
      y: { ticks: { color: fontColor }, grid: { color: gridColor } }
    }
  };

  // Revenue Line Chart (Simplified for live data start)
  const revenueData = state.orders.length > 0 ? [5000, 8000, 12000] : [0, 0, 0];
  new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
      labels: ['Last Month', 'This Month', 'Projected'],
      datasets: [{
        label: 'Revenue (USD)',
        data: revenueData,
        borderColor: '#C9A14A',
        backgroundColor: 'rgba(201, 161, 74, 0.06)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#C9A14A',
        pointRadius: 4
      }]
    },
    options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
  });

  // Category Doughnut
  new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: ['Sapphire', 'Ruby', 'Alexandrite', 'Padparadscha', 'Emerald', 'Spinel'],
      datasets: [{
        data: [42, 18, 9, 6, 27, 15],
        backgroundColor: ['#2563EB', '#9B1C1C', '#6B21A8', '#EA580C', '#065F46', '#78350F'],
        borderColor: 'transparent',
        hoverOffset: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: fontColor, padding: 12, font: { size: 11 } } } } }
  });

  // Visitors Chart (Simplified)
  const visitorsCtx = document.getElementById('visitorsChart');
  if (visitorsCtx) {
    new Chart(visitorsCtx, {
      type: 'bar',
      data: {
        labels: ['Today'],
        datasets: [{
          label: 'Active Sessions',
          data: [state.products.length > 0 ? 12 : 0],
          backgroundColor: 'rgba(201, 161, 74, 0.3)',
          borderColor: '#C9A14A',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderTopPerformers() {
  const container = document.getElementById('topPerformers');
  if (!container) return;

  const items = state.products.slice(0, 4).map(p => ({
    name: p.name,
    views: Math.floor(Math.random() * 50) + 10, // Placeholder until view tracking is added
    emoji: p.emoji || '💎'
  }));

  container.innerHTML = items.map((item, i) => `
    <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem 0; ${i < items.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.04);' : ''}">
      <span style="font-size:1.4rem;">${item.emoji}</span>
      <div style="flex:1;">
        <div style="font-size:0.85rem; color:#fff;">${item.name}</div>
        <div style="font-size:0.7rem; color:var(--grey);">${item.views} views</div>
      </div>
      <div style="font-size:0.72rem; color:var(--gold); font-weight:600;">#${i + 1}</div>
    </div>
  `).join('');
}

/* ─── UI UTILITIES ──────────────────────────────────────── */
function showToast(msg) {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

function initHamburger() {
  const hamburger = document.getElementById('adminHamburger');
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// Expose to HTML
window.switchPage = switchPage;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.markReplied = markReplied;
window.filterProductTable = filterProductTable;
window.handleLogout = handleLogout;
window.showToast = showToast;
window.syncToCloud = syncToCloud;
