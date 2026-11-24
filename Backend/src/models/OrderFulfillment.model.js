import mongoose from 'mongoose';
import { SHIPMENT_STATUSES } from '../services/courier/courierProvider.interface.js';

// One record per seller per parent order. The parent Order keeps the single customer checkout and single payment;
// this record carries the seller-level delivery method and status. It links to the existing SellerNotification
// (which stays the seller's accept / pack workflow) and never stores payment data.
export const FULFILLMENT_STATUSES = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_DISPATCH', 'IN_TRANSIT',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED', 'RETURN_REQUESTED', 'RETURNED',
];

const itemSnapshotSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  sku: { type: String, default: '' },
  variantSku: { type: String, default: '' },
  variantTitle: { type: String, default: '' },
  quantity: { type: Number, min: 1 },
  price: Number,
  image: { type: String, default: '' },
  weightKg: { type: Number, default: null },
  length: { type: Number, default: null },
  breadth: { type: Number, default: null },
  height: { type: Number, default: null },
}, { _id: false });

const addressSnapshotSchema = new mongoose.Schema({}, { _id: false, strict: false });

const orderFulfillmentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderId: { type: String, required: true },
    // Same key the seller notification groups by (product.seller), so the two records always line up
    sellerKey: { type: String, required: true },
    sellerId: { type: String, default: '' }, // Seller _id as a string (matches SellerNotification.sellerId)
    sellerName: { type: String, default: '' },
    brandId: { type: String, default: '' },
    notification: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerNotification', default: null },
    items: { type: [itemSnapshotSchema], default: [] },

    fulfillmentType: { type: String, enum: ['INSTANT', 'STANDARD'], required: true },
    // LOCAL_CAPTAIN = our own captains; COURIER = third-party courier (Phase 3+)
    deliveryMethod: { type: String, enum: ['LOCAL_CAPTAIN', 'COURIER'], required: true },
    fulfillmentStatus: { type: String, enum: FULFILLMENT_STATUSES, default: 'PENDING' },
    statusHistory: { type: [{ status: String, at: { type: Date, default: Date.now }, note: { type: String, default: undefined }, _id: false }], default: [] },

    pickupAddressSnapshot: { type: addressSnapshotSchema, default: null },
    deliveryAddressSnapshot: { type: addressSnapshotSchema, default: null },
    pickupAddressStatus: { type: String, default: '' },
    // STANDARD only: true once the seller's pickup address is VERIFIED by the platform
    dispatchReady: { type: Boolean, default: false },
    requiresCourierServiceabilityCheck: { type: Boolean, default: false },

    assignedCaptain: { type: mongoose.Schema.Types.ObjectId, ref: 'Captain', default: null }, // INSTANT only
    shipmentReference: {
      provider: { type: String, default: null },
      shipmentId: { type: String, default: null },
      awb: { type: String, default: null },
      trackingUrl: { type: String, default: null },
      // courier foundation (additive): provider-side ids and presentation data
      referenceId: { type: String, default: null }, // our own idempotency reference, sent to the provider
      providerOrderId: { type: String, default: null },
      courierName: { type: String, default: null },
      labelUrl: { type: String, default: null },
      simulated: { type: Boolean, default: false }, // true = created by the mock provider; never shown to customers
    },
    // Package actually handed to the courier (auto-built from the item snapshots, or confirmed by the seller/admin)
    parcel: {
      weightKg: { type: Number, default: null }, length: { type: Number, default: null },
      breadth: { type: Number, default: null }, height: { type: Number, default: null },
      source: { type: String, enum: ['AUTO', 'SELLER', 'ADMIN', null], default: null },
      confirmedAt: { type: Date, default: null }, confirmedBy: { type: String, default: null },
    },
    // Courier shipment state. Our fulfillmentStatus stays the business status; this is the courier's view.
    shipment: {
      status: { type: String, enum: SHIPMENT_STATUSES, default: 'NOT_CREATED' },
      createdAt: { type: Date, default: null },
      courierId: { type: String, default: null },
      quote: {
        simulated: { type: Boolean, default: false }, serviceable: { type: Boolean, default: null },
        chargeableWeightKg: { type: Number, default: null }, courierId: { type: String, default: null },
        courierName: { type: String, default: null }, charge: { type: Number, default: null },
        etaDaysMin: { type: Number, default: null }, etaDaysMax: { type: Number, default: null },
        rejectionReason: { type: String, default: null }, quotedAt: { type: Date, default: null },
        options: { type: [mongoose.Schema.Types.Mixed], default: undefined },
      },
      pickup: { status: { type: String, default: null }, scheduledAt: { type: Date, default: null }, reference: { type: String, default: null } },
      labelGeneratedAt: { type: Date, default: null },
      events: { type: [{ status: String, description: String, location: { type: String, default: '' }, at: { type: Date, default: Date.now }, simulated: { type: Boolean, default: false }, _id: false }], default: [] },
      rto: {
        status: { type: String, default: null }, initiatedAt: { type: Date, default: null }, reason: { type: String, default: null },
        returnShipmentRef: { type: String, default: null }, deliveredAt: { type: Date, default: null },
      },
    },
    shippingCost: { type: Number, default: 0 }, // courier rate is a later phase; the customer's fee stays on the parent Order
    estimatedDeliveryDate: { type: Date, default: null },
    locationVerified: { type: Boolean, default: false }, // false when the customer sent no coordinates (legacy behaviour)
  },
  { timestamps: true }
);

// A retry can never create a second record for the same seller on the same order
orderFulfillmentSchema.index({ order: 1, sellerKey: 1 }, { unique: true });
orderFulfillmentSchema.index({ sellerId: 1, createdAt: -1 });
orderFulfillmentSchema.index({ notification: 1 }, { sparse: true });
orderFulfillmentSchema.index({ fulfillmentType: 1, fulfillmentStatus: 1, createdAt: -1 });
orderFulfillmentSchema.index({ brandId: 1, createdAt: -1 });

const OrderFulfillment = mongoose.model('OrderFulfillment', orderFulfillmentSchema);
export default OrderFulfillment;
