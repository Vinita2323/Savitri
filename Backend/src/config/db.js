import mongoose from 'mongoose';

let isConnected = false;
let diagnosticsAttached = false;
let reconnectTimeout = null;
let indexesSynced = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MongoDB connection string/environment variable (MONGODB_URI) is missing.');
    return;
  }

  try {
    mongoose.set('autoIndex', false);

    const conn = await mongoose.connect(uri, {
      maxPoolSize: 50,
      // Each new connection to a remote Atlas cluster costs a TLS + auth handshake (seconds on a slow link). Keeping a
      // warm, long-lived pool means a burst of page requests reuses ready connections instead of opening 16 at once.
      minPoolSize: Number(process.env.DB_MIN_POOL_SIZE) || 20,
      maxIdleTimeMS: 600000,
      serverSelectionTimeoutMS: 30000, // tolerate slow or unstable networks
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      // Opt-in diagnostics (see DB_SLOW_LOG_MS below); command monitoring has no cost when disabled
      monitorCommands: Number(process.env.DB_SLOW_LOG_MS) > 0,
    });

    // Troubleshooting aid: set DB_SLOW_LOG_MS=1500 in .env to log every MongoDB command slower than 1.5s and every
    // connection the driver opens/closes. Use it to tell a slow network from a slow query.
    const slowMs = Number(process.env.DB_SLOW_LOG_MS);
    if (slowMs > 0 && !diagnosticsAttached) {
      diagnosticsAttached = true;
      const client = conn.connection.getClient();
      client.on('commandSucceeded', (e) => {
        if (e.duration >= slowMs) console.warn(`[DB-SLOW] ${e.commandName} took ${e.duration}ms`);
      });
      client.on('commandFailed', (e) => console.warn(`[DB-FAIL] ${e.commandName} failed after ${e.duration}ms: ${e.failure?.message || e.failure}`));
      client.on('connectionCreated', () => console.warn('[DB-POOL] new connection opened'));
      client.on('connectionClosed', (e) => console.warn(`[DB-POOL] connection closed (reason: ${e.reason})`));
    }

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host} [DB: ${conn.connection.name}] (Pool: ${Number(process.env.DB_MIN_POOL_SIZE) || 20}-50)`);

    // Always sync indexes in production so a fresh deploy never silently runs
    // without them (createIndexes() is non-blocking/non-destructive and only
    // builds what's missing). In local dev this stays opt-in via the env flag
    // to avoid re-syncing on every nodemon reload.
    const shouldSyncIndexes = process.env.NODE_ENV === 'production' || process.env.SYNC_INDEXES_ON_STARTUP === 'true';
    if (!indexesSynced && shouldSyncIndexes) {
      indexesSynced = true;
      import('../scripts/syncIndexes.js')
        .then((m) => m.syncAllIndexes())
        .catch((e) => console.warn('[DB] Background index sync notice:', e.message));
    }

    return conn;
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}. Retrying in 3s...`);
    isConnected = false;
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connectDB();
      }, 3000);
    }
  }
};

// Global Connection Event Listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Error]', err.message);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Disconnected] Socket connection lost. Auto-reconnecting...');
  isConnected = false;
  if (!reconnectTimeout) {
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connectDB();
    }, 2000);
  }
});

export default connectDB;
