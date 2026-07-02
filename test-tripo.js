const fs = require('fs');

async function testV2() {
  console.log('Testing v2 API...');
  const res = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer tsk_y0PZzPQ0ufxiIH77qJ7Ee65XX48Ff5A358cWhGxZbVE',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'text_to_model', prompt: 'a simple cube' })
  });
  console.log('v2 status:', res.status);
  const data = await res.json().catch(() => ({}));
  console.log('v2 data:', data);
}

async function testV3() {
  console.log('Testing v3 API...');
  const res = await fetch('https://openapi.tripo3d.ai/v3/generation/text-to-model', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer tsk_y0PZzPQ0ufxiIH77qJ7Ee65XX48Ff5A358cWhGxZbVE',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: 'a simple cube', model: 'v3.0-20250812' })
  });
  console.log('v3 status:', res.status);
  const data = await res.json().catch(() => ({}));
  console.log('v3 data:', data);
}

async function main() {
  await testV2();
  await testV3();
}

main();
