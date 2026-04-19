'use strict';

// API Configuration
const API_BASE = window.location.origin;
const CURRENCIES = {
  USD: { rate: 1, symbol: '$', label: 'USD' },
  LKR: { rate: 300, symbol: 'Rs. ', label: 'LKR' },
  EUR: { rate: 0.92, symbol: '€', label: 'EUR' },
  GBP: { rate: 0.79, symbol: '£', label: 'GBP' },
  JPY: { rate: 151, symbol: '¥', label: 'JPY' }
};


/* ─── DATA (Live API Seed Data moved to Admin) ─────────── */
// Hardcoded PRODUCTS array removed for live-data compliance.

const CATEGORIES = [
  { id: 'sapphire',         name: 'Sapphire',          count: 42, img: 'images/cat-sapphire.png',    cls: 'cat--sapphire' },
  { id: 'ruby',             name: 'Ruby',               count: 18, img: 'images/cat-ruby.png',        cls: 'cat--ruby' },
  { id: 'alexandrite',      name: 'Alexandrite',        count: 9,  img: 'images/cat-alexandrite.png', cls: 'cat--alexandrite' },
  { id: 'chrysoberyl',      name: 'Chrysoberyl',        count: 7,  img: 'images/cat-chrysoberyl.png', cls: 'cat--chrysoberyl' },
  { id: 'spinel',           name: 'Spinel',             count: 11, img: 'images/cat-spinel.png',      cls: 'cat--spinel' },
  { id: 'garnet',           name: 'Garnet',             count: 14, img: 'images/cat-garnet.png',      cls: 'cat--garnet' },
  { id: 'zircon',           name: 'Zircon',             count: 8,  img: 'images/cat-zircon.png',      cls: 'cat--zircon' },
  { id: 'topaz',            name: 'Topaz',              count: 12, img: 'images/cat-topaz.png',       cls: 'cat--topaz' },
  { id: 'aquamarine',       name: 'Aquamarine',         count: 11, img: 'images/cat-aquamarine.png', cls: 'cat--aqua' },
  { id: 'moonstone',        name: 'Moonstone',          count: 6,  img: 'images/cat-moonstone.png',   cls: 'cat--moonstone' },
  { id: 'quartz',           name: 'Quartz',             count: 15, img: 'images/cat-quartz.png',      cls: 'cat--quartz' },
  { id: 'opal',             name: 'Opal',               count: 7,  img: 'images/cat-opal.png',        cls: 'cat--opal' },
  { id: 'crystal',          name: 'Crystal',            count: 9,  img: 'images/cat-crystal.png',     cls: 'cat--crystal' },
  { id: 'ornamental',       name: 'Ornamental Stones',  count: 20, img: 'images/cat-ornamental.png',  cls: 'cat--ornamental' },
  { id: 'other',            name: 'Other Material',     count: 5,  img: 'images/cat-other.png',       cls: 'cat--other' }
];

/* ─── STATE ─────────────────────────────────────────────── */
const state = {
  products: [], // Loaded from Firestore
  cart: [],
  activeFilter: 'all',
  consultOpen: false,
  cartOpen: false,
  wishlist: JSON.parse(localStorage.getItem('sg_wishlist')) || [],
  comparison: [],
  dppProduct: null,
  arProduct: null,
  paymentOpen: false,
  paymentTab: 'card',
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

/* ─── NAV ───────────────────────────────────────────────── */
function initNav() {
  const nav = $('mainNav');
  const menuBtn = $('menuBtn');
  const drawer = $('navDrawer');

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Hamburger
  menuBtn.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    menuBtn.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close drawer on link click
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      menuBtn.classList.remove('open');
      document.body.style.overflow = '';
    });
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
    filterProducts(state.activeFilter);
    if (state.cartOpen) renderCart();
    if (state.paymentOpen) renderPaymentModal();
    
    toast(`Currency switched to ${state.currency}`);
  });
}

