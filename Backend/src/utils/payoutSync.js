import { emitToRoom } from '../socket/socket.js';

/**
 * Called after a PayoutRequest is created or its status changes.
 *  - pings the Super Admin / Admin dashboards ("finance" room) so payout pages refresh live
 *  - keeps the requester's own records in step (seller WithdrawalRequest / WalletTransaction,
 *    captain CaptainTransaction + in-app notification)
 *  - pings the requester's own room so the seller / captain app refreshes live
 * Payloads carry no amounts or personal data; clients refetch through their authorised APIs.
 */
const WITHDRAWAL_STATUS = { APPROVED: 'APPROVED', PROCESSING: 'APPROVED', PAID: 'COMPLETED', REJECTED: 'REJECTED' };

const captainMessage = (payout) => {
  const amt = `₹${Number(payout.approvedAmount || payout.requestedAmount || 0).toFixed(2)}`;
  switch (payout.status) {
    case 'APPROVED':
      return { title: 'Payout Approved', message: `Your payout request #${payout.payoutId} for ${amt} was approved and will be processed shortly.` };
    case 'PROCESSING':
      return { title: 'Payout Processing', message: `Your payout #${payout.payoutId} is being processed.` };
    case 'PAID':
      return { title: 'Payout Paid', message: `${amt} for payout #${payout.payoutId} was transferred to your bank account${payout.paymentReference ? ` (Ref: ${payout.paymentReference})` : ''}.` };
    case 'REJECTED':
      return { title: 'Payout Rejected', message: `Your payout request #${payout.payoutId} was rejected${payout.rejectionReason ? `: ${payout.rejectionReason}` : ''}. The amount was returned to your wallet.` };
    default:
      return null;
  }
};

export const onPayoutSaved = async (payout, { wasNew, statusChanged }) => {
  const type = payout.recipientType;
  const recipientId = String(payout.recipientId);

  // A paid payout is real money leaving a bank account: queue it so the admin allocates it to the account it
  // was paid from. Seller and captain payouts stay separate from gateway collections. Idempotent per payout.
  if (statusChanged && payout.status === 'PAID') {
    try {
      const { queueUnlinked, brandForSeller, brandForCaptain } = await import('../services/treasuryInbox.js');
      let brandId = 'unassigned';
      if (type === 'SELLER') brandId = await brandForSeller(recipientId);
      else {
        const { default: Captain } = await import('../models/Captain.model.js');
        brandId = await brandForCaptain(await Captain.findById(recipientId).select('city workingArea').lean());
      }
      await queueUnlinked({
        brandId, source: type === 'SELLER' ? 'SELLER_PAYOUT' : 'CAPTAIN_PAYOUT', sourceRef: payout.payoutId,
        amountPaise: Math.round(Number(payout.approvedAmount || payout.requestedAmount || 0) * 100), direction: 'DEBIT',
        description: `${type === 'SELLER' ? 'Seller' : 'Captain'} payout ${payout.payoutId}${payout.paymentReference ? ' (Ref: ' + payout.paymentReference + ')' : ''}`,
        reference: payout.paymentReference || '', date: payout.processedAt || new Date(), suggestedCategory: type === 'SELLER' ? 'Seller Payout' : 'Captain Payout',
      });
    } catch (err) {
      console.warn('[Treasury] Could not queue paid payout:', err.message);
    }
  }

  if (statusChanged) {
    try {
      if (type === 'SELLER') {
        const [{ default: WithdrawalRequest }, { default: WalletTransaction }] = await Promise.all([
          import('../models/WithdrawalRequest.model.js'),
          import('../models/WalletTransaction.model.js'),
        ]);
        const wStatus = WITHDRAWAL_STATUS[payout.status];
        if (wStatus) {
          await WithdrawalRequest.updateOne(
            { withdrawalId: payout.payoutId, status: { $ne: wStatus } },
            {
              $set: {
                status: wStatus,
                processedAt: new Date(),
                ...(payout.rejectionReason || payout.remarks ? { adminRemark: payout.rejectionReason || payout.remarks } : {}),
              },
            }
          );
        }
        const txnState = payout.status === 'PAID' ? 'COMPLETED' : payout.status === 'REJECTED' ? 'REVERSED' : null;
        if (txnState) {
          await WalletTransaction.updateMany(
            { sellerId: recipientId, orderId: payout.payoutId, type: 'WITHDRAWAL' },
            { $set: { settlementStatus: txnState } }
          );
        }
      } else if (type === 'CAPTAIN') {
        const [{ default: CaptainTransaction }, { default: CaptainNotification }] = await Promise.all([
          import('../models/CaptainTransaction.model.js'),
          import('../models/CaptainNotification.model.js'),
        ]);
        const txnState = payout.status === 'PAID' ? 'COMPLETED' : payout.status === 'REJECTED' ? 'FAILED' : null;
        if (txnState) {
          await CaptainTransaction.updateMany(
            { captainId: recipientId, orderId: payout.payoutId, type: 'WITHDRAWAL' },
            { $set: { status: txnState } }
          );
        }
        const msg = captainMessage(payout);
        if (msg) {
          await CaptainNotification.create({
            captainId: recipientId,
            type: 'PAYMENT',
            title: msg.title,
            message: msg.message,
            amount: Number(payout.approvedAmount || payout.requestedAmount || 0),
            icon: 'account_balance',
          });
        }
      }
    } catch (err) {
      console.warn('[PayoutSync] recipient sync failed:', err.message);
    }
  }

  const info = { payoutId: payout.payoutId, recipientType: type, status: payout.status, event: wasNew ? 'created' : 'status' };
  emitToRoom('finance', 'payout:changed', info);
  emitToRoom(`${type === 'SELLER' ? 'seller' : 'captain'}:${recipientId}`, 'payout:updated', info);
};
