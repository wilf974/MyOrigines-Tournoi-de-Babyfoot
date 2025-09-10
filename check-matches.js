import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'database',
  database: 'tournoi_baby',
  password: 'password',
  port: 5432,
});

async function checkMatches() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM matches WHERE finished = true ORDER BY created_at DESC');
    console.log('Matchs terminés:');
    result.rows.forEach(match => {
      console.log(`Match ${match.id}: ${match.team1_goals}-${match.team2_goals} (gamelles: ${match.team1_gamelles}-${match.team2_gamelles})`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkMatches();
