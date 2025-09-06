import { getDatabase } from './db.js';

/**
 * Gestionnaire API pour les équipes
 * Supporte GET (récupération), POST (création), PUT (modification), DELETE (suppression)
 */
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

  try {
    const db = await getDatabase();

    switch (req.method) {
      case 'GET':
        await handleGetTeams(req, res, db);
        break;
      case 'POST':
        await handleCreateTeam(req, res, db);
        break;
      case 'PUT':
        await handleUpdateTeam(req, res, db);
        break;
      case 'DELETE':
        await handleDeleteTeam(req, res, db);
        break;
      default:
        res.status(405).json({ error: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API équipes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupère toutes les équipes
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Database} db - Instance de la base de données
 */
async function handleGetTeams(req, res, db) {
  const teams = db.prepare('SELECT * FROM teams ORDER BY nom').all();
  
  // Parser les joueurs JSON
  const teamsWithParsedPlayers = teams.map(team => ({
    ...team,
    joueurs: JSON.parse(team.joueurs)
  }));
  
  res.status(200).json(teamsWithParsedPlayers);
}

/**
 * Crée une nouvelle équipe
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Database} db - Instance de la base de données
 */
async function handleCreateTeam(req, res, db) {
  const { nom, joueurs } = req.body;

  if (!nom || !joueurs || !Array.isArray(joueurs) || joueurs.length === 0) {
    return res.status(400).json({ error: 'Nom et joueurs requis' });
  }

  // Générer un ID unique
  const id = generateTeamId(db);
  
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, nom, joueurs, points, buts, gamelles)
    VALUES (?, ?, ?, 0, 0, 0)
  `);

  insertTeam.run(id, nom, JSON.stringify(joueurs));
  
  res.status(201).json({ 
    id, 
    nom, 
    joueurs, 
    points: 0, 
    buts: 0, 
    gamelles: 0,
    message: 'Équipe créée avec succès' 
  });
}

/**
 * Met à jour une équipe existante
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Database} db - Instance de la base de données
 */
async function handleUpdateTeam(req, res, db) {
  const { id } = req.query;
  const { nom, joueurs } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID de l\'équipe requis' });
  }

  if (!nom || !joueurs || !Array.isArray(joueurs) || joueurs.length === 0) {
    return res.status(400).json({ error: 'Nom et joueurs requis' });
  }

  const updateTeam = db.prepare(`
    UPDATE teams 
    SET nom = ?, joueurs = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = updateTeam.run(nom, JSON.stringify(joueurs), id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Équipe non trouvée' });
  }

  res.status(200).json({ 
    id, 
    nom, 
    joueurs, 
    message: 'Équipe mise à jour avec succès' 
  });
}

/**
 * Supprime une équipe
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Database} db - Instance de la base de données
 */
async function handleDeleteTeam(req, res, db) {
  const { id, forceDelete } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID de l\'équipe requis' });
  }

  // Vérifier si l'équipe a des matchs
  const matchCheck = db.prepare(`
    SELECT COUNT(*) as count FROM matches 
    WHERE equipe1_id = ? OR equipe2_id = ?
  `).get(id, id);

  const matchCount = matchCheck.count;

  if (matchCount > 0 && forceDelete !== 'true') {
    return res.status(400).json({ 
      error: 'Impossible de supprimer une équipe qui a des matchs',
      matchCount: matchCount,
      suggestion: 'Utilisez forceDelete=true pour supprimer l\'équipe et ses matchs associés'
    });
  }

  // Si forceDelete=true, supprimer d'abord les matchs associés
  if (matchCount > 0 && forceDelete === 'true') {
    console.log(`🗑️ Suppression forcée: suppression de ${matchCount} matchs pour l'équipe ${id}`);
    const deleteMatches = db.prepare('DELETE FROM matches WHERE equipe1_id = ? OR equipe2_id = ?');
    deleteMatches.run(id, id);
  }

  const deleteTeam = db.prepare('DELETE FROM teams WHERE id = ?');
  const result = deleteTeam.run(id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Équipe non trouvée' });
  }

  const message = matchCount > 0 
    ? `Équipe supprimée avec succès (${matchCount} matchs supprimés)`
    : 'Équipe supprimée avec succès';

  res.status(200).json({ 
    message: message,
    matchCount: matchCount
  });
}

/**
 * Génère un ID unique pour une nouvelle équipe
 * @param {Database} db - Instance de la base de données
 * @returns {string} ID unique
 */
function generateTeamId(db) {
  const existingIds = db.prepare('SELECT id FROM teams').all().map(row => row.id);
  
  // Chercher la première lettre disponible
  for (let i = 65; i <= 90; i++) { // A-Z
    const letter = String.fromCharCode(i);
    if (!existingIds.includes(letter)) {
      return letter;
    }
  }
  
  // Si toutes les lettres sont prises, utiliser des combinaisons
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const id = String.fromCharCode(i) + String.fromCharCode(j);
      if (!existingIds.includes(id)) {
        return id;
      }
    }
  }
  
  // Fallback avec timestamp
  return 'T' + Date.now().toString(36);
}
