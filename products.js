/**
 * SHAN GEMS — products.js
 * Product Listing & Filtering Logic
 */

const CURRENCIES = {
  USD: { rate: 1, symbol: '$', label: 'USD' },
  LKR: { rate: 300, symbol: 'Rs. ', label: 'LKR' },
  EUR: { rate: 0.92, symbol: '€', label: 'EUR' },
  GBP: { rate: 0.79, symbol: '£', label: 'GBP' },
  JPY: { rate: 151, symbol: '¥', label: 'JPY' }
};

const API_BASE = window.location.origin;

/* ─── DATA & STATE ─────────────────────────────────────── */
const state = {
  allProducts: [],
  filteredProducts: [],
  cart: JSON.parse(localStorage.getItem('sg_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('sg_wishlist')) || [],
  comparison: [],
  activeFilters: {
    categories: [],
    types: [],
    sort: 'featured'
  },
  quickViewProduct: null,
  currency: localStorage.getItem('sg_currency') || 'USD'
};

function formatPrice(usdAmount) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const converted = usdAmount * cur.rate;
  
  if (state.currency === 'JPY') {
    return `${cur.symbol}${Math.round(converted).toLocaleString()}`;
  }
  return `${cur.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/* ─── DOM REFS ──────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ─── INITIALIZATION ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    initNav();
    initCart();
    initFilters();
    initSorting();
    await fetchProducts();
    handleUrlParams();
});

/* ─── NAVIGATION ────────────────────────────────────────── */
function initNav() {
    const nav = $('mainNav');
    const menuBtn = $('menuBtn');
    const drawer = $('navDrawer');
  
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  
    menuBtn?.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      menuBtn.classList.toggle('open', open);
    });

    initCurrencySelector();
}

function initCurrencySelector() {
  const selector = $('currencySelector');
  if (!selector) return;

  selector.value = state.currency;
  selector.addEventListener('change', (e) => {
    state.currency = e.target.value;
    localStorage.setItem('sg_currency', state.currency);
    
    // Global re-render
    applyFilters();
    updateCartUI();
    if (state.quickViewProduct) openQuickView(state.quickViewProduct.id);
    
    toast(`Currency switched to ${state.currency}`);
  });
}

/* ─── WISHLIST & COMPARE ────────────────────────────────── */
window.toggleWishlist = function(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx === -1) {
    state.wishlist.push(id);
    toast('Added to Wishlist');
  } else {
    state.wishlist.splice(idx, 1);
    toast('Removed from Wishlist');
  }
  localStorage.setItem('sg_wishlist', JSON.stringify(state.wishlist));
  renderProducts(); // Refresh buttons
};

window.toggleCompare = function(id) {
  const idx = state.comparison.indexOf(id);
  if (idx === -1) {
    if (state.comparison.length >= 3) {
      toast('Maximum 3 gems can be compared at once.');
      return;
    }
    state.comparison.push(id);
  } else {
    state.comparison.splice(idx, 1);
  }
  
  updateCompareBar();
  renderProducts(); // Refresh buttons
};

function updateCompareBar() {
  const bar = $('compareBar');
  const count = $('compareCount');
  if (!bar || !count) return;

  if (state.comparison.length > 0) {
    bar.classList.add('active');
    count.textContent = state.comparison.length;
  } else {
    bar.classList.remove('active');
  }
}

$('clearCompareBtn')?.addEventListener('click', () => {
    state.comparison = [];
    updateCompareBar();
    renderProducts();
});

/* ─── DATA SYNC ────────────────────────────────────────── */
async function fetchProducts() {
    try {
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        
        state.allProducts = Array.isArray(data) ? data : [];
        applyFilters();
    } catch (err) {
        console.error("Error fetching products from database:", err);
        state.allProducts = [];
        applyFilters();
    }
}

function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) {
        const checkbox = $$(`#categoryFilters input[value="${cat}"]`)[0];
        if (checkbox) {
            checkbox.checked = true;
            // Uncheck "All"
            $$('#categoryFilters input[value="all"]')[0].checked = false;
            applyFilters();
        }
    }
}

/* ─── FILTERING & SORTING ───────────────────────────────── */
function initFilters() {
    // Category Filters
    const catInputs = $$('#categoryFilters input');
    catInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (input.value === 'all' && input.checked) {
                catInputs.forEach(i => { if (i.value !== 'all') i.checked = false; });
            } else if (input.checked) {
                $$('#categoryFilters input[value="all"]')[0].checked = false;
            }
            applyFilters();
        });
    });

    // Type Filters
    $$('#typeFilters input').forEach(input => {
        input.addEventListener('change', applyFilters);
    });

    // Mobile Filter Toggle
    $('mobileFilterBtn')?.addEventListener('click', () => {
        const sidebar = document.querySelector('.filter-sidebar');
        sidebar.classList.toggle('open');
        // This would need extra CSS for .filter-sidebar.open on mobile
    });
}

