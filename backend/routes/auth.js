import { Router } from 'express';
import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
const router = Router();
let googleClient;
function getGoogleClient() { if (!googleClient) googleClient = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.BACKEND_URL}/auth/google/callback`); return googleClient; }
router.get('/google', (req, res) => { const url = getGoogleClient().generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'], prompt: 'consent' }); res.redirect(url); });
router.get('/google/callback', async (req, res) => { try { const client = getGoogleClient(); const { tokens } = await client.getToken(req.query.code); client.setCredentials(tokens); const oauth2 = google.oauth2({ version: 'v2', auth: client }); const { data } = await oauth2.userinfo.get(); req.session.user = { email: data.email, name: data.name, provider: 'google', tokens }; res.redirect(process.env.FRONTEND_URL); } catch (e) { res.redirect(`${process.env.FRONTEND_URL}?error=google_auth_failed`); } });
let msalClient;
function getMsalClient() { if (!msalClient) msalClient = new ConfidentialClientApplication({ auth: { clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET, authority: 'https://login.microsoftonline.com/common' } }); return msalClient; }
router.get('/microsoft', async (req, res) => { const url = await getMsalClient().getAuthCodeUrl({ scopes: ['Calendars.ReadWrite', 'User.Read'], redirectUri: `${process.env.BACKEND_URL}/auth/microsoft/callback` }); res.redirect(url); });
router.get('/microsoft/callback', async (req, res) => { try { const result = await getMsalClient().acquireTokenByCode({ code: req.query.code, scopes: ['Calendars.ReadWrite', 'User.Read'], redirectUri: `${process.env.BACKEND_URL}/auth/microsoft/callback` }); req.session.user = { email: result.account.username, name: result.account.name, provider: 'microsoft', tokens: { access_token: result.accessToken } }; res.redirect(process.env.FRONTEND_URL); } catch (e) { res.redirect(`${process.env.FRONTEND_URL}?error=microsoft_auth_failed`); } });
router.get('/me', (req, res) => { if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' }); const { email, name, provider } = req.session.user; res.json({ email, name, provider }); });
router.post('/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
export default router;
