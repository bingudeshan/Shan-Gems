require('dotenv').config();
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: String,
  name: String
});

const Product = mongoose.model('Product', productSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const products = await Product.find({});
    console.log('--- PRODUCTS IN DB ---');
    products.forEach(p => {
      console.log(`_id: ${p._id}, id: ${p.id}, name: ${p.name}`);
    });
    console.log('----------------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
