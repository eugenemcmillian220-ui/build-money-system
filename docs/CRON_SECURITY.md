# DA-075: Cron Endpoint Security

All `/api/cron/*` routes must verify `CRON_SECRET` header:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... cron logic
}
```

Set `CRON_SECRET` in Vercel environment variables.
