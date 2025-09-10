#!/usr/bin/env node

/**
 * Script pour tester la correction du calcul des points
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'myorigines',
  host: 'database',
  database: 'tournoi_babyfoot',
  password: 'tournoi2024',
  port: 5432,
});

async function testPointsFix() {
  try {
    console.log('🧪 Test de la correction du calcul des points');
    console.log('=' .repeat(50));
    
    const client = await pool.connect();
    
    // 1. Recalculer les statistiques avec la nouvelle logique
    console.log('\n1. Recalcul des statistiques avec la nouvelle logique...');
    
    // Réinitialiser toutes les statistiques
    await client.query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
    
    // Récupérer toutes les équipes
    const teamsResult = await client.query('SELECT id, nom FROM teams');
    const teams = teamsResult.rows;
    
    // Recalculer pour chaque équipe
    for (const team of teams) {
      await recalculateTeamStats(client, team.id);
    }
    
    // 2. Vérifier le nouveau classement
    console.log('\n2. Nouveau classement:');
    const rankingsResult = await client.query(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    rankingsResult.rows.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles (diff: ${team.difference})`);
    });
    
    // 3. Vérifier spécifiquement les équipes A et B
    console.log('\n3. Vérification des équipes A et B:');
    const teamAResult = await client.query('SELECT * FROM teams WHERE id = $1', ['A']);
    const teamBResult = await client.query('SELECT * FROM teams WHERE id = $1', ['B']);
    
    if (teamAResult.rows.length > 0) {
      const teamA = teamAResult.rows[0];
      console.log(`   Équipe A: ${teamA.points} pts, ${teamA.buts} buts, ${teamA.gamelles} gamelles`);
      
      if (teamA.points === 5) {
        console.log('   ✅ Équipe A a maintenant 5 points (correct!)');
      } else {
        console.log(`   ❌ Équipe A a ${teamA.points} points (devrait être 5)`);
      }
    }
    
    if (teamBResult.rows.length > 0) {
      const teamB = teamBResult.rows[0];
      console.log(`   Équipe B: ${teamB.points} pts, ${teamB.buts} buts, ${teamB.gamelles} gamelles`);
      
      if (teamB.points === 2) {
        console.log('   ✅ Équipe B a maintenant 2 points (correct!)');
      } else {
        console.log(`   ❌ Équipe B a ${teamB.points} points (devrait être 2)`);
      }
    }
    
    console.log('\n📋 Nouvelle logique des points:');
    console.log('   - Points = Score final (Buts marqués - Gamelles adverses)');
    console.log('   - Plus de système victoire/défaite/match nul');
    console.log('   - Chaque point de score final = 1 point au classement');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await pool.end();
  }
}

async function recalculateTeamStats(client, teamId) {
  // Récupérer tous les matchs de cette équipe
  const result = await client.query(`
    SELECT * FROM matches 
    WHERE equipe1_id = $1 OR equipe2_id = $1
  `, [teamId]);

  const matches = result.rows;
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
        
        // Calculer les scores finaux avec gamelles adverses
        const team1Final = Math.max(0, teamGoals - opponentGamelles);
        const team2Final = Math.max(0, opponentGoals - teamGamelles);
        
        // Points basés sur le score final (pas sur victoire/défaite)
        totalPoints += team1Final;
      } else {
        // L'équipe est l'équipe 2
        const teamGoals = match.team2_goals || 0;
        const opponentGamelles = match.team1_gamelles || 0;
        const opponentGoals = match.team1_goals || 0;
        const teamGamelles = match.team2_gamelles || 0;
        
        totalGoals += teamGoals;
        totalOpponentGamelles += opponentGamelles;
        
        // Calculer les scores finaux avec gamelles adverses
        const team1Final = Math.max(0, opponentGoals - teamGamelles);
        const team2Final = Math.max(0, teamGoals - opponentGamelles);
        
        // Points basés sur le score final (pas sur victoire/défaite)
        totalPoints += team2Final;
      }
    }
  }

  // Mettre à jour les statistiques de l'équipe
  await client.query(`
    UPDATE teams 
    SET points = $1, buts = $2, gamelles = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [totalPoints, totalGoals, totalOpponentGamelles, teamId]);
}

// Exécuter le test
testPointsFix();
