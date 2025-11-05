# Configuração de Email e Push Notifications

## 📧 CONFIGURAÇÃO DE EMAIL

### 1. Criar App Password no Gmail

Para usar `marvinkittystats@gmail.com`, você precisa criar um **App Password** (não use a senha normal):

1. Acesse: https://myaccount.google.com/security
2. Ative a **Verificação em duas etapas** (se ainda não estiver ativa)
3. Vá em: https://myaccount.google.com/apppasswords
4. Crie um novo App Password:
   - Nome: "StatCat Backend" (ou qualquer nome)
   - Copie a senha gerada (16 caracteres, sem espaços)

### 2. Criar arquivo .env

No diretório `backend/`, crie um arquivo `.env` com o seguinte conteúdo:

```env
# Database
DATABASE_URL=sqlite:///./combine.db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# SMTP Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=marvinkittystats@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx    # Cole aqui o App Password (16 caracteres)
SMTP_FROM_EMAIL=marvinkittystats@gmail.com
SMTP_FROM_NAME=StatCat Events

# Environment
ENVIRONMENT=development
```

**⚠️ IMPORTANTE:** Substitua `xxxx xxxx xxxx xxxx` pelo App Password gerado no passo 1.

### 3. Testar Email

Após configurar o `.env`, reinicie o backend:

```bash
cd backend
python -m uvicorn app.main:app --reload
```

Agora, ao criar um evento e marcar "Send Email", os convites serão enviados!

---

## 📱 PUSH NOTIFICATIONS (PWA)

### Status Atual
- ✅ Service Worker configurado
- ✅ PWA instalável
- ⚠️ Push notifications **não estão implementadas ainda**

### O que precisa ser feito:

#### 1. Backend - Adicionar Web Push

Instalar biblioteca:
```bash
cd backend
pip install pywebpush
```

Adicionar configurações no `config.py`:
```python
# Web Push (VAPID Keys)
VAPID_PUBLIC_KEY: str | None = None
VAPID_PRIVATE_KEY: str | None = None
VAPID_SUBJECT: str = "mailto:marvinkittystats@gmail.com"
```

#### 2. Gerar VAPID Keys

```bash
# Instalar web-push globalmente
npm install -g web-push

# Gerar keys
web-push generate-vapid-keys

# Adicionar as keys no .env:
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

#### 3. Frontend - Solicitar permissão

No frontend, adicionar botão para solicitar permissão de notificações:

```typescript
// Função para solicitar permissão
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push não suportado');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Pedir permissão
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permissão negada');
      return;
    }

    // Subscrever
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
    });

    // Enviar subscription para o backend
    await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    console.log('Subscrito com sucesso!');
  } catch (error) {
    console.error('Erro ao subscrever:', error);
  }
}
```

#### 4. Backend - Endpoint de subscrição

Criar endpoint para salvar as subscrições:

```python
# backend/app/api/v1/endpoints/push.py
from pywebpush import webpush, WebPushException

@router.post("/subscribe")
async def subscribe_to_push(
    subscription: dict,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    # Salvar subscription no banco de dados
    # Associar ao usuário atual
    pass

@router.post("/send")
async def send_push_notification(
    user_id: int,
    title: str,
    body: str,
    db: Session = Depends(get_session),
):
    # Buscar subscription do usuário
    # Enviar notificação usando pywebpush
    pass
```

---

## 🧪 TESTANDO

### Testar Email (Já funciona):

1. Configure o `.env` com o App Password
2. Reinicie o backend
3. No frontend, crie um evento
4. Convide atletas
5. Marque ✅ "Send Email"
6. Clique em "Create Event"
7. Verifique o email dos atletas convidados

### Logs de Email

Para ver se o email está sendo enviado, verifique os logs do backend:

```bash
# Terminal onde o backend está rodando
# Você verá mensagens como:
INFO:     Email sent successfully to athlete@example.com
```

### Testar sem configuração

Se o `.env` não estiver configurado, o backend ainda funciona mas **não envia emails**. 
Você verá logs como:

```
WARNING:  Email service not configured. Set SMTP_USER and SMTP_PASSWORD in .env
INFO:     [Email Not Configured] Would send invitation to athlete@example.com for event: Training
```

---

## 📝 CHECKLIST DE CONFIGURAÇÃO

### Email (Pronto para testar):
- [ ] Criar App Password no Gmail
- [ ] Criar arquivo `backend/.env`
- [ ] Adicionar SMTP_USER e SMTP_PASSWORD
- [ ] Reiniciar backend
- [ ] Criar evento e testar envio

### Push Notifications (Não implementado):
- [ ] Instalar pywebpush no backend
- [ ] Gerar VAPID keys
- [ ] Criar endpoints de push no backend
- [ ] Adicionar botão de permissão no frontend
- [ ] Implementar service worker para receber notificações
- [ ] Testar envio de push

---

## 🔒 SEGURANÇA

**⚠️ NUNCA commite o arquivo `.env` no Git!**

O arquivo `.gitignore` já deve ter:
```
.env
*.env
```

Para produção (Render), adicione as variáveis de ambiente no dashboard do Render.

---

## 📚 RECURSOS

- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [pywebpush](https://github.com/web-push-libs/pywebpush)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## ❓ TROUBLESHOOTING

### Email não está sendo enviado

1. Verifique se o `.env` existe
2. Verifique se SMTP_USER e SMTP_PASSWORD estão corretos
3. Verifique se o App Password tem 16 caracteres
4. Verifique os logs do backend
5. Tente fazer login manual no Gmail para garantir que a conta está ativa

### Push Notifications não funcionam

1. HTTPS é obrigatório (exceto localhost)
2. Safari no iOS tem suporte limitado
3. Verifique se o navegador suporta Push API
4. Verifique se o usuário deu permissão

---

## 🚀 PRÓXIMOS PASSOS

1. **Agora:** Configure o email e teste
2. **Depois:** Implemente push notifications
3. **Futuro:** Adicione templates HTML para emails mais bonitos
4. **Futuro:** Sistema de fila para envios em massa (Celery + Redis)
