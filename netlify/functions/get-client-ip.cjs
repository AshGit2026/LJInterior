exports.handler = async function (event, context) {
  // Extract real visitor IP from Netlify CDN headers
  const clientIp =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    '';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    body: JSON.stringify({ ip: clientIp }),
  };
};