/* ─── RENDER CATEGORIES ─────────────────────────────────── */
function renderCategories() {
  const grid = $('categoryGrid');
  grid.innerHTML = CATEGORIES.map((cat, i) => {
    const imgStyle = cat.img
      ? `style="background-image: url('${cat.img}'); background-size: cover; background-position: center;"`
      : '';
    return `
    <div class="category-card ${cat.cls} ${i === 0 ? 'category-card--featured' : ''} ${cat.img ? 'category-card--has-img' : ''} fade-up"
         data-category="${cat.id}" role="button" tabindex="0" aria-label="Browse ${cat.name}"
         ${imgStyle}>
      <div class="category-card__overlay">
        <div>
          <div class="category-card__name">${cat.name}</div>
          <div class="category-card__count">${cat.count} stones available</div>
        </div>
      </div>
      <div class="category-card__arrow" aria-hidden="true">→</div>
    </div>
  `;
  }).join('');

  // Click → filter products
  grid.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      filterProducts(cat);
      document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ─── RENDER PRODUCTS ───────────────────────────────────── */
function renderProducts(list) {
  const grid = $('productGrid');
  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--grey-light);font-size:.85rem">No gems found in this category.</div>`;
    return;
  }
  grid.innerHTML = list.map(p => {
    const isWishlisted = state.wishlist.includes(p.id);
    const isComparing = state.comparison.includes(p.id);
    
    const badgeHTML = p.badges ? p.badges.map(b => {
      const cls = b.includes('Certified') ? 'badge--cert' : b.includes('Origin') ? 'badge--origin' : 'badge--rare';
      return `<span class="badge ${cls}">${b}</span>`;
    }).join('') : '';

    return `
    <article class="product-card fade-up visible" data-id="${p._id || p.id}">
      <div class="product-card__image" onclick="window.location.href='product-detail.html?id=${p._id || p.id}'" style="cursor: pointer;">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-card__img-file" loading="lazy">` : `<span aria-hidden="true" style="font-size:4.5rem;filter:drop-shadow(0 0 24px rgba(201,161,74,0.1))">${p.emoji || '💎'}</span>`}
        <div class="product-card__badges">${badgeHTML}</div>
        <div class="product-card__actions">
          <button class="product-card__action-btn btn-wishlist ${isWishlisted ? 'active' : ''}" 
                  aria-label="Toggle wishlist" data-id="${p._id || p.id}">
            <svg fill="${isWishlisted ? 'currentColor' : 'none'}" width="18" height="18" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          </button>
          <button class="product-card__action-btn btn-compare ${isComparing ? 'active' : ''}" 
                  aria-label="Toggle comparison" data-id="${p._id || p.id}">
            <svg fill="none" width="18" height="18" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          </button>
          <button class="product-card__action-btn btn-add" aria-label="Add to cart" data-id="${p._id || p.id}">+</button>
        </div>
      </div>
      <div class="product-card__body" onclick="window.location.href='product-detail.html?id=${p._id || p.id}'" style="cursor: pointer;">
        <div class="product-card__origin">${p.origin}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__details">${p.details}</div>
        <div class="product-card__footer">
          <div class="product-card__price">${formatPrice(p.price)}</div>
          <button class="product-card__dpp btn-dpp" data-id="${p._id || p.id}" aria-label="View Digital Product Passport" onclick="event.stopPropagation();">
            <span class="product-card__dpp-dot"></span> DPP
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  // Bind product card events
  grid.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); addToCart(btn.dataset.id); });
  });
  grid.querySelectorAll('.btn-dpp').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openDPP(btn.dataset.id); });
  });
  grid.querySelectorAll('.btn-wishlist').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleWishlist(btn.dataset.id); });
  });
  grid.querySelectorAll('.btn-compare').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleCompare(btn.dataset.id); });
  });

  observeFadeUps();
}

function filterProducts(cat) {
  state.activeFilter = cat;
  $$('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === cat));
  const list = cat === 'all' ? state.products : state.products.filter(p => p.category === cat);
  renderProducts(list);
}

function initFilters() {
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => filterProducts(btn.dataset.filter));
  });
}

/* ─── CART ──────────────────────────────────────────────── */
function addToCart(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  const existing = state.cart.find(i => i.id === id);
  if (existing) { existing.qty++; }
  else { state.cart.push({ ...product, qty: 1 }); }
  updateCartUI();
  toast(`${product.emoji} ${product.name} added to cart`);
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  updateCartUI();
  renderCart();
}

function updateQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  updateCartUI();
  renderCart();
}

function updateCartUI() {
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  const countEl = $('cartCount');
  countEl.textContent = count;
  countEl.classList.toggle('visible', count > 0);
}

