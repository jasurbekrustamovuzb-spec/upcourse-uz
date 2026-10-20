const SUPABASE_URL = 'https://cuubcnnzjlmvcbgnctvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dWJjbm56amxtdmNiZ25jdHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjkzMTAsImV4cCI6MjEwMjQ0NTMxMH0.x-b1KKEtjh928Ae2LXoyYPNK5Ov1rE5tv8nUJk-4Kn0';

async function fetchPublicRows(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Public catalog request failed: ${response.status}`);
  }

  return response.json();
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [categoryRows, courseRows] = await Promise.all([
      fetchPublicRows('categories?select=*&order=created_at.asc&status=eq.approved'),
      fetchPublicRows('courses?select=id,category_id,title,summary,video_url,author,author_id,status,created_at&order=created_at.asc&status=eq.approved'),
    ]);

    // Keep this small, public catalog warm at the edge so a new visitor does
    // not wait for a cold pair of Supabase queries after every short idle.
    // Lesson bodies are not part of this response; five minutes is a safe
    // freshness window for titles, categories and summaries.
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    response.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.status(200).json({ categoryRows, courseRows });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).json({ error: 'Public catalog is temporarily unavailable' });
  }
}
