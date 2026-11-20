import ExcelJS from 'exceljs';
import Category from '../../models/Category.model.js';
import Product from '../../models/Product.model.js';
import { COLUMNS, GST_SLABS, UNIT_TYPES } from './constants.js';

/** Excel/CSV cells that start with = + - @ would be run as formulas when a spreadsheet opens an exported file. */
export const safeCsvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** The categories a seller may use (Active ones, subcategories listed under their parent) and the brands already in use. */
export const loadTemplateLists = async (sellerId) => {
  const cats = await Category.find({ status: 'Active' }).select('name parent').sort({ name: 1 }).lean();
  const names = cats.map((c) => c.name);
  const own = sellerId ? await Product.distinct('brand', { sellerId }) : [];
  const all = await Product.distinct('brand', { brand: { $nin: ['', null] } });
  const brands = [...new Set([...own, ...all].map((b) => String(b || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 500);
  return { categories: names, brands };
};

const SAMPLE = {
  productName: 'Tata Salt 1 kg', SKU: 'SALT-1KG', barcode: '8901052007118', category: '', brand: 'Tata', description: 'Vacuum evaporated iodised salt',
  MRP: 28, sellingPrice: 26, purchasePrice: 21, stock: 120, unit: '1 kg', GST: 5, weight: '1 kg', images: 'SALT-1KG.jpg', status: 'active', returnable: 'yes', returnDays: 7,
};

const INSTRUCTIONS = [
  ['How to use this template'],
  [''],
  ['1. Fill one product per row on the "Products" sheet. Delete the sample row (or overwrite it).'],
  ['2. Required for new products: productName, SKU, category, MRP, sellingPrice, stock.'],
  ['3. category must be one of the names on the "Lists" sheet (pick it from the dropdown).'],
  ['4. sellingPrice cannot be higher than MRP. stock must be a whole number (0 or more).'],
  ['5. unit: a number and a unit, for example 500 g, 1 kg, 1 ltr, 6 pcs. GST: a percentage such as 5, 12 or 18.'],
  ['6. images: separate several with | . Use full https:// links, or file names that are inside your images ZIP.'],
  ['   If you upload an images ZIP and leave "images" empty, files named SKU.jpg, SKU_1.jpg, SKU_2.jpg ... are used (first = main image).'],
  ['7. status: active or inactive. Leave empty to publish automatically (active when stock > 0, out of stock when stock is 0).'],
  ['8. Format the SKU and barcode columns as Text so Excel does not drop leading zeros.'],
  ['9. returnable (optional): yes or no. returnDays (optional): a whole number from 1 to 30. Leave both empty to keep the current setting (UPDATE) or'],
  ['   the default of returnable for 7 days (CREATE). returnDays is ignored for a non-returnable product.'],
  [''],
  ['Modes'],
  ['CREATE: adds new products; a SKU that already exists in YOUR catalogue is rejected.'],
  ['UPDATE: changes your existing products found by SKU (or the optional productId column). Empty cells are left unchanged.'],
  [''],
  ['Every seller has an independent catalogue: your SKUs, prices, stock and images never affect another seller.'],
];

export const buildXlsxTemplate = async ({ categories, brands }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Savitri';
  const ws = wb.addWorksheet('Products', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: Math.max(14, c.length + 4) }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  ws.getColumn('productName').width = 34;
  ws.getColumn('description').width = 40;
  ws.getColumn('images').width = 36;
  ws.addRow({ ...SAMPLE, category: categories[0] || 'Groceries' });
  // text columns so Excel keeps leading zeros
  ['SKU', 'barcode'].forEach((k) => { ws.getColumn(k).numFmt = '@'; });

  const lists = wb.addWorksheet('Lists');
  lists.addRow(['Categories', 'Brands (already used on the platform)', 'Units', 'GST %', 'Status']);
  const max = Math.max(categories.length, brands.length, UNIT_TYPES.length, GST_SLABS.length, 2);
  for (let i = 0; i < max; i += 1) lists.addRow([categories[i] || '', brands[i] || '', UNIT_TYPES[i] || '', GST_SLABS[i] ?? '', ['active', 'inactive'][i] || '']);
  lists.getRow(1).font = { bold: true };
  lists.columns.forEach((c) => { c.width = 30; });

  // dropdowns for 500 rows
  const catEnd = Math.max(2, categories.length + 1);
  for (let r = 2; r <= 501; r += 1) {
    if (categories.length) ws.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`Lists!$A$2:$A$${catEnd}`], showErrorMessage: true, errorTitle: 'Category', error: 'Choose a category from the list.' };
    ws.getCell(`O${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"active,inactive"'] };
    ws.getCell(`P${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"yes,no"'] };
  }

  const help = wb.addWorksheet('Instructions');
  INSTRUCTIONS.forEach((l) => help.addRow(l));
  help.getColumn(1).width = 120;
  help.getRow(1).font = { bold: true, size: 14 };
  return wb.xlsx.writeBuffer();
};

export const buildCsvTemplate = ({ categories }) => {
  const sample = { ...SAMPLE, category: categories[0] || 'Groceries' };
  return `﻿${COLUMNS.join(',')}\r\n${COLUMNS.map((c) => safeCsvCell(sample[c])).join(',')}\r\n`;
};
