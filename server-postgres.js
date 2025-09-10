import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDatabase, getDatabase, query } from './api/db-postgres.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 2001;
const JWT_SECRET = 'myorigines-tournoi-secret-key-2024';


// Middleware
app.use(cors());
app.use(express.json());

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connecté:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
  });
});

// Fonction pour émettre les mises à jour
const emitUpdate = (event, data) => {
  io.emit(event, data);
  console.log(`📡 Émission WebSocket: ${event}`, data);
};

// Initialiser la base de données au démarrage
let db;
initDatabase().then(pool => {
  db = pool;
  console.log('✅ Base de données PostgreSQL initialisée');
}).catch(error => {
  console.error('❌ Erreur initialisation base de données:', error);
  process.exit(1);
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Route de connexion admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const result = await query('SELECT * FROM admins WHERE username = $1', [username]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir toutes les équipes
app.get('/api/teams', async (req, res) => {
  try {
    const result = await query(`
      SELECT *, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    const teams = result.rows.map(team => ({
      ...team,
      joueurs: team.joueurs // PostgreSQL retourne déjà un objet JSON
    }));

    res.json(teams);
  } catch (error) {
    console.error('Erreur récupération équipes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour créer une nouvelle équipe
app.post('/api/teams', async (req, res) => {
  try {
    const { nom, joueurs } = req.body;

    if (!nom || !joueurs || !Array.isArray(joueurs) || joueurs.length === 0) {
      return res.status(400).json({ error: 'Nom et joueurs requis' });
    }

    // Générer un ID unique
    const existingIdsResult = await query('SELECT id FROM teams');
    const existingIds = existingIdsResult.rows.map(row => row.id);
    
    let id = 'A';
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      if (!existingIds.includes(letter)) {
        id = letter;
        break;
      }
    }
    
    const result = await query(`
      INSERT INTO teams (id, nom, joueurs, points, buts, gamelles)
      VALUES ($1, $2, $3, 0, 0, 0)
      RETURNING *
    `, [id, nom, JSON.stringify(joueurs)]);
    
    const newTeam = {
      ...result.rows[0],
      joueurs: result.rows[0].joueurs
    };
    
    res.status(201).json({ 
      ...newTeam,
      message: 'Équipe créée avec succès' 
    });
  } catch (error) {
    console.error('Erreur création équipe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour mettre à jour une équipe
app.put('/api/teams', async (req, res) => {
  try {
    const { id, nom, joueurs } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID de l\'équipe requis' });
    }

    if (!nom || !joueurs || !Array.isArray(joueurs) || joueurs.length === 0) {
      return res.status(400).json({ error: 'Nom et joueurs requis' });
    }

    const result = await query(`
      UPDATE teams 
      SET nom = $1, joueurs = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [nom, JSON.stringify(joueurs), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }

    const updatedTeam = {
      ...result.rows[0],
      joueurs: result.rows[0].joueurs
    };

    res.status(200).json({ 
      ...updatedTeam,
      message: 'Équipe mise à jour avec succès' 
    });
  } catch (error) {
    console.error('Erreur mise à jour équipe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour supprimer une équipe
app.delete('/api/teams', async (req, res) => {
  try {
    const { id, forceDelete } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de l\'équipe requis' });
    }

    // Vérifier si l'équipe a des matchs
    const matchCheck = await query(`
      SELECT COUNT(*) as count FROM matches 
      WHERE equipe1_id = $1 OR equipe2_id = $1
    `, [id]);

    const matchCount = parseInt(matchCheck.rows[0].count);

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
      await query('DELETE FROM matches WHERE equipe1_id = $1 OR equipe2_id = $1', [id]);
    }

    const result = await query('DELETE FROM teams WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }

    const message = matchCount > 0 
      ? `Équipe supprimée avec succès (${matchCount} matchs supprimés)`
      : 'Équipe supprimée avec succès';

    res.status(200).json({ 
      message: message,
      matchCount: matchCount
    });
  } catch (error) {
    console.error('Erreur suppression équipe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir les matchs par jour
app.get('/api/matches/:day', async (req, res) => {
  try {
    const { day } = req.params;
    const timestamp = new Date().toISOString();
    console.log(`📊 [${timestamp}] Récupération des matchs pour ${day} depuis PostgreSQL`);
    
    const result = await query(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      JOIN teams t1 ON m.equipe1_id = t1.id
      JOIN teams t2 ON m.equipe2_id = t2.id
      WHERE m.jour = $1
      ORDER BY m.heure
    `, [day]);

    const matches = result.rows.map(match => ({
      ...match,
      team1_joueurs: match.team1_joueurs, // PostgreSQL retourne déjà un objet JSON
      team2_joueurs: match.team2_joueurs
    }));

    console.log(`✅ [${timestamp}] ${matches.length} matchs récupérés pour ${day}`);
    res.json(matches);
  } catch (error) {
    console.error('❌ Erreur récupération matchs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour réinitialiser un match (admin seulement)
app.post('/api/matches/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(`
      UPDATE matches 
      SET team1_goals = 0, team1_gamelles = 0, team2_goals = 0, team2_gamelles = 0, 
          finished = FALSE, last_updated = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    res.json({ success: true, message: 'Match réinitialisé' });
  } catch (error) {
    console.error('Erreur réinitialisation match:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour réinitialiser tous les scores et le classement
app.post('/api/reset-all', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🔄 [${timestamp}] Remise à zéro de tous les scores demandée`);
    
    // Réinitialiser tous les matchs
    const matchesResult = await query(`
      UPDATE matches 
      SET team1_goals = 0, team1_gamelles = 0, team2_goals = 0, team2_gamelles = 0, 
          finished = FALSE, last_updated = CURRENT_TIMESTAMP
    `);
    
    // Réinitialiser toutes les statistiques des équipes
    const teamsResult = await query(`
      UPDATE teams 
      SET points = 0, buts = 0, gamelles = 0, updated_at = CURRENT_TIMESTAMP
    `);
    
    // Récupérer les données réinitialisées pour l'émission WebSocket
    const resetMatches = await query(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      LEFT JOIN teams t1 ON m.equipe1_id = t1.id
      LEFT JOIN teams t2 ON m.equipe2_id = t2.id
      ORDER BY m.jour, m.heure
    `);
    
    const resetRankings = await query(`
      SELECT *, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    // Émettre les mises à jour via WebSocket
    emitUpdate('matchesReset', resetMatches.rows);
    emitUpdate('rankingsUpdated', resetRankings.rows);
    
    console.log(`✅ [${timestamp}] Remise à zéro effectuée: ${matchesResult.rowCount} matchs, ${teamsResult.rowCount} équipes`);
    
    res.json({ 
      success: true, 
      message: 'Tous les scores et le classement ont été réinitialisés',
      details: {
        matchesReset: matchesResult.rowCount,
        teamsReset: teamsResult.rowCount
      }
    });
  } catch (error) {
    console.error('❌ Erreur réinitialisation complète:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la réinitialisation' });
  }
});

// Fonction pour mettre à jour les statistiques des équipes (recalcule depuis zéro)
async function updateTeamStats(match) {
  // Recalculer les statistiques pour les deux équipes de ce match
  await recalculateTeamStatsForTeam(match.equipe1_id);
  await recalculateTeamStatsForTeam(match.equipe2_id);
}

// Fonction pour recalculer les statistiques d'une équipe spécifique
async function recalculateTeamStatsForTeam(teamId) {
  // Récupérer tous les matchs de cette équipe
  const result = await query(`
    SELECT * FROM matches 
    WHERE equipe1_id = $1 OR equipe2_id = $1
  `, [teamId]);

  const matches = result.rows;

  // Initialiser les statistiques
  let totalGoals = 0;           // Buts marqués par l'équipe
  let totalOpponentGamelles = 0; // Gamelles adverses qui ont impacté notre score
  let totalPoints = 0;

  // Calculer les statistiques pour chaque match
  for (const match of matches) {
    if (match.finished) {
      if (match.equipe1_id === teamId) {
        // L'équipe est l'équipe 1
        const teamGoals = match.team1_goals || 0;
        const opponentGamelles = match.team2_gamelles || 0;
        const opponentGoals = match.team2_goals || 0;
        const teamGamelles = match.team1_gamelles || 0;
        
        totalGoals += teamGoals;
        totalOpponentGamelles += opponentGamelles;
        
        // Calculer les scores finaux avec gamelles adverses (peuvent être négatifs)
        const team1Final = teamGoals - opponentGamelles;
        const team2Final = opponentGoals - teamGamelles;
        
        // Points basés sur le score final (peuvent être négatifs)
        totalPoints += team1Final;
      } else {
        // L'équipe est l'équipe 2
        const teamGoals = match.team2_goals || 0;
        const opponentGamelles = match.team1_gamelles || 0;
        const opponentGoals = match.team1_goals || 0;
        const teamGamelles = match.team2_gamelles || 0;
        
        totalGoals += teamGoals;
        totalOpponentGamelles += opponentGamelles;
        
        // Calculer les scores finaux avec gamelles adverses (peuvent être négatifs)
        const team1Final = opponentGoals - teamGamelles;
        const team2Final = teamGoals - opponentGamelles;
        
        // Points basés sur le score final (peuvent être négatifs)
        totalPoints += team2Final;
      }
    }
  }

  // Mettre à jour les statistiques de l'équipe
  // buts = buts marqués par l'équipe
  // gamelles = gamelles adverses qui ont impacté notre score
  await query(`
    UPDATE teams 
    SET points = $1, buts = $2, gamelles = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [totalPoints, totalGoals, totalOpponentGamelles, teamId]);
}

// Fonction pour recalculer toutes les statistiques des équipes
async function recalculateAllTeamStats() {
  try {
    console.log('🔄 Recalcul de toutes les statistiques avec la nouvelle logique des points...');
    
    // Récupérer toutes les équipes
    const teamsResult = await query('SELECT id, nom FROM teams');
    const teams = teamsResult.rows;

    // Réinitialiser toutes les statistiques
    await query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');

    // Recalculer pour chaque équipe
    for (const team of teams) {
      console.log(`   📊 Recalcul pour ${team.nom}...`);
      await recalculateTeamStatsForTeam(team.id);
    }
    
    console.log('✅ Recalcul terminé avec la nouvelle logique: Points = Score final');
  } catch (error) {
    console.error('❌ Erreur lors du recalcul des statistiques:', error);
  }
}

// Route pour mettre à jour un match (authentification simplifiée)
app.put('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished } = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`🔄 [${timestamp}] Mise à jour match ${id} dans PostgreSQL:`, {
      team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished
    });
    
    // Mettre à jour le match avec le champ finished
    await query(`
      UPDATE matches 
      SET team1_goals = $1, team2_goals = $2, team1_gamelles = $3, team2_gamelles = $4, 
          finished = $5, last_updated = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished || false, id]);
    
    // Recalculer les statistiques pour ce match spécifique
    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [id]);
    if (matchResult.rows.length > 0) {
      await updateTeamStats(matchResult.rows[0]);
    }
    
    // Récupérer les données mises à jour pour l'émission WebSocket
    const updatedMatch = await query(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      LEFT JOIN teams t1 ON m.equipe1_id = t1.id
      LEFT JOIN teams t2 ON m.equipe2_id = t2.id
      WHERE m.id = $1
    `, [id]);
    
    const updatedRankings = await query(`
      SELECT *, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    // Émettre les mises à jour via WebSocket
    emitUpdate('matchUpdated', updatedMatch.rows[0]);
    emitUpdate('rankingsUpdated', updatedRankings.rows);
    
    console.log(`✅ [${timestamp}] Match ${id} mis à jour avec succès dans PostgreSQL (finished: ${finished || false})`);
    res.json({ success: true, message: 'Match mis à jour avec succès' });
  } catch (error) {
    console.error('❌ Erreur mise à jour match:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir le classement
app.get('/api/rankings', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🏆 [${timestamp}] Récupération du classement depuis PostgreSQL`);
    
    // D'abord, recalculer toutes les statistiques pour s'assurer qu'elles sont à jour
    await recalculateAllTeamStats();
    
    // Ensuite, récupérer le classement depuis la table teams
    const result = await query(`
      SELECT *, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);

    const teams = result.rows.map(team => ({
      ...team,
      joueurs: team.joueurs // PostgreSQL retourne déjà un objet JSON
    }));

    console.log(`✅ [${timestamp}] Classement récupéré: ${teams.length} équipes`);
    res.json(teams);
  } catch (error) {
    console.error('❌ Erreur récupération classement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour sauvegarder les matchs actuels
app.post('/api/matches/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`💾 [${timestamp}] Sauvegarde des matchs actuels demandée`);
    
    // Récupérer tous les matchs actuels
    const result = await query(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      JOIN teams t1 ON m.equipe1_id = t1.id
      JOIN teams t2 ON m.equipe2_id = t2.id
      ORDER BY m.jour, m.heure
    `);
    
    const matches = result.rows.map(match => ({
      ...match,
      team1_joueurs: match.team1_joueurs,
      team2_joueurs: match.team2_joueurs
    }));
    
    // Sauvegarder dans une table temporaire
    await query('DROP TABLE IF EXISTS matches_backup');
    await query(`
      CREATE TABLE matches_backup AS 
      SELECT * FROM matches
    `);
    
    console.log(`✅ [${timestamp}] ${matches.length} matchs sauvegardés`);
    res.json({ 
      success: true, 
      message: 'Matchs sauvegardés avec succès',
      count: matches.length,
      matches: matches
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde matchs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde' });
  }
});

// Route pour restaurer les matchs sauvegardés
app.post('/api/matches/restore', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🔄 [${timestamp}] Restauration des matchs sauvegardés demandée`);
    
    // Vérifier si une sauvegarde existe
    const backupExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'matches_backup'
      )
    `);
    
    if (!backupExists.rows[0].exists) {
      return res.status(404).json({ error: 'Aucune sauvegarde trouvée' });
    }
    
    // Supprimer tous les matchs actuels
    await query('DELETE FROM matches');
    
    // Restaurer depuis la sauvegarde
    await query(`
      INSERT INTO matches 
      SELECT * FROM matches_backup
    `);
    
    // Compter les matchs restaurés
    const countResult = await query('SELECT COUNT(*) as count FROM matches');
    const count = parseInt(countResult.rows[0].count);
    
    console.log(`✅ [${timestamp}] ${count} matchs restaurés`);
    res.json({ 
      success: true, 
      message: 'Matchs restaurés avec succès',
      count: count
    });
  } catch (error) {
    console.error('❌ Erreur restauration matchs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la restauration' });
  }
});


// Route pour régénérer les matchs automatiquement
app.post('/api/matches/regenerate', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const { matchesPerTeam = 3, teamI = null } = req.body; // Valeur par défaut : 3 matchs par équipe
    console.log(`🔄 [${timestamp}] Régénération automatique des matchs demandée (${matchesPerTeam} matchs par équipe)`);

    // Validation du paramètre
    if (matchesPerTeam < 1 || matchesPerTeam > 10) {
      return res.status(400).json({ error: 'Le nombre de matchs par équipe doit être entre 1 et 10' });
    }

    // Récupérer toutes les équipes
    const teamsResult = await query('SELECT id, nom FROM teams ORDER BY id');
    const teams = teamsResult.rows;

    if (teams.length < 2) {
      return res.status(400).json({ error: 'Au moins 2 équipes sont nécessaires pour créer des matchs' });
    }

    // Sauvegarder les matchs actuels avant de les remplacer
    await query('DROP TABLE IF EXISTS matches_backup');
    await query('CREATE TABLE matches_backup AS SELECT * FROM matches');

    // Supprimer tous les matchs actuels
    await query('DELETE FROM matches');

    // Générer les nouveaux matchs avec support équipe I
    const newMatches = await generateMatches(teams, matchesPerTeam, teamI);

    // Insérer les nouveaux matchs
    for (const match of newMatches) {
      await query(`
        INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [match.id, match.jour, match.heure, match.equipe1_id, match.equipe2_id]);
    }

    console.log(`✅ [${timestamp}] ${newMatches.length} nouveaux matchs générés (${matchesPerTeam} matchs par équipe)`);
    res.json({
      success: true,
      message: `Matchs régénérés avec succès (${matchesPerTeam} matchs par équipe)`,
      count: newMatches.length,
      matchesPerTeam: matchesPerTeam,
      matches: newMatches,
      teamI: teamI ? `Équipe I: ${teamI.nom}` : 'Aucune équipe I'
    });
  } catch (error) {
    console.error('❌ Erreur régénération matchs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la régénération' });
  }
});

// Route pour créer l'équipe I et générer les matchs du vendredi
app.post('/api/teams/create-team-i', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const { nom, joueurs } = req.body;
    
    console.log(`🏆 [${timestamp}] Création de l'équipe I: ${nom}`);

    if (!nom || !joueurs || !Array.isArray(joueurs) || joueurs.length === 0) {
      return res.status(400).json({ error: 'Nom et joueurs requis pour l\'équipe I' });
    }

    // Vérifier si l'équipe I existe déjà
    const existingTeamI = await query('SELECT id FROM teams WHERE id = $1', ['I']);
    if (existingTeamI.rows.length > 0) {
      return res.status(400).json({ error: 'L\'équipe I existe déjà' });
    }

    // Créer l'équipe I
    await query(`
      INSERT INTO teams (id, nom, joueurs, points, buts, gamelles)
      VALUES ($1, $2, $3, 0, 0, 0)
    `, ['I', nom, JSON.stringify(joueurs)]);

    console.log(`✅ [${timestamp}] Équipe I créée: ${nom} (${joueurs.join(', ')})`);
    
    res.json({
      success: true,
      message: 'Équipe I créée avec succès',
      team: {
        id: 'I',
        nom,
        joueurs,
        points: 0,
        buts: 0,
        gamelles: 0
      }
    });
  } catch (error) {
    console.error('❌ Erreur création équipe I:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de l\'équipe I' });
  }
});

// Route pour créer un match individuel
app.post('/api/matches', async (req, res) => {
  try {
    const { id, jour, heure, equipe1_id, equipe2_id } = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`⚽ [${timestamp}] Création d'un match: ${jour} ${heure} - ${equipe1_id} vs ${equipe2_id}`);

    // Validation des données
    if (!id || !jour || !heure || !equipe1_id || !equipe2_id) {
      return res.status(400).json({ error: 'Tous les champs sont requis (id, jour, heure, equipe1_id, equipe2_id)' });
    }

    // Vérifier que les équipes existent
    const team1Result = await query('SELECT id FROM teams WHERE id = $1', [equipe1_id]);
    const team2Result = await query('SELECT id FROM teams WHERE id = $1', [equipe2_id]);
    
    if (team1Result.rows.length === 0) {
      return res.status(400).json({ error: `L'équipe ${equipe1_id} n'existe pas` });
    }
    
    if (team2Result.rows.length === 0) {
      return res.status(400).json({ error: `L'équipe ${equipe2_id} n'existe pas` });
    }

    // Vérifier qu'il n'y a pas déjà un match avec le même ID
    const existingMatch = await query('SELECT id FROM matches WHERE id = $1', [id]);
    if (existingMatch.rows.length > 0) {
      return res.status(400).json({ error: `Un match avec l'ID ${id} existe déjà` });
    }

    // Créer le match
    await query(`
      INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team1_gamelles, team2_goals, team2_gamelles, finished)
      VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, false)
    `, [id, jour, heure, equipe1_id, equipe2_id]);

    console.log(`✅ [${timestamp}] Match créé avec succès: ${id}`);
    
    res.json({
      success: true,
      message: 'Match créé avec succès',
      match: {
        id,
        jour,
        heure,
        equipe1_id,
        equipe2_id,
        team1_goals: 0,
        team1_gamelles: 0,
        team2_goals: 0,
        team2_gamelles: 0,
        finished: false
      }
    });
  } catch (error) {
    console.error('❌ Erreur création match:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création du match' });
  }
});

// Route pour supprimer tous les matchs
app.delete('/api/matches/delete-all', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🗑️ [${timestamp}] Suppression de tous les matchs`);

    // Supprimer tous les matchs
    const result = await query('DELETE FROM matches');
    
    console.log(`✅ [${timestamp}] ${result.rowCount} matchs supprimés`);
    
    res.json({
      success: true,
      message: `${result.rowCount} matchs supprimés`,
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('❌ Erreur suppression tous les matchs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de tous les matchs' });
  }
});

// Route pour supprimer tous les matchs d'un jour spécifique
app.delete('/api/matches/delete-day/:day', async (req, res) => {
  try {
    const { day } = req.params;
    const timestamp = new Date().toISOString();
    console.log(`🗑️ [${timestamp}] Suppression des matchs du ${day}`);

    // Supprimer tous les matchs du jour spécifié
    const result = await query('DELETE FROM matches WHERE jour = $1', [day]);
    
    console.log(`✅ [${timestamp}] ${result.rowCount} matchs du ${day} supprimés`);
    
    res.json({
      success: true,
      message: `${result.rowCount} matchs du ${day} supprimés`,
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('❌ Erreur suppression matchs jour:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression des matchs du jour' });
  }
});

// Route pour supprimer tous les matchs du vendredi de l'équipe I
app.delete('/api/matches/delete-friday-team-i', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🗑️ [${timestamp}] Suppression des matchs du vendredi pour l'équipe I`);

    // Supprimer tous les matchs du vendredi pour l'équipe I
    const result = await query('DELETE FROM matches WHERE jour = $1 AND (equipe1_id = $2 OR equipe2_id = $2)', ['vendredi', 'I']);
    
    console.log(`✅ [${timestamp}] ${result.rowCount} matchs du vendredi supprimés pour l'équipe I`);
    
    res.json({
      success: true,
      message: `${result.rowCount} matchs du vendredi supprimés pour l'équipe I`,
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('❌ Erreur suppression matchs vendredi équipe I:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression des matchs du vendredi' });
  }
});

// Route pour générer les matchs de la phase suivante avec les équipes qualifiées
app.post('/api/matches/generate-next-phase', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const { phase_number, matchesPerTeam = 3 } = req.body;
    
    console.log(`🏆 [${timestamp}] Génération des matchs pour la phase ${phase_number}`);

    if (!phase_number) {
      return res.status(400).json({ error: 'Numéro de phase requis' });
    }

    // Récupérer les équipes qualifiées pour cette phase
    const qualifiedTeamsResult = await query(`
      SELECT t.id, t.nom, t.joueurs
      FROM teams t
      INNER JOIN team_qualifications tq ON t.id = tq.team_id
      WHERE tq.phase_number = $1 AND tq.qualified = true
      ORDER BY t.id
    `, [phase_number]);

    const qualifiedTeams = qualifiedTeamsResult.rows;
    
    if (qualifiedTeams.length < 2) {
      return res.status(400).json({ error: 'Au moins 2 équipes qualifiées sont nécessaires pour générer des matchs' });
    }

    console.log(`🎯 Équipes qualifiées pour la phase ${phase_number}: ${qualifiedTeams.map(t => t.nom).join(', ')}`);

    // Sauvegarder les matchs actuels de cette phase avant de les remplacer
    await query('DROP TABLE IF EXISTS matches_backup_phase_' + phase_number);
    await query(`CREATE TABLE matches_backup_phase_${phase_number} AS SELECT * FROM matches WHERE phase_number = $1`, [phase_number]);

    // Supprimer les matchs existants de cette phase
    await query('DELETE FROM matches WHERE phase_number = $1', [phase_number]);

    // Générer les nouveaux matchs pour les équipes qualifiées
    const newMatches = await generateMatches(qualifiedTeams, matchesPerTeam);

    // Insérer les nouveaux matchs avec le numéro de phase
    for (const match of newMatches) {
      await query(`
        INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, phase_number)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [match.id, match.jour, match.heure, match.equipe1_id, match.equipe2_id, phase_number]);
    }

    console.log(`✅ [${timestamp}] ${newMatches.length} nouveaux matchs générés pour la phase ${phase_number}`);
    res.json({
      success: true,
      message: `${newMatches.length} matchs générés pour la phase ${phase_number}`,
      phase_number,
      qualified_teams: qualifiedTeams.length,
      matches_generated: newMatches.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération des matchs de la phase suivante:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la génération des matchs de la phase suivante' });
  }
});

// Route pour générer les matchs du vendredi avec l'équipe I
app.post('/api/matches/generate-friday-team-i', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🏆 [${timestamp}] Génération des matchs du vendredi pour l'équipe I`);

    // Vérifier que l'équipe I existe
    const teamIResult = await query('SELECT * FROM teams WHERE id = $1', ['I']);
    if (teamIResult.rows.length === 0) {
      return res.status(400).json({ error: 'L\'équipe I n\'existe pas. Créez-la d\'abord.' });
    }

    const teamI = teamIResult.rows[0];

    // Récupérer le classement actuel pour identifier les 3 équipes perdantes les mieux notées
    // Utiliser le système de points basé sur les buts marqués moins les gamelles adverses
    const rankingsResult = await query(`
      SELECT 
        t.id,
        t.nom,
        COALESCE(SUM(CASE 
          WHEN m.equipe1_id = t.id THEN (m.team1_goals - m.team2_gamelles)
          WHEN m.equipe2_id = t.id THEN (m.team2_goals - m.team1_gamelles)
          ELSE 0
        END), 0) as points,
        COALESCE(SUM(CASE 
          WHEN m.equipe1_id = t.id THEN (m.team1_goals - m.team2_gamelles) - (m.team2_goals - m.team1_gamelles)
          WHEN m.equipe2_id = t.id THEN (m.team2_goals - m.team1_gamelles) - (m.team1_goals - m.team2_gamelles)
          ELSE 0
        END), 0) as difference
      FROM teams t
      LEFT JOIN matches m ON (m.equipe1_id = t.id OR m.equipe2_id = t.id) AND m.finished = true
      WHERE t.id != 'I'
      GROUP BY t.id, t.nom
      ORDER BY points ASC, difference ASC
      LIMIT 3
    `);

    const bottomThreeTeams = rankingsResult.rows;
    
    if (bottomThreeTeams.length < 3) {
      return res.status(400).json({ error: 'Pas assez d\'équipes pour générer les matchs du vendredi' });
    }

    console.log(`🥉 3 équipes perdantes les mieux notées: ${bottomThreeTeams.map(t => t.nom).join(', ')}`);

    // Supprimer les anciens matchs du vendredi pour l'équipe I
    await query('DELETE FROM matches WHERE jour = $1 AND (equipe1_id = $2 OR equipe2_id = $2)', ['vendredi', 'I']);

    // Générer les 3 matchs du vendredi
    const fridayMatches = [];
    const fridayTimes = ['12:00', '13:00', '13:30'];

    for (let i = 0; i < 3; i++) {
      const opponent = bottomThreeTeams[i];
      const matchId = `vendredi_teamI_${i + 1}`;
      
      await query(`
        INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team1_gamelles, team2_goals, team2_gamelles, finished)
        VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, false)
      `, [matchId, 'vendredi', fridayTimes[i], 'I', opponent.id]);

      fridayMatches.push({
        id: matchId,
        jour: 'vendredi',
        heure: fridayTimes[i],
        equipe1_id: 'I',
        equipe2_id: opponent.id,
        team1_goals: 0,
        team1_gamelles: 0,
        team2_goals: 0,
        team2_gamelles: 0,
        finished: false
      });

      console.log(`⚽ Match vendredi ${i + 1}: ${teamI.nom} vs ${opponent.nom} à ${fridayTimes[i]}`);
    }

    console.log(`✅ [${timestamp}] 3 matchs du vendredi générés pour l'équipe I`);
    
    res.json({
      success: true,
      message: 'Matchs du vendredi générés avec succès pour l\'équipe I',
      teamI: teamI.nom,
      opponents: bottomThreeTeams.map(t => t.nom),
      matches: fridayMatches
    });
  } catch (error) {
    console.error('❌ Erreur génération matchs vendredi équipe I:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la génération des matchs du vendredi' });
  }
});