function initSorting() {
    $('sortSelect')?.addEventListener('change', (e) => {
        state.activeFilters.sort = e.target.value;
        applyFilters();
    });
}

function applyFilters() {
    const selectedCats = Array.from($$('#categoryFilters input:checked')).map(i => i.value);
    const selectedTypes = Array.from($$('#typeFilters input:checked')).map(i => i.value);
    const sortRev = $('sortSelect').value;

    let list = [...state.allProducts];

    // 1. Filter by Category
    if (!selectedCats.includes('all') && selectedCats.length > 0) {
        list = list.filter(p => selectedCats.includes(p.category));
    }

    // 2. Filter by Type (keywords in name/details/tags)
    if (selectedTypes.length > 0) {
        list = list.filter(p => {
            const str = `${p.name} ${p.details} ${p.category}`.toLowerCase();
            return selectedTypes.some(t => str.includes(t.toLowerCase()));
        });
    }

    // 3. Sorting
    if (sortRev === 'price-low') {
        list.sort((a, b) => a.price - b.price);
    } else if (sortRev === 'price-high') {
        list.sort((a, b) => b.price - a.price);
    } else if (sortRev === 'newest') {
        list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }

    state.filteredProducts = list;
    renderProducts();
}

/* ─── RENDERING ─────────────────────────────────────────── */
function renderProducts() {
    const grid = $('productGrid');
    const countEl = $('productCount');
    
    countEl.textContent = `Showing ${state.filteredProducts.length} gemstone${state.filteredProducts.length === 1 ? '' : 's'}`;

    if (state.filteredProducts.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 5rem; color: var(--grey);">No gemstones match your selection.</div>`;
        return;
    }

    grid.innerHTML = state.filteredProducts.map(p => `
    <article class="product-card fade-up visible" data-id="${p.id}">
      <div class="product-card__image" onclick="window.location.href='product-detail.html?id=${p._id || p.id}'">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-card__img-file" loading="lazy">` : `<span aria-hidden="true" style="font-size:4.5rem;">${p.emoji || '💎'}</span>`}
        <div class="product-card__badges">
            ${p.badges ? p.badges.map(b => `<span class="badge ${b.includes('Certified') ? 'badge--cert' : 'badge--origin'}">${b}</span>`).join('') : ''}
        </div>
        <div class="product-card__actions">
          <button class="product-card__action-btn btn-quickview" aria-label="Quick View" onclick="event.stopPropagation(); openQuickView('${p.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          <button class="product-card__action-btn btn-add" aria-label="Add to cart" onclick="event.stopPropagation(); addToCart('${p.id}')">+</button>
        </div>
      </div>
      <div class="product-card__body" onclick="window.location.href='product-detail.html?id=${p.id}'">
        <div class="product-card__origin">${p.origin}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__details">${p.details}</div>
        <div class="product-card__footer">
          <div class="product-card__price">${formatPrice(p.price)}</div>
        </div>
      </div>
    </article>
    `).join('');
}

/* ─── QUICK VIEW ────────────────────────────────────────── */
window.openQuickView = function(id) {
    const product = state.allProducts.find(p => p.id === id);
    if (!product) return;

    state.quickViewProduct = product;
    const content = $('quickViewContent');
    
    content.innerHTML = `
        <div class="quick-view-grid">
            <div class="quick-view__image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius);" loading="lazy">` : `<span>${product.emoji || '💎'}</span>`}
            </div>
            <div class="quick-view__content">
                <div class="quick-view__origin">${product.origin}</div>
                <h2 class="quick-view__name">${product.name}</h2>
                <div class="quick-view__details">
                    <p>${product.details}</p>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${product.badges ? product.badges.map(b => `<span class="badge ${b.includes('Certified') ? 'badge--cert' : 'badge--origin'}">${b}</span>`).join('') : ''}
                    </div>
                </div>
                <div class="quick-view__price">${formatPrice(product.price)}</div>
                <div class="quick-view__actions">
                    <button class="btn btn--primary" onclick="addToCart('${product.id}'); closeQuickView();" style="flex: 1; justify-content: center;">ADD TO COLLECTION →</button>
                    <button class="product-card__action-btn" onclick="toggleWishlist('${product.id}')" style="width: 52px; height: 52px; border: 1px solid rgba(255,255,255,0.1);">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    $('quickViewOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.closeQuickView = function() {
    $('quickViewOverlay').classList.remove('open');
    document.body.style.overflow = '';
};

$('closeQuickView')?.addEventListener('click', closeQuickView);
$('quickViewOverlay')?.addEventListener('click', (e) => { if (e.target === $('quickViewOverlay')) closeQuickView(); });

/* ─── CART SYSTEM (Reused from script.js) ───────────────── */
function initCart() {
    updateCartUI();
    $('cartBtn')?.addEventListener('click', openCart);
    $('cartClose')?.addEventListener('click', closeCart);
    $('cartOverlay')?.addEventListener('click', (e) => { if (e.target === $('cartOverlay')) closeCart(); });
}

function addToCart(id) {
    const product = state.allProducts.find(p => p.id === id);
    if (!product) return;
    const existing = state.cart.find(i => i.id === id);
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    toast(`${product.emoji} Added to collection`);
}

function saveCart() {
    localStorage.setItem('sg_cart', JSON.stringify(state.cart));
}

function updateCartUI() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const countEl = $('cartCount');
    if (countEl) {
        countEl.textContent = count;
        countEl.classList.toggle('visible', count > 0);
    }
}

function openCart() {
    $('cartOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
}

function closeCart() {
    $('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function renderCart() {
    const body = $('cartBody');
    const totalEl = $('cartTotal');
    if (state.cart.length === 0) {
        body.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--grey);">Your selection is empty.</div>`;
        totalEl.textContent = 'USD 0';
        return;
    }
    body.innerHTML = state.cart.map(item => `
        <div class="cart-item" style="display:flex; gap:1rem; margin-bottom:1.5rem; align-items:center;">
            <div style="font-size:2rem; width:50px; height:50px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:4px;">
                ${item.image ? `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">` : item.emoji}
            </div>
            <div style="flex:1;">
                <div style="font-size:0.9rem; color:var(--royal-blue);">${item.name}</div>
                <div style="font-size:0.75rem; color:var(--grey);">${item.qty} × ${formatPrice(item.price)}</div>
            </div>
            <div style="font-weight:600;">${formatPrice(item.price * item.qty)}</div>
        </div>
    `).join('');
    
    const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    totalEl.textContent = formatPrice(total);
}

function initCart() {
    updateCartUI();
    $('cartBtn')?.addEventListener('click', openCart);
    $('cartClose')?.addEventListener('click', closeCart);
    $('cartOverlay')?.addEventListener('click', (e) => { if (e.target === $('cartOverlay')) closeCart(); });
    $('cartCheckoutBtn')?.addEventListener('click', () => {
        if (!state.cart.length) { toast('Your cart is empty.'); return; }
        closeCart();
        openPayment();
    });

    // Modal listeners
    ['checkoutModal'].forEach(id => {
        const overlay = $(`${id}Overlay`);
        if(overlay) {
            overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(id); });
            overlay.querySelector('.modal__close')?.addEventListener('click', () => closeModal(id));
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal('checkoutModal');
            closeCart();
        }
    });
}

function openModal(id) {
    const overlay = $(`${id}Overlay`);
    if(overlay) {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const overlay = $(`${id}Overlay`);
    if(overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function openPayment() {
    const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const checkoutTotal = $('checkoutTotal');
    if (checkoutTotal) checkoutTotal.textContent = formatPrice(total);
    
    openModal('checkoutModal');
    setupCheckoutListeners();
}

function setupCheckoutListeners() {
    const form = $('checkoutForm');
    if (form && !form.dataset.listenerBound) {
        form.addEventListener('submit', handlePayment);
        form.dataset.listenerBound = 'true';
        
        form.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'card') {
                    $('cardDetails').style.display = 'block';
                    $('wireDetails').style.display = 'none';
                } else {
                    $('cardDetails').style.display = 'none';
                    $('wireDetails').style.display = 'block';
                }
            });
        });
    }
}

async function handlePayment(e) {
    e.preventDefault();
    const btn = $('confirmOrderBtn');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked').value;

    const orderData = {
        customerName: $('chk-name').value,
        email: $('chk-email').value,
        shippingAddress: { address: $('chk-address').value },
        items: state.cart,
        totalAmount: total,
        paymentMethod: selectedPayment
    };

    try {
        const res = await fetch('http://localhost:5000/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!res.ok) throw new Error('Checkout failed');
        
        await res.json();
        closeModal('checkoutModal');
        state.cart = [];
        updateCartUI();
        toast(`✓ Order placed successfully! Invoice emailed.`);
    } catch (err) {
        toast(`✕ Error: ${err.message}`);
    } finally {
        btn.textContent = 'Place Order ' + formatPrice(total);
        btn.disabled = false;
    }
}


/* ─── UTILS ─────────────────────────────────────────────── */
function toast(msg) {
    const existing = document.querySelector('.toast-container');
    if (!existing) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const container = document.querySelector('.toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add('removing');
        el.addEventListener('animationend', () => el.remove());
    }, 3000);
}


