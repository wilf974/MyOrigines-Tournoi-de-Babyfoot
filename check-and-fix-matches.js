/**
 * Script pour vérifier et corriger les matchs dans la base de données
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

async function checkAndFixMatches() {
  console.log('🔍 Vérification des matchs dans la base de données...\n');
  
  try {
    // Vérifier l'état actuel des matchs
    const result = await pool.query(`
      SELECT 
        jour,
        COUNT(*) as total,
        COUNT(CASE WHEN finished = true THEN 1 END) as finished,
        COUNT(CASE WHEN finished = false THEN 1 END) as ongoing
      FROM matches 
      GROUP BY jour
      ORDER BY 
        CASE jour 
          WHEN 'lundi' THEN 1
          WHEN 'mardi' THEN 2
          WHEN 'mercredi' THEN 3
          WHEN 'jeudi' THEN 4
          WHEN 'vendredi' THEN 5
        END
    `);
    
    console.log('📊 État actuel des matchs:');
    result.rows.forEach(row => {
      console.log(`   ${row.jour}: ${row.total} total, ${row.finished} terminés, ${row.ongoing} en cours`);
    });
    
    // Si aucun match n'existe, créer des matchs de test
    const totalMatches = result.rows.reduce((sum, row) => sum + parseInt(row.total), 0);
    
    if (totalMatches === 0) {
      console.log('\n⚠️ Aucun match trouvé. Création de matchs de test...');
      
      // Créer des matchs de test pour chaque jour
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
      const times = ['12:00', '13:00', '14:00'];
      const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
      
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        
        for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
          const time = times[timeIndex];
          const team1Index = (dayIndex * 3 + timeIndex) % teams.length;
          const team2Index = (team1Index + 1) % teams.length;
          
          const matchId = `${day}_${time.replace(':', '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await pool.query(`
            INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team1_gamelles, team2_goals, team2_gamelles, finished)
            VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, false)
          `, [matchId, day, time, teams[team1Index], teams[team2Index]]);
          
          console.log(`   ✅ Créé: ${day} ${time} - Équipe ${teams[team1Index]} vs Équipe ${teams[team2Index]}`);
        }
      }
      
      console.log('\n🎉 Matchs de test créés avec succès!');
    } else {
      // Remettre tous les matchs en statut "en cours"
      console.log('\n🔄 Remise des matchs en statut "en cours"...');
      const updateResult = await pool.query(`
        UPDATE matches 
        SET finished = false 
        WHERE finished = true
      `);
      
      console.log(`✅ ${updateResult.rowCount} matchs remis en statut "en cours"`);
    }
    
    // Vérifier le nouvel état
    console.log('\n📊 Nouvel état des matchs:');
    const newResult = await pool.query(`
      SELECT 
        jour,
        COUNT(*) as total,
        COUNT(CASE WHEN finished = true THEN 1 END) as finished,
        COUNT(CASE WHEN finished = false THEN 1 END) as ongoing
      FROM matches 
      GROUP BY jour
      ORDER BY 
        CASE jour 
          WHEN 'lundi' THEN 1
          WHEN 'mardi' THEN 2
          WHEN 'mercredi' THEN 3
          WHEN 'jeudi' THEN 4
          WHEN 'vendredi' THEN 5
        END
    `);
    
    newResult.rows.forEach(row => {
      console.log(`   ${row.jour}: ${row.total} total, ${row.finished} terminés, ${row.ongoing} en cours`);
    });
    
    console.log('\n🎯 Les matchs devraient maintenant apparaître dans la gestion manuelle!');
    console.log('💡 Rafraîchissez la page dans votre navigateur.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
checkAndFixMatches().catch(console.error);
