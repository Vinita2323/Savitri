/**
 * Quotation Controller
 *
 * Persistent, brand-scoped quotation management (MongoDB) for Admin / Super Admin.
 * All routes run behind protect('admin','super_admin') + resolveBrandScope (see routes/quotationRoutes.js):
 *   - the caller's brand scope is validated server-side; the client never chooses a record's brand
 *   - records outside the caller's scope answer 404 (existence is not disclosed)
 *
 *   GET    /api/quotations                     list (filters: status, search, page, limit)
 *   POST   /api/quotations                     create (needs a concrete brand scope)
 *   GET    /api/quotations/:ref                read   (ref = quotationNumber or _id)
 *   PUT    /api/quotations/:ref                edit content (Draft / Ready to Send only) and/or move status
 *   PATCH  /api/quotations/:ref/status         move status (validated transitions)
 *   POST   /api/quotations/:ref/ready|cancel|convert|duplicate
 *   DELETE /api/quotations/:ref                delete (Draft / Ready to Send only)
 *   POST   /api/quotations/send-email          e-mail the client and record the attempt on the quotation
 *   GET|POST /api/quotations/requests, PATCH|POST /api/quotations/requests/:ref/(status|reject)   RFQ intake queue
 */
import mongoose from 'mongoose';
import Quotation, { QUOTATION_STATUSES, QUOTATION_TRANSITIONS } from '../models/Quotation.model.js';
import QuotationRequest, { REQUEST_STATUSES } from '../models/QuotationRequest.model.js';
import { sendQuotationEmail } from '../services/quotationEmailService.js';
import { nextSequence } from '../models/Counter.model.js';

const EDITABLE_STATUSES = ['Draft', 'Ready to Send'];
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

const actorOf = (req) => ({ id: String(req.user?.id || ''), email: req.user?.email || '', role: req.user?.role || '' });
const scopeFilter = (req) => (!req.scope || req.scope.isAll ? {} : { brandId: req.scope.brandId });
const refQuery = (ref) => {
  const or = [{ quotationNumber: String(ref) }];
  if (mongoose.Types.ObjectId.isValid(String(ref))) or.push({ _id: ref });
  return { $or: or };
};
const withScope = (req, q) => (Object.keys(scopeFilter(req)).length ? { $and: [scopeFilter(req), q] } : q);

const toClient = (doc) => {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const who = (u) => (u && (u.email || (u.role === 'super_admin' ? 'Super Admin' : u.role ? 'Admin' : ''))) || '';
  return {
    ...o,
    id: o.quotationNumber,
    convertedOrderId: o.purchaseOrderNumber || undefined,
    // The pages render these as plain text; the structured actor stays in createdByInfo.
    createdBy: who(o.createdBy) || 'System Admin',
    updatedBy: who(o.updatedBy) || '',
    createdByInfo: o.createdBy,
  };
};
const requestToClient = (doc) => {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return { ...o, id: o.requestNumber };
};

const needBrand = (req, res) => {
  if (!req.scope || req.scope.isAll || !req.scope.brandId) {
    res.status(400).json({ success: false, message: 'Select a specific brand (not "All Regions") before creating records.' });
    return false;
  }
  return true;
};

