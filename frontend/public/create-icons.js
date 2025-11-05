// Script para criar ícones PWA a partir da imagem iconPWA.jpg
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImage = path.join(__dirname, 'media', 'iconPWA.jpg');
const outputDir = __dirname;

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 32 }
];

async function createIcons() {
  console.log('📱 Criando ícones PWA a partir de iconPWA.jpg...\n');

  if (!fs.existsSync(inputImage)) {
    console.error('Erro: Arquivo iconPWA.jpg não encontrado em:', inputImage);
    process.exit(1);
  }

  for (const { name, size } of sizes) {
    try {
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(path.join(outputDir, name));
      
      console.log(`✅ ${name} (${size}x${size}) criado com sucesso`);
    } catch (error) {
      console.error(`Erro ao criar ${name}:`, error.message);
    }
  }

  console.log('\n🎉 Todos os ícones foram criados com sucesso!');
}

createIcons().catch(console.error);
