import { getDatabase } from '../db.js';

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
    const { day } = req.query;
    
    if (!day) {
      return res.status(400).json({ error: 'Jour requis' });
    }

    const db = await getDatabase();
    const matches = db.prepare(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE m.jour = ?
      ORDER BY m.heure
    `).all(day);
    
    res.status(200).json(matches);
  } catch (error) {
    console.error('Erreur lors du chargement des matchs:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des matchs' });
  }
}
