// Script pour corriger les valeurs NULL dans la base de données
import { getDatabase } from './api/db.js';

async function fixNullValues() {
  try {
    console.log('🔧 Correction des valeurs NULL dans la base de données...\n');
    
    const db = await getDatabase();
    
    // 1. Vérifier les valeurs NULL
    console.log('📊 Vérification des valeurs NULL:');
    const nullMatches = db.prepare(`
      SELECT id, team1_goals, team2_goals, team1_gamelles, team2_gamelles
      FROM matches 
      WHERE team1_goals IS NULL OR team2_goals IS NULL OR team1_gamelles IS NULL OR team2_gamelles IS NULL
    `).all();
    
    console.log(`${nullMatches.length} matchs avec des valeurs NULL trouvés:`);
    nullMatches.forEach(match => {
      console.log(`   ${match.id}: ${match.team1_goals}-${match.team2_goals} (gamelles: ${match.team1_gamelles}-${match.team2_gamelles})`);
    });
    
    // 2. Corriger les valeurs NULL
    if (nullMatches.length > 0) {
      console.log('\n🔧 Correction des valeurs NULL...');
      
      const fixNulls = db.prepare(`
        UPDATE matches 
        SET team1_goals = COALESCE(team1_goals, 0),
            team2_goals = COALESCE(team2_goals, 0),
            team1_gamelles = COALESCE(team1_gamelles, 0),
            team2_gamelles = COALESCE(team2_gamelles, 0)
        WHERE team1_goals IS NULL OR team2_goals IS NULL OR team1_gamelles IS NULL OR team2_gamelles IS NULL
      `);
      
      const result = fixNulls.run();
      console.log(`✅ ${result.changes} matchs corrigés`);
    }
    
    // 3. Vérifier la correction
    console.log('\n✅ Vérification de la correction:');
    const allMatches = db.prepare(`
      SELECT m.id, m.jour, m.heure, 
             t1.nom as team1, t2.nom as team2,
             m.team1_goals, m.team2_goals, m.team1_gamelles, m.team2_gamelles
      FROM matches m
      JOIN teams t1 ON m.equipe1_id = t1.id
      JOIN teams t2 ON m.equipe2_id = t2.id
      ORDER BY m.jour, m.heure
    `).all();
    
    allMatches.forEach(match => {
      console.log(`   ${match.jour} ${match.heure}: ${match.team1} vs ${match.team2}`);
      console.log(`      Score: ${match.team1_goals}-${match.team2_goals}, Gamelles: ${match.team1_gamelles}-${match.team2_gamelles}`);
    });
    
    // 4. Recalculer les statistiques
    console.log('\n📊 Recalcul des statistiques...');
    
    // Réinitialiser les statistiques
    db.exec('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
    console.log('Statistiques réinitialisées');
    
    // Récupérer tous les matchs avec des scores
    const matchesWithScores = db.prepare(`
      SELECT * FROM matches 
      WHERE team1_goals > 0 OR team2_goals > 0 OR team1_gamelles > 0 OR team2_gamelles > 0
    `).all();
    console.log(`${matchesWithScores.length} matchs avec des scores trouvés`);
    
    // Recalculer pour chaque match
    for (const match of matchesWithScores) {
      const team1Final = Math.max(0, match.team1_goals - match.team2_gamelles);
      const team2Final = Math.max(0, match.team2_goals - match.team1_gamelles);
      
      console.log(`\nMatch ${match.id}: ${match.team1_goals}-${match.team2_goals} (final: ${team1Final}-${team2Final})`);
      
      // Mettre à jour les buts et gamelles
      const updateTeam1 = db.prepare('UPDATE teams SET buts = buts + ?, gamelles = gamelles + ? WHERE id = ?');
      const updateTeam2 = db.prepare('UPDATE teams SET buts = buts + ?, gamelles = gamelles + ? WHERE id = ?');
      
      updateTeam1.run(match.team1_goals, match.team1_gamelles, match.equipe1_id);
      updateTeam2.run(match.team2_goals, match.team2_gamelles, match.equipe2_id);
      
      // Mettre à jour les points
      const updatePoints1 = db.prepare('UPDATE teams SET points = points + ? WHERE id = ?');
      const updatePoints2 = db.prepare('UPDATE teams SET points = points + ? WHERE id = ?');
      
      if (team1Final > team2Final) {
        updatePoints1.run(3, match.equipe1_id);
        console.log(`  Équipe 1 gagne: +3 points`);
      } else if (team2Final > team1Final) {
        updatePoints2.run(3, match.equipe2_id);
        console.log(`  Équipe 2 gagne: +3 points`);
      } else {
        updatePoints1.run(1, match.equipe1_id);
        updatePoints2.run(1, match.equipe2_id);
        console.log(`  Match nul: +1 point chacun`);
      }
    }
    
    // 5. Vérifier le résultat final
    console.log('\n🏆 Classement final:');
    const finalTeams = db.prepare('SELECT id, nom, points, buts, gamelles FROM teams ORDER BY points DESC').all();
    finalTeams.forEach(team => {
      console.log(`   ${team.id}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}`);
    });
    
    console.log('\n✅ Correction terminée');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

fixNullValues();
