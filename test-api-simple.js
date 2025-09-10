import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🧪 Test de l\'API de classement...');
    
    const response = await fetch('http://localhost:2001/api/rankings');
    
    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API fonctionne!');
    console.log('📊 Données reçues:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAPI();
