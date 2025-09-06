import { getDatabase } from './api/db.js';

/**
 * Script de débogage des matchs
 * Affiche tous les matchs avec leurs scores pour comprendre le problème
 */
async function debugMatches() {
  try {
    console.log('🔍 Débogage des matchs...');
    
    const db = await getDatabase();
    
    // Récupérer tous les matchs
    const matches = db.prepare(`
      SELECT m.*, 
             t1.nom as team1_nom, t2.nom as team2_nom
      FROM matches m
      JOIN teams t1 ON m.equipe1_id = t1.id
      JOIN teams t2 ON m.equipe2_id = t2.id
      ORDER BY m.jour, m.heure
    `).all();
    
    console.log(`📋 ${matches.length} matchs trouvés\n`);
    
    matches.forEach(match => {
      const team1Final = Math.max(0, (match.team1_goals || 0) - (match.team2_gamelles || 0));
      const team2Final = Math.max(0, (match.team2_goals || 0) - (match.team1_gamelles || 0));
      
      console.log(`🏟️  ${match.jour} ${match.heure} - ${match.team1_nom} vs ${match.team2_nom}`);
      console.log(`   Score brut: ${match.team1_goals || 0} - ${match.team2_goals || 0}`);
      console.log(`   Gamelles: ${match.team1_gamelles || 0} - ${match.team2_gamelles || 0}`);
      console.log(`   Score final: ${team1Final} - ${team2Final}`);
      
      if (team1Final > team2Final) {
        console.log(`   🏆 ${match.team1_nom} gagne (+3 pts)`);
      } else if (team2Final > team1Final) {
        console.log(`   🏆 ${match.team2_nom} gagne (+3 pts)`);
      } else if (team1Final === team2Final && team1Final > 0) {
        console.log(`   🤝 Match nul (+1 pt chacun)`);
      } else {
        console.log(`   ⏳ Match non joué`);
      }
      console.log('');
    });
    
    // Afficher le classement actuel
    console.log('🏆 Classement actuel:');
    const teams = db.prepare(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY points DESC, difference DESC, buts DESC
    `).all();
    
    teams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}, Diff: ${team.difference}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du débogage:', error);
  }
}

// Exécuter le débogage
debugMatches();
