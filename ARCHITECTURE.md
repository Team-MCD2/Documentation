# Architecture Complète — Plateforme de Documentation Collaborative

> Inspirée de GitBook, Notion, Stripe Docs et Vercel Docs.  
> Stack : **Node.js + Express + React + TypeScript**

---

## 1. Vue d'ensemble de l'Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (Navigateur)                    │
│         React 19 + TypeScript + Vite + React Router      │
│         Framer Motion · Lucide Icons · React Markdown    │
├─────────────────────────────────────────────────────────┤
│                     API LAYER (REST)                     │
│         Express 5 · Sessions Cookie · Multer             │
│         Middleware RBAC · Crypto (built-in Node)         │
├─────────────────────────────────────────────────────────┤
│                     DATA LAYER                           │
│     SQLite/better-sqlite3 (dev) · PostgreSQL (prod)      │
│     Filesystem local (dev) · DB BYTEA (prod)             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Structure des Dossiers

```
plateforme-docs/
├── server.js                  # Serveur Express (point d'entrée)
├── db.js                      # Couche base de données (adapter pattern)
├── package.json
├── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Composants réutilisables (futur)
│   │   │   ├── layout/        # Sidebar, Header, Breadcrumbs
│   │   │   ├── ui/            # Button, Modal, Badge, Toast
│   │   │   └── editor/        # MarkdownEditor, EditorToolbar
│   │   ├── pages/
│   │   │   ├── Home.tsx       # Dashboard avec stats et projets
│   │   │   ├── Login.tsx      # Authentification (username + mot de passe)
│   │   │   ├── Project.tsx    # Page projet (fichiers/discussions/activité)
│   │   │   ├── Preview.tsx    # Aperçu/édition document
│   │   │   └── Settings.tsx   # Profil + gestion utilisateurs (admin)
│   │   ├── AppContext.tsx      # Contexte global (user, role, theme, projets)
│   │   ├── App.tsx            # Layout principal, routing, sidebar
│   │   ├── api.ts             # Couche API typée (fetch wrapper)
│   │   ├── index.css          # Design system (dark/light mode)
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── data/                      # Base SQLite (gitignored)
└── storage/                   # Fichiers uploadés localement (gitignored)
```

### Structure évolutive recommandée (Phase 2+)

```
server/
├── routes/
│   ├── auth.routes.js
│   ├── projects.routes.js
│   ├── documents.routes.js
│   ├── users.routes.js
│   └── search.routes.js
├── middleware/
│   ├── auth.middleware.js
│   └── rbac.middleware.js
└── utils/
    ├── crypto.js
    └── validators.js
```

---

## 3. Stack Technique Choisie

### Backend
| Composant | Technologie | Raison |
|-----------|-------------|--------|
| Runtime | Node.js 20+ LTS | Stable, excellent écosystème |
| Framework | Express 5 | Léger, flexible, REST natif |
| DB dev | SQLite (better-sqlite3) | Zero-config, synchrone, rapide |
| DB prod | PostgreSQL | Scalable, ACID, full-text search |
| Auth | Sessions + Cookie HTTPOnly | Sécurisé, simple, sans JWT |
| Crypto | `crypto` (Node built-in) | Pas de dépendance externe |
| Upload | Multer | Multipart/form-data |

### Frontend
| Composant | Technologie | Raison |
|-----------|-------------|--------|
| Framework | React 19 + TypeScript | Typage fort, écosystème mature |
| Build | Vite 6 | HMR ultra-rapide, optimisations |
| Router | React Router v7 | Standard industrie |
| Animations | Framer Motion | UX premium, transitions fluides |
| Icons | Lucide React | Cohérent, léger, tree-shakable |
| Markdown | React Markdown + remark-gfm | Rendu MD sécurisé |

### Pourquoi React + Express et pas Astro (pour l'instant) ?
- **Plateforme collaborative interne** → SPA React = meilleure UX pour les éditeurs (pas de rechargements)
- **Auth + sessions** → gérées plus simplement côté Express
- **Astro** = excellent pour documentation publique statique (SEO, performance)
- **Migration Astro** possible en Phase 4 pour la partie documentation publique

