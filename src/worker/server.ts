import http from 'http'
import { URL } from 'url'

const PORT = parseInt(process.env.PORT ?? '8080', 10)

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (url.pathname === '/health') {
    return json(res, 200, { status: 'healthy', timestamp: new Date().toISOString() })
  }

  return json(res, 404, { error: 'Not found', path: url.pathname })
})

server.listen(PORT, () => {
  console.log(`🚂 Railway worker listening on :${PORT}`)
})
