import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDatabase, getDatabase, query } from './api/db-postgres.js';

const app = express();
const PORT = 2001;
const JWT_SECRET = 'myorigines-tournoi-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());

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
app.post('/api/matches/:id/reset', authenticateToken, async (req, res) => {
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
app.post('/api/reset-all', authenticateToken, async (req, res) => {
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
  let totalGoals = 0;
  let totalGamelles = 0;
  let totalPoints = 0;

  // Calculer les statistiques pour chaque match
  for (const match of matches) {
    if (match.equipe1_id === teamId) {
      // L'équipe est l'équipe 1
      const teamGoals = match.team1_goals || 0;
      const teamGamelles = match.team1_gamelles || 0;
      const opponentGamelles = match.team2_gamelles || 0;
      
      totalGoals += teamGoals;
      totalGamelles += teamGamelles;
      
      // Points = Buts marqués - Gamelles adverses
      const matchPoints = Math.max(0, teamGoals - opponentGamelles);
      totalPoints += matchPoints;
    } else {
      // L'équipe est l'équipe 2
      const teamGoals = match.team2_goals || 0;
      const teamGamelles = match.team2_gamelles || 0;
      const opponentGamelles = match.team1_gamelles || 0;
      
      totalGoals += teamGoals;
      totalGamelles += teamGamelles;
      
      // Points = Buts marqués - Gamelles adverses
      const matchPoints = Math.max(0, teamGoals - opponentGamelles);
      totalPoints += matchPoints;
    }
  }

  // Mettre à jour les statistiques de l'équipe
  await query(`
    UPDATE teams 
    SET points = $1, buts = $2, gamelles = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [totalPoints, totalGoals, totalGamelles, teamId]);
}

// Route pour mettre à jour un match (authentification requise pour l'admin)
app.put('/api/matches/:id', authenticateToken, async (req, res) => {
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

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur tournoi MyOrigines démarré sur le port ${PORT}`);
  console.log(`📊 Interface admin: http://localhost:${PORT}/api/auth/login`);
  console.log(`🏆 API disponible: http://localhost:${PORT}/api/`);
  console.log(`🌐 Frontend React: http://localhost:2000`);
  console.log(`🗄️ Base de données: PostgreSQL sur le port 2003`);
});
