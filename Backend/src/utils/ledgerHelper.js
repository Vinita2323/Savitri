import mongoose from 'mongoose';
import { emitFinanceUpdate } from '../socket/socket.js';

/**
 * Records the customer's payment for an order in the central PlatformLedger so the
 * Super Admin "Customer Payments" / "Transactions" pages can show it.
 *
 * Idempotent: at most one CUSTOMER_PAYMENT row exists per order (atomic upsert), so it is safe
 * to call from every place an order can become Paid (online verify, wallet, COD collected,
 * admin / seller / captain delivery). Failures never break the order flow.
 */
export const recordCustomerPayment = async (orderRef) => {
  try {
    const id = orderRef?._id || orderRef;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return null;

    // Lazy imports keep this helper free of model import cycles.
    const [{ default: Order }, { default: PlatformLedger }, { default: SellerNotification }, { default: Seller }, { default: User }] =
      await Promise.all([
        import('../models/Order.model.js'),
        import('../models/PlatformLedger.model.js'),
        import('../models/SellerNotification.model.js'),
        import('../models/Seller.model.js'),
        import('../models/User.model.js'),
      ]);

    const order = await Order.findById(id).lean();
    if (!order || order.paymentStatus !== 'Paid') return null;
    const amount = Number(order.grandTotal || 0);
    if (!(amount > 0)) return null;

    const notes = await SellerNotification.find({ order: order._id }).select('sellerId').lean();
    const sellerIds = [...new Set(notes.map((n) => String(n.sellerId)).filter(Boolean))];
    const seller = sellerIds.length ? await Seller.findById(sellerIds[0]).select('brandId businessName').lean().catch(() => null) : null;
    const user = order.user ? await User.findById(order.user).select('name phone').lean().catch(() => null) : null;

    const method = String(order.paymentMethod || '').toUpperCase();
    const doc = {
      transactionId: `TXN-LED-CPAY-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`,
      category: 'CUSTOMER_PAYMENT',
      type: 'CREDIT',
      amount,
      source: 'USER',
      destination: 'PLATFORM_TREASURY',
      entityType: 'USER',
      entityId: String(order.user || ''),
      entityName: user?.name || user?.phone || 'Customer',
      referenceModel: 'Order',
      referenceId: order.orderId,
      referenceObjId: order._id,
      status: 'SUCCESS',
      description: `Customer payment (${method || 'N/A'}) for Order #${order.orderId}`,
      metadata: {
        brandId: seller?.brandId || '',
        city: order.shippingAddress?.city || '',
        sellerIds,
        paymentMethod: method,
        gatewayRef: order.razorpay?.paymentId || '',
      },
    };

    const res = await PlatformLedger.updateOne(
      { category: 'CUSTOMER_PAYMENT', referenceObjId: order._id },
      { $setOnInsert: doc },
      { upsert: true }
    );
    if (res.upsertedCount) emitFinanceUpdate({ category: 'CUSTOMER_PAYMENT' });
    return res.upsertedCount ? doc.transactionId : null;
  } catch (err) {
    console.warn('[Ledger] recordCustomerPayment failed:', err.message);
    return null;
  }
};
