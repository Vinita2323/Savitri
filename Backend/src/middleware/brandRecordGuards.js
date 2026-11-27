/**
 * Record-level brand checks for admin routes that load a record by id. They only act for a brand-restricted admin
 * (req.restricted, set by scopeRestrictedAdmin). Outside the brand = 404, the same as a record that does not exist.
 */
import mongoose from 'mongoose';
import ProfileEditRequest from '../models/ProfileEditRequest.model.js';
import Referral from '../models/Referral.model.js';
import SellerRegistrationPayment from '../models/SellerRegistrationPayment.model.js';
import CaptainRegistrationPayment from '../models/CaptainRegistrationPayment.model.js';
import TransportBooking from '../models/TransportBooking.model.js';
import { brandSellerIds, brandCaptainIds, brandUserIds, includesId } from '../utils/restrictedAdmin.js';
import { getCityRegex } from './scopeMiddleware.js';

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const missing = (res, message) => res.status(404).json({ success: false, message });

const guard = (check, message) => async (req, res, next) => {
  try {
    if (!req.restricted) return next();
    return (await check(req)) ? next() : missing(res, message);
  } catch (error) {
    return next(error);
  }
};

/** Which sellers / captains / customers of the brand a profile edit request may belong to. */
export const editRequestBrandFilter = async (req) => ({
  $or: [
    { requesterRole: 'seller', requesterId: { $in: await brandSellerIds(req) } },
    { requesterRole: 'captain', requesterId: { $in: await brandCaptainIds(req) } },
    { requesterRole: 'user', requesterId: { $in: await brandUserIds(req) } },
  ],
});

export const guardEditRequest = guard(async (req) => isId(req.params.id) && Boolean(await ProfileEditRequest.exists({ $and: [{ _id: req.params.id }, await editRequestBrandFilter(req)] })), 'Profile edit request not found');

export const referralBrandFilter = async (req) => ({ referrerId: { $in: [...(await brandSellerIds(req)), ...(await brandCaptainIds(req))] } });

export const guardReferral = guard(async (req) => isId(req.params.id) && Boolean(await Referral.exists({ $and: [{ _id: req.params.id }, await referralBrandFilter(req)] })), 'Referral not found');

export const guardSellerFeePayment = guard(async (req) => isId(req.params.id) && Boolean(await SellerRegistrationPayment.exists({ _id: req.params.id, sellerId: { $in: await brandSellerIds(req) } })), 'Registration fee payment record not found');

export const guardCaptainFeePayment = guard(async (req) => isId(req.params.id) && Boolean(await CaptainRegistrationPayment.exists({ _id: req.params.id, captainId: { $in: await brandCaptainIds(req) } })), 'Registration fee payment record not found');

/** A freight booking belongs to a brand when its captain does, or (no captain yet) when it starts in the brand's city. */
export const transportBrandFilter = async (req) => {
  const or = [{ captainId: { $in: await brandCaptainIds(req) } }];
  if (req.scope?.city) or.push({ captainId: null, 'pickupLocation.city': getCityRegex(req.scope.city) });
  return { $or: or };
};

export const guardTransportBooking = guard(async (req) => {
  const ref = req.params.bookingId;
  const byRef = isId(ref) ? { $or: [{ _id: ref }, { bookingId: ref }] } : { bookingId: ref };
  if (!(await TransportBooking.exists({ $and: [byRef, await transportBrandFilter(req)] }))) return false;
  const captainId = req.body?.captainId;
  return !captainId || includesId(await brandCaptainIds(req), captainId);
}, 'Booking or captain not found in your brand.');
