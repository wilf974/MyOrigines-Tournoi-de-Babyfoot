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

// Route pour sauvegarder les matchs actuels
app.post('/api/matches/backup', authenticateToken, async (req, res) => {
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
app.post('/api/matches/restore', authenticateToken, async (req, res) => {
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
app.post('/api/matches/regenerate', authenticateToken, async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const { matchesPerTeam = 3 } = req.body; // Valeur par défaut : 3 matchs par équipe
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

    // Générer les nouveaux matchs avec l'IA Mistral
    const newMatches = generateMatches(teams, matchesPerTeam);

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
      matches: newMatches
    });
  } catch (error) {
    console.error('❌ Erreur régénération matchs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la régénération' });
  }
});


/**
 * Algorithme de génération de tournoi optimisé
 * Basé sur les spécifications du projet Baby-foot
 * Gère intelligemment le nombre de matchs selon le nombre d'équipes
 */
class TournamentGenerator {
  constructor() {
    this.teams = [];
    this.matchesPerTeam = 3;
    this.daysAvailable = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    this.times = ['12:00', '13:00', '13:30', '14:00', '14:30'];
    this.maxMatchesPerDay = 3;
  }

  // Ajouter une équipe
  addTeam(team) {
    if (!this.teams.find(t => t.id === team.id)) {
      this.teams.push(team);
      return true;
    }
    return false;
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

    // Configuration intelligente selon le nombre d'équipes
    let targetMatches;
    let daysToUse = [];
    let matchesPerDay = [];

    if (teamCount === 8) {
      // 8 équipes : 12 matchs (3 matchs par équipe)
      targetMatches = 12;
      daysToUse = ['lundi', 'mardi', 'mercredi', 'jeudi'];
      matchesPerDay = [3, 3, 3, 3];
      console.log(`📅 Configuration 8 équipes: 12 matchs sur 4 jours (3 matchs/jour)`);
    } else if (teamCount === 9) {
      // 9 équipes : 14 matchs (configuration optimale)
      targetMatches = 14;
      daysToUse = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
      matchesPerDay = [3, 3, 3, 3, 2];
      console.log(`📅 Configuration 9 équipes: 14 matchs sur 5 jours (3+3+3+3+2)`);
    } else {
      // Configuration par défaut
      targetMatches = Math.ceil((teamCount * this.matchesPerTeam) / 2);
      daysToUse = this.daysAvailable;
      matchesPerDay = new Array(daysToUse.length).fill(this.maxMatchesPerDay);
      console.log(`📅 Configuration par défaut: ${targetMatches} matchs sur ${daysToUse.length} jours`);
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
}

/**
 * Fonction principale de génération de matchs
 * Utilise la classe TournamentGenerator avancée
 */
function generateMatches(teams, matchesPerTeam = 3) {
  const generator = new TournamentGenerator();
  
  // Ajouter toutes les équipes
  teams.forEach(team => generator.addTeam(team));
  generator.setMatchesPerTeam(matchesPerTeam);
  
  // Générer le tournoi
  const result = generator.generateTournament();
  
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
