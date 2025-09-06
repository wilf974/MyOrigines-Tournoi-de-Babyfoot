import { getDatabase } from './db.js';

export default async function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const db = await getDatabase();
    const rankings = db.prepare(`
      SELECT 
        t.id,
        t.nom,
        COALESCE(SUM(CASE 
          WHEN m.finished = 1 THEN 
            CASE 
              WHEN (m.team1_goals - m.team2_gamelles) > (m.team2_goals - m.team1_gamelles) AND m.team1_id = t.id THEN 3
              WHEN (m.team2_goals - m.team1_gamelles) > (m.team1_goals - m.team2_gamelles) AND m.team2_id = t.id THEN 3
              WHEN (m.team1_goals - m.team2_gamelles) = (m.team2_goals - m.team1_gamelles) THEN 1
              ELSE 0
            END
          ELSE 0
        END), 0) as points,
        COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN m.team1_goals ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN m.team2_id = t.id THEN m.team2_goals ELSE 0 END), 0) as goals,
        COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN m.team1_gamelles ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN m.team2_id = t.id THEN m.team2_gamelles ELSE 0 END), 0) as gamelles,
        COALESCE(SUM(CASE 
          WHEN m.team1_id = t.id THEN (m.team1_goals - m.team2_gamelles) - (m.team2_goals - m.team1_gamelles)
          WHEN m.team2_id = t.id THEN (m.team2_goals - m.team1_gamelles) - (m.team1_goals - m.team2_gamelles)
          ELSE 0
        END), 0) as difference
      FROM teams t
      LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.finished = 1
      GROUP BY t.id, t.nom
      ORDER BY points DESC, difference DESC, goals DESC
    `).all();
    
    res.status(200).json(rankings);
  } catch (error) {
    console.error('Erreur lors du chargement du classement:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du classement' });
  }
}
