export function getGladiaApiKey() {
  const apiKey = process.env.GLADIA_API_KEY;
  if (!apiKey) {
    console.error(
      'You must provide a Gladia key. Go to https://app.gladia.io to get yours.',
    );
    process.exit(1);
  }
  return apiKey;
}
export function getGladiaApiUrl() {
  return process.env.GLADIA_API_URL || 'https://api.gladia.io';
}
export function getGladiaRegion() {
  return process.env.GLADIA_REGION || 'eu-west'; // eu-west or us-west
}
