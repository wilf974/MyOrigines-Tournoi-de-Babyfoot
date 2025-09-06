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
    const teams = db.prepare('SELECT * FROM teams ORDER BY nom').all();
    
    res.status(200).json(teams);
  } catch (error) {
    console.error('Erreur lors du chargement des équipes:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des équipes' });
  }
}