/** Whitelist + sanity-check the client-authored quotation body. Returns { data } or { error }. */
const parseBody = (body = {}) => {
  const data = {};
  const textFields = ['quotationDate', 'validUntil', 'quotationType', 'referenceNumber', 'subject', 'assignedSeller', 'internalNotes'];
  for (const f of textFields) if (body[f] !== undefined) data[f] = str(body[f], f === 'internalNotes' ? 4000 : 500);
  if (body.originatingRequestId !== undefined) data.originatingRequestId = body.originatingRequestId ? str(String(body.originatingRequestId), 100) : null;

  if (body.buyer !== undefined) {
    if (!isPlainObject(body.buyer)) return { error: 'buyer must be an object.' };
    data.buyer = body.buyer;
    data.buyerName = str(body.buyer.organizationName, 200);
  }
  if (body.items !== undefined) {
    if (!Array.isArray(body.items) || body.items.length > 500) return { error: 'items must be an array of at most 500 lines.' };
    for (const it of body.items) {
      if (!isPlainObject(it)) return { error: 'Each item must be an object.' };
      for (const k of ['quantity', 'unitPrice', 'lineTotal']) {
        if (it[k] !== undefined && (!Number.isFinite(Number(it[k])) || Number(it[k]) < 0)) {
          return { error: `Item ${k} must be a non-negative number.` };
        }
      }
    }
    data.items = body.items;
  }
  if (body.summary !== undefined) {
    if (!isPlainObject(body.summary)) return { error: 'summary must be an object.' };
    const g = Number(body.summary.grandTotal ?? 0);
    if (!Number.isFinite(g) || g < 0) return { error: 'summary.grandTotal must be a non-negative number.' };
    data.summary = body.summary;
    data.grandTotal = g;
  }
  if (body.commercialTerms !== undefined) {
    if (!isPlainObject(body.commercialTerms)) return { error: 'commercialTerms must be an object.' };
    data.commercialTerms = body.commercialTerms;
  }
  if (body.governmentInfo !== undefined) data.governmentInfo = isPlainObject(body.governmentInfo) ? body.governmentInfo : null;
  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments) || body.attachments.length > 50) return { error: 'attachments must be an array of at most 50 entries.' };
    data.attachments = body.attachments;
  }
  if (body.termsAndConditions !== undefined) data.termsAndConditions = body.termsAndConditions;
  return { data };
};

// Numbers come from an atomic counter (never from "max + 1"), so parallel creates cannot collide.
const createWithNumber = async (doc) => {
  const year = new Date().getFullYear();
  for (let i = 0; i < 20; i += 1) {
    const seq = await nextSequence(`quotation-${year}`);
    const quotationNumber = `QT-${year}-${String(seq).padStart(4, '0')}`;
    if (await Quotation.exists({ quotationNumber })) continue; // counter behind existing data: skip ahead
    try {
      return await Quotation.create({ ...doc, quotationNumber });
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  throw new Error('Could not allocate a quotation number, please retry.');
};

const applyStatus = (q, status, reason = '') => {
  if (status === q.status) return null;
  if (!QUOTATION_STATUSES.includes(status)) return `Invalid status "${status}".`;
  if (!(QUOTATION_TRANSITIONS[q.status] || []).includes(status)) {
    return `A quotation in status "${q.status}" cannot move to "${status}".`;
  }
  q.status = status;
  if (status === 'Sent' && !q.sentAt) q.sentAt = new Date();
  if (status === 'Cancelled') { q.cancelledAt = new Date(); q.cancellationReason = str(reason, 1000); }
  if (status === 'Rejected') q.rejectionReason = str(reason, 1000);
  if (status === 'Converted to Order') {
    q.convertedAt = new Date();
    q.purchaseOrderNumber = q.purchaseOrderNumber || `PO-${q.quotationNumber.replace(/^QT-/, '')}`;
  }
  return null;
};

const load = async (req, res) => {
  const q = await Quotation.findOne(withScope(req, refQuery(req.params.ref)));
  if (!q) res.status(404).json({ success: false, message: 'Quotation not found.' });
  return q;
};

// ───────────────────────────── Quotations ─────────────────────────────
export const listQuotations = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 500));
    const q = {};
    if (typeof status === 'string' && status && status !== 'ALL') q.status = status;
    if (typeof search === 'string' && search.trim()) {
      const re = new RegExp(escapeRegex(search.trim().slice(0, 100)), 'i');
      q.$or = [{ quotationNumber: re }, { buyerName: re }, { subject: re }, { referenceNumber: re }];
    }
    const filter = withScope(req, q);
    const [rows, total] = await Promise.all([
      Quotation.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Quotation.countDocuments(filter),
    ]);
    res.json({ success: true, total, page, quotations: rows.map(toClient) });
  } catch (e) { next(e); }
};

