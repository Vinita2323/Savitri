import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { COLUMNS, HEADER_ALIASES, LIMITS, OPTIONAL_COLUMNS } from './constants.js';

const normalizeHeader = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Cell -> plain trimmed text, whatever ExcelJS hands back (numbers, dates, rich text, formulas, hyperlinks). */
export const cellText = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.replace(/^﻿/, '').trim();
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join('').trim();
    if (v.result !== undefined) return cellText(v.result);
    if (v.text !== undefined) return cellText(v.text);
    if (v.hyperlink) return String(v.hyperlink).trim();
    if (v.error) return '';
  }
  return '';
};

export class UploadFileError extends Error {}

const FIRST_SHEET_SKIP = /^(instructions?|lists?|readme|help)$/i;

/**
 * Parses an uploaded .xlsx or .csv buffer.
 * Returns { headers (canonical columns found), rows: [{ rowNumber, values: { column: text } }], unknownColumns }.
 * Fully empty rows are dropped. Throws UploadFileError for anything that makes the whole file unusable.
 */
export const parseUpload = async (buffer, ext) => {
  const wb = new ExcelJS.Workbook();
  let sheet;
  try {
    if (ext === '.csv') {
      sheet = await wb.csv.read(Readable.from(buffer), { parserOptions: { delimiter: ',', trim: true } });
    } else {
      await wb.xlsx.load(buffer);
      sheet = wb.worksheets.find((w) => /^products?$/i.test(w.name)) || wb.worksheets.find((w) => !FIRST_SHEET_SKIP.test(w.name));
    }
  } catch (err) {
    throw new UploadFileError(ext === '.csv' ? 'The CSV file could not be read. Save it as UTF-8 CSV and try again.' : 'The Excel file could not be read. Use the downloaded template and save it as .xlsx.');
  }
  if (!sheet) throw new UploadFileError('The file has no data sheet. Put your products on the "Products" sheet.');
  if (sheet.actualRowCount > LIMITS.maxRows + 5) throw new UploadFileError(`Too many rows. A single upload can contain up to ${LIMITS.maxRows} products; split the file.`);

  // header row = first non-empty row
  let headerRowNumber = 0;
  const colToCanonical = new Map();
  const unknownColumns = [];
  for (let r = 1; r <= Math.min(sheet.rowCount, 15) && !headerRowNumber; r += 1) {
    const row = sheet.getRow(r);
    const found = new Map();
    const unknown = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value);
      if (!text) return;
      const canonical = HEADER_ALIASES[normalizeHeader(text)];
      if (canonical && ![...found.values()].includes(canonical)) found.set(colNumber, canonical);
      else if (!canonical && normalizeHeader(text) !== 'error' && normalizeHeader(text) !== 'rownumber') unknown.push(text);
    });
    if (found.size >= 2) {
      headerRowNumber = r;
      found.forEach((v, k) => colToCanonical.set(k, v));
      unknownColumns.push(...unknown);
    }
  }
  if (!headerRowNumber) throw new UploadFileError('Could not find the header row. The first row must contain column names such as productName, SKU, category, MRP, sellingPrice, stock.');

  const rows = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const values = {};
    let any = false;
    colToCanonical.forEach((canonical, colNumber) => {
      const t = cellText(row.getCell(colNumber).value);
      values[canonical] = t;
      if (t) any = true;
    });
    if (any) rows.push({ rowNumber: r, values });
    if (rows.length > LIMITS.maxRows) throw new UploadFileError(`Too many rows. A single upload can contain up to ${LIMITS.maxRows} products; split the file.`);
  }
  const headers = [...new Set(colToCanonical.values())];
  return { headers, rows, unknownColumns };
};

export const KNOWN_COLUMNS = [...COLUMNS, ...OPTIONAL_COLUMNS];
