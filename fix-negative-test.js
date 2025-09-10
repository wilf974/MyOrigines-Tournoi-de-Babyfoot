#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'myorigines',
  host: 'database',
  database: 'tournoi_babyfoot',
  password: 'tournoi2024',
  port: 5432,
});

async function fixNegativeTest() {
  const client = await pool.connect();
  try {
    console.log('🔧 Correction du test des scores négatifs');
    
    // Créer un match où l'Équipe C aura des gamelles adverses
    // Match: Équipe C (0 buts, 0 gamelles) vs Équipe D (0 buts, 2 gamelles)
    await client.query(`
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
      'test_negative_c',
      'lundi',
      '14:00',
      'C', // Équipe C
      'D', // Équipe D
      0,   // Équipe C: 0 buts
      0,   // Équipe D: 0 buts
      0,   // Équipe C: 0 gamelles
      2,   // Équipe D: 2 gamelles
      true // finished
    ]);
    
    console.log('✅ Match créé: Équipe C (0 buts, 0 gamelles) vs Équipe D (0 buts, 2 gamelles)');
    
    // Recalculer les statistiques
    await client.query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
    
    const teamsResult = await client.query('SELECT id, nom FROM teams');
    const teams = teamsResult.rows;
    
    for (const team of teams) {
      await recalculateTeamStats(client, team.id);
    }
    
    console.log('✅ Statistiques recalculées');
    
    // Vérifier le classement
    const rankingsResult = await client.query(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    console.log('\n📊 Nouveau classement:');
    rankingsResult.rows.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles (diff: ${team.difference})`);
    });
    
    // Vérifier l'Équipe C
    const teamCResult = await client.query('SELECT * FROM teams WHERE id = $1', ['C']);
    if (teamCResult.rows.length > 0) {
      const teamC = teamCResult.rows[0];
      console.log(`\n📊 Équipe C: ${teamC.points} pts, ${teamC.buts} buts, ${teamC.gamelles} gamelles`);
      
      if (teamC.points === -2) {
        console.log('✅ Équipe C a maintenant -2 points (correct!)');
      } else {
        console.log(`❌ Équipe C a ${teamC.points} points (devrait être -2)`);
      }
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function recalculateTeamStats(client, teamId) {
  const result = await client.query(`
    SELECT * FROM matches 
    WHERE equipe1_id = $1 OR equipe2_id = $1
  `, [teamId]);

  const matches = result.rows;
  let totalGoals = 0;
  let totalOpponentGamelles = 0;
  let totalPoints = 0;

  for (const match of matches) {
    if (match.finished) {
      if (match.equipe1_id === teamId) {
        const teamGoals = match.team1_goals || 0;
        const opponentGamelles = match.team2_gamelles || 0;
        const opponentGoals = match.team2_goals || 0;
        const teamGamelles = match.team1_gamelles || 0;
        
        totalGoals += teamGoals;
        totalOpponentGamelles += opponentGamelles;
        
        const team1Final = teamGoals - opponentGamelles;
        const team2Final = opponentGoals - teamGamelles;
        
        totalPoints += team1Final;
      } else {
        const teamGoals = match.team2_goals || 0;
        const opponentGamelles = match.team1_gamelles || 0;
        const opponentGoals = match.team1_goals || 0;
        const teamGamelles = match.team2_gamelles || 0;
        
        totalGoals += teamGoals;
        totalOpponentGamelles += opponentGamelles;
        
        const team1Final = opponentGoals - teamGamelles;
        const team2Final = teamGoals - opponentGamelles;
        
        totalPoints += team2Final;
      }
    }
  }

  await client.query(`
    UPDATE teams 
    SET points = $1, buts = $2, gamelles = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [totalPoints, totalGoals, totalOpponentGamelles, teamId]);
}

fixNegativeTest();
