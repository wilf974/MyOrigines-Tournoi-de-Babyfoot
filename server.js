import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './api/db.js';

const app = express();
const PORT = 2001;
const JWT_SECRET = 'myorigines-tournoi-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());

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

    const db = await getDatabase();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

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
    const db = await getDatabase();
    const teams = db.prepare('SELECT * FROM teams ORDER BY points DESC, (buts - gamelles) DESC, buts DESC').all();
    
    // Parser les joueurs JSON
    const teamsWithParsedPlayers = teams.map(team => ({
      ...team,
      joueurs: JSON.parse(team.joueurs)
    }));

    res.json(teamsWithParsedPlayers);
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
    console.log(`📊 [${timestamp}] Récupération des matchs pour ${day} depuis SQLite`);
    
    const db = await getDatabase();
    
    const matches = db.prepare(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      JOIN teams t1 ON m.equipe1_id = t1.id
      JOIN teams t2 ON m.equipe2_id = t2.id
      WHERE m.jour = ?
      ORDER BY m.heure
    `).all(day);

    // Parser les joueurs JSON
    const matchesWithParsedData = matches.map(match => ({
      ...match,
      team1_joueurs: JSON.parse(match.team1_joueurs),
      team2_joueurs: JSON.parse(match.team2_joueurs)
    }));

    console.log(`✅ [${timestamp}] ${matchesWithParsedData.length} matchs récupérés pour ${day}`);
    res.json(matchesWithParsedData);
  } catch (error) {
    console.error('❌ Erreur récupération matchs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// Route pour réinitialiser un match (admin seulement)
app.post('/api/matches/:id/reset', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    const resetMatch = db.prepare(`
      UPDATE matches 
      SET team1_goals = 0, team1_gamelles = 0, team2_goals = 0, team2_gamelles = 0, 
          finished = FALSE, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    resetMatch.run(id);
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
    
    const db = await getDatabase();
    
    // Réinitialiser tous les matchs
    const resetAllMatches = db.prepare(`
      UPDATE matches 
      SET team1_goals = 0, team1_gamelles = 0, team2_goals = 0, team2_gamelles = 0, 
          finished = FALSE, last_updated = CURRENT_TIMESTAMP
    `);
    
    const matchesReset = resetAllMatches.run();
    
    // Réinitialiser toutes les statistiques des équipes
    const resetAllTeams = db.prepare(`
      UPDATE teams 
      SET points = 0, buts = 0, gamelles = 0, updated_at = CURRENT_TIMESTAMP
    `);
    
    const teamsReset = resetAllTeams.run();
    
    console.log(`✅ [${timestamp}] Remise à zéro effectuée: ${matchesReset.changes} matchs, ${teamsReset.changes} équipes`);
    
    res.json({ 
      success: true, 
      message: 'Tous les scores et le classement ont été réinitialisés',
      details: {
        matchesReset: matchesReset.changes,
        teamsReset: teamsReset.changes
      }
    });
  } catch (error) {
    console.error('❌ Erreur réinitialisation complète:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la réinitialisation' });
  }
});

// Fonction pour mettre à jour les statistiques des équipes (recalcule depuis zéro)
async function updateTeamStats(db, match) {
  // Recalculer les statistiques pour les deux équipes de ce match
  await recalculateTeamStatsForTeam(db, match.equipe1_id);
  await recalculateTeamStatsForTeam(db, match.equipe2_id);
}

// Fonction pour recalculer les statistiques d'un match spécifique
async function recalculateMatchStats(db, matchId) {
  // Récupérer le match
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return;

  // Recalculer les statistiques pour les deux équipes de ce match
  await recalculateTeamStatsForTeam(db, match.equipe1_id);
  await recalculateTeamStatsForTeam(db, match.equipe2_id);
}

