/**
 * Corrects ONE brand's map location. Safe by default: it only reads and prints unless --apply is given.
 *
 *   node src/scripts/fixBrandCoordinates.js --list-city Delhi
 *   node src/scripts/fixBrandCoordinates.js --brand-id <brandId|_id> --lat 28.62 --lng 77.08 --expect-name "Natural argo form"
 *   node src/scripts/fixBrandCoordinates.js --brand-id <brandId|_id> --lat 28.62 --lng 77.08 --expect-name "..." --apply
 *
 * Guards: the brand is looked up by its unique id (never by name); --expect-name must match exactly; the update
 * only changes coordinates + location (the radius and every other field are untouched) and its filter includes the
 * coordinates read a moment ago, so it cannot overwrite a value somebody corrected in the meantime.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Brand from '../models/Brand.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(`--${name}`);
const show = (b) => ({
  _id: String(b._id),
  brandId: b.brandId,
  name: b.name,
  code: b.code,
  city: b.city,
  status: b.status,
  serviceCoverage: b.serviceCoverage || 'RADIUS',
  operatingRadiusKm: b.operatingRadiusKm,
  coordinates: b.coordinates,
  location: b.location?.coordinates,
});

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);
  const dbName = mongoose.connection.name;
  console.log(`Connected to database "${dbName}" (${flag('apply') ? 'APPLY mode' : 'dry-run: nothing will be written'})`);

  const listCity = arg('list-city');
  if (listCity) {
    const rows = await Brand.find({ city: new RegExp(`^${listCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
    console.log(JSON.stringify(rows.map(show), null, 2));
    return;
  }

  const id = arg('brand-id');
  const lat = Number(arg('lat'));
  const lng = Number(arg('lng'));
  const expectName = arg('expect-name');
  if (!id || !expectName || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
    throw new Error('Usage: --brand-id <id> --lat <number> --lng <number> --expect-name "<exact brand name>" [--apply]');
  }

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const matches = await Brand.find(isObjectId ? { $or: [{ _id: id }, { brandId: id }] } : { brandId: id }).lean();
  if (matches.length !== 1) throw new Error(`Expected exactly one brand for id "${id}", found ${matches.length}. Nothing changed.`);
  const brand = matches[0];
  if (brand.name !== expectName) throw new Error(`Brand ${brand.brandId} is named "${brand.name}", not "${expectName}". Nothing changed.`);

  console.log('Current record:', JSON.stringify(show(brand), null, 2));
  console.log(`Planned change: coordinates -> { latitude: ${lat}, longitude: ${lng} }, location -> [${lng}, ${lat}] (radius ${brand.operatingRadiusKm} km unchanged)`);

  if (!flag('apply')) {
    console.log('Dry run only. Re-run with --apply to write this change.');
    return;
  }

  const currentCoords = brand.location?.coordinates;
  const res = await Brand.collection.updateOne(
    { _id: brand._id, name: brand.name, 'location.coordinates': currentCoords },
    { $set: { coordinates: { latitude: lat, longitude: lng }, location: { type: 'Point', coordinates: [lng, lat] }, updatedAt: new Date() } }
  );
  if (res.modifiedCount !== 1) throw new Error('The brand changed while the script was running. Nothing was written; run it again.');
  const after = await Brand.findById(brand._id).lean();
  console.log('Updated record:', JSON.stringify(show(after), null, 2));
};

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
