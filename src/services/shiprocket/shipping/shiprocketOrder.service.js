import axios from "axios";
import { ApiError } from "../../../utils/ApiError.js";

/**
 * Create order in Shiprocket
 * @param {object} payload - Shiprocket order payload
 */
export const createShiprocketOrder = async (payload) => {
  try {
    const res = await axios.post(
      `${process.env.SHIPROCKET_BASEURL}/orders/create/adhoc`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPROCKET_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data; // Shiprocket response
  } catch (error) {
    console.error("❌ Shiprocket Order Create Failed:", error.response?.data || error.message);
    throw new ApiError(500, "Shiprocket order creation failed");
  }
};

/**
 * Generate Shiprocket payload from local order and addresses
 * @param {object} order - local order
 * @param {array} items - order items
 * @param {object} shippingAddress 
 * @param {object} billingAddress 
 */
export const generateShiprocketOrderPayload = (order, items, shippingAddress, billingAddress) => {
  return {
    order_id: order.orderNumber,
    order_date: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION_ID,
    comment: order.notes || "",
    reseller_name: "",
    company_name: "",
    billing_customer_name: billingAddress.name,
    billing_last_name: billingAddress.lastName || "",
    billing_address: billingAddress.addressLine1,
    billing_address_2: billingAddress.addressLine2 || "",
    billing_isd_code: billingAddress.isdCode || "",
    billing_city: billingAddress.city,
    billing_pincode: billingAddress.postalCode,
    billing_state: billingAddress.state,
    billing_country: billingAddress.country,
    billing_email: billingAddress.email || "",
    billing_phone: billingAddress.phone || "",
    billing_alternate_phone: billingAddress.alternatePhone || "",
    shipping_is_billing: shippingAddress.isBilling ? 1 : 0,
    shipping_customer_name: shippingAddress.name,
    shipping_last_name: shippingAddress.lastName || "",
    shipping_address: shippingAddress.addressLine1,
    shipping_address_2: shippingAddress.addressLine2 || "",
    shipping_city: shippingAddress.city,
    shipping_pincode: shippingAddress.postalCode,
    shipping_state: shippingAddress.state,
    shipping_country: shippingAddress.country,
    shipping_email: shippingAddress.email || "",
    shipping_phone: shippingAddress.phone || "",
    order_items: items.map(item => ({
      name: item.productName,
      sku: item.productSku,
      units: item.quantity,
      selling_price: item.unitPrice,
      discount: item.discountAmount || 0,
      tax: item.taxAmount || 0,
      hsn: item.hsnCode || "",
    })),
    payment_method: order.paymentMethod.toUpperCase(),
    shipping_charges: order.shippingAmount || 0,
    giftwrap_charges: order.giftWrapAmount || 0,
    transaction_charges: order.transactionAmount || 0,
    total_discount: order.discountAmount || 0,
    sub_total: order.subtotal,
    length: Math.max(...items.map(i => i.length || 10)),
    breadth: Math.max(...items.map(i => i.breadth || 10)),
    height: Math.max(...items.map(i => i.height || 10)),
    weight: items.reduce((sum, i) => sum + ((i.weight || 0.5) * i.quantity), 0),
    ewaybill_no: order.ewaybillNo || "",
    customer_gstin: order.customerGstin || "",
    invoice_number: order.invoiceNumber || "",
    order_type: order.orderType || "Regular",
  };
};