/**
 * Algorithme de génération de tournoi optimisé
 * Basé sur les spécifications du projet Baby-foot
 * Gère intelligemment le nombre de matchs selon le nombre d'équipes
 * Support de l'équipe I avec les 3 équipes perdantes les mieux notées
 */
class TournamentGenerator {
  constructor() {
    this.teams = [];
    this.matchesPerTeam = 3;
    this.daysAvailable = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    this.times = ['12:00', '13:00', '13:30', '14:00', '14:30'];
    this.maxMatchesPerDay = 3;
    this.teamI = null; // Équipe I spéciale
  }

  // Ajouter une équipe
  addTeam(team) {
    if (!this.teams.find(t => t.id === team.id)) {
      this.teams.push(team);
      return true;
    }
    return false;
  }

  // Définir l'équipe I spéciale
  setTeamI(team) {
    this.teamI = team;
    console.log(`🏆 Équipe I définie: ${team.nom} (${team.id})`);
  }

  // Définir le nombre de matchs par équipe
  setMatchesPerTeam(matches) {
    this.matchesPerTeam = matches;
  }

  // Vérifier si le tournoi est réalisable
  isTournamentFeasible() {
    const totalTeams = this.teams.length;
    const totalMatchesNeeded = Math.ceil((totalTeams * this.matchesPerTeam) / 2);
    const totalCapacity = this.daysAvailable.length * this.maxMatchesPerDay;

    return {
      feasible: totalMatchesNeeded <= totalCapacity,
      totalMatchesNeeded,
      maxMatchesPerDay: this.maxMatchesPerDay,
      totalCapacity,
      daysNeeded: Math.ceil(totalMatchesNeeded / this.maxMatchesPerDay)
    };
  }

