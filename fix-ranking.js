import { getDatabase } from './api/db.js';

/**
 * Script de correction du classement
 * Réinitialise et recalcule correctement tous les points des équipes
 */
async function fixRanking() {
  try {
    console.log('🔧 Correction du classement en cours...');
    
    const db = await getDatabase();
    
    // 1. Réinitialiser toutes les statistiques
    console.log('📊 Réinitialisation des statistiques...');
    db.exec('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
    
    // 2. Récupérer tous les matchs avec des scores
    const matchesWithScores = db.prepare(`
      SELECT * FROM matches 
      WHERE team1_goals > 0 OR team2_goals > 0 OR team1_gamelles > 0 OR team2_gamelles > 0
    `).all();
    
    console.log(`📋 ${matchesWithScores.length} matchs avec des scores trouvés`);
    
    // 3. Recalculer les statistiques pour chaque équipe
    const teams = db.prepare('SELECT id FROM teams').all();
    
    for (const team of teams) {
      console.log(`\n🔄 Recalcul pour l'équipe ${team.id}...`);
      
      // Récupérer tous les matchs de cette équipe
      const teamMatches = db.prepare(`
        SELECT * FROM matches 
        WHERE equipe1_id = ? OR equipe2_id = ?
      `).all(team.id, team.id);
      
      let totalGoals = 0;
      let totalGamelles = 0;
      let totalPoints = 0;
      
      // Calculer les statistiques pour chaque match
      for (const match of teamMatches) {
        if (match.equipe1_id === team.id) {
          // L'équipe est l'équipe 1
          totalGoals += match.team1_goals || 0;
          totalGamelles += match.team1_gamelles || 0;
          
          const team1Final = Math.max(0, (match.team1_goals || 0) - (match.team2_gamelles || 0));
          const team2Final = Math.max(0, (match.team2_goals || 0) - (match.team1_gamelles || 0));
          
          if (team1Final > team2Final) {
            totalPoints += 3; // Victoire
          } else if (team1Final === team2Final && team1Final > 0) {
            totalPoints += 1; // Match nul (seulement si des scores existent)
          }
        } else {
          // L'équipe est l'équipe 2
          totalGoals += match.team2_goals || 0;
          totalGamelles += match.team2_gamelles || 0;
          
          const team1Final = Math.max(0, (match.team1_goals || 0) - (match.team2_gamelles || 0));
          const team2Final = Math.max(0, (match.team2_goals || 0) - (match.team1_gamelles || 0));
          
          if (team2Final > team1Final) {
            totalPoints += 3; // Victoire
          } else if (team1Final === team2Final && team1Final > 0) {
            totalPoints += 1; // Match nul (seulement si des scores existent)
          }
        }
      }
      
      // Mettre à jour les statistiques de l'équipe
      const updateTeam = db.prepare(`
        UPDATE teams 
        SET points = ?, buts = ?, gamelles = ?
        WHERE id = ?
      `);
      
      updateTeam.run(totalPoints, totalGoals, totalGamelles, team.id);
      
      console.log(`   ✅ ${team.id}: ${totalPoints} pts, ${totalGoals} buts, ${totalGamelles} gamelles`);
    }
    
    // 4. Afficher le classement final
    console.log('\n🏆 Classement final corrigé:');
    const finalTeams = db.prepare(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `).all();
    
    finalTeams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}, Diff: ${team.difference}`);
    });
    
    console.log('\n✅ Correction du classement terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter la correction
fixRanking();
