const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Proxy for Zoom OAuth token - browser can't call zoom.us/oauth/token directly due to CORS
exports.zoomToken = functions.https.onRequest(async (req, res) => {
  // Allow CORS from our app
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { accountId, clientId, clientSecret } = req.body;
    if (!accountId || !clientId || !clientSecret) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const zoomRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const data = await zoomRes.json();
    res.status(zoomRes.status).json(data);
  } catch (err) {
    console.error('zoomToken error:', err);
    res.status(500).json({ error: err.message });
  }
});
