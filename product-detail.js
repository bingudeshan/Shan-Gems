/**
 * SHAN GEMS — product-detail.js
 * 360 Viewer & Digital Product Passport Logic
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
  product: null,
  cart: JSON.parse(localStorage.getItem('sg_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('sg_wishlist')) || [],
  rotation: 0,
  currency: localStorage.getItem('sg_currency') || 'USD',
  threeScene: null,
  threeGem: null
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
    await loadProduct();
    init360Viewer();
    initActions();
    observeFadeUps();
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
    renderProduct();
    updateCartUI();
    
    toast(`Currency switched to ${state.currency}`);
  });
}

/* ─── LOAD DATA ─────────────────────────────────────────── */
async function loadProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (!id) {
        window.location.href = 'products.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/products/${id}`);
        if (!res.ok) throw new Error('Product not found');
        state.product = await res.json();
    } catch (err) {
        console.error("Error loading product:", err);
        window.location.href = 'products.html';
        return;
    }

    renderProduct();
}

function renderProduct() {
    const p = state.product;
    
    // Core Info
    $('gemName').textContent = p.name;
    $('gemCategory').textContent = p.category.toUpperCase();
    $('gemPrice').innerHTML = formatPrice(p.price);
    // Removed static image injection to allow 3D viewer to mount cleanly
    
    // Inject SEO Schema
    injectProductSchema(p);
    
    // Specifications
    $('specTable').innerHTML = `
        <tr><td class="spec-label">Identification</td><td class="spec-val">${p.name}</td></tr>
        <tr><td class="spec-label">Weight</td><td class="spec-val">${p.details.split('·')[0].trim() || '--'}</td></tr>
        <tr><td class="spec-label">Shape / Cut</td><td class="spec-val">${p.details.split('·')[2]?.trim() || '--'}</td></tr>
        <tr><td class="spec-label">Origin</td><td class="spec-val">${p.origin}</td></tr>
        <tr><td class="spec-label">Treatment</td><td class="spec-val">${p.dpp?.treatment || 'No Treatment Disclosed'}</td></tr>
        <tr><td class="spec-label">Color</td><td class="spec-val">${p.category === 'sapphire' ? 'Blue / Royal Blue' : p.category}</td></tr>
    `;

    // Digital Product Passport
    if (p.dpp) {
        $('dppId').textContent = `DPP-ID: ${p.dpp.id}`;
        $('dppTimeline').innerHTML = `
            <div class="dpp-step">
                <span class="dpp-step__label">Mine of Origin</span>
                <span class="dpp-step__val">${p.dpp.mine}</span>
                <span class="dpp-step__meta">Mined: ${p.dpp.minedDate}</span>
            </div>
            <div class="dpp-step">
                <span class="dpp-step__label">Cutting & Polishing</span>
                <span class="dpp-step__val">${p.dpp.cutter}</span>
                <span class="dpp-step__meta">${p.dpp.cutDate}</span>
            </div>
            <div class="dpp-step">
                <span class="dpp-step__label">Certification</span>
                <span class="dpp-step__val">${p.dpp.certifier}</span>
                <span class="dpp-step__meta">Issued: ${p.dpp.certDate}</span>
            </div>
            <div class="dpp-step">
                <span class="dpp-step__label">Sustainability Disclosure</span>
                <span class="dpp-step__val">ESPR Compliant</span>
                <span class="dpp-step__meta">Carbon: ${p.dpp.carbon}</span>
            </div>
        `;
        
        // Certification authority
        $('certTitle').textContent = p.dpp.certifier;
        
        // Map Modal Fields
        $('modalDppId').textContent = `ID: ${p.dpp.id}`;
        $('modalMine').textContent = p.dpp.mine;
        $('modalMinedDate').textContent = `Mined: ${p.dpp.minedDate}`;
        $('modalCutter').textContent = p.dpp.cutter;
        $('modalCutDate').textContent = `Polished: ${p.dpp.cutDate}`;
        $('modalCarbon').textContent = `${p.dpp.carbon} kg`;
        $('modalTreatment').textContent = p.dpp.treatment || 'Natural';
    }
}

/**
 * Dynamic JSON-LD Injection for SEO
 */
