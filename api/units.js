const DIALOGEDU_API = 'https://world-wide-university.dialogedu.com/api/v1';
const SITE_ID = '1923';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { course_id } = req.query;
  if (!course_id) return res.status(400).json({ error: 'Missing course_id' });

  try {
    const token = process.env.DIALOGEDU_API_TOKEN;
    if (!token) return res.status(500).json({ error: 'DIALOGEDU_API_TOKEN not configured' });

    // Get course to find unit_ids
    const coursesRes = await fetch(`${DIALOGEDU_API}/sites/${SITE_ID}/courses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!coursesRes.ok) return res.status(502).json({ error: 'Failed to fetch courses' });

    const coursesData = await coursesRes.json();
    const course = (coursesData.courses || []).find(c => c.id === parseInt(course_id));

    if (!course) return res.status(404).json({ error: 'Course not found' });

    const unitIds = course.unit_ids || [];
    if (unitIds.length === 0) return res.status(200).json({ units: [] });

    // Fetch all units in parallel
    const unitPromises = unitIds.map(uid =>
      fetch(`${DIALOGEDU_API}/sites/${SITE_ID}/courses/${course_id}/units/${uid}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : null)
    );

    const unitResults = await Promise.all(unitPromises);

    const units = unitResults
      .filter(Boolean)
      .sort((a, b) => a.position - b.position)
      .map(u => ({
        id: u.id,
        title: u.title,
        description: u.description || '',
        position: u.position,
        is_sequential: u.is_sequential,
        unit_elements_count: (u.unit_elements || []).length,
      }));

    return res.status(200).json({ units });

  } catch (err) {
    console.error('Units fetch error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
