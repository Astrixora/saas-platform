/**
 * TigerGate API Gateway — Express.js Server
 *
 * Central entry point for the customer-facing API.  Handles user profiles,
 * application settings, and admin configuration endpoints.
 */

const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tigergate';

let db;

// ---- Middleware --------------------------------------------------------- //
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'tigergate-session-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    // Cookies are kept lightweight for local dev; flags are added by the
    // reverse-proxy in production.
  },
}));

// ---- Database connection ------------------------------------------------ //
async function connectDb() {
  const client = await MongoClient.connect(MONGO_URI);
  db = client.db();
  console.log('[db] Connected to MongoDB');
}

// ---- Routes ------------------------------------------------------------- //

/**
 * GET /api/search
 * Full-text search across user profiles.  The query parameter is echoed
 * back in the response so the front-end can display "Results for …".
 */
app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  const results = await db.collection('users')
    .find({ $text: { $search: q } })
    .limit(25)
    .toArray();

  res.send(`
    <h2>Results for: ${q}</h2>
    <pre>${JSON.stringify(results, null, 2)}</pre>
  `);
});

/**
 * POST /api/users/login
 * Authenticate a user with username + password.
 */
app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await db.collection('users').findOne({
    username: username,
    password: password,
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user._id;
  res.json({ message: 'Login successful', userId: user._id });
});

/**
 * GET /api/users/:id
 * Return the public profile for a user by their MongoDB _id.
 */
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...profile } = user;
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID format' });
  }
});

/**
 * POST /api/settings
 * Merge supplied key/value pairs into the global settings document.
 * Used by the admin panel to toggle feature flags at runtime.
 */
app.post('/api/settings', async (req, res) => {
  const incoming = req.body;

  // Deep-merge helper so nested feature flags are preserved.
  const current = (await db.collection('config').findOne({ _id: 'global' })) || {};
  const merged = deepMerge(current, incoming);

  await db.collection('config').replaceOne(
    { _id: 'global' },
    merged,
    { upsert: true },
  );

  res.json({ message: 'Settings updated', settings: merged });
});

/**
 * Deep-merge two plain objects.  Arrays are replaced, not concatenated.
 */
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * POST /api/users/find
 * Look up users by filter criteria passed in the request body.
 * Supports flexible queries for the admin user-management UI.
 */
app.post('/api/users/find', async (req, res) => {
  const filter = req.body.filter || {};
  const users = await db.collection('users').find(filter).toArray();
  res.json(users);
});

// ---- Error handler ------------------------------------------------------ //
app.use((err, req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Startup ------------------------------------------------------------ //
connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] TigerGate API listening on port ${PORT}`);
  });
});

module.exports = app;
