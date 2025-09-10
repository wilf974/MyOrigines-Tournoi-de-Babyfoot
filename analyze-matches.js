#!/usr/bin/env node

/**
 * Script pour analyser les matchs et comprendre le calcul des points
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

async function analyzeMatches() {
  try {
    console.log('📊 Analyse des matchs pour comprendre le calcul des points:');
    console.log('=' .repeat(60));
    
    const client = await pool.connect();
    
    // 1. Analyser les matchs terminés
    console.log('\n1. Matchs terminés:');
    const matchesResult = await client.query(`
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
    
    // 2. Analyser le classement actuel
    console.log('\n2. Classement actuel:');
    const rankingsResult = await client.query(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `);
    
    rankingsResult.rows.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles (diff: ${team.difference})`);
    });
    
    // 3. Analyser les statistiques par équipe
    console.log('\n3. Statistiques détaillées par équipe:');
    for (const team of rankingsResult.rows) {
      console.log(`\n📊 ${team.nom}:`);
      
      // Récupérer tous les matchs de cette équipe
      const teamMatchesResult = await client.query(`
        SELECT m.*, 
               t1.nom as team1_nom, t2.nom as team2_nom
        FROM matches m
        LEFT JOIN teams t1 ON m.equipe1_id = t1.id
        LEFT JOIN teams t2 ON m.equipe2_id = t2.id
        WHERE (m.equipe1_id = $1 OR m.equipe2_id = $1) AND m.finished = true
        ORDER BY m.created_at DESC
      `, [team.id]);
      
      let totalPoints = 0;
      let totalGoals = 0;
      let totalOpponentGamelles = 0;
      
      teamMatchesResult.rows.forEach(match => {
        if (match.equipe1_id === team.id) {
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
          
          console.log(`   vs ${match.team2_nom}: ${teamGoals}-${opponentGoals} (final: ${team1Final}-${team2Final})`);
          
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
          const opponentGamelles = match.team1_gamelles || 0;
          const opponentGoals = match.team1_goals || 0;
          const teamGamelles = match.team2_gamelles || 0;
          
          totalGoals += teamGoals;
          totalOpponentGamelles += opponentGamelles;
          
          // Calculer les scores finaux avec gamelles adverses
          const team1Final = Math.max(0, opponentGoals - teamGamelles);
          const team2Final = Math.max(0, teamGoals - opponentGamelles);
          
          console.log(`   vs ${match.team1_nom}: ${teamGoals}-${opponentGoals} (final: ${team2Final}-${team1Final})`);
          
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
      });
      
      console.log(`   📈 Total calculé: ${totalPoints} pts, ${totalGoals} buts, ${totalOpponentGamelles} gamelles adverses`);
      console.log(`   📊 Base de données: ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles`);
      
      if (totalPoints !== team.points) {
        console.log(`   ⚠️ DIFFÉRENCE DÉTECTÉE! Calculé: ${totalPoints}, DB: ${team.points}`);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
  } finally {
    await pool.end();
  }
}

// Exécuter l'analyse
analyzeMatches();
