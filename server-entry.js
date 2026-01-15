import { createServer } from 'node:http';
import { server } from './dist/server/server.js';

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await new Promise((resolve, reject) => {
          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        })
      : undefined;

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
      duplex: 'half'
    });

    const response = await server.fetch(request);

    res.statusCode = response.status;
    for (const [key, value] of response.headers) {
      res.setHeader(key, value);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

httpServer.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