export const getQuotation = async (req, res, next) => {
  try {
    const q = await load(req, res);
    if (q) res.json({ success: true, quotation: toClient(q) });
  } catch (e) { next(e); }
};

export const createQuotation = async (req, res, next) => {
  try {
    if (!needBrand(req, res)) return;
    const { data, error } = parseBody(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    if (!data.buyerName) return res.status(400).json({ success: false, message: 'Buyer organization name is required.' });

    const initial = (req.body || {}).status || 'Draft';
    if (!['Draft', 'Ready to Send', 'Sent'].includes(initial)) {
      return res.status(400).json({ success: false, message: 'A new quotation can only start as Draft, Ready to Send or Sent.' });
    }

    const doc = {
      ...data,
      brandId: req.scope.brandId,
      status: initial,
      sentAt: initial === 'Sent' ? new Date() : null,
      createdBy: actorOf(req),
      updatedBy: actorOf(req),
    };
    const q = await createWithNumber(doc);

    if (data.originatingRequestId) {
      await QuotationRequest.updateOne(
        withScope(req, { $or: [{ requestNumber: data.originatingRequestId }, ...(mongoose.Types.ObjectId.isValid(data.originatingRequestId) ? [{ _id: data.originatingRequestId }] : [])] }),
        { $set: { status: 'Quotation Created', quotationNumber: q.quotationNumber } }
      );
    }
    res.status(201).json({ success: true, quotation: toClient(q) });
  } catch (e) { next(e); }
};

export const updateQuotation = async (req, res, next) => {
  try {
    const q = await load(req, res);
    if (!q) return;
    const body = req.body || {};
    const { data, error } = parseBody(body);
    if (error) return res.status(400).json({ success: false, message: error });

    const contentKeys = Object.keys(data);
    if (contentKeys.length && !EDITABLE_STATUSES.includes(q.status)) {
      return res.status(409).json({ success: false, message: `A quotation in status "${q.status}" can no longer be edited. Duplicate it to make changes.` });
    }
    if (data.buyer && !data.buyerName) return res.status(400).json({ success: false, message: 'Buyer organization name is required.' });

    Object.assign(q, data);
    if (body.status && body.status !== q.status) {
      const err = applyStatus(q, body.status, body.reason || body.cancellationReason);
      if (err) return res.status(409).json({ success: false, message: err });
    }
    q.updatedBy = actorOf(req);
    await q.save();
    res.json({ success: true, quotation: toClient(q) });
  } catch (e) { next(e); }
};

const transition = (status, reasonKeys = []) => async (req, res, next) => {
  try {
    const q = await load(req, res);
    if (!q) return;
    const body = req.body || {};
    const target = status || body.status;
    if (target === 'Cancelled' && !str(body.reason || body.cancellationReason)) {
      return res.status(400).json({ success: false, message: 'A cancellation reason is required.' });
    }
    if (q.status === target) {
      return res.status(409).json({ success: false, message: `Quotation is already "${target}".` });
    }
    const err = applyStatus(q, target, body.reason || body.cancellationReason || '');
    if (err) return res.status(409).json({ success: false, message: err });
    q.updatedBy = actorOf(req);
    await q.save();
    res.json({ success: true, quotation: toClient(q) });
  } catch (e) { next(e); }
};
export const markReady = transition('Ready to Send');
export const cancelQuotation = transition('Cancelled');
export const convertQuotation = transition('Converted to Order');
export const setQuotationStatus = transition(null);

export const duplicateQuotation = async (req, res, next) => {
  try {
    const src = await load(req, res);
    if (!src) return;
    const o = src.toObject();
    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const copy = await createWithNumber({
      brandId: o.brandId,
      quotationDate: today,
      validUntil,
      quotationType: o.quotationType,
      referenceNumber: o.referenceNumber,
      subject: `${o.subject} (Copy)`.slice(0, 500),
      assignedSeller: o.assignedSeller,
      buyer: o.buyer,
      buyerName: o.buyerName,
      items: o.items,
      summary: o.summary,
      grandTotal: o.grandTotal,
      commercialTerms: o.commercialTerms,
      governmentInfo: o.governmentInfo,
      attachments: o.attachments,
      termsAndConditions: o.termsAndConditions,
      internalNotes: o.internalNotes,
      status: 'Draft',
      createdBy: actorOf(req),
      updatedBy: actorOf(req),
    });
    res.status(201).json({ success: true, quotation: toClient(copy) });
  } catch (e) { next(e); }
};

export const deleteQuotation = async (req, res, next) => {
  try {
    const q = await load(req, res);
    if (!q) return;
    if (!EDITABLE_STATUSES.includes(q.status)) {
      return res.status(409).json({ success: false, message: `Only draft quotations can be deleted (this one is "${q.status}"). Cancel it instead.` });
    }
    await q.deleteOne();
    res.json({ success: true, message: `Quotation ${q.quotationNumber} deleted.` });
  } catch (e) { next(e); }
};

// ───────────────────────────── E-mail ─────────────────────────────
export const sendQuotationEmailHandler = async (req, res) => {
  try {
    const { quotationId, quotationNumber, recipientEmail, recipientName, organizationName, emailSubject, emailBody } = req.body || {};

    if (typeof recipientEmail !== 'string' || !recipientEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      return res.status(400).json({ success: false, message: `Invalid recipient email address: "${recipientEmail}". Please provide a valid email.` });
    }

    // The stored quotation (inside the caller's brand scope) is the source of truth for number / total / validity.
    const ref = quotationId || quotationNumber;
    if (typeof ref !== 'string' || !ref.trim()) {
      return res.status(400).json({ success: false, message: 'Quotation number is required.' });
    }
    const q = await Quotation.findOne(withScope(req, refQuery(ref.trim())));
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found.' });
    if (['Cancelled', 'Rejected', 'Expired', 'Converted to Order'].includes(q.status)) {
      return res.status(409).json({ success: false, message: `A quotation in status "${q.status}" cannot be e-mailed.` });
    }

    const subject = str(emailSubject, 300) || `Quotation ${q.quotationNumber}`;
    const result = await sendQuotationEmail({
      quotationId: q.quotationNumber,
      quotationNumber: q.quotationNumber,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      recipientName: str(recipientName, 200),
      organizationName: str(organizationName, 200) || q.buyerName,
      emailSubject: subject,
      emailBody: str(emailBody, 5000),
      grandTotal: q.grandTotal || 0,
      validUntil: q.validUntil || '',
      quotationDate: q.quotationDate || '',
    });

    q.emailLog.push({
      timestamp: new Date(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      subject,
      success: Boolean(result.success),
      error: result.success ? null : (result.error || 'Email delivery failed'),
      messageId: result.messageId || null,
    });
    if (result.success) {
      q.emailStatus = 'Sent';
      q.lastEmailSentAt = new Date();
      if (['Draft', 'Ready to Send'].includes(q.status)) applyStatus(q, 'Sent');
    } else {
      q.emailStatus = 'Failed';
    }
    q.updatedBy = actorOf(req);
    await q.save();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Quotation email successfully sent to ${recipientEmail}.`,
        messageId: result.messageId,
        quotation: toClient(q),
      });
    }
    return res.status(500).json({
      success: false,
      message: result.error ? `Email delivery failed: ${result.error}` : 'Email delivery failed. Please check your SMTP configuration.',
      quotation: toClient(q),
    });
  } catch (error) {
    console.error('[QuotationController] Unexpected error in sendQuotationEmailHandler:', error);
    return res.status(500).json({ success: false, message: 'An unexpected server error occurred while sending the email.' });
  }
};

// ───────────────────────────── RFQ requests ─────────────────────────────
const requestRef = (ref) => {
  const or = [{ requestNumber: String(ref) }];
  if (mongoose.Types.ObjectId.isValid(String(ref))) or.push({ _id: ref });
  return { $or: or };
};
const loadRequest = async (req, res) => {
  const r = await QuotationRequest.findOne(withScope(req, requestRef(req.params.ref)));
  if (!r) res.status(404).json({ success: false, message: 'Quotation request not found.' });
  return r;
};

export const listRequests = async (req, res, next) => {
  try {
    const rows = await QuotationRequest.find(withScope(req, {})).sort({ createdAt: -1 }).limit(1000);
    res.json({ success: true, total: rows.length, requests: rows.map(requestToClient) });
  } catch (e) { next(e); }
};

export const createRequest = async (req, res, next) => {
  try {
    if (!needBrand(req, res)) return;
    const b = req.body || {};
    if (!str(b.organizationName)) return res.status(400).json({ success: false, message: 'Organization name is required.' });
    const products = Array.isArray(b.requestedProducts) ? b.requestedProducts.slice(0, 200) : [];
    if (products.some((p) => !isPlainObject(p))) return res.status(400).json({ success: false, message: 'requestedProducts must be a list of objects.' });

    const year = new Date().getFullYear();
    const prefix = `RFQ-${year}-`;

    const fields = {};
    for (const f of ['organizationName', 'organizationType', 'department', 'contactPerson', 'designation', 'email', 'phone', 'gstin', 'deliveryLocation', 'billingAddress', 'shippingAddress', 'city', 'state', 'pincode', 'requiredDeliveryDate', 'estimatedBudget', 'notes']) {
      if (b[f] !== undefined) fields[f] = str(String(b[f]), f === 'notes' ? 4000 : 500);
    }
    for (let i = 0; i < 20; i += 1) {
      const requestNumber = `${prefix}${String(await nextSequence(`rfq-${year}`)).padStart(4, '0')}`;
      if (await QuotationRequest.exists({ requestNumber })) continue;
      try {
        const r = await QuotationRequest.create({
          ...fields,
          brandId: req.scope.brandId,
          requestNumber,
          requestDate: new Date().toISOString().split('T')[0],
          requestedProducts: products,
          totalEstimatedUnits: products.reduce((s, p) => s + (Number(p.quantity) || 0), 0),
          status: 'Pending',
        });
        return res.status(201).json({ success: true, request: requestToClient(r) });
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
    }
    return res.status(500).json({ success: false, message: 'Could not allocate a request number, please retry.' });
  } catch (e) { next(e); }
};

export const setRequestStatus = async (req, res, next) => {
  try {
    const r = await loadRequest(req, res);
    if (!r) return;
    const { status } = req.body || {};
    if (!REQUEST_STATUSES.includes(status) || ['Rejected', 'Quotation Created'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "Pending" or "Under Review" (use the reject action or create a quotation for the others).' });
    }
    if (['Rejected', 'Quotation Created'].includes(r.status)) {
      return res.status(409).json({ success: false, message: `A request in status "${r.status}" cannot be changed.` });
    }
    r.status = status;
    await r.save();
    res.json({ success: true, request: requestToClient(r) });
  } catch (e) { next(e); }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const r = await loadRequest(req, res);
    if (!r) return;
    if (['Rejected', 'Quotation Created'].includes(r.status)) {
      return res.status(409).json({ success: false, message: `A request in status "${r.status}" cannot be rejected.` });
    }
    r.status = 'Rejected';
    r.rejectionReason = str(req.body?.reason, 1000) || 'Inquiry outside supply scope';
    await r.save();
    res.json({ success: true, request: requestToClient(r) });
  } catch (e) { next(e); }
};
