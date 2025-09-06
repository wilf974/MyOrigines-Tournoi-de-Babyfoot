// Script de debug pour la base de données
import { getDatabase } from './api/db.js';

async function debugDatabase() {
  try {
    console.log('🔍 Debug de la base de données SQLite...\n');
    
    const db = await getDatabase();
    
    // 1. Vérifier la structure des tables
    console.log('📊 Structure des tables:');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    console.log('Tables:', tables.map(t => t.name));
    
    // 2. Vérifier les équipes
    console.log('\n👥 Équipes:');
    const teams = db.prepare('SELECT id, nom, points, buts, gamelles FROM teams').all();
    teams.forEach(team => {
      console.log(`   ${team.id}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}`);
    });
    
    // 3. Vérifier tous les matchs
    console.log('\n⚽ Tous les matchs:');
    const allMatches = db.prepare(`
      SELECT m.id, m.jour, m.heure, 
             t1.nom as team1, t2.nom as team2,
             m.team1_goals, m.team2_goals, m.team1_gamelles, m.team2_gamelles,
             m.equipe1_id, m.equipe2_id
      FROM matches m
      JOIN teams t1 ON m.equipe1_id = t1.id
      JOIN teams t2 ON m.equipe2_id = t2.id
      ORDER BY m.jour, m.heure
    `).all();
    
    allMatches.forEach(match => {
      console.log(`   ${match.jour} ${match.heure}: ${match.team1} vs ${match.team2}`);
      console.log(`      Score: ${match.team1_goals}-${match.team2_goals}, Gamelles: ${match.team1_gamelles}-${match.team2_gamelles}`);
      console.log(`      IDs: ${match.equipe1_id} vs ${match.equipe2_id}`);
    });
    
    // 4. Test de mise à jour directe
    console.log('\n🔄 Test de mise à jour directe...');
    if (allMatches.length > 0) {
      const firstMatch = allMatches[0];
      console.log(`Mise à jour du match: ${firstMatch.team1} vs ${firstMatch.team2} (ID: ${firstMatch.id})`);
      
      // Mettre à jour le match
      const updateMatch = db.prepare(`
        UPDATE matches 
        SET team1_goals = ?, team2_goals = ?, team1_gamelles = ?, team2_gamelles = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const result = updateMatch.run(3, 1, 0, 1, firstMatch.id);
      console.log(`Résultat de la mise à jour:`, result);
      
      // Vérifier la mise à jour
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
        console.log(`✅ Match mis à jour: ${updatedMatch.team1} vs ${updatedMatch.team2}`);
        console.log(`   Score: ${updatedMatch.team1_goals}-${updatedMatch.team2_goals}, Gamelles: ${updatedMatch.team1_gamelles}-${updatedMatch.team2_gamelles}`);
      } else {
        console.log('❌ Match non trouvé après mise à jour');
      }
      
      // 5. Test du recalcul des statistiques
      console.log('\n📊 Test du recalcul des statistiques...');
      
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
        console.log(`\nTraitement du match ${match.id}:`);
        console.log(`  Score: ${match.team1_goals}-${match.team2_goals}, Gamelles: ${match.team1_gamelles}-${match.team2_gamelles}`);
        
        const team1Final = Math.max(0, match.team1_goals - match.team2_gamelles);
        const team2Final = Math.max(0, match.team2_goals - match.team1_gamelles);
        console.log(`  Score final: ${team1Final}-${team2Final}`);
        
        // Mettre à jour les buts et gamelles
        const updateTeam1 = db.prepare('UPDATE teams SET buts = buts + ?, gamelles = gamelles + ? WHERE id = ?');
        const updateTeam2 = db.prepare('UPDATE teams SET buts = buts + ?, gamelles = gamelles + ? WHERE id = ?');
        
        const result1 = updateTeam1.run(match.team1_goals, match.team1_gamelles, match.equipe1_id);
        const result2 = updateTeam2.run(match.team2_goals, match.team2_gamelles, match.equipe2_id);
        console.log(`  Mise à jour équipe 1:`, result1);
        console.log(`  Mise à jour équipe 2:`, result2);
        
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
      
      // 6. Vérifier le résultat final
      console.log('\n🏆 Classement final:');
      const finalTeams = db.prepare('SELECT id, nom, points, buts, gamelles FROM teams ORDER BY points DESC').all();
      finalTeams.forEach(team => {
        console.log(`   ${team.id}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}`);
      });
    }
    
    console.log('\n✅ Debug terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

debugDatabase();
