import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Express } from 'express';
import session from 'express-session';

// In a real application, store these in environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret';

// Admin email addresses - configured via environment variable
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['abdulazeezidris28@gmail.com'];

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if the user's email is in the admin list
    const email = profile.emails?.[0]?.value;
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return done(null, false, { message: 'Access denied. Admin privileges required.' });
    }

    // Create admin user object
    const adminUser = {
      id: profile.id,
      email: email,
      name: profile.displayName,
      isAdmin: true
    };

    return done(null, adminUser);
  } catch (error) {
    return done(error, false);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export function setupAuth(app: Express) {
  // Session configuration
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/admin?error=access_denied' }),
    (req, res) => {
      // Successful authentication, redirect to admin page
      res.redirect('/admin?authenticated=true');
    }
  );

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Check authentication status
  app.get('/api/auth/status', (req, res) => {
    // For development: bypass authentication if no Google credentials
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id') {
      res.json({ 
        authenticated: true, 
        user: {
          id: 'dev-user',
          email: 'dev@example.com',
          name: 'Dev User',
          isAdmin: true
        }
      });
      return;
    }
    
    if (req.isAuthenticated() && req.user) {
      res.json({ 
        authenticated: true, 
        user: req.user 
      });
    } else {
      res.json({ authenticated: false });
    }
  });
}

// Middleware to protect admin routes
export function requireAuth(req: any, res: any, next: any) {
  // For development: bypass authentication if no Google credentials
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id') {
    return next();
  }
  
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}