function injectProductSchema(p) {
    // Remove existing if any
    const existing = document.getElementById('product-schema');
    if (existing) existing.remove();

    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p.name,
        "image": p.image || "",
        "description": `${p.name} - ${p.details}. Ethically sourced from ${p.origin}.`,
        "brand": {
            "@type": "Brand",
            "name": "Shan Gems"
        },
        "offers": {
            "@type": "Offer",
            "price": p.price,
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": window.location.href
        },
        "additionalProperty": [
            {
                "@type": "PropertyValue",
                "name": "Origin",
                "value": p.origin
            },
            {
                "@type": "PropertyValue",
                "name": "Weight",
                "value": p.details.split('·')[0].trim()
            }
        ]
    };

    const script = document.createElement('script');
    script.id = 'product-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
}

/* ─── 360 VIEWER (THREE.JS UPGRADE) ─────────────────────── */
function init360Viewer() {
    const container = $('gemViewer');
    if (!container || !window.THREE) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || width;

    // SCENE SETUP
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Position canvas absolute so it overlaps or replaces the placeholder nicely
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    // Clear placeholder and mount WebGL
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.appendChild(renderer.domElement);

    const p = state.product;
    if (!p) return;

    // GEOMETRY FACTORY based on p.shape
    let geometry;
    const shape = p.shape || 'round';
    
    if (shape === 'round') {
        geometry = new THREE.IcosahedronGeometry(1.5, 1);
    } else if (shape === 'princess' || shape === 'asscher') {
        geometry = new THREE.BoxGeometry(1.5, 1.5, 0.8);
    } else if (shape === 'cushion') {
        geometry = new THREE.BoxGeometry(1.6, 1.5, 0.9);
    } else if (shape === 'emerald-cut' || shape === 'radiant') {
        geometry = new THREE.BoxGeometry(1.2, 1.8, 0.8);
    } else if (shape === 'oval') {
        geometry = new THREE.IcosahedronGeometry(1.5, 1);
    } else if (shape === 'pear') {
        geometry = new THREE.SphereGeometry(1.2, 16, 16);
    } else if (shape === 'marquise') {
        geometry = new THREE.IcosahedronGeometry(1.5, 0);
    } else if (shape === 'trillion') {
        geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 3);
    } else if (shape === 'hexagon') {
        geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 6);
    } else if (shape === 'baguette') {
        geometry = new THREE.BoxGeometry(0.6, 2.2, 0.4);
    } else if (shape === 'kite' || shape === 'shield') {
        geometry = new THREE.OctahedronGeometry(1.5, 0);
    } else if (shape === 'briolette') {
        geometry = new THREE.SphereGeometry(1, 12, 12);
    } else if (shape === 'sphere') {
        geometry = new THREE.SphereGeometry(1.5, 32, 32);
    } else if (shape === 'cabochon') {
        geometry = new THREE.SphereGeometry(1.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    } else {
        geometry = new THREE.OctahedronGeometry(1.5, 0); 
    }
    
    const isSmooth = (shape === 'sphere' || shape === 'cabochon' || shape === 'pear');
    let materialOptions = {
        color: getGemColor(),
        shininess: isSmooth ? 50 : 150,
        specular: 0xffffff,
        transparent: true,
        opacity: isSmooth ? 0.95 : 0.85,
        flatShading: !isSmooth
    };

    // Special case for Opal (iridescence effect simulation)
    if (p.category === 'opal') {
        materialOptions.opacity = 0.9;
        materialOptions.shininess = 200;
    }

    // If product has an image, use it as a texture
    if (p.image) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin('anonymous');
        
        textureLoader.load(
            p.image, 
            (texture) => {
                material.map = texture;
                material.color.set(0xffffff); // Clear color to show texture
                material.needsUpdate = true;
            },
            undefined, 
            (err) => {
                console.warn('Texture load failed, falling back to gem color');
                material.color.set(getGemColor());
                material.needsUpdate = true;
            }
        );
    }

    const material = new THREE.MeshPhongMaterial(materialOptions);
    const gem = new THREE.Mesh(geometry, material);

    // Apply specific scaling/rotations for non-uniform shapes
    if (shape === 'oval') gem.scale.set(1.4, 1.1, 1);
    if (shape === 'pear') gem.scale.set(1, 1.6, 1);
    if (shape === 'marquise') gem.scale.set(1.8, 0.7, 0.7);
    if (shape === 'briolette') gem.scale.set(1, 2.4, 1);
    if (shape === 'kite') gem.scale.set(1, 2, 0.6);
    if (shape === 'shield') gem.scale.set(1.5, 1.5, 0.7);
    if (shape === 'trillion' || shape === 'hexagon') gem.rotation.x = Math.PI / 2;
    if (shape === 'cabochon') gem.rotation.x = -Math.PI / 2;

    // Add a subtle wireframe detail for luxury tech feel (skip for smooth spheres)
    if (shape !== 'sphere' && shape !== 'cabochon') {
        const wireframe = new THREE.Mesh(
            geometry, 
            new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 })
        );
        // Sync wireframe scaling
        wireframe.scale.copy(gem.scale);
        wireframe.rotation.copy(gem.rotation);
        gem.add(wireframe);
    }
    
    scene.add(gem);

    // LIGHTS
    const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
    light1.position.set(5, 5, 5);
    scene.add(light1);
    
    const light2 = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient
    scene.add(light2);

    const light3 = new THREE.PointLight(0x4785FF, 1);
    light3.position.set(-5, -5, 2);
    scene.add(light3);

    camera.position.z = 5;

    // STATE
    state.threeScene = scene;
    state.threeGem = gem;

    // INTERACTION
    let isDragging = false;
    let prevMouseX = 0;

    container.addEventListener('mousedown', (e) => { isDragging = true; prevMouseX = e.clientX; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = e.clientX - prevMouseX;
        gem.rotation.y += delta * 0.01;
        prevMouseX = e.clientX;
    });

    // Touch support
    container.addEventListener('touchstart', (e) => { isDragging = true; prevMouseX = e.touches[0].clientX; });
    window.addEventListener('touchend', () => { isDragging = false; });
    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientX - prevMouseX;
        gem.rotation.y += delta * 0.01;
        prevMouseX = e.touches[0].clientX;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (!isDragging) gem.rotation.y += 0.005;
        renderer.render(scene, camera);
    }
    animate();

    initZoom();
}

