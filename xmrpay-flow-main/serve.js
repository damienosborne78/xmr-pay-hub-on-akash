import { serve } from 'bun';

serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    if (pathname === '/') pathname = '/index.html';
    if (!pathname.includes('.')) pathname += '/index.html';

    return new Response(Bun.file('dist' + pathname));
  },
});
console.log('Server running on http://localhost:3001');