// Fonction pour recalculer les statistiques d'une équipe spécifique
async function recalculateTeamStatsForTeam(db, teamId) {
  // Récupérer tous les matchs de cette équipe
  const matches = db.prepare(`
    SELECT * FROM matches 
    WHERE equipe1_id = ? OR equipe2_id = ?
  `).all(teamId, teamId);

  // Initialiser les statistiques
  let totalGoals = 0;
  let totalGamelles = 0;
  let totalPoints = 0;

  // Calculer les statistiques pour chaque match
  for (const match of matches) {
    if (match.equipe1_id === teamId) {
      // L'équipe est l'équipe 1
      totalGoals += match.team1_goals || 0;
      totalGamelles += match.team1_gamelles || 0;
      
      const team1Final = Math.max(0, (match.team1_goals || 0) - (match.team2_gamelles || 0));
      const team2Final = Math.max(0, (match.team2_goals || 0) - (match.team1_gamelles || 0));
      
      if (team1Final > team2Final) {
        totalPoints += 3; // Victoire
      } else if (team1Final === team2Final) {
        totalPoints += 1; // Match nul
      }
    } else {
      // L'équipe est l'équipe 2
      totalGoals += match.team2_goals || 0;
      totalGamelles += match.team2_gamelles || 0;
      
      const team1Final = Math.max(0, (match.team1_goals || 0) - (match.team2_gamelles || 0));
      const team2Final = Math.max(0, (match.team2_goals || 0) - (match.team1_gamelles || 0));
      
      if (team2Final > team1Final) {
        totalPoints += 3; // Victoire
      } else if (team1Final === team2Final) {
        totalPoints += 1; // Match nul
      }
    }
  }

  // Mettre à jour les statistiques de l'équipe
  const updateTeam = db.prepare(`
    UPDATE teams 
    SET points = ?, buts = ?, gamelles = ?
    WHERE id = ?
  `);
  
  updateTeam.run(totalPoints, totalGoals, totalGamelles, teamId);
}

// Fonction pour recalculer toutes les statistiques des équipes
async function recalculateTeamStats(db) {
  // Réinitialiser les statistiques
  db.exec('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
  
  // Récupérer TOUS les matchs (pas seulement ceux avec des scores > 0)
  const matches = db.prepare('SELECT * FROM matches').all();
  
  // Recalculer pour chaque match
  for (const match of matches) {
    await updateTeamStats(db, match);
  }
}

// Route pour mettre à jour un match (authentification requise pour l'admin)
app.put('/api/matches/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished } = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`🔄 [${timestamp}] Mise à jour match ${id} dans SQLite:`, {
      team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished
    });
    
    const db = await getDatabase();
    
    // Mettre à jour le match avec le champ finished
    const updateMatch = db.prepare(`
      UPDATE matches 
      SET team1_goals = ?, team2_goals = ?, team1_gamelles = ?, team2_gamelles = ?, 
          finished = ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateMatch.run(team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished || false, id);
    
    // Recalculer les statistiques pour ce match spécifique
    await recalculateMatchStats(db, id);
    
    console.log(`✅ [${timestamp}] Match ${id} mis à jour avec succès dans SQLite (finished: ${finished || false})`);
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
    console.log(`🏆 [${timestamp}] Récupération du classement depuis SQLite`);
    
    const db = await getDatabase();
    const teams = db.prepare(`
      SELECT *, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `).all();

    const teamsWithParsedPlayers = teams.map(team => ({
      ...team,
      joueurs: JSON.parse(team.joueurs)
    }));

    console.log(`✅ [${timestamp}] Classement récupéré: ${teamsWithParsedPlayers.length} équipes`);
    res.json(teamsWithParsedPlayers);
  } catch (error) {
    console.error('❌ Erreur récupération classement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur tournoi MyOrigines actif' });
});

// Route de diagnostic SQLite
app.get('/api/sqlite-status', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] Diagnostic SQLite demandé`);
    
    const db = await getDatabase();
    
    // Vérifier les tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    // Compter les enregistrements
    const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get();
    const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    
    // Vérifier les matchs avec des scores
    const matchesWithScores = db.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE team1_goals > 0 OR team2_goals > 0 OR team1_gamelles > 0 OR team2_gamelles > 0
    `).get();
    
    const status = {
      timestamp,
      database: 'SQLite',
      tables: tables.map(t => t.name),
      counts: {
        teams: teamCount.count,
        matches: matchCount.count,
        admins: adminCount.count,
        matchesWithScores: matchesWithScores.count
      },
      status: 'OK'
    };
    
    console.log(`✅ [${timestamp}] Diagnostic SQLite:`, status);
    res.json(status);
  } catch (error) {
    console.error('❌ Erreur diagnostic SQLite:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Erreur lors du diagnostic SQLite',
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
});
