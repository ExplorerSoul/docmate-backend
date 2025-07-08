const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./config');

const sessionMiddleware = session({
  name: 'session_id',
  secret: config.expressSessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // ✅ Recommended
  },
  store: MongoStore.create({
    mongoUrl: config.mongodbURI,
    collectionName: 'session',
    ttl: 14 * 24 * 60 * 60, // optional: 14-day TTL
    autoRemove: 'native',   // cleanup expired sessions
  }),
});

module.exports = sessionMiddleware;
