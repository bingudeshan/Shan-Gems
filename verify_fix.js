// Verification script using native fetch

async function testFix() {
    const API_BASE = 'http://localhost:5000';
    
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@shangems.com', password: 'admin123' })
    });
    const { token } = await loginRes.json();
    console.log('Token acquired:', token);

    // 2. Simulate "Edit & Save" of dummy product sg-001
    // This should trigger the new POST logic in admin.js (which we'll simulate here)
    console.log('Simulating dummy product promotion...');
    const formData = {
        name: 'Ceylon Blue Sapphire (Synced Test)',
        category: 'sapphire',
        carat: 4.82,
        price: 4850,
        origin: 'Rathnapura, Sri Lanka',
        details: '4.82 ct · Heat Treated · Oval Cut',
        emoji: '💎',
        badges: 'GIA Certified'
    };

    const saveRes = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });

    if (saveRes.ok) {
        console.log('✓ Successfully promoted dummy product to database');
        const newProduct = await saveRes.json();
        console.log('New product in DB:', newProduct);
    } else {
        const err = await saveRes.json();
        console.error('✕ Failed to promote product:', err);
    }

    // 3. Verify sync functionality
    // (Note: we can't easily sync all from here without the admin.js context, but let's just check the product list)
    const listRes = await fetch(`${API_BASE}/api/products`);
    const list = await listRes.json();
    console.log(`Current products in DB: ${list.length}`);
}

testFix();
