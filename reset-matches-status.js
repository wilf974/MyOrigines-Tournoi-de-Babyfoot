/**
 * Script pour remettre tous les matchs en statut "en cours"
 * Résout le problème des matchs qui n'apparaissent pas dans la gestion manuelle
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
 * Remet tous les matchs en statut "en cours" (finished = false)
 */
async function resetMatchesToOngoing() {
  console.log('🔄 Remise des matchs en statut "en cours"...\n');
  
  try {
    // D'abord, afficher l'état actuel
    console.log('📊 État actuel des matchs:');
    const beforeResult = await pool.query(`
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
    
    beforeResult.rows.forEach(row => {
      console.log(`   ${row.jour}: ${row.total} total, ${row.finished} terminés, ${row.ongoing} en cours`);
    });
    
    // Remettre tous les matchs en cours
    const updateResult = await pool.query(`
      UPDATE matches 
      SET finished = false 
      WHERE finished = true
    `);
    
    console.log(`\n✅ ${updateResult.rowCount} matchs remis en statut "en cours"`);
    
    // Afficher le nouvel état
    console.log('\n📊 Nouvel état des matchs:');
    const afterResult = await pool.query(`
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
    
    afterResult.rows.forEach(row => {
      console.log(`   ${row.jour}: ${row.total} total, ${row.finished} terminés, ${row.ongoing} en cours`);
    });
    
    console.log('\n🎯 Les matchs devraient maintenant apparaître dans la gestion manuelle!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la remise à zéro:', error.message);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
resetMatchesToOngoing().catch(console.error);
