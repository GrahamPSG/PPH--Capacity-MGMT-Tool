import { initAuth0 } from '@auth0/nextjs-auth0';

export const auth0Instance = initAuth0({
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL!,
  clientID: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret: process.env.AUTH0_SECRET!,
  clockTolerance: 60,
  httpTimeout: 5000,
  enableTelemetry: false,
  session: {
    rolling: true,
    rollingDuration: 60 * 60 * 12, // 12 hours
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  authorizationParams: {
    response_type: 'code',
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email offline_access',
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
});

export const {
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile,
  withApiAuthRequired,
  withPageAuthRequired,
  getSession,
  getAccessToken,
  updateSession,
} = auth0Instance;