---

## 4. Organisation Frontend / Backend

```
Frontend (React SPA)          Backend (Express REST API)
─────────────────────         ──────────────────────────
Pages React                   Routes /api/*
  └─ appelle api.ts             └─ valide session/role
       └─ fetch /api/*               └─ accès db.js
                                           └─ SQLite / PostgreSQL
```

- Le frontend est servi en **production** par Express (fichiers buildés dans `frontend/dist`)
- En **développement**, Vite dev server (port 5173) proxifie vers Express (port 8001)
- Pas de duplication de logique métier côté client

---

## 5. Structure de la Base de Données

### Table `users`
```sql
CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'reader',  -- 'admin' | 'editor' | 'reader'
    avatar_color  TEXT DEFAULT '#3b82f6',
    created_at    TEXT NOT NULL,
    last_login    TEXT
);
```

### Table `projects`
```sql
CREATE TABLE projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    created_by  TEXT               -- username du créateur
);
```

### Table `documents`
```sql
CREATE TABLE documents (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name   TEXT,            -- mode SQLite
    size_bytes    BIGINT NOT NULL,
    mime          TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT,
    file_data     BYTEA,           -- mode PostgreSQL
    author_name   TEXT DEFAULT 'Team',
    tags          TEXT DEFAULT '',
    category      TEXT DEFAULT 'Documentation'
);
```

### Table `document_versions`
```sql
CREATE TABLE document_versions (
    id             TEXT PRIMARY KEY,
    document_id    TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id     TEXT NOT NULL,
    content        TEXT NOT NULL,
    author_name    TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_summary TEXT DEFAULT ''
);
```

