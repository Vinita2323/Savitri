import mongoose from 'mongoose';
import { GST_SLABS, LIMITS } from './constants.js';
import { zipFilesForSku } from './images.js';

const SKU_RULE = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,49}$/;
const BARCODE_RULE = /^[A-Za-z0-9\-]{4,32}$/;
const OID = /^[0-9a-fA-F]{24}$/;
const clean = (s) => String(s ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
const norm = (s) => clean(s).toLowerCase();

const toNumber = (text) => {
  const t = String(text).replace(/[₹,\s]|rs\.?|inr/gi, '');
  if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
};

const UNIT_ALIASES = { kgs: 'kg', kilogram: 'kg', kilograms: 'kg', gm: 'g', gms: 'g', gram: 'g', grams: 'g', ltr: 'ltr', l: 'ltr', litre: 'ltr', liter: 'ltr', litres: 'ltr', liters: 'ltr', lt: 'ltr', pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs', unit: 'pcs', units: 'pcs', nos: 'pcs', pack: 'pack', packs: 'pack', dozen: 'dozen', box: 'box', boxes: 'box', ml: 'ml', mg: 'mg', kg: 'kg', g: 'g', m: 'm', cm: 'cm' };

export const parseUnit = (text) => {
  const t = clean(text).toLowerCase();
  const m = t.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (m && UNIT_ALIASES[m[2]]) return { unitValue: String(Number(m[1])), unitType: UNIT_ALIASES[m[2]], unit: `${Number(m[1])} ${UNIT_ALIASES[m[2]]}` };
  const bare = t.match(/^([a-z]+)$/);
  if (bare && UNIT_ALIASES[bare[1]]) return { unitValue: '1', unitType: UNIT_ALIASES[bare[1]], unit: `1 ${UNIT_ALIASES[bare[1]]}` };
  return null;
};

const splitImages = (text) => clean(text).length === 0 ? [] : String(text).split(/[|;\n]|,(?=\s*https?:)/).map((x) => x.trim()).filter(Boolean);

/**
 * Validates every row. Nothing here touches the database except through the lookups handed in via `ctx`:
 *   ctx.mode            'CREATE' | 'UPDATE'
 *   ctx.headers         canonical columns present in the file
 *   ctx.categoryMap     Map(lower-case name -> { name, parentName|null })
 *   ctx.bySku           Map(lower-case sku -> existing product of THIS seller)
 *   ctx.byId            Map(id string -> existing product of THIS seller)
 *   ctx.zipByName       Map of image file names inside the uploaded ZIP, or null
 *   ctx.sheetSkus       Set of lower-case SKUs in the file
 */
export const validateRows = (rows, ctx) => {
  const seenSku = new Map();
  const results = [];
  for (const row of rows) {
    const v = row.values;
    const errors = [];
    const warnings = [];
    const rawOut = { ...v };
    const res = { rowNumber: row.rowNumber, raw: rawOut, status: 'invalid', action: 'none', errors, warnings, data: null };
    results.push(res);

    const id = clean(v.productId);
    const sku = clean(v.SKU);
    if (id && !OID.test(id)) errors.push('productId is not a valid id');
    if (sku && !SKU_RULE.test(sku)) errors.push('SKU may contain letters, numbers and . _ - / only (max 50 characters, must start with a letter or number)');

    // duplicate inside the file
    const dupKey = id || (sku ? sku.toLowerCase() : '');
    if (dupKey) {
      if (seenSku.has(dupKey)) errors.push(`Duplicate ${id ? 'productId' : 'SKU'} in this file (also on row ${seenSku.get(dupKey)})`);
      else seenSku.set(dupKey, row.rowNumber);
    }

    const create = ctx.mode === 'CREATE';
    let existing = null;
    if (create) {
      if (!sku) errors.push('SKU is required');
      else if (ctx.bySku.has(sku.toLowerCase())) errors.push('SKU already exists in your catalogue (use UPDATE mode to change it)');
    } else {
      if (!sku && !id) errors.push('SKU or productId is required to find the product');
      else {
        existing = id ? ctx.byId.get(id) : ctx.bySku.get(sku.toLowerCase());
        // never reveal whether the product belongs to someone else: it is simply not in your catalogue
        if (!existing && (id ? OID.test(id) : SKU_RULE.test(sku))) errors.push('Product not found in your catalogue');
      }
    }

    const set = {}; // validated, cleaned values
    const provided = (k) => clean(v[k]) !== '';

    // productName
    if (provided('productName')) {
      const name = clean(v.productName);
      if (name.length < 2) errors.push('productName must be at least 2 characters');
      else if (name.length > 200) errors.push('productName must be 200 characters or fewer');
      else set.name = name;
    } else if (create) errors.push('productName is required');

    // barcode
    if (provided('barcode')) {
      const b = clean(v.barcode);
      if (!BARCODE_RULE.test(b)) errors.push('barcode must be 4-32 letters, numbers or hyphens');
      else set.barcode = b;
    }

    // category (a subcategory name is also accepted: it fills category + subCategory)
    if (provided('category')) {
      const hit = ctx.categoryMap.get(norm(v.category));
      if (!hit) errors.push(`Category "${clean(v.category).slice(0, 60)}" does not exist. Choose one from the Lists sheet`);
      else if (hit.parentName) { set.category = hit.parentName; set.subCategory = hit.name; } else { set.category = hit.name; if (!create) set.subCategory = ''; }
    } else if (create) errors.push('category is required');

    // brand / description / weight
    if (provided('brand')) { const b = clean(v.brand); if (b.length > 80) errors.push('brand must be 80 characters or fewer'); else set.brand = b; }
    if (provided('description')) { const d = String(v.description).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim(); if (d.length > 5000) errors.push('description must be 5000 characters or fewer'); else set.description = d; }
    if (provided('weight')) { const w = clean(v.weight); if (w.length > 30) errors.push('weight must be 30 characters or fewer'); else set.weight = w; }

    // prices + stock
    let mrp; let price;
    if (provided('MRP')) { mrp = toNumber(v.MRP); if (Number.isNaN(mrp) || mrp < 0 || mrp > 10000000) errors.push('MRP must be a number between 0 and 10,000,000'); else set.mrp = mrp; } else if (create) errors.push('MRP is required');
    if (provided('sellingPrice')) { price = toNumber(v.sellingPrice); if (Number.isNaN(price) || price < 0 || price > 10000000) errors.push('sellingPrice must be a number between 0 and 10,000,000'); else set.salePrice = price; } else if (create) errors.push('sellingPrice is required');
    if (provided('purchasePrice')) { const p = toNumber(v.purchasePrice); if (Number.isNaN(p) || p < 0 || p > 10000000) errors.push('purchasePrice must be a number (0 or more)'); else set.purchasePrice = p; }
    if (provided('stock')) {
      const s = toNumber(v.stock);
      if (Number.isNaN(s) || s < 0 || !Number.isInteger(s) || s > 10000000) errors.push('stock must be a whole number (0 or more)'); else set.stock = s;
    } else if (create) errors.push('stock is required');

    const effMrp = set.mrp !== undefined ? set.mrp : existing?.mrp;
    const effPrice = set.salePrice !== undefined ? set.salePrice : existing?.salePrice;
    if (effMrp !== undefined && effPrice !== undefined && effPrice > effMrp) errors.push('sellingPrice cannot be higher than MRP');
    if (set.purchasePrice !== undefined && effPrice !== undefined && set.purchasePrice > effPrice) warnings.push('purchasePrice is higher than sellingPrice (selling at a loss)');

    // unit, GST
    if (provided('unit')) {
      const u = parseUnit(v.unit);
      if (!u) errors.push('unit must look like "500 g", "1 kg", "1 ltr" or "6 pcs"'); else Object.assign(set, u);
    } else if (create) Object.assign(set, { unitValue: '1', unitType: 'pcs', unit: '1 pcs' });
    if (provided('GST')) {
      const g = toNumber(String(v.GST).replace('%', ''));
      if (Number.isNaN(g) || g < 0 || g > 100) errors.push('GST must be a percentage between 0 and 100');
      else { set.taxRate = `${g}%`; if (!GST_SLABS.includes(g)) warnings.push(`GST ${g}% is not a standard slab (0, 3, 5, 12, 18, 28)`); }
    }

    // status
    let desired = null; // null = automatic
    if (provided('status')) {
      const st = norm(v.status);
      if (['active', 'published', 'live'].includes(st)) desired = 'active';
      else if (['inactive', 'draft', 'hidden', 'disabled'].includes(st)) desired = 'inactive';
      else if (st === 'out_of_stock' || st === 'out of stock') desired = null;
      else errors.push('status must be active or inactive (or empty)');
    }

    // returns: returnable (yes / no) and returnDays (1-30). Empty cells keep the product's current value (UPDATE) or the
    // platform default, returnable for 7 days (CREATE). Nothing here touches variants, stock or any other field.
    let retFlag;
    if (provided('returnable')) {
      const t = norm(v.returnable).replace(/[\s_-]+/g, '');
      if (['yes', 'y', 'true', '1', 'returnable'].includes(t)) retFlag = true;
      else if (['no', 'n', 'false', '0', 'nonreturnable', 'notreturnable'].includes(t)) retFlag = false;
      else errors.push('returnable must be yes or no (or empty)');
    }
    let retDays;
    if (provided('returnDays')) {
      const d = toNumber(v.returnDays);
      if (Number.isNaN(d) || !Number.isInteger(d) || d < 1 || d > 30) errors.push('returnDays must be a whole number between 1 and 30');
      else retDays = d;
    }
    if (retFlag !== undefined || retDays !== undefined) {
      const effFlag = retFlag !== undefined ? retFlag : (existing ? existing.isReturnable !== false : true);
      if (retFlag !== undefined) set.isReturnable = retFlag;
      if (retDays !== undefined) {
        if (effFlag) set.returnWindow = retDays; else warnings.push('returnDays was ignored because the product is non-returnable');
      }
      if (retFlag !== undefined || (retDays !== undefined && effFlag)) {
        // the policy label follows the product editor; a custom note written by the seller is kept
        const curPolicy = existing ? String(existing.returnPolicy || '') : '';
        if (create || !curPolicy || /^\d+ Days Returnable/i.test(curPolicy) || /^Non-Returnable/i.test(curPolicy)) {
          set.returnPolicy = effFlag ? `${set.returnWindow !== undefined ? set.returnWindow : (existing?.returnWindow || 7)} Days Returnable / Replacement` : 'Non-Returnable';
        }
      }
    }

    // images (resolved when the import runs; here we only check that links look right and ZIP files exist)
    const refs = [];
    const tokens = splitImages(v.images);
    for (const tok of tokens) {
      if (/^https?:\/\//i.test(tok)) {
        if (tok.length > 2000) errors.push('An image link is longer than 2000 characters');
        else refs.push({ kind: 'url', value: tok });
      } else if (/\.(jpe?g|png|webp|gif|avif)$/i.test(tok)) {
        if (!ctx.zipByName) errors.push(`Image "${tok.slice(0, 60)}" is a file name but no images ZIP was uploaded`);
        else if (!ctx.zipByName.has(tok.split(/[\\/]/).pop().toLowerCase())) errors.push(`Image "${tok.slice(0, 60)}" was not found in the images ZIP`);
        else refs.push({ kind: 'zip', value: tok.split(/[\\/]/).pop().toLowerCase() });
      } else errors.push(`"${tok.slice(0, 60)}" is not an image link or an image file name (.jpg .png .webp .gif .avif)`);
    }
    if (tokens.length === 0 && ctx.zipByName && sku) {
      const files = zipFilesForSku(ctx.zipByName, sku, ctx.sheetSkus);
      files.forEach((f) => refs.push({ kind: 'zip', value: f }));
      if (files.length) warnings.push(`${files.length} image${files.length === 1 ? '' : 's'} matched from the ZIP by SKU`);
    }
    if (refs.length > LIMITS.maxImagesPerProduct) { errors.push(`A product can have at most ${LIMITS.maxImagesPerProduct} images`); }

    // update-specific rules
    if (!create && existing) {
      if (existing.hasVariants && (set.stock !== undefined || set.mrp !== undefined || set.salePrice !== undefined)) {
        errors.push('This product has variants. Change its price and stock in the product editor');
      }
      if (id && sku && SKU_RULE.test(sku) && sku.toLowerCase() !== String(existing.sku || '').toLowerCase()) {
        const clash = ctx.bySku.get(sku.toLowerCase());
        if (clash && String(clash._id) !== String(existing._id)) errors.push('The new SKU is already used by another product of yours');
        else set.sku = sku;
      }
    }
    if (create && sku) set.sku = sku;

    if (errors.length) { res.status = 'invalid'; continue; }

    const hasChange = Object.keys(set).length > 0 || refs.length > 0 || (provided('status'));
    if (!create && !hasChange) { res.status = 'skipped'; res.warnings.push('No changes: every column except SKU was empty'); res.action = 'none'; res.data = null; continue; }

    res.status = 'valid';
    res.action = create ? 'create' : 'update';
    res.data = { set, imageRefs: refs, desiredStatus: desired, statusProvided: provided('status'), productId: existing ? String(existing._id) : null };
  }
  return results;
};

export const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
