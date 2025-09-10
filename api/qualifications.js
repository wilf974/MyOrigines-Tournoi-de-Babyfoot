import { initDatabase } from './db-postgres.js';

/**
 * API pour la gestion des qualifications d'équipes
 * Permet de gérer les équipes qualifiées pour chaque phase
 */

/**
 * Gère les qualifications d'équipes
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
export default async function handler(req, res) {
  const db = await initDatabase();
  
  try {
    switch (req.method) {
      case 'GET':
        await handleGetQualifications(req, res, db);
        break;
      case 'POST':
        await handleSetQualifications(req, res, db);
        break;
      case 'PUT':
        await handleUpdateQualification(req, res, db);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).json({ error: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('❌ Erreur API qualifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupère les qualifications pour une phase donnée
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Object} db - Pool de connexions PostgreSQL
 */
async function handleGetQualifications(req, res, db) {
  const { phase_number } = req.query;
  
  if (!phase_number) {
    return res.status(400).json({ error: 'Numéro de phase requis' });
  }
  
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        t.id,
        t.nom,
        t.joueurs,
        t.points,
        t.buts,
        t.gamelles,
        COALESCE(tq.qualified, false) as qualified,
        tq.qualification_date
      FROM teams t
      LEFT JOIN team_qualifications tq ON t.id = tq.team_id AND tq.phase_number = $1
      ORDER BY t.points DESC, t.buts DESC, t.gamelles ASC
    `, [phase_number]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des qualifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des qualifications' });
  } finally {
    client.release();
  }
}

/**
 * Définit les qualifications pour une phase
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Object} db - Pool de connexions PostgreSQL
 */
async function handleSetQualifications(req, res, db) {
  const { phase_number, qualified_teams } = req.body;
  
  if (!phase_number || !Array.isArray(qualified_teams)) {
    return res.status(400).json({ error: 'Numéro de phase et liste des équipes qualifiées requis' });
  }
  
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Supprimer les qualifications existantes pour cette phase
    await client.query(`
      DELETE FROM team_qualifications WHERE phase_number = $1
    `, [phase_number]);
    
    // Insérer les nouvelles qualifications
    for (const teamId of qualified_teams) {
      await client.query(`
        INSERT INTO team_qualifications (team_id, phase_number, qualified)
        VALUES ($1, $2, true)
      `, [teamId, phase_number]);
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({ 
      message: `${qualified_teams.length} équipes qualifiées pour la phase ${phase_number}`,
      qualified_teams: qualified_teams.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la définition des qualifications:', error);
    res.status(500).json({ error: 'Erreur lors de la définition des qualifications' });
  } finally {
    client.release();
  }
}

/**
 * Met à jour une qualification individuelle
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Object} db - Pool de connexions PostgreSQL
 */
async function handleUpdateQualification(req, res, db) {
  const { team_id, phase_number, qualified } = req.body;
  
  if (!team_id || !phase_number || qualified === undefined) {
    return res.status(400).json({ error: 'ID équipe, numéro de phase et statut de qualification requis' });
  }
  
  const client = await db.connect();
  
  try {
    // Vérifier si la qualification existe déjà
    const existingResult = await client.query(`
      SELECT id FROM team_qualifications 
      WHERE team_id = $1 AND phase_number = $2
    `, [team_id, phase_number]);
    
    if (existingResult.rows.length > 0) {
      // Mettre à jour la qualification existante
      await client.query(`
        UPDATE team_qualifications 
        SET qualified = $1, qualification_date = CURRENT_TIMESTAMP
        WHERE team_id = $2 AND phase_number = $3
      `, [qualified, team_id, phase_number]);
    } else {
      // Créer une nouvelle qualification
      await client.query(`
        INSERT INTO team_qualifications (team_id, phase_number, qualified)
        VALUES ($1, $2, $3)
      `, [team_id, phase_number, qualified]);
    }
    
    res.status(200).json({ 
      message: `Qualification mise à jour pour l'équipe ${team_id}`,
      team_id,
      phase_number,
      qualified
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la qualification:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la qualification' });
  } finally {
    client.release();
  }
}

