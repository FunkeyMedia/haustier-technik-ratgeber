const { loadProducts } = require('../lib/amazon');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Nur GET ist erlaubt.' });
  }

  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=1800, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const result = await loadProducts(undefined, request.query?.batch);
    return response.status(200).json({
      status: 'live',
      ...result,
      notice: 'Preise und Verfügbarkeit können sich ändern. Maßgeblich ist das Angebot bei Amazon zum Kaufzeitpunkt.'
    });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(503).json({
      status: 'unavailable',
      products: [],
      count: 0,
      notice: 'Der Live-Abruf von Amazon ist momentan nicht verfügbar. Es werden deshalb keine Produktpreise angezeigt.'
    });
  }
};
