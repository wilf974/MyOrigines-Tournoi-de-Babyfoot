#!/usr/bin/env node

/**
 * Script de test pour la nouvelle logique des gamelles adverses
 * Teste le calcul correct des statistiques
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

async function testNewLogic() {
  try {
    console.log('🧪 Test de la nouvelle logique des gamelles adverses');
    console.log('=' .repeat(60));
    
    // 1. Afficher les matchs terminés
    console.log('\n📊 Matchs terminés:');
    const matchesResult = await query(`
      SELECT m.*, 
             t1.nom as team1_nom, t2.nom as team2_nom
      FROM matches m
      LEFT JOIN teams t1 ON m.equipe1_id = t1.id
      LEFT JOIN teams t2 ON m.equipe2_id = t2.id
      WHERE m.finished = true
      ORDER BY m.created_at DESC
    `);
    
    matchesResult.rows.forEach(match => {
      console.log(`\nMatch ${match.id}: ${match.team1_nom} vs ${match.team2_nom}`);
      console.log(`   Buts: ${match.team1_goals} - ${match.team2_goals}`);
      console.log(`   Gamelles: ${match.team1_gamelles} - ${match.team2_gamelles}`);
      
      // Calculer les scores finaux
      const team1Final = Math.max(0, (match.team1_goals || 0) - (match.team2_gamelles || 0));
      const team2Final = Math.max(0, (match.team2_goals || 0) - (match.team1_gamelles || 0));
      
      console.log(`   Score final: ${team1Final} - ${team2Final}`);
      
      if (team1Final > team2Final) {
        console.log(`   Résultat: ${match.team1_nom} gagne`);
      } else if (team2Final > team1Final) {
        console.log(`   Résultat: ${match.team2_nom} gagne`);
      } else {
        console.log(`   Résultat: Match nul`);
      }
    });
    
    // 2. Recalculer les statistiques
    console.log('\n🔄 Recalcul des statistiques...');
    await recalculateAllStats();
    
    // 3. Afficher le classement final
    console.log('\n🏆 Classement final:');
    const rankingsResult = await query(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    console.log('Rang | Équipe | Points | Buts | Gamelles Adv. | Différence');
    console.log('-'.repeat(65));
    
    rankingsResult.rows.forEach((team, index) => {
      console.log(`${String(index + 1).padStart(4)} | ${team.nom.padEnd(8)} | ${String(team.points).padStart(6)} | ${String(team.buts).padStart(4)} | ${String(team.gamelles).padStart(13)} | ${String(team.difference).padStart(10)}`);
    });
    
    // 4. Explication de la logique
    console.log('\n📋 Explication de la logique:');
    console.log('   - Buts = Buts marqués par l\'équipe');
    console.log('   - Gamelles = Gamelles adverses qui ont impacté notre score');
    console.log('   - Différence = Buts - Gamelles adverses');
    console.log('   - Points = 3 pour victoire, 1 pour match nul, 0 pour défaite');
    console.log('   - Score final = Buts marqués - Gamelles adverses');
    
    console.log('\n✅ Test terminé!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await pool.end();
  }
}

async function recalculateAllStats() {
  // Réinitialiser toutes les statistiques
  await query('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
  
  // Récupérer toutes les équipes
  const teamsResult = await query('SELECT id, nom FROM teams');
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
        
        // Points selon victoire/défaite/match nul
        if (team1Final > team2Final) {
          totalPoints += 3; // Victoire
        } else if (team1Final === team2Final) {
          totalPoints += 1; // Match nul
        }
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
  `, [totalPoints, totalGoals, totalOpponentGamelles, teamId]);
}

// Exécuter le test
testNewLogic();
