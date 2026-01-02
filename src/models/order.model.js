// ---------------- ORDER SCHEMA ----------------
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: String, required: true, unique: true, maxlength: 50 },
    status: {
      type: String,
      enum: ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending','paid','failed','refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cod','credit_card','debit_card','upi','net_banking','wallet'],
      required: true,
    },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    shippingAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, maxlength: 3, default: 'INR' },
    notes: String,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    shiprocketOrderId: { type: String, trim: true },
    shippingMethod: { type: String, trim: true },
    shiprocketStatus: { type: String, trim: true },

    // reference to your existing userAddress
    shippingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAddress', required: true },
    billingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAddress' },
  },
  { timestamps: true }
);

// ---------------- ORDER ITEM SCHEMA ----------------
const orderItemSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    productName: { type: String, required: true, maxlength: 255 },
    productSku: { type: String, required: true, maxlength: 100 },
    weight: { type: Number }, 
    dimensions: { length: Number, width: Number, height: Number },
    imageUrl: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Order = mongoose.model('Order', orderSchema);
export const OrderItem = mongoose.model('OrderItem', orderItemSchema);
