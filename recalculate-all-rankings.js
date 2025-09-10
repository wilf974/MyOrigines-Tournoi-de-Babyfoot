#!/usr/bin/env node

/**
 * Script pour recalculer tous les classements avec la logique des gamelles adverses
 * Utilise PostgreSQL et respecte la logique : Points = Victoire (3pts) / Match nul (1pt)
 * Score final = Buts marqués - Gamelles adverses
 */

import pkg from 'pg';
const { Pool } = pkg;

// Configuration de la base de données PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tournoi_baby',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
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

/**
 * Recalcule les statistiques d'une équipe spécifique
 * @param {number} teamId - ID de l'équipe
 */
async function recalculateTeamStatsForTeam(teamId) {
  console.log(`\n🔄 Recalcul des stats pour l'équipe ${teamId}...`);
  
  // Récupérer tous les matchs de cette équipe
  const result = await query(`
    SELECT * FROM matches 
    WHERE equipe1_id = $1 OR equipe2_id = $1
  `, [teamId]);

  const matches = result.rows;
  console.log(`   📊 ${matches.length} matchs trouvés`);

  // Initialiser les statistiques
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
        
        console.log(`   Match ${match.id}: ${teamGoals}-${opponentGoals} (final: ${team1Final}-${team2Final})`);
        
        // Points selon victoire/défaite/match nul
        if (team1Final > team2Final) {
          totalPoints += 3; // Victoire
          console.log(`     ✅ Victoire: +3 points`);
        } else if (team1Final === team2Final) {
          totalPoints += 1; // Match nul
          console.log(`     ⚖️ Match nul: +1 point`);
        } else {
          console.log(`     ❌ Défaite: 0 point`);
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
        
        console.log(`   Match ${match.id}: ${teamGoals}-${opponentGoals} (final: ${team2Final}-${team1Final})`);
        
        // Points selon victoire/défaite/match nul
        if (team2Final > team1Final) {
          totalPoints += 3; // Victoire
          console.log(`     ✅ Victoire: +3 points`);
        } else if (team1Final === team2Final) {
          totalPoints += 1; // Match nul
          console.log(`     ⚖️ Match nul: +1 point`);
        } else {
          console.log(`     ❌ Défaite: 0 point`);
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

  console.log(`   📈 Stats finales: ${totalPoints} pts, ${totalGoals} buts, ${totalGamelles} gamelles`);
}

/**
 * Fonction principale pour recalculer tous les classements
 */
async function recalculateAllRankings() {
  try {
    console.log('🚀 Début du recalcul des classements avec logique des gamelles adverses');
    console.log('📋 Règles appliquées:');
    console.log('   - Score final = Buts marqués - Gamelles adverses');
    console.log('   - Points: Victoire = 3pts, Match nul = 1pt, Défaite = 0pt');
    console.log('   - Minimum 0 point (pas de points négatifs)');
    
    // 1. Récupérer toutes les équipes
    const teamsResult = await query('SELECT id, nom FROM teams ORDER BY id');
    const teams = teamsResult.rows;
    console.log(`\n📊 ${teams.length} équipes trouvées`);

    // 2. Réinitialiser toutes les statistiques
    console.log('\n🔄 Réinitialisation des statistiques...');
    await query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');

    // 3. Recalculer pour chaque équipe
    for (const team of teams) {
      await recalculateTeamStatsForTeam(team.id);
    }

    // 4. Afficher le classement final
    console.log('\n🏆 Classement final:');
    const finalResult = await query(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    finalResult.rows.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles (diff: ${team.difference})`);
    });

    console.log('\n✅ Recalcul terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du recalcul:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
recalculateAllRankings();

export { recalculateAllRankings, recalculateTeamStatsForTeam };