### Table `activity`
```sql
CREATE TABLE activity (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_name  TEXT NOT NULL,
    action     TEXT NOT NULL,  -- CREATE_PROJECT | UPLOAD | UPDATE | DELETE | COMMENT
    details    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

### Table `comments`
```sql
CREATE TABLE comments (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_name  TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

### Table `favorites`
```sql
CREATE TABLE favorites (
    user_name  TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (user_name, project_id)
);
```

### Table `notifications`
```sql
CREATE TABLE notifications (
    id         TEXT PRIMARY KEY,
    user_name  TEXT NOT NULL,
    content    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL
);
```

---

## 6. Relations SQL entre les Tables

```
users (1) ────────────── (*) projects        (created_by)
users (1) ────────────── (*) documents       (author_name)
projects (1) ─────────── (*) documents       (CASCADE DELETE)
projects (1) ─────────── (*) activity        (CASCADE DELETE)
projects (1) ─────────── (*) comments        (CASCADE DELETE)
projects (1) ─────────── (*) favorites       (CASCADE DELETE)
documents (1) ────────── (*) document_versions (CASCADE DELETE)
users (1) ────────────── (*) favorites       (user_name)
users (1) ────────────── (*) notifications   (user_name)
```

### Index recommandés
```sql
CREATE INDEX idx_documents_project   ON documents(project_id);
CREATE INDEX idx_activity_project    ON activity(project_id);
CREATE INDEX idx_comments_project    ON comments(project_id);
CREATE INDEX idx_versions_document   ON document_versions(document_id);
CREATE INDEX idx_notifs_user         ON notifications(user_name);
CREATE INDEX idx_favorites_user      ON favorites(user_name);
```

---

## 7. Composants UI à Créer

### Layout (dans `App.tsx`)
- **`Sidebar`** : Navigation, liste projets, favoris, profil utilisateur
- **`Header`** : Breadcrumbs, barre de recherche, notifications, toggle thème
- **`Breadcrumbs`** : Chemin contextuel cliquable

### Pages
- **`Home`** : Stats dashboard (projets, docs, contributeurs), grille projets, formulaire création
- **`Login`** : Formulaire username + password, page setup premier admin
- **`Project`** : Header projet (nom, description, favoris), tabs (Fichiers / Discussions / Activité)
- **`Preview`** : Header document, toolbar Markdown, rendu/édition/raw, historique versions
- **`Settings`** : Onglets Profil | Utilisateurs (admin) | Apparence

### Composants Réutilisables
- **`Modal`** : Confirmation destructive, formulaires (porté à un portal React)
- **`Toast`** : Notifications success/error temporaires
- **`Button`** : Primary, ghost, danger, icon
- **`Badge/Tag`** : Labels colorés (rôles, catégories)
- **`Avatar`** : Initiales + couleur générée depuis le nom
- **`MarkdownToolbar`** : Gras, italique, titres, code, lien, liste
- **`VersionHistory`** : Liste des versions avec boutons Voir/Restaurer
- **`ConfirmDialog`** : Popup de confirmation avant suppression

---

## 8. Système d'Authentification

### Flux d'authentification
```
1. Premier démarrage → aucun user en DB → page /setup
2. Setup → POST /api/auth/setup → crée l'admin initial
3. Connexion → POST /api/auth/login → {username, password}
4. Validation → scryptSync comparison → session stockée
5. Session → cookie HTTPOnly, SameSite=Strict, 24h
6. Chaque requête → middleware vérifie req.session.userId + role
7. Déconnexion → POST /api/auth/logout → session.destroy()
```

### Hachage des mots de passe (Node.js crypto built-in)
```javascript
const crypto = require('crypto');

// Création
const salt = crypto.randomBytes(32).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');

// Vérification (timing-safe)
const hashToCheck = crypto.scryptSync(input, salt, 64).toString('hex');
const valid = crypto.timingSafeEqual(
  Buffer.from(storedHash, 'hex'),
  Buffer.from(hashToCheck, 'hex')
);
```

---

## 9. Gestion des Permissions (RBAC)

### Matrice des rôles

| Action | Admin | Éditeur | Lecteur |
|--------|:-----:|:-------:|:-------:|
| Voir tous les projets | ✅ | ✅ | ✅ |
| Créer un projet | ✅ | ✅ | ❌ |
| Modifier/Supprimer son projet | ✅ | ✅ | ❌ |
| Supprimer n'importe quel projet | ✅ | ❌ | ❌ |
| Upload / Créer document | ✅ | ✅ | ❌ |
| Modifier un document | ✅ | ✅ | ❌ |
| Supprimer son document | ✅ | ✅ | ❌ |
| Supprimer n'importe quel document | ✅ | ❌ | ❌ |
| Commenter | ✅ | ✅ | ✅ |
| Voir historique versions | ✅ | ✅ | ✅ |
| Restaurer une version | ✅ | ✅ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ |
| Changer les rôles | ✅ | ❌ | ❌ |

### Middleware RBAC (Express)
```javascript
const requireRole = (...roles) => (req, res, next) => {
    if (!req.session?.userId) return res.status(401).json({ detail: 'auth_required' });
    if (!roles.includes(req.session.role)) return res.status(403).json({ detail: 'forbidden' });
    next();
};

// Exemples d'utilisation
app.post('/api/projects', requireRole('admin', 'editor'), createProject);
app.delete('/api/projects/:id', requireRole('admin', 'editor'), deleteProject);
app.get('/api/users', requireRole('admin'), listUsers);
```

---

## 10. Système de Navigation

### Routes React Router
```
/                          → Dashboard (Home)
/login                     → Connexion
/setup                     → Premier admin (si aucun utilisateur)
/projets/:id               → Page projet
/projets/:id/fichiers/:docId → Aperçu/édition document
/settings                  → Paramètres
*                          → Redirect vers /
```

### Navigation keyboard (bonnes pratiques)
- `Ctrl/Cmd + K` → Focus barre de recherche
- `Ctrl/Cmd + S` → Sauvegarder (dans l'éditeur)
- `Escape` → Fermer modal/dropdown

---

## 11. Sidebar et Dashboard

### Sidebar (260px, fixe)
```
┌──────────────────────────┐
│  🔵 DevHub               │
├──────────────────────────┤
│  🏠 Accueil              │
├── FAVORIS ───────────────┤
│  ⭐ Projet API           │
│  ⭐ Projet Mobile        │
├── PROJETS ───────────────┤
│  📁 Projet 1             │
│  📁 Projet 2             │
│  📁 Projet 3             │
├── OUTILS ────────────────┤
│  ⚙️  Paramètres          │
├──────────────────────────┤
│  [Avatar] Jean           │
│           Admin          │
└──────────────────────────┘
```

### Dashboard (Home)
```
┌────────┬────────┬────────┬────────┐
│ Projets│  Docs  │Contrib │Stockage│
│   12   │   48   │   5    │ 1.2 Go │
└────────┴────────┴────────┴────────┘

Projets Récents                [+ Nouveau]
┌────────────┬────────────┬────────────┐
│ 📁 API     │ 📁 Mobile  │ 📁 Backend │
│ 12 docs    │ 8 docs     │ 5 docs     │
└────────────┴────────────┴────────────┘
```

---

## 12. Logique des Projets et Documents

### Cycle de vie d'un document
```
Upload → Stockage (FS/DB) → Preview → Édition → Version créée → Sauvegarde
   └─ UUID généré            └─ Type détecté  └─ Textarea + toolbar
```

### Types de fichiers supportés
| Extension | Preview | Édition Markdown |
|-----------|:-------:|:----------------:|
| `.md` `.markdown` | Rendu HTML | ✅ avec toolbar |
| `.txt` `.csv` `.json` | Texte brut | ✅ |
| `.py` `.js` `.ts` `.sql` | Code (pre) | ✅ |
| `.png` `.jpg` `.gif` `.webp` | Image native | ❌ |
| `.pdf` | iFrame | ❌ |

### Organisation par catégories
- Chaque document a un champ `category` (Documentation, API, Guide, Tutoriel, etc.)
- Affichage groupé par catégorie dans la liste du projet

---

## 13. Système de Versioning

### Stratégie
- Une version est créée automatiquement à chaque sauvegarde de contenu textuel
- Maximum **50 versions** par document (les plus anciennes sont supprimées)
- Les versions stockent le **contenu complet** en TEXT
- Possibilité de voir n'importe quelle version et de la restaurer

### Interface Version History
```
Historique des versions
─────────────────────────────────────
▶ v5  Aujourd'hui 14:32      [ACTUELLE]
      Jean — "Ajout section API REST"

  v4  Hier 09:15
      Marie — "Corrections typographies"

  v3  Lundi 16:45
      Jean — "Restructuration chapitre 3"

  v2  ...
                          [Voir] [Restaurer]
```

### API Versioning
```
GET  /api/projects/:id/files/:docId/versions      → liste des versions
POST /api/projects/:id/files/:docId/content       → sauvegarde + crée version
POST /api/projects/:id/files/:docId/restore/:vid  → restaure une version
```

---

## 14. Commentaires et Collaboration

### Commentaires au niveau projet
- Discussion générale sur le projet (comme un fil Slack)
- Affichés dans l'onglet "Discussions" du projet
- Format : Avatar + nom + contenu + date

### Collaboration (Phase 2)
- Commentaires inline sur les paragraphes d'un document
- Mentions `@utilisateur` dans les commentaires
- Notifications push quand mentionné
- Indicateurs de présence (qui consulte quoi)

---

## 15. Éditeur Markdown

### Implémentation actuelle (Phase 1)
- Textarea avec police monospace
- Toolbar avec boutons : **Gras**, *Italique*, # Titre, `Code`, 🔗 Lien, — Liste
- Raccourci `Ctrl+S` pour sauvegarder
- Preview side-by-side (onglets Aperçu / Code / Modifier)

### Évolution recommandée (Phase 2+)
- **CodeMirror 6** pour la coloration syntaxique dans l'éditeur
- **TipTap** ou **Milkdown** pour WYSIWYG Markdown
- Autosave toutes les 30 secondes
- Indicateur "modifications non sauvegardées"

### Toolbar Markdown (Phase 1)
```
[B] [I] [H1] [H2] [H3] [```code```] [> quote] [link] [ul] [ol] [---]
```

---

## 16. Sécurité

### Mesures implémentées
1. **Mots de passe** : `crypto.scryptSync` — salt unique 32 bytes, hash 64 bytes, timing-safe compare
2. **Sessions** : Cookie HTTPOnly, SameSite=Strict, expiration 24h, clé secrète forte
3. **RBAC** : Vérification du rôle sur chaque route sensible
4. **CORS** : Whitelist d'origines stricte (dev: localhost:5173)
5. **Upload** : Validation taille (max configurable), stockage UUID (pas le nom original)
6. **SQL Injection** : Requêtes 100% paramétrées (jamais de concaténation)
7. **XSS** : React échappe automatiquement, React Markdown avec rehype-sanitize
8. **Variables d'env** : Tous les secrets en `.env` (jamais dans le code)

### Variables d'environnement (.env)
```
SESSION_SECRET=une-clé-très-longue-et-aléatoire-min-32-chars
DATABASE_URL=postgresql://user:pass@host:5432/docs_db
PORT=8001
MAX_UPLOAD_MB=50
NODE_ENV=production
```

### À ne jamais faire
```javascript
// ❌ SQL injection
db.query(`SELECT * FROM users WHERE name = '${req.body.name}'`);

// ✅ Paramétré
db.prepare('SELECT * FROM users WHERE name = ?').get(req.body.name);

// ❌ Mot de passe en clair
users[name] = req.body.password;

// ✅ Haché
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
```

---

## 17. Optimisations de Performance

### Frontend
- `React.lazy()` + `Suspense` pour le code splitting des pages
- Debounce 300ms sur la recherche (évite les requêtes en rafale)
- `AnimatePresence` de Framer Motion pour transitions légères
- Éviter les re-renders inutiles avec `useMemo` / `useCallback`

### Backend
- Index DB sur les colonnes de jointure et de filtrage
- `LIMIT` sur toutes les requêtes de liste (activity: 50, notifications: 20, search: 5+5)
- Compression gzip pour les réponses API (middleware `compression`)
- Cache `Cache-Control` pour les assets statiques servis par Express

### Base de données
- Utiliser des transactions pour les opérations multi-tables
- `EXPLAIN QUERY PLAN` en SQLite pour analyser les requêtes lentes
- Pagination sur les listes longues (cursor-based ou offset)

---

## 18. Stratégie de Déploiement

### Option A — Railway (Recommandée pour démarrer)
```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "cd frontend && npm install && npm run build"

[deploy]
startCommand = "node server.js"
restartPolicyType = "ON_FAILURE"
```

**Avantages** : Déploiement git-push, PostgreSQL intégré, SSL automatique, gratuit (500h/mois)

### Option B — VPS + Nginx + PM2
```nginx
# /etc/nginx/sites-available/docs
server {
    listen 443 ssl;
    server_name docs.monequipe.com;
    
    ssl_certificate /etc/letsencrypt/live/docs.monequipe.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.monequipe.com/privkey.pem;
    
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        root /var/www/docs/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```
```bash
pm2 start server.js --name docs-platform
pm2 save && pm2 startup
```

### Option C — Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN cd frontend && npm ci && npm run build
EXPOSE 8001
CMD ["node", "server.js"]
```

### Checklist avant déploiement
- [ ] `SESSION_SECRET` fort (64+ caractères aléatoires)
- [ ] `DATABASE_URL` pointant vers PostgreSQL de prod
- [ ] `NODE_ENV=production`
- [ ] Frontend buildé (`cd frontend && npm run build`)
- [ ] Sauvegardes DB automatiques configurées
- [ ] Reverse proxy avec SSL/TLS
- [ ] Variables d'env injectées (jamais dans le code)

---

## 19. Structure des APIs (Référence complète)

```
AUTH
POST  /api/auth/setup              Création premier administrateur
POST  /api/auth/login              Connexion {username, password}
POST  /api/auth/logout             Déconnexion
GET   /api/auth/me                 Profil de l'utilisateur connecté
POST  /api/auth/change-password    Changement de mot de passe

PROJETS
GET   /api/projects                Liste des projets (+ is_favorite, doc_count)
POST  /api/projects                Créer un projet {name, description}
GET   /api/projects/:id            Détail projet + documents + commentaires
PUT   /api/projects/:id            Modifier {name, description}
DELETE /api/projects/:id           Supprimer (cascade documents)

DOCUMENTS
POST  /api/projects/:id/files                      Upload (multipart)
POST  /api/projects/:id/files/:docId/content       Sauvegarder contenu texte
PUT   /api/projects/:id/files/:docId               Renommer / modifier tags
GET   /api/projects/:id/files/:docId/preview       Aperçu (text/image/pdf)
GET   /api/projects/:id/files/:docId/download      Téléchargement
DELETE /api/projects/:id/files/:docId              Supprimer

VERSIONS
GET   /api/projects/:id/files/:docId/versions          Liste des versions
POST  /api/projects/:id/files/:docId/restore/:vid      Restaurer une version

COLLABORATION
POST  /api/projects/:id/comments   Ajouter un commentaire
GET   /api/projects/:id/activity   Journal d'activité (50 derniers)
POST  /api/projects/:id/favorite   Basculer favori

GESTION UTILISATEURS (admin only)
GET   /api/users                   Liste des utilisateurs
PUT   /api/users/:id/role          Modifier le rôle
DELETE /api/users/:id              Supprimer un utilisateur

SYSTÈME
GET   /api/config                  Configuration (authRequired, maxUploadMb)
GET   /api/search?q=...            Recherche globale
GET   /api/notifications           Notifications de l'utilisateur
POST  /api/notifications/read      Marquer tout comme lu
```

---

## 20. Étapes de Développement dans le Bon Ordre

### Phase 1 — Fondations (✅ Fait / 🔄 En cours)
```
✅ 1.  Initialisation projet Node.js + Express
✅ 2.  Schéma DB SQLite/PostgreSQL (projets, documents, activité)
✅ 3.  API CRUD projets + upload documents
✅ 4.  Frontend React + Vite + TypeScript
✅ 5.  Layout (Sidebar, Header, Breadcrumbs)
✅ 6.  Pages Home, Project, Preview
✅ 7.  Commentaires, activité, favoris, notifications
✅ 8.  Recherche globale
🔄 9.  Auth complète (users, roles, RBAC)
🔄 10. Suppression projets et documents
🔄 11. Versioning des documents
🔄 12. Dark/Light mode toggle
🔄 13. Éditeur Markdown avec toolbar
🔄 14. Gestion utilisateurs (admin)
🔄 15. Paramètres complets
```

### Phase 2 — Enrichissement
```
16. Édition inline de projets (rename, description)
17. Catégories/dossiers pour documents
18. Templates de documents
19. Export PDF/Markdown
20. Filtres avancés (par tag, date, auteur)
21. Raccourcis clavier (Ctrl+K search, Ctrl+S save)
22. Autosave dans l'éditeur
23. Indicateur "non sauvegardé"
```

### Phase 3 — Collaboration temps réel
```
24. Socket.IO pour présence utilisateurs
25. Commentaires inline sur paragraphes
26. Mentions @utilisateur avec notifications
27. Révisions avec workflow approbation
28. Analytics du projet (vues, contributeurs actifs)
```

### Phase 4 — Enterprise
```
29. Migration Astro 5 (parties publiques/statiques)
30. SSO (OAuth Google/GitHub)
31. Webhooks (intégration Slack, Teams)
32. API publique documentée
33. Audit logs avancés
34. Permissions par projet (accès granulaire)
```

---

*Document maintenu dans `ARCHITECTURE.md` — mise à jour à chaque phase.*
