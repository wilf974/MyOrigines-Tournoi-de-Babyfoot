// Script pour tester directement la base de données SQLite
import { getDatabase } from './api/db.js';

async function testDatabase() {
  try {
    console.log('🔍 Test direct de la base de données SQLite...\n');
    
    const db = await getDatabase();
    
    // 1. Vérifier les équipes
    console.log('📊 Équipes:');
    const teams = db.prepare('SELECT id, nom, points, buts, gamelles FROM teams ORDER BY points DESC').all();
    teams.forEach(team => {
      console.log(`   ${team.id}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}`);
    });
    
    // 2. Vérifier tous les matchs
    console.log('\n⚽ Tous les matchs:');
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
    
    // 3. Test de mise à jour directe
    console.log('\n🔄 Test de mise à jour directe...');
    const firstMatch = allMatches[0];
    if (firstMatch) {
      console.log(`Mise à jour du match: ${firstMatch.team1} vs ${firstMatch.team2}`);
      
      const updateMatch = db.prepare(`
        UPDATE matches 
        SET team1_goals = ?, team2_goals = ?, team1_gamelles = ?, team2_gamelles = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      updateMatch.run(3, 1, 0, 1, firstMatch.id);
      console.log('✅ Match mis à jour directement en base');
      
      // 4. Vérifier la mise à jour
      console.log('\n✅ Vérification de la mise à jour...');
      const updatedMatch = db.prepare(`
        SELECT m.id, m.jour, m.heure, 
               t1.nom as team1, t2.nom as team2,
               m.team1_goals, m.team2_goals, m.team1_gamelles, m.team2_gamelles
        FROM matches m
        JOIN teams t1 ON m.equipe1_id = t1.id
        JOIN teams t2 ON m.equipe2_id = t2.id
        WHERE m.id = ?
      `).get(firstMatch.id);
      
      if (updatedMatch) {
        console.log(`   ${updatedMatch.team1} vs ${updatedMatch.team2}: ${updatedMatch.team1_goals}-${updatedMatch.team2_goals}`);
        console.log(`   Gamelles: ${updatedMatch.team1_gamelles}-${updatedMatch.team2_gamelles}`);
      }
      
      // 5. Recalculer les statistiques
      console.log('\n📊 Recalcul des statistiques...');
      
      // Réinitialiser les statistiques
      db.exec('UPDATE teams SET points = 0, buts = 0, gamelles = 0');
      
      // Récupérer tous les matchs avec des scores
      const matchesWithScores = db.prepare('SELECT * FROM matches WHERE team1_goals > 0 OR team2_goals > 0 OR team1_gamelles > 0 OR team2_gamelles > 0').all();
      console.log(`   ${matchesWithScores.length} matchs avec des scores trouvés`);
      
      // Recalculer pour chaque match
      for (const match of matchesWithScores) {
        const team1Final = Math.max(0, match.team1_goals - match.team2_gamelles);
        const team2Final = Math.max(0, match.team2_goals - match.team1_gamelles);
        
        console.log(`   Match ${match.id}: ${match.team1_goals}-${match.team2_goals} (final: ${team1Final}-${team2Final})`);
        
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
        } else if (team2Final > team1Final) {
          updatePoints2.run(3, match.equipe2_id);
        } else {
          updatePoints1.run(1, match.equipe1_id);
          updatePoints2.run(1, match.equipe2_id);
        }
      }
      
      // 6. Vérifier le résultat
      console.log('\n🏆 Classement final:');
      const finalTeams = db.prepare('SELECT id, nom, points, buts, gamelles FROM teams ORDER BY points DESC').all();
      finalTeams.forEach(team => {
        console.log(`   ${team.id}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}`);
      });
    }
    
    console.log('\n✅ Test terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

testDatabase();
