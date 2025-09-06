import { getDatabase } from './api/db.js';

/**
 * Script pour vérifier l'état de la base de données
 */
async function checkDatabase() {
  try {
    console.log('🔍 Vérification de la base de données...');
    
    const db = await getDatabase();
    
    // Vérifier les équipes
    const teams = db.prepare('SELECT * FROM teams ORDER BY id').all();
    console.log(`\n📊 Équipes (${teams.length}):`);
    teams.forEach(team => {
      console.log(`   ${team.id}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}`);
    });
    
    // Vérifier les matchs
    const matches = db.prepare('SELECT * FROM matches ORDER BY jour, heure').all();
    console.log(`\n🏟️  Matchs (${matches.length}):`);
    matches.forEach(match => {
      console.log(`   ${match.id}: ${match.team1_goals || 0}-${match.team2_goals || 0} (${match.jour} ${match.heure})`);
    });
    
    // Vérifier les admins
    const admins = db.prepare('SELECT * FROM admins').all();
    console.log(`\n👤 Admins (${admins.length}):`);
    admins.forEach(admin => {
      console.log(`   ${admin.username} (ID: ${admin.id})`);
    });
    
    console.log('\n✅ Vérification terminée');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter la vérification
checkDatabase();
