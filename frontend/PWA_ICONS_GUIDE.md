# PWA Icons - Guia de Geração

## ⚠️ AÇÃO NECESSÁRIA

Os ícones PWA SVG foram criados como **placeholders**. Para produção, você precisa gerar ícones PNG reais.

## 🎨 Opção 1: Ferramenta Online (RECOMENDADO)

### PWA Builder (Mais Fácil)
1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload do seu logo
3. Baixe os ícones gerados
4. Copie para `frontend/public/`
   - `pwa-192x192.png`
   - `pwa-512x512.png`

### Real Favicon Generator
1. Acesse: https://realfavicongenerator.net/
2. Faça upload do logo
3. Configure opções PWA
4. Baixe e extraia os arquivos
5. Copie os PNGs necessários

## 🛠️ Opção 2: ImageMagick (Terminal)

```bash
# Instalar ImageMagick (macOS)
brew install imagemagick

# Converter SVG para PNG
cd frontend/public
convert pwa-192x192.svg -resize 192x192 pwa-192x192.png
convert pwa-512x512.svg -resize 512x512 pwa-512x512.png
```

## 📋 Especificações

### Tamanhos Necessários:
- **192x192px** - Ícone padrão (Android, iOS)
- **512x512px** - Ícone grande (splash screen)

### Formato:
- PNG (não use transparência)
- Fundo sólido (preferencialmente cor da marca)
- Centralizado
- Padding de ~10% nas bordas

### Dicas:
- Use o logo/marca da aplicação
- Mantenha simples e reconhecível
- Teste em diferentes tamanhos
- Verifique em modo escuro e claro

## 🎯 Para Desenvolvimento

Os SVGs placeholders funcionarão para testar, mas **DEVEM** ser substituídos por PNGs antes do deploy em produção.

## ✅ Checklist

- [ ] Gerar pwa-192x192.png
- [ ] Gerar pwa-512x512.png
- [ ] Testar instalação em dispositivo móvel
- [ ] Verificar aparência do ícone
- [ ] Confirmar que funciona em iOS e Android
