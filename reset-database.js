import { getDatabase } from './api/db.js';
import { unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script pour remettre à zéro complètement la base de données
 * Supprime le fichier de base de données et le recrée
 */
async function resetDatabase() {
  try {
    console.log('🗑️  Remise à zéro de la base de données...');
    
    // 1. Supprimer le fichier de base de données existant
    const dbPath = join(__dirname, 'data', 'tournoi.db');
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
      console.log('✅ Fichier de base de données supprimé');
    } else {
      console.log('ℹ️  Aucun fichier de base de données existant');
    }
    
    // 2. Recréer la base de données
    console.log('🔄 Recréation de la base de données...');
    const db = await getDatabase();
    
    // 3. Vérifier que la base est bien vide et initialisée
    const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get();
    const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    
    console.log(`📊 Base de données recréée:`);
    console.log(`   - ${teamCount.count} équipes`);
    console.log(`   - ${matchCount.count} matchs`);
    console.log(`   - ${adminCount.count} administrateurs`);
    
    // 4. Afficher le classement initial (tous à 0)
    console.log('\n🏆 Classement initial (tous à zéro):');
    const teams = db.prepare(`
      SELECT id, nom, points, buts, gamelles, (buts - gamelles) as difference
      FROM teams 
      ORDER BY id
    `).all();
    
    teams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.nom} - Pts: ${team.points}, Buts: ${team.buts}, Gamelles: ${team.gamelles}, Diff: ${team.difference}`);
    });
    
    console.log('\n✅ Base de données remise à zéro avec succès!');
    console.log('🔑 Mot de passe admin: 123456');
    
  } catch (error) {
    console.error('❌ Erreur lors de la remise à zéro:', error);
  }
}

// Exécuter la remise à zéro
resetDatabase();
