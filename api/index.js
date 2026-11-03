// Vercel entry point: every /api/* request runs the same handler as `npm start` (server.js).
// The pages themselves are served by Vercel from client/dist (see vercel.json).
const { handler } = require('../server')
module.exports = (req, res) => {
  // vercel.json rewrites /api/<path> to /api/index?__path=<path>; restore the original URL either way
  const u = new URL(req.url, 'http://x'), p = u.searchParams.get('__path')
  if (p !== null) { u.searchParams.delete('__path'); req.url = (u.pathname === '/api/index' ? '/api/' + p : u.pathname) + u.search }
  return handler(req, res)
}
