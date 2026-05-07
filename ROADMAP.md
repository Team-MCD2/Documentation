# Roadmap — Plateforme de Documentation Collaborative

---

## État actuel du projet

| Fonctionnalité | Statut |
|---------------|--------|
| Structure Express + React | ✅ |
| CRUD Projets (partiel) | ✅ |
| Upload + Preview documents | ✅ |
| Commentaires / Discussions | ✅ |
| Journal d'activité | ✅ |
| Favoris | ✅ |
| Notifications | ✅ |
| Recherche globale | ✅ |
| **Authentification avec rôles** | ✅ |
| **Suppression projets/documents** | ✅ |
| **Versioning documents** | ✅ |
| **Dark/Light mode** | ✅ |
| **Éditeur Markdown toolbar** | ✅ |
| **Gestion utilisateurs** | ✅ |

---

## Phase 1 — MVP Solide (Semaines 1-2)

> **Objectif** : Plateforme utilisable par l'équipe au quotidien

### Priorités absolues
1. **Auth complète avec rôles** (Admin / Éditeur / Lecteur)
   - Login username + mot de passe haché
   - Setup page pour le premier admin
   - Middleware RBAC sur chaque route
   - Badges de rôle dans la sidebar

2. **Suppression** (avec confirmation)
   - Supprimer un projet (cascade sur documents)
   - Supprimer un document
   - Confirmation modale avant action destructive

3. **Versioning documents**
   - Version créée à chaque sauvegarde
   - Onglet "Historique" dans Preview
   - Restauration d'une version antérieure

4. **Dark/Light mode**
   - Toggle dans le header
   - Persistance en localStorage

5. **Éditeur Markdown amélioré**
   - Toolbar : Gras, Italique, Titre H1/H2, Code, Lien, Liste
   - Raccourci Ctrl+S pour sauvegarder

6. **Paramètres complets**
   - Modifier son nom d'affichage et mot de passe
   - Admin : liste des utilisateurs, modification des rôles

### Ce qu'on reporte (pas dans le MVP)
- Édition WYSIWYG avancée (TipTap)
- Temps réel multi-utilisateurs
- Export PDF
- OAuth / SSO

---

## Phase 2 — Enrichissement (Semaines 3-4)

> **Objectif** : Expérience professionnelle, comparable à GitBook

### Fonctionnalités
- [x] Modifier un projet (renommer, changer description)
- [ ] Catégories/dossiers pour les documents dans un projet
- [ ] Templates de documents (Guide, API, Tutoriel...)
- [ ] Tags avancés avec filtrage dans les projets
- [ ] Filtres de liste (par auteur, date, type)
- [ ] Export document en Markdown / PDF
- [x] Raccourcis clavier (`Ctrl+S` → sauvegarde, `Escape` → annuler)
- [x] Autosave toutes les 30 secondes dans l'éditeur
- [x] Indicateur "modifications non sauvegardées"
- [ ] Pagination sur les grandes listes de documents
- [x] Avatar coloré unique par utilisateur

---

## Phase 3 — Collaboration Temps Réel (Semaines 5-6)

> **Objectif** : Vraie collaboration d'équipe, comme Notion

### Fonctionnalités
- [ ] Socket.IO — indicateur de présence (qui lit quoi en temps réel)
- [ ] Commentaires inline sur les paragraphes d'un document
- [ ] Mentions `@utilisateur` dans les commentaires + notifications
- [ ] Workflow de révision : brouillon → révision → publié
- [ ] Statistiques projet (vues, docs les plus consultés, activité)
- [ ] Tableau de bord analytics de l'équipe

---

## Phase 4 — Enterprise & Évolutivité (Futur)

> **Objectif** : Plateforme de niveau entreprise

