import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const DIALOGEDU_API = 'https://world-wide-university.dialogedu.com/api/v1';
const SITE_ID = '1923';

export default async function handler(req, res) {
  // CORS
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
    const token = process.env.DIALOGEDU_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'DIALOGEDU_API_TOKEN not configured' });
    }

    // Fetch courses directly from dialogEDU API
    const apiRes = await fetch(`${DIALOGEDU_API}/sites/${SITE_ID}/courses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!apiRes.ok) {
      console.error('dialogEDU API error:', apiRes.status, await apiRes.text());
      return res.status(502).json({ error: 'Failed to fetch from dialogEDU API' });
    }

    const apiData = await apiRes.json();
    const apiCourses = apiData.courses || [];

    // Sync each course into Redis and build response
    const courses = [];
    const courseIds = [];

    for (const course of apiCourses) {
      const storedCourse = {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.program_title || 'General',
        tags: [],
        image: course.cover_image,
        url: `https://world-wide-university.dialogedu.com/flyte-health-demo/courses/${course.slug}`,
        credits: '0.0',
        created_at: course.created_at || new Date().toISOString(),
        updated_at: course.updated_at || new Date().toISOString(),
        synced_at: new Date().toISOString(),
      };

      await redis.set(`course:${course.id}`, JSON.stringify(storedCourse));
      courseIds.push(course.id);
      courses.push(storedCourse);
    }

    // Update the course_ids index
    await redis.set('course_ids', courseIds);

    return res.status(200).json({ courses });

  } catch (err) {
    console.error('Courses fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
