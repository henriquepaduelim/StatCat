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
  console.log('📱 Criando ícones PWA com zoom no logo...\n');

  if (!fs.existsSync(inputImage)) {
    console.error('Erro: Arquivo iconPWA.jpg não encontrado em:', inputImage);
    process.exit(1);
  }

  // Get image metadata to calculate crop
  const metadata = await sharp(inputImage).metadata();
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;
  
  // Calculate crop to zoom 1.8x on center (make logo bigger)
  const zoomFactor = 1.8; // Ajuste este valor para mais/menos zoom (maior = mais zoom)
  const cropWidth = Math.round(imageWidth / zoomFactor);
  const cropHeight = Math.round(imageHeight / zoomFactor);
  const left = Math.round((imageWidth - cropWidth) / 2);
  const top = Math.round((imageHeight - cropHeight) / 2);

  console.log(`📐 Imagem original: ${imageWidth}x${imageHeight}`);
  console.log(`🔍 Aplicando zoom ${zoomFactor}x no centro\n`);

  for (const { name, size } of sizes) {
    try {
      await sharp(inputImage)
        // First crop to zoom on center
        .extract({
          left: left,
          top: top,
          width: cropWidth,
          height: cropHeight
        })
        // Then resize to target size
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(path.join(outputDir, name));
      
      console.log(`✅ ${name} (${size}x${size}) criado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao criar ${name}:`, error.message);
    }
  }

  console.log('\n🎉 Todos os ícones foram criados com zoom no logo!');
  console.log('💡 Para ajustar o zoom, edite a variável zoomFactor no script');
}

createIcons().catch(console.error);
