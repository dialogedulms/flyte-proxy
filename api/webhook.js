import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // Validate it's a course_published event
    if (!payload || payload.event !== 'course_published' || !payload.course) {
      return res.status(400).json({ error: 'Invalid or unsupported webhook event' });
    }

    const course = payload.course;

    // Build a clean course object for storage
    const storedCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category || 'General',
      tags: course.tags || [],
      image: course.image,
      url: course.url,
      credits: course.credits,
      created_at: course.created_at,
      updated_at: course.updated_at,
      synced_at: new Date().toISOString(),
    };

    // Store in KV using course ID as key
    await kv.set(`course:${course.id}`, JSON.stringify(storedCourse));

    // Maintain a list of all course IDs
    const existingIds = await kv.get('course_ids') || [];
    if (!existingIds.includes(course.id)) {
      existingIds.unshift(course.id); // newest first
      await kv.set('course_ids', existingIds);
    }

    console.log(`Course synced: ${course.id} — "${course.title}"`);
    return res.status(200).json({ success: true, course_id: course.id });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
