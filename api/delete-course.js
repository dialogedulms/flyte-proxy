import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;

    if (!id) return res.status(400).json({ error: 'Missing course id' });

    const courseId = parseInt(id);

    // Remove the course record
    await redis.del(`course:${courseId}`);

    // Remove from the ID list
    const existingIds = await redis.get('course_ids') || [];
    const updated = existingIds.filter(i => i !== courseId);
    await redis.set('course_ids', updated);

    return res.status(200).json({ success: true, deleted_id: courseId });

  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
