import http from 'http';

// Fonction pour obtenir un token
function getToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 2001,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.token);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Fonction pour récupérer les matchs
function getMatches(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 2001,
      path: '/api/matches',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const matches = JSON.parse(data);
          resolve(matches);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test principal
async function test() {
  try {
    console.log('🔑 Obtention du token...');
    const token = await getToken();
    console.log('✅ Token obtenu');

    console.log('📊 Récupération des matchs...');
    const matches = await getMatches(token);
    
    console.log('📋 Matchs récupérés:');
    matches.forEach(match => {
      const score = match.team1_goals !== null && match.team2_goals !== null 
        ? `${match.team1_goals}-${match.team2_goals}` 
        : '-';
      console.log(`   ${match.equipe1} vs ${match.equipe2}: ${score}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

test();
