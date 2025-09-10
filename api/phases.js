import { initDatabase } from './db-postgres.js';

/**
 * API pour la gestion des phases de tournoi
 * Gère les phases, qualifications et transitions entre phases
 */

/**
 * Récupère toutes les phases du tournoi
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
export default async function handler(req, res) {
  const db = await initDatabase();
  
  try {
    switch (req.method) {
      case 'GET':
        await handleGetPhases(req, res, db);
        break;
      case 'POST':
        await handleCreatePhase(req, res, db);
        break;
      case 'PUT':
        await handleUpdatePhase(req, res, db);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).json({ error: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('❌ Erreur API phases:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupère toutes les phases du tournoi
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Object} db - Pool de connexions PostgreSQL
 */
async function handleGetPhases(req, res, db) {
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        tp.*,
        COUNT(tq.team_id) as qualified_teams_count
      FROM tournament_phases tp
      LEFT JOIN team_qualifications tq ON tp.phase_number = tq.phase_number AND tq.qualified = true
      GROUP BY tp.id, tp.phase_number, tp.phase_name, tp.is_active, tp.is_completed, tp.created_at, tp.completed_at
      ORDER BY tp.phase_number ASC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des phases:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des phases' });
  } finally {
    client.release();
  }
}

/**
 * Crée une nouvelle phase de tournoi
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Object} db - Pool de connexions PostgreSQL
 */
async function handleCreatePhase(req, res, db) {
  const { phase_name } = req.body;
  
  if (!phase_name) {
    return res.status(400).json({ error: 'Nom de la phase requis' });
  }
  
  const client = await db.connect();
  
  try {
    // Récupérer le numéro de phase suivant
    const nextPhaseResult = await client.query(`
      SELECT COALESCE(MAX(phase_number), 0) + 1 as next_phase_number 
      FROM tournament_phases
    `);
    
    const nextPhaseNumber = nextPhaseResult.rows[0].next_phase_number;
    
    // Créer la nouvelle phase
    const result = await client.query(`
      INSERT INTO tournament_phases (phase_number, phase_name, is_active, is_completed)
      VALUES ($1, $2, FALSE, FALSE)
      RETURNING *
    `, [nextPhaseNumber, phase_name]);
    
    res.status(201).json({
      ...result.rows[0],
      message: 'Phase créée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la phase:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la phase' });
  } finally {
    client.release();
  }
}

/**
 * Met à jour une phase (activation, completion, etc.)
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Object} db - Pool de connexions PostgreSQL
 */
async function handleUpdatePhase(req, res, db) {
  const { phase_number, is_active, is_completed } = req.body;
  
  if (phase_number === undefined) {
    return res.status(400).json({ error: 'Numéro de phase requis' });
  }
  
  const client = await db.connect();
  
  try {
    let updateQuery = 'UPDATE tournament_phases SET ';
    let updateValues = [];
    let paramCount = 1;
    
    if (is_active !== undefined) {
      updateQuery += `is_active = $${paramCount}, `;
      updateValues.push(is_active);
      paramCount++;
    }
    
    if (is_completed !== undefined) {
      updateQuery += `is_completed = $${paramCount}, `;
      updateValues.push(is_completed);
      paramCount++;
      
      if (is_completed) {
        updateQuery += `completed_at = CURRENT_TIMESTAMP, `;
      }
    }
    
    // Supprimer la dernière virgule et ajouter la clause WHERE
    updateQuery = updateQuery.slice(0, -2) + ` WHERE phase_number = $${paramCount}`;
    updateValues.push(phase_number);
    
    const result = await client.query(updateQuery, updateValues);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Phase non trouvée' });
    }
    
    res.status(200).json({ message: 'Phase mise à jour avec succès' });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la phase:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la phase' });
  } finally {
    client.release();
  }
}

