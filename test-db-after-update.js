// Test pour vérifier la base de données après une mise à jour
import { getDatabase } from './api/db.js';

async function testDatabaseAfterUpdate() {
  try {
    console.log('🔍 Test de la base de données après mise à jour...\n');
    
    const db = await getDatabase();
    
    // 1. Vérifier l'état actuel
    console.log('📊 État actuel des matchs:');
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
    
    // 2. Mettre à jour un match directement
    console.log('\n🔄 Mise à jour directe d\'un match...');
    const firstMatch = allMatches.find(m => m.jour === 'lundi');
    
    if (firstMatch) {
      console.log(`Mise à jour du match: ${firstMatch.team1} vs ${firstMatch.team2} (ID: ${firstMatch.id})`);
      
      const updateMatch = db.prepare(`
        UPDATE matches 
        SET team1_goals = ?, team2_goals = ?, team1_gamelles = ?, team2_gamelles = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const result = updateMatch.run(2, 1, 0, 1, firstMatch.id);
      console.log(`Résultat de la mise à jour:`, result);
      
      // 3. Vérifier la mise à jour
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
        console.log(`✅ Match mis à jour: ${updatedMatch.team1} vs ${updatedMatch.team2}`);
        console.log(`   Score: ${updatedMatch.team1_goals}-${updatedMatch.team2_goals}, Gamelles: ${updatedMatch.team1_gamelles}-${updatedMatch.team2_gamelles}`);
      } else {
        console.log('❌ Match non trouvé après mise à jour');
      }
      
      // 4. Test de l'API
      console.log('\n🌐 Test de l\'API...');
      
      // Simuler une requête API
      const apiMatches = db.prepare(`
        SELECT m.*, 
               t1.nom as team1_nom, t1.joueurs as team1_joueurs,
               t2.nom as team2_nom, t2.joueurs as team2_joueurs
        FROM matches m
        JOIN teams t1 ON m.equipe1_id = t1.id
        JOIN teams t2 ON m.equipe2_id = t2.id
        WHERE m.jour = ?
        ORDER BY m.heure
      `).all('lundi');
      
      const apiMatchesWithParsedData = apiMatches.map(match => ({
        ...match,
        team1_joueurs: JSON.parse(match.team1_joueurs),
        team2_joueurs: JSON.parse(match.team2_joueurs)
      }));
      
      console.log('Données retournées par l\'API:');
      apiMatchesWithParsedData.forEach(match => {
        console.log(`   ${match.team1_nom} vs ${match.team2_nom}: ${match.team1_goals}-${match.team2_goals}`);
      });
    }
    
    console.log('\n✅ Test terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

testDatabaseAfterUpdate();
