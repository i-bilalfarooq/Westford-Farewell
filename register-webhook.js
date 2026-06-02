// Webhook Registration Script

const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const ZIINA_API_KEY = env.split('\n').find(l=>l.startsWith('ZIINA_API_KEY=')).split('=')[1].trim();
const YOUR_VERCEL_DOMAIN = "https://westford-farewell.vercel.app";

async function createWebhook() {
  const response = await fetch('https://api-v2.ziina.com/api/webhook', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZIINA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: `${YOUR_VERCEL_DOMAIN}/api/webhook`
    })
  });

  const data = await response.json();
  console.log('Webhook Registration Result:', data);
}

createWebhook();