  // Algorithme optimisé basé sur les meilleures pratiques de tournoi
  generateTournament() {
    const teamCount = this.teams.length;
    
    console.log(`🔍 Génération des matchs: ${teamCount} équipes, ${this.matchesPerTeam} matchs par équipe`);
    console.log(`📋 Équipes disponibles: ${this.teams.map(t => t.nom).join(', ')}`);

    // Vérifier si l'équipe I est définie
    if (this.teamI) {
      console.log(`🏆 Équipe I détectée: ${this.teamI.nom} - Génération spéciale du vendredi`);
      return this.generateTournamentWithTeamI();
    }

    // Configuration intelligente selon le nombre d'équipes
    let targetMatches;
    let daysToUse = [];
    let matchesPerDay = [];

    if (teamCount === 8) {
      // 8 équipes : 12 matchs (3 matchs par équipe) - PAS de vendredi
      targetMatches = 12;
      daysToUse = ['lundi', 'mardi', 'mercredi', 'jeudi'];
      matchesPerDay = [3, 3, 3, 3];
      console.log(`📅 Configuration 8 équipes: 12 matchs sur 4 jours (3 matchs/jour) - Vendredi vide pour équipe I`);
    } else if (teamCount === 9) {
      // 9 équipes : 12 matchs sur 4 jours (lundi-jeudi) - PAS de vendredi automatique
      targetMatches = 12;
      daysToUse = ['lundi', 'mardi', 'mercredi', 'jeudi'];
      matchesPerDay = [3, 3, 3, 3];
      console.log(`📅 Configuration 9 équipes: 12 matchs sur 4 jours (3 matchs/jour) - Vendredi vide pour équipe I`);
    } else {
      // Configuration par défaut - PAS de vendredi automatique
      targetMatches = Math.ceil((teamCount * this.matchesPerTeam) / 2);
      daysToUse = ['lundi', 'mardi', 'mercredi', 'jeudi']; // Exclure le vendredi
      matchesPerDay = new Array(daysToUse.length).fill(this.maxMatchesPerDay);
      console.log(`📅 Configuration par défaut: ${targetMatches} matchs sur ${daysToUse.length} jours - Vendredi vide pour équipe I`);
    }

    console.log(`📊 Matchs cibles: ${targetMatches}`);

    // Générer toutes les paires possibles
    const allPairs = [];
    for (let i = 0; i < this.teams.length; i++) {
      for (let j = i + 1; j < this.teams.length; j++) {
        allPairs.push({
          team1: this.teams[i],
          team2: this.teams[j]
        });
      }
    }

    console.log(`📊 Total de paires possibles: ${allPairs.length}`);

    // Sélectionner exactement le nombre de matchs cibles
    const selectedPairs = [];
    
    // Mélanger les paires pour plus de variété
    this.shuffleArray(allPairs);

    // Prendre exactement le nombre de matchs souhaité
    for (let i = 0; i < Math.min(targetMatches, allPairs.length); i++) {
      selectedPairs.push(allPairs[i]);
      console.log(`✅ Paire sélectionnée: ${allPairs[i].team1.nom} vs ${allPairs[i].team2.nom}`);
    }

    console.log(`📊 Paires sélectionnées: ${selectedPairs.length}/${targetMatches}`);

    // Répartir les matchs selon la configuration optimale
    const schedule = {};
    daysToUse.forEach(day => schedule[day] = []);

    let pairIndex = 0;
    for (let dayIndex = 0; dayIndex < daysToUse.length && pairIndex < selectedPairs.length; dayIndex++) {
      const currentDay = daysToUse[dayIndex];
      const maxMatchesForDay = matchesPerDay[dayIndex];
      
      for (let matchIndex = 0; matchIndex < maxMatchesForDay && pairIndex < selectedPairs.length; matchIndex++) {
        const pair = selectedPairs[pairIndex];
        const currentTime = this.times[matchIndex % this.times.length];

        schedule[currentDay].push({
          team1: pair.team1,
          team2: pair.team2,
          time: currentTime
        });

        console.log(`📅 Match programmé: ${pair.team1.nom} vs ${pair.team2.nom} le ${currentDay} à ${currentTime}`);
        pairIndex++;
      }
    }

    // Vérifier si le tournoi est complet
    const finalTeamCounts = {};
    this.teams.forEach(team => finalTeamCounts[team.id] = 0);
    selectedPairs.forEach(pair => {
      finalTeamCounts[pair.team1.id]++;
      finalTeamCounts[pair.team2.id]++;
    });

    const isComplete = this.teams.every(team => finalTeamCounts[team.id] === this.matchesPerTeam);

    console.log(`🏁 Génération terminée: ${selectedPairs.length} matchs générés`);
    console.log(`📊 Matchs par équipe:`, finalTeamCounts);
    console.log(`📊 Répartition par jour:`, Object.fromEntries(Object.entries(schedule).map(([day, matches]) => [day, matches.length])));
    console.log(`📊 Tournoi complet: ${isComplete ? '✅' : '❌'}`);

    return {
      success: true,
      schedule,
      statistics: {
        totalMatches: selectedPairs.length,
        targetMatches: targetMatches,
        teamCounts: finalTeamCounts
      }
    };
  }

