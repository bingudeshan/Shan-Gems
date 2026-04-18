/**
 * SHAN GEMS — server.js
 * Node.js/Express Backend | MongoDB Mongoose
 * Enhanced: Auth, Filtering, Orders, and Persistence
 */

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'shan_gems_secure_secret_2026';

// ── Multer Storage Configuration (Memory for Vercel compatibility) ──
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS, Images)
// On Vercel, this is handled by vercel.json rewrites.
// Locally, we serve them explicitly from the /public folder.
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../')));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✓ Connected to Shan Gems MongoDB Atlas');
    // Seed admin as soon as the database is connected
    await seedAdmin();
  })
  .catch(err => console.error('✕ MongoDB connection error:', err));

/* ─── SCHEMAS & MODELS ──────────────────────────────────── */

// Product Schema
const productSchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  carat: Number,
  origin: String,
  details: String,
  image: String,
  shape: { type: String, default: 'round' },
  emoji: { type: String, default: '💎' },
  badges: [String],
  dpp: {
    id: String,
    mine: String,
    minedDate: String,
    cutter: String,
    cutDate: String,
    certifier: String,
    certDate: String,
    carbon: String,
    treatment: String,
    espr: String
  },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  cart: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    qty: { type: Number, default: 1 }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: String,
  email: String,
  items: Array,
  totalAmount: Number,
  paymentMethod: String,
  shippingAddress: Object,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Inquiry Schema
const inquirySchema = new mongoose.Schema({
  customerName: String,
  email: String,
  message: String,
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now }
});

const Inquiry = mongoose.model('Inquiry', inquirySchema);

/* ─── MIDDLEWARE ────────────────────────────────────────── */

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

/* ─── API ROUTES ────────────────────────────────────────── */

// 1. AUTH: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed: Email may already exist' });
  }
});

// 2. AUTH: Real Login
app.post(['/api/auth/login', '/api/login'], async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { name: 'Sameera Fernando', email: user.email, role: user.role } });
});

/* ─── SEED DATA ─────────────────────────────────────────── */

async function seedAdmin() {
  try {
    const adminEmail = 'admin@shangems.com';
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const exists = await User.findOne({ email: adminEmail });
    
    if (!exists) {
      const admin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✓ Default Admin User Seeded');
    } else {
      await User.findOneAndUpdate({ email: adminEmail }, { password: hashedPassword });
      console.log('✓ Admin User Password Updated');
    }
  } catch (err) {
    console.error('✕ Error seeding admin:', err);
  }
}

// Start Server
// Removed redundant listener and seeding logic (consolidated at end)
app.get('/api/products', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query).sort({ updatedAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let product;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    } else {
      product = await Product.findOne({ id });
    }
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Product (Admin Only)
app.post('/api/products', authenticate, upload.single('image'), async (req, res) => {
  try {
    const productData = req.body;
    if (req.file) {
      // Convert buffer to Base64 Data URI
      const base64Image = req.file.buffer.toString('base64');
      productData.image = `data:${req.file.mimetype};base64,${base64Image}`;
    }
    const newProduct = new Product(productData);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Product (Admin Only)
app.put('/api/products/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (req.file) {
      // Convert buffer to Base64 Data URI
      const base64Image = req.file.buffer.toString('base64');
      updateData.image = `data:${req.file.mimetype};base64,${base64Image}`;
    }
    
    // Find by _id first, then fallback to custom id
    let updatedProduct;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    }
    
    if (!updatedProduct) {
      updatedProduct = await Product.findOneAndUpdate({ id: id }, updateData, { new: true });
    }

    if (!updatedProduct) return res.status(404).json({ error: 'Gemstone not found' });
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Product (Admin Only)
app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    let deleted;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Product.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await Product.findOneAndDelete({ id: id });
    }
    if (!deleted) return res.status(404).json({ error: 'Gemstone not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. USERS: Update Wishlist/Cart (Sync)
app.put('/api/user/sync', authenticate, async (req, res) => {
  try {
    const { wishlist, cart } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { wishlist, cart },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. ORDERS: Create
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ message: 'Order placed successfully', orderId: newOrder._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5.5 CHECKOUT: Process Order & Send Email
app.post('/api/checkout', async (req, res) => {
  try {
    const { customerName, email, items, totalAmount, paymentMethod, shippingAddress } = req.body;

    const newOrder = new Order({
      customerName,
      email,
      items,
      totalAmount,
      paymentMethod,
      shippingAddress
    });
    
    await newOrder.save();

    // Send Invoice via Nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'rebecca.gottlieb9@ethereal.email', // Replace with real credentials on prod
        pass: '6J3NqRm2bUuq3u8z9r'
      }
    });

    const itemsHtml = items.map(i => `<tr><td style="padding: 10px; border-bottom: 1px solid #ddd;">${i.name} (x${i.qty})</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">USD ${i.price * i.qty}</td></tr>`).join('');

    const mailOptions = {
      from: '"Shan Gems" <sales@shangems.com>',
      to: email,
      subject: `Invoice & Order Confirmation - ${newOrder._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #C9A14A; text-align: center;">SHAN GEMS</h2>
          <p>Dear ${customerName},</p>
          <p>Thank you for your order. We are processing it now. Below is your invoice:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <tr style="background: #f8f8f8;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
            ${itemsHtml}
            <tr>
              <td style="padding: 10px; font-weight: bold;">Total</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; color: #C9A14A;">USD ${totalAmount}</td>
            </tr>
          </table>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">Payment Method: <strong>${paymentMethod === 'wire' ? 'Bank Wire Transfer' : 'Credit Card'}</strong></p>
          ${paymentMethod === 'wire' ? '<p style="font-size: 13px; background: #fdf5e6; padding: 15px; border-left: 3px solid #C9A14A;"><strong>Wire Instructions:</strong> Please transfer the total amount to: Account Name: Shan Gems, Acc No: 12345678, SWIFT: CEBOCKXXX</p>' : ''}
          <p>Regards,<br><strong>Shan Gems Sales Team</strong></p>
        </div>
      `
    };

    transporter.sendMail(mailOptions).then(info => {
      console.log('Invoice sent: ', info.messageId);
      console.log('Preview URL: ', nodemailer.getTestMessageUrl(info));
    }).catch(console.error);

    res.status(201).json({ message: 'Order processed successfully', orderId: newOrder._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. INQUIRIES: Create
app.post('/api/inquiries', async (req, res) => {
  try {
    const newInquiry = new Inquiry(req.body);
    await newInquiry.save();
    res.status(201).json({ message: 'Inquiry saved successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. ADMIN: Fetch data
app.get('/api/admin/inquiries', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/orders', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const totalGems = await Product.countDocuments();
    const totalInquiries = await Inquiry.countDocuments();
    const allOrders = await Order.find();
    
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const activeOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    
    // Simplistic reach calculation based on unique emails or addresses
    const uniqueCustomers = new Set(allOrders.map(o => o.email)).size;

    res.json({
      totalGems,
      totalOrders: allOrders.length,
      activeOrders,
      totalInquiries,
      totalRevenue,
      countriesReached: uniqueCustomers // For demo purposes, we treat unique customers as reach
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Final Server Start
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    console.log(`✓ Shan Gems Backend Live at http://localhost:${PORT}`);
  });
}

module.exports = app;
