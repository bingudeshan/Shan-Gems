const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\Bingu\\.gemini\\antigravity\\brain\\9c0d2e5b-e14b-4222-a760-ee427de786da\\heritage_mining_1775633721612.png';
const dest = path.join(__dirname, 'images', 'heritage-mining.png');

try {
    if (!fs.existsSync(path.dirname(dest))) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log('✓ Image copied successfully to ' + dest);
} catch (err) {
    console.error('✕ Error copying image:', err);
    process.exit(1);
}
