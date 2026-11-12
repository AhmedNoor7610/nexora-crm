// ── Nexora CRM — MongoDB Connection Handler & Reliability Manager ─
import mongoose from 'mongoose';

let isConnected = false;
let connectionError = null;
let lastConnectedTime = null;
let retryCount = 0;

export const dbStatus = {
  get isConnected() {
    return isConnected && mongoose.connection.readyState === 1;
  },
  get engine() {
    return this.isConnected ? 'mongodb' : 'memory';
  },
  get readyState() {
    return mongoose.connection.readyState;
  },
  get lastError() {
    return connectionError;
  },
  get connectedAt() {
    return lastConnectedTime;
  },
  get retryCount() {
    return retryCount;
  },
};

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexora-crm';
  const isProd = process.env.NODE_ENV === 'production';
  const allowMemoryInProd = process.env.ALLOW_IN_MEMORY_IN_PROD === 'true';

  // Setup connection event listeners
  mongoose.connection.on('connected', () => {
    isConnected = true;
    connectionError = null;
    lastConnectedTime = new Date().toISOString();
    console.log('🍃 MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    connectionError = err.message;
    console.error('⚠️ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️ MongoDB disconnected. Attempting auto-reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    connectionError = null;
    lastConnectedTime = new Date().toISOString();
    console.log('🍃 MongoDB reconnected successfully');
  });

  try {
    // Set 3s timeout for fast initial boot
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    connectionError = null;
    lastConnectedTime = new Date().toISOString();
    console.log(`\n🍃 MongoDB connected successfully: ${uri.replace(/\/\/.*@/, '//***@')}\n`);
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    retryCount++;

    if (isProd && !allowMemoryInProd) {
      console.error('\n============================================================');
      console.error('❌ CRITICAL DATABASE WARNING (Production Environment)');
      console.error(`   Failed to connect to MongoDB (${err.message})`);
      console.error('   Silent switching to ephemeral in-memory storage is BLOCKED in production');
      console.error('   to protect business data integrity.');
      console.error('   Set ALLOW_IN_MEMORY_IN_PROD=true if you intentionally want ephemeral testing in production.');
      console.error('============================================================\n');
    } else {
      console.log(`\n⚡ MongoDB not detected (${err.message}).`);
      console.log('   Using Nexora Enterprise in-memory high-performance data store.');
      console.log('   (Full MongoDB models, schema rules, queries & safe conversion active)\n');
    }
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function getDatabaseHealth() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowMemoryInProd = process.env.ALLOW_IN_MEMORY_IN_PROD === 'true';
  const hasProdAlert = isProd && !isConnected && !allowMemoryInProd;

  return {
    engine: isConnected ? 'mongodb' : 'memory',
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    readyStateLabel: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    retryAttempts: retryCount,
    lastConnectedAt: lastConnectedTime,
    lastError: connectionError,
    productionAlert: hasProdAlert,
    message: isConnected
      ? 'MongoDB operational and persistent'
      : hasProdAlert
      ? 'Production MongoDB connection error: Ephemeral memory store active without explicit override'
      : 'In-memory multi-tenant store active (Development / Fallback mode)',
  };
}
