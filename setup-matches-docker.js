/**
 * Script pour créer les matchs via Docker PostgreSQL
 */
const { exec } = require('child_process');

// SQL pour créer les matchs
const sql = `
DELETE FROM matches;

INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team1_gamelles, team2_goals, team2_gamelles, finished) VALUES
-- Lundi
('lundi_1200_AB', 'lundi', '12:00', 'A', 'B', 0, 0, 0, 0, false),
('lundi_1300_CD', 'lundi', '13:00', 'C', 'D', 0, 0, 0, 0, false),
('lundi_1330_EF', 'lundi', '13:30', 'E', 'F', 0, 0, 0, 0, false),

-- Mardi
('mardi_1200_AC', 'mardi', '12:00', 'A', 'C', 0, 0, 0, 0, false),
('mardi_1300_BD', 'mardi', '13:00', 'B', 'D', 0, 0, 0, 0, false),
('mardi_1330_GH', 'mardi', '13:30', 'G', 'H', 0, 0, 0, 0, false),

-- Mercredi
('mercredi_1200_AE', 'mercredi', '12:00', 'A', 'E', 0, 0, 0, 0, false),
('mercredi_1300_BF', 'mercredi', '13:00', 'B', 'F', 0, 0, 0, 0, false),
('mercredi_1330_CG', 'mercredi', '13:30', 'C', 'G', 0, 0, 0, 0, false),

-- Jeudi
('jeudi_1200_DH', 'jeudi', '12:00', 'D', 'H', 0, 0, 0, 0, false),
('jeudi_1300_EG', 'jeudi', '13:00', 'E', 'G', 0, 0, 0, 0, false),
('jeudi_1330_FH', 'jeudi', '13:30', 'F', 'H', 0, 0, 0, 0, false);
`;

console.log('🏆 Configuration des matchs du tournoi...');

// Exécuter le SQL via Docker
const command = `docker exec -i tournoi-baby_postgres_1 psql -U postgres -d tournoi_babyfoot -c "${sql}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erreur lors de l\'exécution SQL:', error.message);
    return;
  }
  
  if (stderr && !stderr.includes('DELETE') && !stderr.includes('INSERT')) {
    console.error('⚠️ Avertissements SQL:', stderr);
  }
  
  console.log('✅ Matchs créés avec succès !');
  console.log('\n📅 Planning configuré:');
  console.log('   • Lundi: 3 matchs (A/B, C/D, E/F)');
  console.log('   • Mardi: 3 matchs (A/C, B/D, G/H)');
  console.log('   • Mercredi: 3 matchs (A/E, B/F, C/G)');
  console.log('   • Jeudi: 3 matchs (D/H, E/G, F/H)');
  console.log('   • Vendredi: Vide (pour l\'équipe I)');
  
  if (stdout) {
    console.log('\n📊 Résultat SQL:', stdout);
  }
});
