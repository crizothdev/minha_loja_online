# Deploy no GitHub Pages

## 1. Criar repositório no GitHub

Crie um repositório público chamado `minha_loja_online` no GitHub.

## 2. Conectar e fazer push

```bash
git remote add origin https://github.com/SEU_USUARIO/minha_loja_online.git
git push -u origin main
```

## 3. Configurar Secrets no GitHub

No repositório, vá em **Settings → Secrets and variables → Actions → New repository secret** e adicione:

| Nome | Valor |
|------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyAEYEhx0J98Hpp1Xmbo8XYGTtFpka48_tQ` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `minha-loja-online-ae0dd.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `minha-loja-online-ae0dd` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `minha-loja-online-ae0dd.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `34116832623` |
| `VITE_FIREBASE_APP_ID` | `1:34116832623:web:53eb5ee10fce9e2260ac9a` |

## 4. Configurar GitHub Pages

No repositório, vá em **Settings → Pages**:
- **Source**: GitHub Actions
- **Branch**: (automático via Actions)

## 5. Autorizar domínio no Firebase

No Firebase Console, vá em **Authentication → Settings → Authorized domains** e adicione:
- `SEU_USUARIO.github.io`

## 6. Deploy automático

Após o push na branch `main`, o deploy é automático. A URL será:
`https://SEU_USUARIO.github.io/minha_loja_online/`
