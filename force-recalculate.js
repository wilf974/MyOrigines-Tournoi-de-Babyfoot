import { getDatabase } from './api/db.js';

/**
 * Script pour forcer le recalcul du classement via l'API
 * Simule une mise à jour de match pour déclencher le recalcul
 */
async function forceRecalculate() {
  try {
    console.log('🔄 Forçage du recalcul du classement...');
    
    const db = await getDatabase();
    
    // 1. Trouver un match avec des scores
    const matchWithScores = db.prepare(`
      SELECT * FROM matches 
      WHERE team1_goals > 0 OR team2_goals > 0 OR team1_gamelles > 0 OR team2_gamelles > 0
      LIMIT 1
    `).get();
    
    if (!matchWithScores) {
      console.log('❌ Aucun match avec des scores trouvé');
      return;
    }
    
    console.log(`📋 Match trouvé: ${matchWithScores.id}`);
    console.log(`   Score: ${matchWithScores.team1_goals}-${matchWithScores.team2_goals}`);
    console.log(`   Gamelles: ${matchWithScores.team1_gamelles}-${matchWithScores.team2_gamelles}`);
    
    // 2. Forcer le recalcul en mettant à jour le match avec les mêmes valeurs
    const updateMatch = db.prepare(`
      UPDATE matches 
      SET team1_goals = ?, team2_goals = ?, team1_gamelles = ?, team2_gamelles = ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateMatch.run(
      matchWithScores.team1_goals, 
      matchWithScores.team2_goals, 
      matchWithScores.team1_gamelles, 
      matchWithScores.team2_gamelles, 
      matchWithScores.id
    );
    
    console.log('✅ Match mis à jour, recalcul déclenché');
    
    // 3. Vérifier le classement final
    console.log('\n🏆 Classement après recalcul:');
    const teams = db.prepare(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `).all();
    
    teams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}, Diff: ${team.difference}`);
    });
    
    console.log('\n✅ Recalcul forcé terminé!');
    
  } catch (error) {
    console.error('❌ Erreur lors du recalcul forcé:', error);
  }
}

// Exécuter le recalcul forcé
forceRecalculate();
