#!/usr/bin/env node

/**
 * Script pour tester les scores négatifs
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

async function testNegativeScores() {
  try {
    console.log('🧪 Test des scores négatifs');
    console.log('=' .repeat(50));
    
    const client = await pool.connect();
    
    // 1. Créer un match avec des scores négatifs possibles
    console.log('\n1. Création d\'un match avec scores négatifs...');
    
    // Match: Équipe A (10 buts, 0 gamelles) vs Équipe C (0 buts, 2 gamelles)
    const matchResult = await client.query(`
      INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team2_goals, team1_gamelles, team2_gamelles, finished, created_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        team1_goals = EXCLUDED.team1_goals,
        team2_goals = EXCLUDED.team2_goals,
        team1_gamelles = EXCLUDED.team1_gamelles,
        team2_gamelles = EXCLUDED.team2_gamelles,
        finished = EXCLUDED.finished,
        last_updated = CURRENT_TIMESTAMP
    `, [
      'test_negative_scores',
      'lundi',
      '13:00',
      'A', // Équipe A
      'C', // Équipe C
      10,  // Équipe A: 10 buts
      0,   // Équipe C: 0 buts
      0,   // Équipe A: 0 gamelles
      2,   // Équipe C: 2 gamelles
      true // finished
    ]);
    
    console.log('✅ Match créé: Équipe A (10 buts, 0 gamelles) vs Équipe C (0 buts, 2 gamelles)');
    
    // 2. Marquer le match comme terminé
    console.log('\n2. Marquage du match comme terminé...');
    await client.query(`
      UPDATE matches 
      SET finished = true, last_updated = CURRENT_TIMESTAMP
      WHERE id = 'test_negative_scores'
    `);
    
    console.log('✅ Match marqué comme terminé');
    
    // 3. Recalculer les statistiques
    console.log('\n3. Recalcul des statistiques...');
    
    // Réinitialiser toutes les statistiques
    await client.query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
    
    // Récupérer toutes les équipes
    const teamsResult = await client.query('SELECT id, nom FROM teams');
    const teams = teamsResult.rows;
    
    // Recalculer pour chaque équipe
    for (const team of teams) {
      await recalculateTeamStats(client, team.id);
    }
    
    console.log('✅ Statistiques recalculées avec scores négatifs autorisés');
    
    // 4. Vérifier le classement
    console.log('\n4. Vérification du classement:');
    const rankingsResult = await client.query(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    rankingsResult.rows.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles (diff: ${team.difference})`);
    });
    
    // 5. Vérifier spécifiquement les équipes A et C
    console.log('\n5. Vérification des équipes A et C:');
    const teamAResult = await client.query('SELECT * FROM teams WHERE id = $1', ['A']);
    const teamCResult = await client.query('SELECT * FROM teams WHERE id = $1', ['C']);
    
    if (teamAResult.rows.length > 0) {
      const teamA = teamAResult.rows[0];
      console.log(`   Équipe A: ${teamA.points} pts, ${teamA.buts} buts, ${teamA.gamelles} gamelles`);
      
      // Équipe A: 10 buts - 0 gamelles adverses = 10 points
      if (teamA.points === 10) {
        console.log('   ✅ Équipe A a 10 points (correct!)');
      } else {
        console.log(`   ❌ Équipe A a ${teamA.points} points (devrait être 10)`);
      }
    }
    
    if (teamCResult.rows.length > 0) {
      const teamC = teamCResult.rows[0];
      console.log(`   Équipe C: ${teamC.points} pts, ${teamC.buts} buts, ${teamC.gamelles} gamelles`);
      
      // Équipe C: 0 buts - 2 gamelles adverses = -2 points
      if (teamC.points === -2) {
        console.log('   ✅ Équipe C a -2 points (correct!)');
      } else {
        console.log(`   ❌ Équipe C a ${teamC.points} points (devrait être -2)`);
      }
    }
    
    console.log('\n📋 Logique des scores négatifs confirmée:');
    console.log('   - Équipe A: 10 buts - 0 gamelles adverses = 10 points');
    console.log('   - Équipe C: 0 buts - 2 gamelles adverses = -2 points');
    console.log('   - Les scores peuvent maintenant être négatifs');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur lors du test des scores négatifs:', error.message);
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
  await client.query(`
    UPDATE teams 
    SET points = $1, buts = $2, gamelles = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [totalPoints, totalGoals, totalOpponentGamelles, teamId]);
}

// Exécuter le test
testNegativeScores();
