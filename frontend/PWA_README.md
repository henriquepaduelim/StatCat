# 📱 PWA (Progressive Web App) - StatCat

## ✅ Fase 1 Completa! 

A aplicação agora é um PWA funcional com as seguintes características:

### 🎉 Funcionalidades Implementadas:

1. **📲 Instalável**
   - Pode ser instalado em Android, iOS, Desktop
   - Aparece como app nativo no dispositivo
   - Ícone na home screen

2. **⚡ Cache Inteligente**
   - Assets (JS, CSS, imagens) em cache
   - API calls com estratégia Network First
   - Imagens com estratégia Cache First
   - Google Fonts em cache

3. **🔄 Auto-update**
   - Detecta novas versões automaticamente
   - Prompt para atualizar quando disponível
   - Atualização sem recarregar página

4. **📴 Offline Ready**
   - Funciona offline com dados em cache
   - Notificação quando app está pronto para offline
   - Cache de 24h para API calls

5. **🎨 Aparência Nativa**
   - Theme color na barra de status
   - Splash screen automático
   - Modo standalone (sem barra do navegador)

---

## 🚀 Como Testar:

### Desktop (Chrome/Edge):
1. Execute `npm run dev`
2. Abra http://localhost:5173
3. Clique no ícone ➕ na barra de endereço
4. Clique em "Instalar"

### Android:
1. Acesse a URL de produção (Vercel)
2. Chrome mostrará banner "Adicionar à tela inicial"
3. OU: Menu → Adicionar à tela inicial

### iOS:
1. Acesse a URL no Safari
2. Toque no ícone de compartilhar
3. "Adicionar à Tela de Início"
4. O app abrirá em modo standalone

---

## 🛠️ Configuração:

### Service Worker
- **Localização**: Gerado automaticamente em `dist/sw.js`
- **Estratégias**:
  - API: Network First (prioriza rede, fallback para cache)
  - Imagens: Cache First (prioriza cache, fallback para rede)
  - Assets: Cache automático

### Manifest
- **Localização**: Gerado automaticamente em `dist/manifest.webmanifest`
- **Configurável em**: `vite.config.ts`

### Ícones
- **Atual**: SVG placeholders (funcionam para dev)
- **Produção**: Substituir por PNG
- **Guia**: Ver `PWA_ICONS_GUIDE.md`

---

## 📝 Comandos:

```bash
# Desenvolvimento (com PWA)
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

---

## 🔍 Verificar PWA:

### Chrome DevTools:
1. Abra DevTools (F12)
2. Vá para "Application"
3. Seção "Service Workers" - Ver status
4. Seção "Manifest" - Ver configuração
5. "Lighthouse" - Testar PWA score

### PWA Checklist:
- ✅ HTTPS (Vercel fornece)
- ✅ Service Worker registrado
- ✅ Manifest válido
- ✅ Ícones corretos
- ✅ Theme color
- ✅ Viewport meta tag
- ✅ Instalável

---

## 📦 Cache Strategy:

### API Calls (`/api/*`):
- Estratégia: **Network First**
- Cache: 24 horas
- Max entries: 100
- Funciona offline se já visitou a página

### Images (`/media/*`):
- Estratégia: **Cache First**  
- Cache: 30 dias
- Max entries: 50
- Carrega instantaneamente da segunda vez

### Google Fonts:
- Estratégia: **Cache First**
- Cache: 1 ano
- Max entries: 10

---

## 🎯 Próximos Passos (Fase 2):

1. **Indicador de Status Online/Offline**
   - Badge visual
   - Toast quando ficar offline

2. **Sincronização Inteligente**
   - Queue de ações offline
   - Sync automático ao voltar online

3. **Update Banner Melhorado**
   - Changelog no prompt
   - "O que há de novo"

4. **Cache Seletivo**
   - Escolher quais dados cachear
   - Limpar cache antigo

---

## 🐛 Troubleshooting:

### Warning "glob pattern doesn't match" no console:
- ✅ **NORMAL EM DEV!** Este warning aparece apenas em desenvolvimento
- Em produção (build), o precache será gerado automaticamente
- Pode ignorar este warning durante desenvolvimento
- Configuramos `suppressWarnings: true` para escondê-lo

### Service Worker não registra:
```bash
# Limpar cache do browser
# Chrome: DevTools → Application → Clear storage
# OU
# Abrir no modo anônimo
```

### Ícones não aparecem:
- Gerar PNGs reais (ver `PWA_ICONS_GUIDE.md`)
- Verificar paths em `vite.config.ts`
- Hard refresh (Cmd+Shift+R)

### Update não funciona:
- Verificar que build foi atualizado
- Force refresh do service worker
- Verificar console para erros

### Offline não funciona:
- Visitar página primeiro (para cachear)
- Verificar estratégia de cache
- Checar DevTools → Application → Cache Storage

---

## 📊 Performance:

### Lighthouse Scores Esperados:
- **Performance**: 90-100
- **Accessibility**: 90-100
- **Best Practices**: 90-100
- **SEO**: 90-100
- **PWA**: 100 ✅

### Métricas:
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.8s
- **Cumulative Layout Shift**: < 0.1

---

## 📚 Recursos:

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)

---

## ✅ Status:

- [x] Service Worker configurado
- [x] Manifest criado
- [x] Ícones (SVG placeholders)
- [x] Cache strategies
- [x] Update prompt
- [x] Offline ready
- [x] Testado em dev
- [ ] Ícones PNG para produção
- [ ] Testado em produção (Vercel)
- [ ] Testado em iOS
- [ ] Testado em Android

---

🎉 **PWA Fase 1 Completa!** A aplicação agora pode ser instalada e funciona offline!
