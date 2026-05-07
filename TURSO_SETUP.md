# Configuration Turso/LibSQL

## Setup Local

1. **Installer les dépendances:**
```bash
npm install
npm install @libsql/client
```

2. **Créer `.env` local:**
```bash
cp .env.example .env
```

3. **Remplir les variables dans `.env`:**
```
PORT=8001
SESSION_SECRET=votre-secret-sécurisé
VITE_API_URL=http://localhost:8001
TURSO_CONNECTION_URL=libsql://documentation-team-mcd2.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

4. **Lancer le serveur:**
```bash
npm start
```

## Setup Vercel

### 1. Ajouter les variables d'environnement Vercel

Allez sur **Vercel Dashboard → Settings → Environment Variables** et ajoutez:

| Variable | Valeur |
|----------|--------|
| `TURSO_CONNECTION_URL` | `libsql://documentation-team-mcd2.aws-ap-northeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | Votre token Turso |
| `SESSION_SECRET` | Une clé aléatoire sécurisée |

### 2. Build Command (Vercel)

Le build command doit être:
```
npm install && npm run build
```

Cette commande:
- Installe les dépendances (inclus `@libsql/client`)
- Build le frontend Vite
- Le serveur Node.js est prêt

### 3. Déploiement

- **API Backend**: Netlify Functions (ou Vercel Serverless)
- **Frontend**: Servi statiquement par Vercel

## Notes importantes

⚠️ **Ne commitez jamais le `.env` sur GitHub!**
- Il est dans `.gitignore`
- Les tokens Turso sont secrets

🔒 **Token Turso:**
- Gardez-le secret
- Ne le partagez pas dans le repo
- Régulièrement, régénérez-le si compromis

📝 **Environnements:**
- `.env` - Local (développement)
- `.env.example` - Template (à commiter)
- Vercel Dashboard - Production