### Fonctionnalités
- [ ] Migration partielle vers **Astro 5** (pages publiques, SEO)
- [ ] SSO : OAuth Google / GitHub / GitLab
- [ ] Permissions par projet (accès granulaire par utilisateur)
- [ ] Intégration GitHub : documentation liée aux repos
- [ ] Webhooks (notifications Slack/Teams sur modification)
- [ ] API publique documentée (Swagger/OpenAPI)
- [ ] Audit logs avancés (qui a fait quoi, quand, depuis quelle IP)
- [ ] Mobile app (React Native ou PWA)

---

## Erreurs à Éviter

### Architecture
- ❌ **Secrets dans le code** → toujours dans `.env`
- ❌ **Requêtes SQL concaténées** → toujours paramétrées (prévention injection)
- ❌ **Mots de passe en clair** → scrypt + salt unique par utilisateur
- ❌ **Pas de validation côté serveur** → valider TOUTES les entrées
- ❌ **Rôles vérifiés uniquement côté client** → vérifier dans le middleware

### Performance
- ❌ **N+1 queries** → jointures SQL ou chargement groupé
- ❌ **Charger tout le contenu des fichiers** → pagination, lazy loading
- ❌ **Pas d'index sur les colonnes de jointure** → indexer project_id, user_name
- ❌ **Bundles trop lourds** → code splitting React.lazy(), éviter les grosses dépendances

### UX
- ❌ **Actions destructives sans confirmation** → toujours une modale
- ❌ **Pas de feedback visuel** → toujours un état loading, un toast de succès/erreur
- ❌ **Formulaires sans validation** → messages d'erreur clairs et immédiats
- ❌ **Navigation cassée sur refresh** → gestion correcte des routes React Router

### Maintenabilité
- ❌ **Toute la logique dans les composants** → séparer en hooks, contextes, api.ts
- ❌ **Pas de types TypeScript** → typer toutes les réponses API
- ❌ **CSS inline partout** → utiliser les classes CSS définies dans index.css

---

## Meilleures Pratiques des Grandes Plateformes

### Stripe Documentation
- ✅ Recherche instantanée avec aperçu des résultats
- ✅ Exemples de code dans plusieurs langages
- ✅ Navigation sticky sur longue page
- ✅ Breadcrumbs toujours visibles

### GitHub Docs
- ✅ Versioning visible (quelle version de l'API)
- ✅ Contribution facile (bouton "Edit on GitHub")
- ✅ Navigation left panel + table des matières right panel
- ✅ Résumé de la page en haut

### Vercel Documentation
- ✅ Design épuré, dark mode natif
- ✅ Performance avant tout (Lighthouse 100)
- ✅ Liens de navigation clairs (pas de profondeur > 3)

### GitBook
- ✅ Hiérarchie claire (espaces → sections → pages)
- ✅ Éditeur WYSIWYG intuitif
- ✅ Collaboration en temps réel
- ✅ Historique de révisions visuel

### À implémenter dans notre plateforme
1. **Feedback immédiat** sur chaque action (toast, loading state)
2. **Empty states** soignés (pas de page blanche)
3. **URL partageables** pour chaque document
4. **Métadonnées riches** sur chaque doc (auteur, date, nombre de versions)
5. **Navigation clavier** complète
6. **Responsive** parfait sur mobile et tablet

---

## Décisions Techniques Clés

| Décision | Choix | Alternative envisagée | Raison |
|----------|-------|-----------------------|--------|
| Auth | Sessions + Cookie | JWT | Révocation facile, plus simple |
| Crypto | Node.js built-in | bcrypt | Pas de dépendance native à compiler |
| DB dev | SQLite | JSON files | ACID, requêtes, migrations faciles |
| DB prod | PostgreSQL | MySQL | JSON natif, full-text search, extensions |
| Frontend | React SPA | Astro | Meilleur pour appli collaborative avec auth |
| Animations | Framer Motion | CSS only | UX premium, transitions complexes |
| Build | Vite | CRA/Webpack | Vitesse HMR, modernité |

---

*Roadmap mise à jour régulièrement dans `ROADMAP.md`*