function renderCart() {
  const body = $('cartBody');
  const totalEl = $('cartTotal');
  if (!state.cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">💎</div>
        <div class="cart-empty__text">Your collection is empty.<br>Discover our finest Sri Lankan gems.</div>
      </div>`;
    totalEl.textContent = formatPrice(0);
    return;
  }
  body.innerHTML = state.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item__image">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">` : `<span style="font-size:1.5rem;">${item.emoji}</span>`}
      </div>
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__origin">${item.origin}</div>
        <div class="cart-item__controls">
          <button class="qty-btn btn-qty-minus" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn btn-qty-plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
          <span class="cart-item__remove btn-remove" data-id="${item.id}" role="button" tabindex="0">Remove</span>
        </div>
      </div>
      <div class="cart-item__price">${formatPrice(item.price * item.qty)}</div>
    </div>`).join('');

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  totalEl.textContent = formatPrice(total);

  body.querySelectorAll('.btn-qty-minus').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.id, -1)));
  body.querySelectorAll('.btn-qty-plus').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.id, +1)));
  body.querySelectorAll('.btn-remove').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.id)));
}

function openCart() {
  state.cartOpen = true;
  $('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCart();
}

function closeCart() {
  state.cartOpen = false;
  $('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function initCart() {
  $('cartBtn').addEventListener('click', openCart);
  $('cartOverlay').addEventListener('click', e => { if (e.target === $('cartOverlay')) closeCart(); });
  $('cartClose').addEventListener('click', closeCart);
  $('cartCheckoutBtn').addEventListener('click', () => {
    if (!state.cart.length) { toast('Your cart is empty.'); return; }
    closeCart();
    openPayment();
  });
}

/* ─── DPP MODAL ─────────────────────────────────────────── */
function openDPP(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  state.dppProduct = product;
  const d = product.dpp || { id: 'DPP-SG-2026-PENDING', mine: 'Pending Verification', minedDate: 'N/A', cutter: 'N/A', cutDate: 'N/A', certifier: 'N/A', certDate: 'N/A', treatment: 'Natural', carbon: 'N/A', espr: 'Pending' };
  $('dppContent').innerHTML = `
    <div style="margin-bottom: 1.5rem; border-radius: 10px; overflow: hidden; background: var(--surface-2); height: 200px; display: flex; align-items: center; justify-content: center;">
      ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : `<span style="font-size: 4rem;">${product.emoji}</span>`}
    </div>
    <div class="dpp__id">
      <span>🔗 ${d.id}</span>
      <span class="dpp__id-verified">✓ Blockchain Verified</span>
    </div>
    <div class="dpp__timeline">
      <div class="dpp__step">
        <div class="dpp__step-label">⛏ Mine of Origin</div>
        <div class="dpp__step-value">${d.mine}</div>
        <div class="dpp__step-meta">Extracted: ${d.minedDate}</div>
      </div>
      <div class="dpp__step">
        <div class="dpp__step-label">💠 Cutting & Polishing</div>
        <div class="dpp__step-value">${d.cutter}</div>
        <div class="dpp__step-meta">Completed: ${d.cutDate}</div>
      </div>
      <div class="dpp__step">
        <div class="dpp__step-label">🏅 Gemological Certification</div>
        <div class="dpp__step-value">${d.certifier}</div>
        <div class="dpp__step-meta">Issued: ${d.certDate}</div>
      </div>
      <div class="dpp__step">
        <div class="dpp__step-label">🌿 Treatment Disclosure</div>
        <div class="dpp__step-value">${d.treatment}</div>
        <div class="dpp__step-meta">Carbon Footprint: ${d.carbon}</div>
      </div>
    </div>
    <div class="dpp__compliance">
      <div class="dpp__compliance-title">EU ESPR Compliance Data</div>
      <div class="dpp__compliance-grid">
        <div class="dpp__compliance-item">
          <div class="dpp__compliance-key">Compliance Status</div>
          <div class="dpp__compliance-val" style="color:#4ADE80">${d.espr}</div>
        </div>
        <div class="dpp__compliance-item">
          <div class="dpp__compliance-key">Material Origin</div>
          <div class="dpp__compliance-val">Sri Lanka (LK)</div>
        </div>
        <div class="dpp__compliance-item">
          <div class="dpp__compliance-key">Carbon Footprint</div>
          <div class="dpp__compliance-val">${d.carbon}</div>
        </div>
        <div class="dpp__compliance-item">
          <div class="dpp__compliance-key">Internationally recognized certificates</div>
          <div class="dpp__compliance-val" style="color:#4ADE80">✓ Yes — LK/2026</div>
        </div>
      </div>
    </div>`;
  $('dppModalTitle').textContent = `${product.name} — Digital Passport`;
  openModal('dppModal');
}

/* ─── AR MODAL ──────────────────────────────────────────── */
function openAR(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  $('arContent').innerHTML = `
    <div class="ar-preview">
      <div class="ar-preview__icon">${product.emoji}</div>
      <div class="ar-preview__text">
        AR Virtual Try-On module<br>
        <span style="font-size:.65rem;color:var(--grey);letter-spacing:.1em;text-transform:uppercase">WebGL / Three.js integration point</span><br>
        <span style="font-size:.68rem;color:var(--grey-light);margin-top:.5rem;display:block">Grant camera access to try on ${product.name}</span>
      </div>
    </div>
    <p style="font-size:.78rem;color:var(--grey-light);line-height:1.7;margin-bottom:1.25rem">
      This panel will host a <strong style="color:var(--gold-light)">Three.js / WebGL</strong> 3D digital twin with hand-tracking AR. 
      The DOM structure is AR-ready — connect your renderer to <code style="background:var(--surface-3);padding:.1rem .35rem;border-radius:2px;font-size:.72rem">#arCanvas-${id}</code>.
    </p>
    <canvas id="arCanvas-${id}" style="display:none"></canvas>`;
  $('arModalTitle').textContent = `AR Try-On — ${product.name}`;
  openModal('arModal');
}

/* ─── PAYMENT / CHECKOUT ─────────────────────────────────────── */
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
    
    // Toggle Payment Method Details
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
    
    const data = await res.json();
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

/* ─── MODAL SYSTEM ──────────────────────────────────────── */
function openModal(id) {
  const overlay = $(`${id}Overlay`);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const overlay = $(`${id}Overlay`);
  overlay.classList.remove('open');
  if (!state.cartOpen) document.body.style.overflow = '';
}

function initModals() {
  ['dppModal', 'arModal', 'checkoutModal'].forEach(id => {
    const overlay = $(`${id}Overlay`);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(id); });
    overlay.querySelector('.modal__close')?.addEventListener('click', () => closeModal(id));
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['dppModal', 'arModal', 'checkoutModal'].forEach(id => closeModal(id));
      closeCart();
      closeConsult();
    }
  });
}

/* ─── CONSULT WIDGET ────────────────────────────────────── */
function toggleConsult() {
  state.consultOpen = !state.consultOpen;
  $('consultPopup').classList.toggle('open', state.consultOpen);
}
function closeConsult() {
  state.consultOpen = false;
  $('consultPopup').classList.remove('open');
}
function initConsult() {
  $('consultBtn').addEventListener('click', toggleConsult);
  document.addEventListener('click', e => {
    if (!e.target.closest('.consult-widget')) closeConsult();
  });
  $$('.consult-popup__action').forEach(btn => {
    btn.addEventListener('click', () => { closeConsult(); toast('Connecting you to a gemologist…'); });
  });
}

/* ─── TOAST ─────────────────────────────────────────────── */
function toast(msg, duration = 3000) {
  const container = $('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

/* ─── INTERSECTION OBSERVER (fade-up) ──────────────────── */
function observeFadeUps() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.fade-up').forEach(el => obs.observe(el));
}

/* ─── DATA SYNC ────────────────────────────────────────── */
async function initDataSync() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const dbProducts = await res.json();
    if (dbProducts && Array.isArray(dbProducts)) {
      state.products = dbProducts;
      console.log("✓ Live products loaded from database:", dbProducts.length);
    } else {
      state.products = [];
    }
  } catch (err) {
    console.error("Fetch error. Database may be offline:", err);
    state.products = [];
  }
  filterProducts(state.activeFilter);
}

/* ─── HERO PARALLAX ─────────────────────────────────────── */
function initParallax() {
  const orb = document.querySelector('.hero__gem-orb');
  if (!orb || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    orb.style.transform = `translateY(-50%) translate(${x}px, ${y}px)`;
  }, { passive: true });
}

/* ─── SHOP NOW → products ───────────────────────────────── */
function initHeroCTA() {
  $('shopNowBtn')?.addEventListener('click', () => {
    window.location.href = 'products.html';
  });
  $('browseCatalogBtn')?.addEventListener('click', () => {
    $('categoriesSection').scrollIntoView({ behavior: 'smooth' });
  });
  $('arHeroBadge')?.addEventListener('click', () => {
    toast('AR Try-On — click the ⬡ icon on any product');
  });
}

/**
 * Migration helper: Run this once in the browser console 
 * to seed your Firestore with the initial 6 gems.
 */
window.migrateToFirebase = async function() {
  const productsCol = collection(db, 'products');
  toast("Seeding database... please wait.");
  for (const p of PRODUCTS) {
    const { id, ...data } = p;
    await addDoc(productsCol, data);
  }
  toast("✓ Database seeded successfully!");
};

/**
 * Saves a customer inquiry to Firestore
 */
async function saveInquiry(data) {
  try {
    const inquiriesCol = collection(db, 'inquiries');
    await addDoc(inquiriesCol, {
      ...data,
      timestamp: serverTimestamp(),
      status: 'new'
    });
    toast('✓ Inquiry sent! Our gemologists will contact you.');
  } catch (err) {
    console.error("Error saving inquiry:", err);
    toast('✕ Error sending message. Please try again.');
  }
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
  updateCounter('wishlist', state.wishlist.length);
  renderProducts(state.products); // Update icons
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
  renderProducts(state.products); // Update icons
};

function updateCompareBar() {
  const bar = $('#compareBar');
  const count = $('#compareCount');
  if (!bar || !count) return;

  if (state.comparison.length > 0) {
    bar.classList.add('active');
    count.textContent = state.comparison.length;
  } else {
    bar.classList.remove('active');
  }
}

function initShoppingFeatures() {
  $('#clearCompareBtn')?.addEventListener('click', () => {
    state.comparison = [];
    updateCompareBar();
    renderProducts(state.products);
  });

  $('#showCompareBtn')?.addEventListener('click', openCompareModal);
  $('#closeCompareModal')?.addEventListener('click', () => $('#compareModalOverlay').classList.remove('open'));
}

function openCompareModal() {
  const overlay = $('#compareModalOverlay');
  const container = $('#compareTableContainer');
  const selectedGems = state.comparison.map(id => state.products.find(p => p.id === id)).filter(Boolean);

  container.innerHTML = `
    <div class="compare-table-wrapper">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Characteristic</th>
            ${selectedGems.map(g => `<th>${g.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="compare-table__label">Preview</span></td>
            ${selectedGems.map(g => `<td><span class="compare-table__gem-img" style="width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; background: var(--surface-2);">
              ${g.image ? `<img src="${g.image}" alt="${g.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : g.emoji}
            </span></td>`).join('')}
          </tr>
          <tr>
            <td><span class="compare-table__label">Category</span></td>
            ${selectedGems.map(g => `<td><span class="compare-table__val">${g.category}</span></td>`).join('')}
          </tr>
          <tr>
            <td><span class="compare-table__label">Carats / cut</span></td>
            ${selectedGems.map(g => `<td><span class="compare-table__val">${g.details}</span></td>`).join('')}
          </tr>
          <tr>
            <td><span class="compare-table__label">Origin</span></td>
            ${selectedGems.map(g => `<td><span class="compare-table__val">${g.origin}</span></td>`).join('')}
          </tr>
          <tr>
            <td><span class="compare-table__label">Certification</span></td>
            ${selectedGems.map(g => `<td><span class="compare-table__val">${g.badges[0]}</span></td>`).join('')}
          </tr>
          <tr>
            <td><span class="compare-table__label">Price</span></td>
            ${selectedGems.map(g => `<td><span class="compare-table__val" style="font-weight:600; color:var(--royal-blue)">${formatPrice(g.price)}</span></td>`).join('')}
          </tr>
          <tr>
            <td></td>
            ${selectedGems.map(g => `
              <td>
                <button class="btn btn--primary btn--sm compare-table__btn" onclick="addToCart('${g.id}')">ADD TO CART</button>
              </td>
            `).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  `;
  overlay.classList.add('open');
}

/* ─── PREMIUM FEATURES ──────────────────────────────────── */

/**
 * Page Loader — Hide after content loaded
 */
function initLoader() {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;

  const hideLoader = () => {
    loader.classList.add('hidden');
    document.body.classList.add('loaded');
  };

  // If already loaded, hide immediately
  if (document.readyState === 'complete') {
    hideLoader();
    return;
  }

  // Hide on load event
  window.addEventListener('load', () => {
    setTimeout(hideLoader, 1200); // Luxury delay
  });

  // Emergency fallback: hide after 4 seconds regardless
  setTimeout(hideLoader, 4000);
}

/**
 * Search Overlay — Open, Close, and Search Logic
 */
function initSearchOverlay() {
  const searchBtn = document.getElementById('searchBtn');
  const overlay = document.getElementById('searchOverlay');
  const closeBtn = document.getElementById('searchOverlayClose');
  const input = document.getElementById('searchOverlayInput');

  if (!searchBtn || !overlay) return;

  const openSearch = () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 300);
  };

  const closeSearch = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  searchBtn.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch();
  });

  // Search on Enter
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
      }
    }
  });

  // Suggestion tags
  document.querySelectorAll('.search-suggestion-tag').forEach(tag => {
    tag.addEventListener('click', closeSearch);
  });
}

/**
 * Scroll Reveal — Intersection Observer for micro-animations
 */
function initScrollReveal() {
  const options = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Reveal once
      }
    });
  }, options);

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/**
 * Stats Ticker Pause — Simple interaction
 */
function initStatsTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  
  // Handled by CSS naturally, but we can add more logic here if needed
}

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();          // First
  initNav();
  initHeroCTA();
  renderCategories();
  initDataSync();
  initFilters();
  initCart();
  initModals();
  initConsult();
  initParallax();
  initHeroGem();
  initShoppingFeatures();
  observeFadeUps();
  
  // Premium additions
  initSearchOverlay();
  initScrollReveal();
  initStatsTicker();
});

/**
 * 3D Hero Gemstone Implementation
 * Renders a high-end, rotating sapphire in the hero section.
 */
function initHeroGem() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !window.THREE) return;

  const container = canvas.parentElement;
  
  // 1. Scene Setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: true, 
    alpha: true 
  });
  
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 2. Geometry & Materials (Luxury Sapphire)
  // We use an Icosahedron for a faceted look
  const geometry = new THREE.IcosahedronGeometry(2, 0); 
  
  const material = new THREE.MeshPhongMaterial({
    color: 0x0F52BA,     // Royal Blue Sapphire
    shininess: 150,
    specular: 0xffffff,
    transparent: true,
    opacity: 0.85,
    flatShading: true,   // Faceted appearance
  });

  // Wireframe overlay for tech-luxe feel
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x4785FF,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });

  const gem = new THREE.Mesh(geometry, material);
  const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
  gem.add(wireframe);
  scene.add(gem);

  // 3. Lighting
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
  mainLight.position.set(5, 5, 5);
  scene.add(mainLight);

  const backLight = new THREE.DirectionalLight(0x4785FF, 1);
  backLight.position.set(-5, -5, -5);
  scene.add(backLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
  scene.add(ambientLight);

  camera.position.z = 6;

  // 4. Mouse Interactivity Variables
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;

  window.addEventListener('mousemove', (e) => {
    // Normalized mouse coordinates (-1 to 1)
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // Set target rotation based on mouse
    targetRotationY = mouseX * 0.5;
    targetRotationX = mouseY * 0.5;
  }, { passive: true });

  // 5. Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    // Constant rotation
    gem.rotation.y += 0.005;
    
    // Subtle mouse follow (lerp for smoothness)
    gem.rotation.y += (targetRotationY - gem.rotation.y) * 0.05;
    gem.rotation.x += (targetRotationX - gem.rotation.x) * 0.05;

    // Subtle scale pulsing
    const scale = 1 + Math.sin(Date.now() * 0.001) * 0.03;
    gem.scale.set(scale, scale, scale);

    renderer.render(scene, camera);
  }

  // 6. Resize Handler
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  animate();
}
