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

async function checkMatch() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM matches WHERE id = $1', ['test_negative_scores']);
    if (result.rows.length > 0) {
      const match = result.rows[0];
      console.log('Match trouvé:');
      console.log('  Équipe A:', match.team1_goals, 'buts,', match.team1_gamelles, 'gamelles');
      console.log('  Équipe C:', match.team2_goals, 'buts,', match.team2_gamelles, 'gamelles');
      console.log('  Terminé:', match.finished);
      
      // Calculer les scores finaux
      const team1Final = match.team1_goals - match.team2_gamelles;
      const team2Final = match.team2_goals - match.team1_gamelles;
      
      console.log('  Score final Équipe A:', team1Final);
      console.log('  Score final Équipe C:', team2Final);
    } else {
      console.log('Match non trouvé');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

checkMatch();