function getGemColor() {
    const cat = state.product?.category?.toLowerCase();
    if (cat === 'sapphire') return 0x0F52BA;
    if (cat === 'ruby') return 0xE0115F;
    if (cat === 'emerald') return 0x50C878;
    if (cat === 'alexandrite') return 0x8A2BE2;
    if (cat === 'diamond') return 0xFFFFFF;
    if (cat === 'pearl') return 0xFFFDD0;
    if (cat === 'garnet') return 0x9B111E;
    if (cat === 'aquamarine') return 0x7FFFD4;
    if (cat === 'amethyst') return 0x9966CC;
    if (cat === 'citrine') return 0xE4D00A;
    if (cat === 'opal') return 0xE2F1F1;
    if (cat === 'tourmaline') return 0xFF69B4;
    if (cat === 'lapis') return 0x26619C;
    return 0xADD8E6;
}

/* ─── ZOOM LOGIC ────────────────────────────────────────── */
function initZoom() {
    const container = document.querySelector('.gem-viewer-container');
    const viewer = $('gemViewer');
    
    container.addEventListener('click', () => {
        container.classList.toggle('zoomed');
    });

    container.addEventListener('mousemove', (e) => {
        if (!container.classList.contains('zoomed')) return;
        const canvas = viewer.querySelector('canvas');
        if (!canvas) return;
        
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        canvas.style.transformOrigin = `${x}% ${y}%`;
    });
}

/* ─── ACTIONS ───────────────────────────────────────────── */
function initActions() {
    $('addToCartBtn')?.addEventListener('click', () => {
        if (!state.product) return;
        addToCart(state.product.id);
    });

    $('wishlistBtn')?.addEventListener('click', () => {
        if (!state.product) return;
        toggleWishlist(state.product.id);
    });

    $('consultBtn')?.addEventListener('click', () => {
        window.open('https://wa.me/94777866799?text=Hello, I am interested in ' + (state.product?.name || 'a gemstone'), '_blank');
    });

    // DPP Modal Handlers
    $('openDppModalBtn')?.addEventListener('click', openDppModal);
    $('dppModalClose')?.addEventListener('click', closeDppModal);
    $('dppModalOverlay')?.addEventListener('click', (e) => { if (e.target === $('dppModalOverlay')) closeDppModal(); });
}

function openDppModal() {
    $('dppModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDppModal() {
    $('dppModalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function addToCart(id) {
    const existing = state.cart.find(i => i.id === id);
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({ ...state.product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    toast(`${state.product.emoji} Added to collection`);
}

function toggleWishlist(id) {
    const idx = state.wishlist.indexOf(id);
    if (idx === -1) {
        state.wishlist.push(id);
        toast('Added to Wishlist');
    } else {
        state.wishlist.splice(idx, 1);
        toast('Removed from Wishlist');
    }
    localStorage.setItem('sg_wishlist', JSON.stringify(state.wishlist));
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


