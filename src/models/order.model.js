// ---------------- ORDER SCHEMA ----------------
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    guestMobile: {
      type: String,
    },
    shiprocketOrderId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    shiprocketCheckoutId: {
      type: String,
      trim: true,
    },
    orderNumber: { type: String, required: true, unique: true },

    currency: { type: String, maxlength: 3, default: "INR" },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    shippingAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: { type: String },
    transactionId: { type: String, trim: true },
    orderStatus: {
      type: String,
      enum: [
        "created",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "created",
    },

    notes: String,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    shippingMethod: { type: String, trim: true },
    shiprocketStatus: { type: String, trim: true },

    // reference to your existing userAddress
    shippingAddress: {
      firstName: String,
      lastName: String,
      mobile: String,
      email: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    billingAddress: {
      firstName: String,
      lastName: String,
      mobile: String,
      email: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    rawShiprocketResponse: mongoose.Schema.Types.Mixed,

    courier: {
      type: String,
    },
    awb: {
      type: String,
      trim: true,
    },
    shiprocketShipmentId: {
      type: Number,
    },
    shipmentStatus: {
      type: String,
    },
    shipmentStatusCode: {
      type: Number,
    },
    etd: {
      type: Date,
    },
    isReturn: {
      type: Boolean,
      default: false,
    },
    tracking: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    lastWebhookAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// ---------------- ORDER ITEM SCHEMA ----------------
const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productImage: { type: String, maxlength: 500 },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" },
    shiprocketVariantId: { type: String, trim: true },
    title: { type: String, required: true, maxlength: 255 },
    handle: { type: String, trim: true },
    sku: { type: String, required: true, maxlength: 100 },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    weight: { type: Number, default: 0 }, // in kg
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

orderItemSchema.index({ orderId: 1 });
orderItemSchema.index({ productId: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1 });


export const Order = mongoose.model("Order", orderSchema);
export const OrderItem = mongoose.model("OrderItem", orderItemSchema);
