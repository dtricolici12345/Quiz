const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;

export async function sendPushToUsers({ externalUserIds = [], title, body, data = {} }) {
  try {
    if (!APP_ID || !API_KEY || externalUserIds.length === 0) return;

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: APP_ID,
        headings: { en: title || 'Notification' },
        contents: { en: body || '' },
        include_external_user_ids: externalUserIds.map(String),
        data,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn('[OneSignal] Non-OK:', resp.status, text);
    }
  } catch (e) {
    console.warn('[OneSignal] error:', e.message);
  }
}
