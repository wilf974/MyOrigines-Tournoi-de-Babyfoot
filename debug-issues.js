/**
 * Script de diagnostic et correction des problèmes
 * - Vérification des matchs et de leur statut
 * - Nettoyage des tokens d'authentification
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
 * Vérifie l'état des matchs dans la base de données
 */
async function checkMatchesStatus() {
  console.log('🔍 Diagnostic des matchs...\n');
  
  try {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    
    for (const day of days) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_matches,
          COUNT(CASE WHEN finished = true THEN 1 END) as finished_matches,
          COUNT(CASE WHEN finished = false THEN 1 END) as ongoing_matches
        FROM matches 
        WHERE jour = $1
      `, [day]);
      
      const stats = result.rows[0];
      console.log(`📅 ${day.charAt(0).toUpperCase() + day.slice(1)}:`);
      console.log(`   Total: ${stats.total_matches} matchs`);
      console.log(`   Terminés: ${stats.finished_matches} matchs`);
      console.log(`   En cours: ${stats.ongoing_matches} matchs`);
      console.log('');
    }
    
    // Afficher les détails des matchs du jeudi
    console.log('📋 Détails des matchs du jeudi:');
    const jeudiMatches = await pool.query(`
      SELECT id, heure, equipe1_id, equipe2_id, team1_goals, team2_goals, finished
      FROM matches 
      WHERE jour = 'jeudi' 
      ORDER BY heure
    `);
    
    jeudiMatches.rows.forEach(match => {
      console.log(`   ${match.heure} - ${match.equipe1_id} vs ${match.equipe2_id} - ${match.finished ? '✅ Terminé' : '⏳ En cours'} (${match.team1_goals}-${match.team2_goals})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  }
}

/**
 * Remet tous les matchs en statut "en cours" (finished = false)
 */
async function resetMatchesToOngoing() {
  console.log('\n🔄 Remise des matchs en statut "en cours"...\n');
  
  try {
    const result = await pool.query(`
      UPDATE matches 
      SET finished = false 
      WHERE finished = true
    `);
    
    console.log(`✅ ${result.rowCount} matchs remis en statut "en cours"`);
    
    // Vérifier le résultat
    await checkMatchesStatus();
    
  } catch (error) {
    console.error('❌ Erreur lors de la remise à zéro:', error.message);
  }
}

/**
 * Affiche les instructions pour nettoyer l'authentification
 */
function showAuthInstructions() {
  console.log('\n🔐 Instructions pour résoudre le problème d\'authentification:');
  console.log('');
  console.log('1. Ouvrez les outils de développement du navigateur (F12)');
  console.log('2. Allez dans l\'onglet "Application" ou "Stockage"');
  console.log('3. Dans la section "Local Storage", trouvez "http://localhost:2000"');
  console.log('4. Supprimez les clés suivantes:');
  console.log('   - tournoi_token');
  console.log('   - tournoi_user');
  console.log('5. Rafraîchissez la page (F5)');
  console.log('6. L\'application devrait maintenant demander le mot de passe');
  console.log('');
  console.log('Alternative: Ouvrez la console et exécutez:');
  console.log('localStorage.removeItem("tournoi_token");');
  console.log('localStorage.removeItem("tournoi_user");');
  console.log('location.reload();');
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Diagnostic des problèmes du Tournoi Baby\n');
  console.log('=' .repeat(50));
  
  await checkMatchesStatus();
  
  console.log('=' .repeat(50));
  showAuthInstructions();
  
  console.log('=' .repeat(50));
  console.log('💡 Solutions proposées:');
  console.log('');
  console.log('1. Pour voir les matchs en cours:');
  console.log('   - Exécutez: node debug-issues.js --reset-matches');
  console.log('');
  console.log('2. Pour l\'authentification:');
  console.log('   - Suivez les instructions ci-dessus');
  console.log('');
  
  // Vérifier les arguments de ligne de commande
  if (process.argv.includes('--reset-matches')) {
    await resetMatchesToOngoing();
  }
  
  await pool.end();
}

// Exécuter le script
main().catch(console.error);
