/**
 * Moves existing brand-limited admins to per-brand permissions WITHOUT changing what they can do today.
 *
 *   node scripts/migrateAdminBrandPermissions.js            dry run: shows what would change, writes nothing
 *   node scripts/migrateAdminBrandPermissions.js --apply    writes the records and switches the accounts
 *
 * Optional: --preset=ADMIN or --preset=SUB_ADMIN gives that preset instead of today's full access (this REDUCES access).
 *           --admin=someone@example.com limits the run to one account.
 *
 * Only admins that already have a list of brands are touched. City Admins and Super Admins are never touched. Older admins
 * that can use every brand are only listed: choose their brands in Admin Configuration first. Running it again changes
 * nothing for accounts already switched.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../src/models/Admin.model.js';
import Brand from '../src/models/Brand.model.js';
import { saveBrandAccess } from '../src/services/adminBrandAccessService.js';
import { assignedBrandIds } from '../src/utils/adminAccess.js';
import { MODULES, ROLE_PRESETS } from '../src/utils/permissionCatalog.js';

dotenv.config();

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const apply = process.argv.includes('--apply');
const preset = arg('preset');
const only = arg('admin')?.toLowerCase();

const FULL = Object.fromEntries(MODULES.map((m) => [m.key, [...m.actions]]));
const actor = { id: null, name: 'Permission migration', email: '' };

const main = async () => {
  if (preset && !['ADMIN', 'SUB_ADMIN'].includes(preset)) throw new Error('--preset must be ADMIN or SUB_ADMIN');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(uri);
  console.log(`Database: ${mongoose.connection.name} | mode: ${apply ? 'APPLY' : 'DRY RUN (nothing is written)'} | access: ${preset || 'same as today'}`);

  const brands = new Map((await Brand.find({}).select('brandId name').lean()).map((b) => [b.brandId, b.name]));
  const admins = await Admin.find({ role: 'admin', adminType: { $ne: 'CITY_ADMIN' }, ...(only ? { email: only } : {}) })
    .select('name email authorizedBrands brandAccess permissionMode status').lean();

  const permissions = preset ? ROLE_PRESETS.find((r) => r.key === preset).permissions : FULL;
  let switched = 0; const everyBrand = []; let already = 0;
  for (const admin of admins) {
    if (admin.permissionMode === 'PER_BRAND') { already += 1; continue; }
    const list = admin.authorizedBrands;
    const limited = admin.brandAccess === 'ASSIGNED' || (Array.isArray(list) && list.length > 0 && !list.includes('*'));
    if (!limited) { everyBrand.push(admin.email); continue; }
    const ids = assignedBrandIds(admin).filter((id) => brands.has(id));
    console.log(`- ${admin.email}: ${ids.length} brand(s): ${ids.map((id) => brands.get(id)).join(', ') || 'none'}`);
    if (apply) {
      for (const brandId of ids) {
        await saveBrandAccess({ admin, brandId, brandName: brands.get(brandId), roleProfile: preset || 'CUSTOM', permissions, actor });
      }
      await Admin.updateOne({ _id: admin._id }, { $set: { permissionMode: 'PER_BRAND', brandAccess: 'ASSIGNED', authorizedBrands: ids } });
    }
    switched += 1;
  }

  console.log(`\n${apply ? 'Switched' : 'Would switch'}: ${switched}. Already per-brand: ${already}.`);
  if (everyBrand.length) console.log(`Not changed (they can use every brand; assign brands in Admin Configuration to limit them): ${everyBrand.join(', ')}`);
  await mongoose.disconnect();
};

main().catch(async (e) => { console.error(e.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
