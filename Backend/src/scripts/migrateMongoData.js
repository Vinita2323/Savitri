/**
 * MongoDB Atlas → Atlas data migration (read-safe by default).
 *
 * Usage:
 *   # Inspect only (no writes) — default when --execute is omitted
 *   SOURCE_MONGODB_URI="..." DESTINATION_MONGODB_URI="..." node src/scripts/migrateMongoData.js
 *
 *   # Perform migration (requires explicit --execute)
 *   SOURCE_MONGODB_URI="..." DESTINATION_MONGODB_URI="..." node src/scripts/migrateMongoData.js --execute
 *
 * Optional:
 *   SOURCE_DB_NAME=shippnex   DESTINATION_DB_NAME=shippnex
 *   BATCH_SIZE=500
 *
 * Safety:
 *   - Never drops databases or collections
 *   - Aborts before writes if destination collections already have documents (unless --force-merge)
 *   - Preserves _id; skips docs that already exist in destination (idempotent)
 *   - Does not print credentials
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.migration') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSTEM_DBS = new Set(['admin', 'local', 'config']);
const SYSTEM_COLL_PREFIXES = ['system.'];

const args = new Set(process.argv.slice(2));
const DO_EXECUTE = args.has('--execute');
const FORCE_MERGE = args.has('--force-merge');
const BATCH_SIZE = Math.max(50, Number(process.env.BATCH_SIZE || 500));

function redactUri(uri) {
  if (!uri) return '(missing)';
  try {
    const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    const host = u.host;
    const dbPath = u.pathname || '';
    return `${uri.startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb'}://***:***@${host}${dbPath}`;
  } catch {
    return 'mongodb://*** (unparseable)';
  }
}

function dbNameFromUri(uri, fallback) {
  if (!uri) return fallback;
  try {
    const normalized = uri.replace(/^mongodb\+srv:\/\//, 'https://').replace(/^mongodb:\/\//, 'http://');
    const u = new URL(normalized);
    const name = (u.pathname || '').replace(/^\//, '').split('?')[0];
    return name || fallback;
  } catch {
    return fallback;
  }
}

function isSystemCollection(name) {
  return SYSTEM_COLL_PREFIXES.some((p) => name.startsWith(p));
}

async function listNonSystemDatabases(client) {
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();
  return databases
    .map((d) => d.name)
    .filter((name) => !SYSTEM_DBS.has(name));
}

async function listCollections(db) {
  const cols = await db.listCollections({}, { nameOnly: false }).toArray();
  return cols.filter((c) => !isSystemCollection(c.name));
}

async function getIndexSpecs(collection) {
  const indexes = await collection.indexes();
  // Exclude default _id_ — Mongo creates it automatically
  return indexes.filter((idx) => idx.name !== '_id_');
}

function sanitizeIndexForCreate(idx) {
  const { key, name, ...rest } = idx;
  const opts = { name };
  const allowed = [
    'unique',
    'sparse',
    'expireAfterSeconds',
    'partialFilterExpression',
    'collation',
    'wildcardProjection',
    'hidden',
    'weights',
    'default_language',
    'language_override',
    'textIndexVersion',
    '2dsphereIndexVersion',
    'bits',
    'min',
    'max',
    'bucketSize',
  ];
  for (const k of allowed) {
    if (rest[k] !== undefined) opts[k] = rest[k];
  }
  return { key, options: opts };
}

async function countByIdOverlap(sourceCol, destCol) {
  // Sample check: if dest empty, overlap is 0. If both have data, compare via aggregation on _id.
  const destCount = await destCol.estimatedDocumentCount();
  if (destCount === 0) return { overlap: 0, destCount: 0 };

  const sourceIds = await sourceCol.find({}, { projection: { _id: 1 } }).map((d) => d._id).toArray();
  if (sourceIds.length === 0) return { overlap: 0, destCount };

  let overlap = 0;
  const chunk = 1000;
  for (let i = 0; i < sourceIds.length; i += chunk) {
    const slice = sourceIds.slice(i, i + chunk);
    overlap += await destCol.countDocuments({ _id: { $in: slice } });
  }
  return { overlap, destCount };
}

async function copyCollection(sourceCol, destCol, { dryRun }) {
  const report = {
    collection: sourceCol.collectionName,
    sourceCount: await sourceCol.countDocuments(),
    destCountBefore: await destCol.countDocuments(),
    migrated: 0,
    skippedExisting: 0,
    failed: 0,
    indexCreated: 0,
    indexSkipped: 0,
    indexErrors: [],
    errors: [],
  };

  if (dryRun) {
    report.destCountAfter = report.destCountBefore;
    return report;
  }

  // Indexes first (non-destructive; skip conflicts)
  try {
    const specs = await getIndexSpecs(sourceCol);
    for (const idx of specs) {
      try {
        const { key, options } = sanitizeIndexForCreate(idx);
        await destCol.createIndex(key, options);
        report.indexCreated += 1;
      } catch (err) {
        report.indexSkipped += 1;
        report.indexErrors.push(err.message);
      }
    }
  } catch (err) {
    report.errors.push(`index listing failed: ${err.message}`);
  }

  // Optional: copy validator / collation options if present and dest has none
  try {
    const sourceInfo = (
      await sourceCol.s.db.listCollections({ name: sourceCol.collectionName }).toArray()
    )[0];
    if (sourceInfo?.options && Object.keys(sourceInfo.options).length > 0) {
      const destInfo = (
        await destCol.s.db.listCollections({ name: destCol.collectionName }).toArray()
      )[0];
      const destHasValidator = Boolean(destInfo?.options?.validator);
      if (!destHasValidator && sourceInfo.options.validator) {
        try {
          await destCol.s.db.command({
            collMod: destCol.collectionName,
            validator: sourceInfo.options.validator,
            validationLevel: sourceInfo.options.validationLevel || 'moderate',
            validationAction: sourceInfo.options.validationAction || 'error',
          });
        } catch (err) {
          // Collection may not exist yet — create with options via insert path, then collMod may fail until first write
          report.errors.push(`validator apply: ${err.message}`);
        }
      }
    }
  } catch {
    // validators are best-effort
  }

  const cursor = sourceCol.find({}).batchSize(BATCH_SIZE);
  let batch = [];

  const flush = async () => {
    if (batch.length === 0) return;
    try {
      const result = await destCol.insertMany(batch, { ordered: false });
      report.migrated += result.insertedCount ?? Object.keys(result.insertedIds || {}).length;
    } catch (err) {
      // BulkWriteError: some inserted, some duplicate key
      const inserted = err.result?.nInserted ?? err.insertedCount ?? 0;
      report.migrated += inserted;
      const writeErrors = err.writeErrors || err.result?.result?.writeErrors || [];
      for (const we of writeErrors) {
        if (we.code === 11000) {
          report.skippedExisting += 1;
        } else {
          report.failed += 1;
          if (report.errors.length < 20) {
            report.errors.push(we.errmsg || we.message || String(we));
          }
        }
      }
      // If err has no writeErrors detail, count remaining as failed/skipped heuristically
      if (!writeErrors.length) {
        const msg = err.message || '';
        if (msg.includes('duplicate key') || err.code === 11000) {
          report.skippedExisting += batch.length - inserted;
        } else {
          report.failed += batch.length - inserted;
          if (report.errors.length < 20) report.errors.push(msg);
        }
      }
    }
    batch = [];
  };

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }
  await flush();

  report.destCountAfter = await destCol.countDocuments();
  return report;
}

async function verifyCollection(sourceCol, destCol) {
  const sourceCount = await sourceCol.countDocuments();
  const destCount = await destCol.countDocuments();

  // Verify every source _id exists in destination (batched)
  const missing = [];
  const cursor = sourceCol.find({}, { projection: { _id: 1 } }).batchSize(BATCH_SIZE);
  let idBatch = [];

  const checkBatch = async () => {
    if (idBatch.length === 0) return;
    const found = await destCol
      .find({ _id: { $in: idBatch } }, { projection: { _id: 1 } })
      .map((d) => String(d._id))
      .toArray();
    const foundSet = new Set(found);
    for (const id of idBatch) {
      if (!foundSet.has(String(id))) missing.push(String(id));
    }
    idBatch = [];
  };

  for await (const doc of cursor) {
    idBatch.push(doc._id);
    if (idBatch.length >= BATCH_SIZE) await checkBatch();
  }
  await checkBatch();

  return {
    sourceCount,
    destCount,
    missingCount: missing.length,
    missingSample: missing.slice(0, 5),
    ok: missing.length === 0 && destCount >= sourceCount,
  };
}

async function main() {
  const sourceUri = process.env.SOURCE_MONGODB_URI;
  const destUri = process.env.DESTINATION_MONGODB_URI;

  if (!sourceUri || !destUri) {
    console.error('Missing SOURCE_MONGODB_URI and/or DESTINATION_MONGODB_URI.');
    console.error('Set them in Backend/.env.migration or the environment, then re-run.');
    process.exit(1);
  }

  const sourceDbName =
    process.env.SOURCE_DB_NAME || dbNameFromUri(sourceUri, null);
  const destDbName =
    process.env.DESTINATION_DB_NAME || dbNameFromUri(destUri, 'shippnex') || 'shippnex';

  console.log('=== MongoDB Migration Tool ===');
  console.log(`Mode: ${DO_EXECUTE ? 'EXECUTE (writes enabled)' : 'INSPECT / DRY-RUN (no writes)'}`);
  console.log(`Source URI:      ${redactUri(sourceUri)}`);
  console.log(`Destination URI: ${redactUri(destUri)}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  const sourceClient = new MongoClient(sourceUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 20000,
  });
  const destClient = new MongoClient(destUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 20000,
  });

  try {
    await sourceClient.connect();
    await destClient.connect();
    console.log('Connected to source and destination clusters.');

    const sourceDbs = await listNonSystemDatabases(sourceClient);
    const destDbs = await listNonSystemDatabases(destClient);
    console.log(`Source databases:      ${sourceDbs.join(', ') || '(none)'}`);
    console.log(`Destination databases: ${destDbs.join(', ') || '(none)'}`);

    // Resolve source DB name if URI has no path
    let resolvedSourceDb = sourceDbName;
    if (!resolvedSourceDb) {
      if (sourceDbs.length === 1) {
        resolvedSourceDb = sourceDbs[0];
        console.log(`Source DB inferred (only non-system DB): ${resolvedSourceDb}`);
      } else if (sourceDbs.includes('shippnex')) {
        resolvedSourceDb = 'shippnex';
        console.log('Source DB selected: shippnex (matched app name)');
      } else if (sourceDbs.includes('test')) {
        resolvedSourceDb = 'test';
        console.log('Source DB selected: test (common Mongoose default)');
      } else {
        console.error('Cannot determine SOURCE_DB_NAME. Set SOURCE_DB_NAME explicitly.');
        console.error(`Available: ${sourceDbs.join(', ')}`);
        process.exit(1);
      }
    }

    console.log(`Source DB:      ${resolvedSourceDb}`);
    console.log(`Destination DB: ${destDbName}`);
    console.log('');

    const sourceDb = sourceClient.db(resolvedSourceDb);
    const destDb = destClient.db(destDbName);

    const sourceCollections = await listCollections(sourceDb);
    if (sourceCollections.length === 0) {
      console.error(`No application collections found in source DB "${resolvedSourceDb}".`);
      process.exit(1);
    }

    console.log(`Source collections (${sourceCollections.length}):`);
    const inventory = [];
    let destHasAnyData = false;
    let conflictCollections = [];

    for (const meta of sourceCollections) {
      const name = meta.name;
      const sourceCol = sourceDb.collection(name);
      const destCol = destDb.collection(name);
      const sourceCount = await sourceCol.countDocuments();
      const destCount = await destCol.countDocuments();
      let overlap = 0;
      if (destCount > 0 && sourceCount > 0) {
        // Lightweight overlap estimate for report (full verify later)
        const sample = await sourceCol.find({}, { projection: { _id: 1 } }).limit(200).toArray();
        if (sample.length) {
          overlap = await destCol.countDocuments({ _id: { $in: sample.map((d) => d._id) } });
        }
      }
      if (destCount > 0) {
        destHasAnyData = true;
        conflictCollections.push({ name, sourceCount, destCount, sampleOverlap: overlap });
      }
      inventory.push({ name, sourceCount, destCount, sampleOverlap: overlap, type: meta.type });
      console.log(
        `  - ${name}: source=${sourceCount}, dest=${destCount}` +
          (destCount > 0 ? `, sampleIdOverlap(≤200)=${overlap}` : '')
      );
    }

    console.log('');

    if (destHasAnyData && DO_EXECUTE && !FORCE_MERGE) {
      console.error('DESTINATION ALREADY CONTAINS DATA. Aborting before any writes.');
      console.error('Conflicting collections:');
      for (const c of conflictCollections) {
        console.error(
          `  - ${c.name}: dest=${c.destCount}, source=${c.sourceCount}, sampleOverlap=${c.sampleOverlap}`
        );
      }
      console.error('');
      console.error('Options:');
      console.error('  1) Clear destination data manually (outside this script), then re-run with --execute');
      console.error('  2) Re-run with --execute --force-merge to insert only missing _ids (skip duplicates)');
      process.exit(2);
    }

    if (!DO_EXECUTE) {
      console.log('DRY-RUN complete. No documents were written.');
      console.log('To migrate after approval, re-run with --execute');
      if (destHasAnyData) {
        console.log('NOTE: Destination already has data; --execute will abort unless --force-merge is also passed.');
      }
      console.log('');
      console.log(
        JSON.stringify(
          {
            mode: 'inspect',
            sourceDb: resolvedSourceDb,
            destDb: destDbName,
            collections: inventory,
            destinationHasData: destHasAnyData,
            conflictCollections,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`Starting migration of ${sourceCollections.length} collections...`);
    const reports = [];
    for (const meta of sourceCollections) {
      const name = meta.name;
      console.log(`\n→ Migrating collection: ${name}`);
      const report = await copyCollection(sourceDb.collection(name), destDb.collection(name), {
        dryRun: false,
      });
      reports.push(report);
      console.log(
        `  migrated=${report.migrated}, skippedExisting=${report.skippedExisting}, failed=${report.failed}, indexesCreated=${report.indexCreated}`
      );
      if (report.errors.length) {
        console.log(`  errors (sample): ${report.errors.slice(0, 3).join(' | ')}`);
      }
    }

    console.log('\n=== Verification ===');
    let allOk = true;
    const verifications = [];
    for (const meta of sourceCollections) {
      const name = meta.name;
      const v = await verifyCollection(sourceDb.collection(name), destDb.collection(name));
      verifications.push({ collection: name, ...v });
      const status = v.ok ? 'OK' : 'FAIL';
      if (!v.ok) allOk = false;
      console.log(
        `  [${status}] ${name}: source=${v.sourceCount}, dest=${v.destCount}, missingIds=${v.missingCount}`
      );
    }

    console.log('\n=== Final Report ===');
    const summary = reports.map((r) => ({
      collection: r.collection,
      sourceCount: r.sourceCount,
      destCountBefore: r.destCountBefore,
      destCountAfter: r.destCountAfter,
      migrated: r.migrated,
      skippedExisting: r.skippedExisting,
      failed: r.failed,
      indexCreated: r.indexCreated,
      indexSkipped: r.indexSkipped,
    }));
    console.log(JSON.stringify({ success: allOk, summary, verifications }, null, 2));

    if (!allOk) {
      console.error('\nMigration verification FAILED.');
      process.exit(3);
    }
    console.log('\nMigration verification PASSED.');
  } finally {
    await sourceClient.close().catch(() => {});
    await destClient.close().catch(() => {});
    console.log('Connections closed.');
  }
}

main().catch((err) => {
  console.error('Migration aborted:', err.message);
  process.exit(1);
});