  // Fonction utilitaire pour mélanger un tableau
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Convertir le planning en format attendu par l'application
  convertToAppFormat(schedule) {
    const finalMatches = [];
    let matchIndex = 1;

    Object.entries(schedule).forEach(([day, matches]) => {
      matches.forEach((match) => {
        finalMatches.push({
          id: `${day}-${matchIndex}`,
          jour: day,
          heure: match.time,
          equipe1_id: match.team1.id,
          equipe2_id: match.team2.id
        });
        
        matchIndex++;
      });
    });

    return finalMatches;
  }

  /**
   * Génère un tournoi spécial avec l'équipe I
   * L'équipe I affronte les 3 équipes perdantes les mieux notées le vendredi
   */
  async generateTournamentWithTeamI() {
    console.log(`🏆 Génération spéciale avec équipe I: ${this.teamI.nom}`);
    
    try {
      // 1. Générer le tournoi normal pour les équipes A-H (lundi-jeudi)
      const regularTeams = this.teams.filter(team => team.id !== this.teamI.id);
      console.log(`📋 Équipes régulières: ${regularTeams.map(t => t.nom).join(', ')}`);
      
      // Créer un générateur temporaire pour les équipes régulières
      const regularGenerator = new TournamentGenerator();
      regularTeams.forEach(team => regularGenerator.addTeam(team));
      regularGenerator.setMatchesPerTeam(this.matchesPerTeam);
      
      // Générer les matchs réguliers (lundi-jeudi)
      const regularResult = regularGenerator.generateTournament();
      if (!regularResult.success) {
        return { success: false, error: regularResult.error };
      }
      
      console.log(`✅ ${regularResult.schedule.size} jours de matchs réguliers générés`);
      
      // 2. Ne pas générer automatiquement les matchs du vendredi
      // Les matchs du vendredi seront générés manuellement via l'API
      console.log(`📅 Vendredi laissé vide pour génération manuelle des matchs de l'équipe I`);
      
      // 3. Retourner seulement les matchs réguliers (lundi-jeudi)
      console.log(`🎯 Total: ${regularResult.schedule.length} matchs générés (lundi-jeudi seulement)`);
      
      return {
        success: true,
        schedule: regularResult.schedule,
        regularMatches: regularResult.schedule.length,
        fridayMatches: 0,
        teamIMatches: []
      };
      
    } catch (error) {
      console.error('❌ Erreur génération tournoi équipe I:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Fonction principale de génération de matchs
 * Utilise la classe TournamentGenerator avancée
 * Support de l'équipe I avec les 3 équipes perdantes les mieux notées
 */
async function generateMatches(teams, matchesPerTeam = 3, teamI = null) {
  const generator = new TournamentGenerator();
  
  // Ajouter toutes les équipes
  teams.forEach(team => generator.addTeam(team));
  generator.setMatchesPerTeam(matchesPerTeam);
  
  // Définir l'équipe I si fournie
  if (teamI) {
    generator.setTeamI(teamI);
  }
  
  // Générer le tournoi
  const result = await generator.generateTournament();
  
  if (result.success) {
    const finalMatches = generator.convertToAppFormat(result.schedule);
    
    // Analyser la qualité du planning généré
    const qualityAnalysis = analyzeScheduleQuality(finalMatches, teams, matchesPerTeam);
    console.log(`📈 Analyse de qualité:`, qualityAnalysis);
    
    return finalMatches;
  } else {
    console.error(`❌ Erreur de génération: ${result.error}`);
    return [];
  }
}


/**
 * Analyse la qualité du planning généré
 * Basé sur les métriques de planification de tournoi
 */
function analyzeScheduleQuality(matches, teams, matchesPerTeam) {
  const analysis = {
    totalMatches: matches.length,
    expectedMatches: Math.ceil((teams.length * matchesPerTeam) / 2),
    completionRate: 0,
    balanceScore: 0,
    diversityScore: 0,
    constraintsRespected: {
      maxMatchesPerDay: true,
      noTeamTwicePerDay: true,
      matchesPerTeamRespected: true
    },
    issues: []
  };
  
  // 1. Taux de complétion
  analysis.completionRate = (matches.length / analysis.expectedMatches) * 100;
  
  // 2. Équilibrage des matchs par équipe
  const teamMatchCounts = new Map();
  teams.forEach(team => teamMatchCounts.set(team.id, 0));
  
  matches.forEach(match => {
    teamMatchCounts.set(match.equipe1_id, teamMatchCounts.get(match.equipe1_id) + 1);
    teamMatchCounts.set(match.equipe2_id, teamMatchCounts.get(match.equipe2_id) + 1);
  });
  
  const matchCounts = Array.from(teamMatchCounts.values());
  const avgMatches = matchCounts.reduce((a, b) => a + b, 0) / matchCounts.length;
  const variance = matchCounts.reduce((sum, count) => sum + Math.pow(count - avgMatches, 2), 0) / matchCounts.length;
  analysis.balanceScore = Math.max(0, 100 - variance * 10); // Score inversement proportionnel à la variance
  
  // 3. Diversité des affrontements
  const uniquePairs = new Set();
  matches.forEach(match => {
    const pair = [match.equipe1_id, match.equipe2_id].sort().join('-');
    uniquePairs.add(pair);
  });
  
  const maxPossiblePairs = (teams.length * (teams.length - 1)) / 2;
  analysis.diversityScore = (uniquePairs.size / maxPossiblePairs) * 100;
  
  // 4. Vérification des contraintes
  const dayMatchCounts = new Map();
  const teamDayCounts = new Map();
  
  teams.forEach(team => {
    teamDayCounts.set(team.id, new Map());
  });
  
  matches.forEach(match => {
    // Compter les matchs par jour
    dayMatchCounts.set(match.jour, (dayMatchCounts.get(match.jour) || 0) + 1);
    
    // Compter les jours par équipe
    if (!teamDayCounts.get(match.equipe1_id).has(match.jour)) {
      teamDayCounts.get(match.equipe1_id).set(match.jour, 0);
    }
    if (!teamDayCounts.get(match.equipe2_id).has(match.jour)) {
      teamDayCounts.get(match.equipe2_id).set(match.jour, 0);
    }
    
    teamDayCounts.get(match.equipe1_id).set(match.jour, teamDayCounts.get(match.equipe1_id).get(match.jour) + 1);
    teamDayCounts.get(match.equipe2_id).set(match.jour, teamDayCounts.get(match.equipe2_id).get(match.jour) + 1);
  });
  
  // Vérifier max 3 matchs par jour
  for (const [day, count] of dayMatchCounts) {
    if (count > 3) {
      analysis.constraintsRespected.maxMatchesPerDay = false;
      analysis.issues.push(`Trop de matchs le ${day}: ${count} (max 3)`);
    }
  }
  
  // Vérifier qu'aucune équipe ne joue 2 fois le même jour
  for (const [teamId, dayCounts] of teamDayCounts) {
    for (const [day, count] of dayCounts) {
      if (count > 1) {
        analysis.constraintsRespected.noTeamTwicePerDay = false;
        const teamName = teams.find(t => t.id === teamId)?.nom || teamId;
        analysis.issues.push(`${teamName} joue ${count} fois le ${day}`);
      }
    }
  }
  
  // Vérifier le quota de matchs par équipe
  for (const [teamId, count] of teamMatchCounts) {
    if (count !== matchesPerTeam) {
      analysis.constraintsRespected.matchesPerTeamRespected = false;
      const teamName = teams.find(t => t.id === teamId)?.nom || teamId;
      analysis.issues.push(`${teamName}: ${count} matchs au lieu de ${matchesPerTeam}`);
    }
  }
  
  // Score global
  const constraintScore = Object.values(analysis.constraintsRespected).filter(Boolean).length * 33.33;
  analysis.overallScore = (analysis.completionRate + analysis.balanceScore + analysis.diversityScore + constraintScore) / 4;
  
  return analysis;
}

// Routes pour la gestion des phases
app.get('/api/phases', async (req, res) => {
  try {
    const result = await query(`
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
  }
});

app.post('/api/phases', async (req, res) => {
  try {
    const { phase_name } = req.body;
    
    if (!phase_name) {
      return res.status(400).json({ error: 'Nom de la phase requis' });
    }
    
    // Récupérer le numéro de phase suivant
    const nextPhaseResult = await query(`
      SELECT COALESCE(MAX(phase_number), 0) + 1 as next_phase_number 
      FROM tournament_phases
    `);
    
    const nextPhaseNumber = nextPhaseResult.rows[0].next_phase_number;
    
    // Créer la nouvelle phase
    const result = await query(`
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
  }
});

app.put('/api/phases', async (req, res) => {
  try {
    const { phase_number, is_active, is_completed } = req.body;
    
    if (phase_number === undefined) {
      return res.status(400).json({ error: 'Numéro de phase requis' });
    }
    
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
    
    const result = await query(updateQuery, updateValues);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Phase non trouvée' });
    }
    
    res.status(200).json({ message: 'Phase mise à jour avec succès' });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la phase:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la phase' });
  }
});

// Routes pour la gestion des qualifications
app.get('/api/qualifications', async (req, res) => {
  try {
    const { phase_number } = req.query;
    
    if (!phase_number) {
      return res.status(400).json({ error: 'Numéro de phase requis' });
    }
    
    const result = await query(`
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
  }
});

app.post('/api/qualifications', async (req, res) => {
  try {
    const { phase_number, qualified_teams } = req.body;
    
    if (!phase_number || !Array.isArray(qualified_teams)) {
      return res.status(400).json({ error: 'Numéro de phase et liste des équipes qualifiées requis' });
    }
    
    await query('BEGIN');
    
    // Supprimer les qualifications existantes pour cette phase
    await query(`
      DELETE FROM team_qualifications WHERE phase_number = $1
    `, [phase_number]);
    
    // Insérer les nouvelles qualifications
    for (const teamId of qualified_teams) {
      await query(`
        INSERT INTO team_qualifications (team_id, phase_number, qualified)
        VALUES ($1, $2, true)
      `, [teamId, phase_number]);
    }
    
    await query('COMMIT');
    
    res.status(200).json({ 
      message: `${qualified_teams.length} équipes qualifiées pour la phase ${phase_number}`,
      qualified_teams: qualified_teams.length
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('❌ Erreur lors de la définition des qualifications:', error);
    res.status(500).json({ error: 'Erreur lors de la définition des qualifications' });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur tournoi MyOrigines actif avec PostgreSQL' });
});

// Route de diagnostic PostgreSQL
app.get('/api/postgres-status', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] Diagnostic PostgreSQL demandé`);
    
    // Vérifier les tables
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    // Compter les enregistrements
    const teamCount = await query('SELECT COUNT(*) as count FROM teams');
    const matchCount = await query('SELECT COUNT(*) as count FROM matches');
    const adminCount = await query('SELECT COUNT(*) as count FROM admins');
    
    // Vérifier les matchs avec des scores
    const matchesWithScores = await query(`
      SELECT COUNT(*) as count FROM matches 
      WHERE team1_goals > 0 OR team2_goals > 0 OR team1_gamelles > 0 OR team2_gamelles > 0
    `);
    
    const status = {
      timestamp,
      database: 'PostgreSQL',
      tables: tablesResult.rows.map(t => t.table_name),
      counts: {
        teams: parseInt(teamCount.rows[0].count),
        matches: parseInt(matchCount.rows[0].count),
        admins: parseInt(adminCount.rows[0].count),
        matchesWithScores: parseInt(matchesWithScores.rows[0].count)
      },
      status: 'OK'
    };
    
    console.log(`✅ [${timestamp}] Diagnostic PostgreSQL:`, status);
    res.json(status);
  } catch (error) {
    console.error('❌ Erreur diagnostic PostgreSQL:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Erreur lors du diagnostic PostgreSQL',
      error: error.message 
    });
  }
});

// Route pour restaurer le planning standard prédéfini
app.post('/api/matches/restore-standard', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const { matches } = req.body;
    console.log(`🔄 [${timestamp}] Restauration du planning standard demandée`);

    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Liste de matchs requise' });
    }

    // Sauvegarder les matchs actuels avant de les remplacer
    await query('DROP TABLE IF EXISTS matches_backup');
    await query('CREATE TABLE matches_backup AS SELECT * FROM matches');

    // Supprimer tous les matchs actuels
    await query('DELETE FROM matches');

    // Insérer les matchs du planning standard
    for (const match of matches) {
      await query(`
        INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [match.id, match.jour, match.heure, match.equipe1_id, match.equipe2_id]);
    }

    console.log(`✅ [${timestamp}] Planning standard restauré avec succès (${matches.length} matchs)`);
    res.json({
      success: true,
      message: 'Planning standard restauré avec succès',
      count: matches.length
    });
  } catch (error) {
    console.error('❌ Erreur restauration planning standard:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la restauration du planning standard' 
    });
  }
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur tournoi MyOrigines démarré sur le port ${PORT}`);
  console.log(`📊 Interface admin: http://localhost:${PORT}/api/auth/login`);
  console.log(`🏆 API disponible: http://localhost:${PORT}/api/`);
  console.log(`🌐 Frontend React: http://localhost:2000`);
  console.log(`🗄️ Base de données: PostgreSQL sur le port 2003`);
});
