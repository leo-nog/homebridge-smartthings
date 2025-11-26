const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('Diretório dist removido com sucesso');
} else {
  console.log('Diretório dist não existe');
}

