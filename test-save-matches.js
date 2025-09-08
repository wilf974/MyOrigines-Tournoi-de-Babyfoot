/**
 * Script de test pour vérifier la sauvegarde des matchs
 * Teste l'API de suppression et de création des matchs
 */

const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
  host: 'localhost',
  port: 2003,
  database: 'tournoi',
  user: 'postgres',
  password: 'postgres'
});

/**
 * Teste la suppression des matchs d'un jour
 */
async function testDeleteDayMatches(day) {
  console.log(`🧪 Test de suppression des matchs du ${day}...`);
  
  try {
    const result = await pool.query('DELETE FROM matches WHERE jour = $1', [day]);
    console.log(`✅ ${result.rowCount} matchs du ${day} supprimés`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression des matchs du ${day}:`, error);
    return false;
  }
}

/**
 * Teste la création d'un match
 */
async function testCreateMatch(matchData) {
  console.log(`🧪 Test de création du match: ${matchData.heure} - ${matchData.equipe1_id} vs ${matchData.equipe2_id}...`);
  
  try {
    const result = await pool.query(`
      INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team1_gamelles, team2_goals, team2_gamelles, finished)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      matchData.id,
      matchData.jour,
      matchData.heure,
      matchData.equipe1_id,
      matchData.equipe2_id,
      matchData.team1_goals || 0,
      matchData.team1_gamelles || 0,
      matchData.team2_goals || 0,
      matchData.team2_gamelles || 0,
      matchData.finished || false
    ]);
    
    console.log(`✅ Match créé avec succès`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la création du match:`, error);
    return false;
  }
}

/**
 * Teste la récupération des matchs d'un jour
 */
async function testGetDayMatches(day) {
  console.log(`🧪 Test de récupération des matchs du ${day}...`);
  
  try {
    const result = await pool.query(`
      SELECT m.*, 
             t1.nom as team1_nom, t1.joueurs as team1_joueurs,
             t2.nom as team2_nom, t2.joueurs as team2_joueurs
      FROM matches m
      LEFT JOIN teams t1 ON m.equipe1_id = t1.id
      LEFT JOIN teams t2 ON m.equipe2_id = t2.id
      WHERE m.jour = $1
      ORDER BY m.heure
    `, [day]);
    
    console.log(`✅ ${result.rows.length} matchs récupérés pour le ${day}`);
    result.rows.forEach(match => {
      console.log(`   - ${match.heure}: ${match.team1_nom} vs ${match.team2_nom} (${match.finished ? 'Terminé' : 'En cours'})`);
    });
    
    return result.rows;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des matchs du ${day}:`, error);
    return [];
  }
}

/**
 * Test complet du processus de sauvegarde
 */
async function testSaveProcess() {
  console.log('🚀 Début du test complet du processus de sauvegarde\n');
  
  const testDay = 'mardi';
  const testMatches = [
    {
      id: `${testDay}_1200_test_${Date.now()}`,
      jour: testDay,
      heure: '12:00',
      equipe1_id: 'A',
      equipe2_id: 'B',
      team1_goals: 0,
      team1_gamelles: 0,
      team2_goals: 0,
      team2_gamelles: 0,
      finished: false
    },
    {
      id: `${testDay}_1300_test_${Date.now()}`,
      jour: testDay,
      heure: '13:00',
      equipe1_id: 'C',
      equipe2_id: 'D',
      team1_goals: 0,
      team1_gamelles: 0,
      team2_goals: 0,
      team2_gamelles: 0,
      finished: false
    }
  ];
  
  try {
    // 1. Supprimer les matchs existants
    console.log('1️⃣ Suppression des matchs existants...');
    await testDeleteDayMatches(testDay);
    
    // 2. Créer les nouveaux matchs
    console.log('\n2️⃣ Création des nouveaux matchs...');
    for (const match of testMatches) {
      await testCreateMatch(match);
    }
    
    // 3. Vérifier que les matchs ont été créés
    console.log('\n3️⃣ Vérification des matchs créés...');
    const createdMatches = await testGetDayMatches(testDay);
    
    if (createdMatches.length === testMatches.length) {
      console.log('\n🎉 Test réussi ! Le processus de sauvegarde fonctionne correctement.');
    } else {
      console.log('\n❌ Test échoué ! Le nombre de matchs créés ne correspond pas.');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
  } finally {
    await pool.end();
  }
}

// Exécuter le test
testSaveProcess();
