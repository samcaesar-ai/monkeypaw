export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    const wishes = await redis.lrange('wishes', 0, 49);
    return res.status(200).json(wishes);
  } catch {
    // Redis not configured — return empty list
    return res.status(200).json([]);
  }
}
