import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // CORS — must be set before anything else
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const courseIds = await redis.get('course_ids') || [];

    if (courseIds.length === 0) {
      return res.status(200).json({ courses: [] });
    }

    // Fetch all courses in parallel
    const courseStrings = await Promise.all(
      courseIds.map(id => redis.get(`course:${id}`))
    );

    const courses = courseStrings
      .filter(Boolean)
      .map(c => typeof c === 'string' ? JSON.parse(c) : c);

    return res.status(200).json({ courses });

  } catch (err) {
    console.error('Courses fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
