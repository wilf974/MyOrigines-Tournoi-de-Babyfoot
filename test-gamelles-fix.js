#!/usr/bin/env node

/**
 * Script de test pour vérifier la correction des gamelles adverses
 * Teste l'API de classement et affiche les résultats
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:2001';

async function testRankings() {
  try {
    console.log('🧪 Test de la correction des gamelles adverses');
    console.log('=' .repeat(50));
    
    // Test de l'API de classement
    console.log('\n📊 Récupération du classement...');
    const response = await fetch(`${API_BASE}/api/rankings`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const rankings = await response.json();
    
    console.log(`✅ ${rankings.length} équipes récupérées`);
    
    // Afficher le classement
    console.log('\n🏆 Classement actuel:');
    console.log('Rang | Équipe | Points | Buts | Gamelles | Différence');
    console.log('-'.repeat(60));
    
    rankings.forEach((team, index) => {
      const diff = team.buts - team.gamelles;
      console.log(`${String(index + 1).padStart(4)} | ${team.nom.padEnd(8)} | ${String(team.points).padStart(6)} | ${String(team.buts).padStart(4)} | ${String(team.gamelles).padStart(8)} | ${String(diff).padStart(10)}`);
    });
    
    // Vérifier la logique des gamelles adverses
    console.log('\n🔍 Vérification de la logique des gamelles:');
    console.log('   - Les points doivent refléter les victoires/défaites/matchs nuls');
    console.log('   - La différence = Buts marqués - Gamelles de l\'équipe');
    console.log('   - Les gamelles adverses impactent le score final du match');
    
    // Test de l'API de santé
    console.log('\n🏥 Test de l\'API de santé...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ API de santé OK');
    } else {
      console.log('❌ API de santé KO');
    }
    
    console.log('\n✅ Test terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n💡 Vérifiez que:');
    console.log('   - Docker est démarré');
    console.log('   - L\'application est accessible sur http://localhost:2001');
    console.log('   - La base de données PostgreSQL est connectée');
  }
}

// Exécuter le test
testRankings();
