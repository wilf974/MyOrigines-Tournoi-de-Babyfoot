#!/usr/bin/env node

/**
 * Script de diagnostic et correction du problème de classement
 * Vérifie la base de données et corrige les problèmes
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'database',
  database: 'tournoi_baby',
  password: 'password',
  port: 5432,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function diagnoseAndFix() {
  try {
    console.log('🔍 Diagnostic du problème de classement...');
    
    // 1. Vérifier la connexion à la base de données
    console.log('\n1. Test de connexion à la base de données...');
    const testResult = await query('SELECT NOW()');
    console.log('✅ Connexion OK:', testResult.rows[0].now);
    
    // 2. Vérifier les équipes
    console.log('\n2. Vérification des équipes...');
    const teamsResult = await query('SELECT id, nom, points, buts, gamelles FROM teams ORDER BY id');
    console.log(`📊 ${teamsResult.rows.length} équipes trouvées:`);
    teamsResult.rows.forEach(team => {
      console.log(`   ${team.id}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles`);
    });
    
    // 3. Vérifier les matchs
    console.log('\n3. Vérification des matchs...');
    const matchesResult = await query('SELECT id, team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished FROM matches ORDER BY created_at DESC LIMIT 10');
    console.log(`📊 ${matchesResult.rows.length} matchs récents:`);
    matchesResult.rows.forEach(match => {
      console.log(`   Match ${match.id}: ${match.team1_goals}-${match.team2_goals} (gamelles: ${match.team1_gamelles}-${match.team2_gamelles}) - Terminé: ${match.finished}`);
    });
    
    // 4. Recalculer les statistiques
    console.log('\n4. Recalcul des statistiques...');
    await recalculateAllStats();
    
    // 5. Vérifier le résultat
    console.log('\n5. Vérification du classement final...');
    const finalResult = await query('SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference FROM teams ORDER BY points DESC, difference DESC, buts DESC');
    console.log('🏆 Classement final:');
    finalResult.rows.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles (diff: ${team.difference})`);
    });
    
    console.log('\n✅ Diagnostic et correction terminés!');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  } finally {
    await pool.end();
  }
}

async function recalculateAllStats() {
  // Réinitialiser toutes les statistiques
  await query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
  
  // Récupérer toutes les équipes
  const teamsResult = await query('SELECT id FROM teams');
  const teams = teamsResult.rows;
  
  // Recalculer pour chaque équipe
  for (const team of teams) {
    await recalculateTeamStats(team.id);
  }
}

async function recalculateTeamStats(teamId) {
  // Récupérer tous les matchs de cette équipe
  const result = await query(`
    SELECT * FROM matches 
    WHERE equipe1_id = $1 OR equipe2_id = $1
  `, [teamId]);

  const matches = result.rows;
  let totalGoals = 0;
  let totalGamelles = 0;
  let totalPoints = 0;

  // Calculer les statistiques pour chaque match
  for (const match of matches) {
    if (match.finished) {
      if (match.equipe1_id === teamId) {
        // L'équipe est l'équipe 1
        const teamGoals = match.team1_goals || 0;
        const teamGamelles = match.team1_gamelles || 0;
        const opponentGoals = match.team2_goals || 0;
        const opponentGamelles = match.team2_gamelles || 0;
        
        totalGoals += teamGoals;
        totalGamelles += teamGamelles;
        
        // Calculer les scores finaux avec gamelles adverses
        const team1Final = Math.max(0, teamGoals - opponentGamelles);
        const team2Final = Math.max(0, opponentGoals - teamGamelles);
        
        // Points selon victoire/défaite/match nul
        if (team1Final > team2Final) {
          totalPoints += 3; // Victoire
        } else if (team1Final === team2Final) {
          totalPoints += 1; // Match nul
        }
      } else {
        // L'équipe est l'équipe 2
        const teamGoals = match.team2_goals || 0;
        const teamGamelles = match.team2_gamelles || 0;
        const opponentGoals = match.team1_goals || 0;
        const opponentGamelles = match.team1_gamelles || 0;
        
        totalGoals += teamGoals;
        totalGamelles += teamGamelles;
        
        // Calculer les scores finaux avec gamelles adverses
        const team1Final = Math.max(0, opponentGoals - teamGamelles);
        const team2Final = Math.max(0, teamGoals - opponentGamelles);
        
        // Points selon victoire/défaite/match nul
        if (team2Final > team1Final) {
          totalPoints += 3; // Victoire
        } else if (team1Final === team2Final) {
          totalPoints += 1; // Match nul
        }
      }
    }
  }

  // Mettre à jour les statistiques de l'équipe
  await query(`
    UPDATE teams 
    SET points = $1, buts = $2, gamelles = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [totalPoints, totalGoals, totalGamelles, teamId]);
}

// Exécuter le diagnostic
diagnoseAndFix();
