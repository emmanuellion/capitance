# Capitance

**Capitance** est une application web d'analyse et de suivi de portefeuille d'investissement. Elle permet aux investisseurs d'importer des relevés de plusieurs courtiers, d'analyser leurs performances et de visualiser l'évolution de leurs investissements dans le temps.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Sécurité](#sécurité)
- [Développement](#développement)
- [Déploiement](#déploiement)
- [Contribution](#contribution)
- [License](#license)

## ✨ Fonctionnalités

### Gestion de portefeuille
- 📊 **Import multi-courtiers** : Support de Boursobank, Fortuneo, Bourse Direct, Trade Republic, Interactive Brokers, DEGIRO
- 🔍 **Détection automatique** : Reconnaissance automatique du format de fichier CSV
- 📈 **Analyse de performance** : Calcul des gains/pertes, rendements, variations intraday
- 🕐 **Timeline historique** : Suivi de l'évolution du portefeuille dans le temps
- 💼 **Vue par position** : Détails complets de chaque actif détenu

### Sécurité
- 🔐 **Authentification JWT** : Avec rotation des tokens refresh
- 🛡️ **Protection CSRF** : Double Submit Cookie pattern
- 🔒 **Validation CSV** : Protection contre les injections et fichiers malveillants
- 📝 **Logs structurés** : Journalisation complète des activités
- ⚡ **Rate limiting** : Protection contre les abus

### Performance
- ⚙️ **Cache Redis** : Optimisation des requêtes fréquentes
- 📦 **Compression** : Gzip/Brotli pour réduire la bande passante
- 🎯 **Virtualisation** : Tables virtualisées pour grandes listes

## 🏗️ Architecture

```
capitance/
├── back/          # Backend API (Node.js + Express + TypeScript)
├── front/         # Frontend Web (Next.js 16 + React 19 + TypeScript)
└── desktop/       # Application Desktop (placeholder)
```

### Stack Technologique

**Backend:**
- Node.js 20+ avec TypeScript
- Express.js 5
- MongoDB (base de données)
- Redis (cache optionnel)
- JWT pour l'authentification
- Winston pour les logs

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- TanStack Query (React Query)
- Chart.js pour les graphiques
- Radix UI pour les composants

## 📦 Prérequis

- **Node.js** ≥ 20.x
- **MongoDB** ≥ 6.0
- **Redis** ≥ 7.0 (optionnel, recommandé pour la production)
- **npm** ou **yarn**

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/votre-username/capitance.git
cd capitance
```

### 2. Installer les dépendances

```bash
# Backend
cd back
npm install

# Frontend
cd ../front
npm install
```

### 3. Configuration

Créez les fichiers `.env` dans chaque dossier :

#### Backend (`back/.env`)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/capitance

# JWT Secrets (générer avec: openssl rand -base64 32)
JWT_ACCESS_SECRET=votre_secret_access_32_caracteres_minimum
JWT_REFRESH_SECRET=votre_secret_refresh_32_caracteres_minimum
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRY_REMEMBER=30d

# Cookies
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
COOKIE_SAME_SITE=strict

# Redis (optionnel)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=capitance:
REDIS_DEFAULT_TTL=300

# Email (actuellement console uniquement)
EMAIL_SERVICE=console
EMAIL_FROM=noreply@capitance.com
EMAIL_FROM_NAME=Capitance

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Security
MIN_PASSWORD_LENGTH=8
```

#### Frontend (`front/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 4. Démarrer les services

#### Démarrer MongoDB
```bash
mongod --dbpath=/path/to/data
```

#### Démarrer Redis (optionnel)
```bash
redis-server
```

#### Démarrer le backend
```bash
cd back
npm run dev
```

#### Démarrer le frontend
```bash
cd front
npm run dev
```

L'application sera disponible sur :
- **Frontend** : http://localhost:3001
- **Backend API** : http://localhost:3000

## 📖 Utilisation

### Créer un compte

1. Accédez à http://localhost:3001
2. Cliquez sur "S'inscrire"
3. Remplissez le formulaire
4. Vérifiez votre email (en mode développement, le token est affiché dans les logs)

### Importer un portefeuille

1. Connectez-vous
2. Allez dans "Fichiers"
3. Cliquez sur "Importer un fichier CSV"
4. Sélectionnez votre relevé de courtier
5. Le système détecte automatiquement le format et analyse le fichier

### Formats supportés

| Courtier | Format | Notes |
|----------|--------|-------|
| **Boursobank** | CSV avec colonnes: name, isin, quantity, buyingPrice, lastPrice, etc. | Format français (`;` séparateur, `,` décimal) |
| **Fortuneo** | CSV avec colonnes: Libellé, Code ISIN, Quantité, PRU, Cours, Valorisation, etc. | Format français (`;` séparateur, `,` décimal) |
| **Bourse Direct** | CSV avec colonnes: Valeur, ISIN, Qté, PRU, Cours, Valorisation, etc. | Format français (`;` séparateur, `,` décimal) |
| **Trade Republic** | CSV avec colonnes: name, isin, shares, averageBuyInPrice, currentPrice, etc. | Format allemand (`,` séparateur, `.` décimal) |
| **Interactive Brokers** | CSV avec colonnes: Symbol, Description, Quantity, MarketPrice, CostBasis, etc. | Format US |
| **DEGIRO** | CSV générique | Détection heuristique |

> 📖 Pour plus de détails sur Fortuneo et Bourse Direct, consultez [FORTUNEO_BOURSE_DIRECT.md](back/FORTUNEO_BOURSE_DIRECT.md)

## 🔒 Sécurité

### Authentification

- **JWT avec rotation** : Les access tokens expirent après 15 minutes, les refresh tokens après 7 jours (30 jours avec "Se souvenir de moi")
- **HttpOnly cookies** : Protection contre le vol de tokens via XSS
- **Révocation de tokens** : Déconnexion de tous les appareils disponible

### Protection CSRF

L'application utilise le pattern **Double Submit Cookie** :
- Token CSRF dans un cookie HttpOnly
- Token CSRF dans le header `X-CSRF-Token` des requêtes

Voir [CSRF_IMPLEMENTATION.md](back/CSRF_IMPLEMENTATION.md) pour les détails d'implémentation.

### Validation CSV

- **Détection d'injections** : Protection contre les formules Excel/Sheets malveillantes
- **Limites strictes** : 10MB max, 10,000 lignes max, 50 colonnes max
- **Validation du contenu** : Vérification de la structure et du format

### Rate Limiting

- **5 requêtes / 15 min** sur les endpoints d'authentification
- **100 requêtes / 15 min** sur l'API générale

## 🛠️ Développement

### Structure du projet

```
back/
├── src/
│   ├── config/         # Configuration (DB, Redis, etc.)
│   ├── controllers/    # Contrôleurs Express
│   ├── middleware/     # Middleware (auth, CSRF, upload, etc.)
│   ├── models/         # Modèles MongoDB
│   ├── routes/         # Routes API
│   ├── services/       # Logique métier
│   │   └── parsers/    # Parsers CSV par courtier
│   ├── types/          # Types TypeScript
│   ├── utils/          # Utilitaires
│   └── index.ts        # Point d'entrée
├── uploads/            # Fichiers uploadés (gitignored)
└── logs/               # Logs Winston (gitignored)

front/
├── src/
│   ├── app/            # Pages Next.js (App Router)
│   ├── components/     # Composants React
│   ├── contexts/       # Context API
│   ├── lib/            # Utilitaires et API client
│   └── styles/         # CSS global
└── public/             # Assets statiques
```

### Scripts disponibles

#### Backend
```bash
npm run dev          # Démarrage en mode développement
npm run build        # Build production
npm start            # Démarrage production
npm run lint         # Linting ESLint
npm run format       # Formatting Prettier
```

#### Frontend
```bash
npm run dev          # Démarrage en mode développement
npm run build        # Build production
npm start            # Démarrage production
npm run lint         # Linting ESLint
```

### Ajouter un nouveau parser de courtier

Voir [PARSER_ARCHITECTURE.md](back/PARSER_ARCHITECTURE.md) pour un guide complet.

Résumé :
1. Créer une classe qui étend `BaseSnapshotParser`
2. Implémenter les méthodes `canParse()`, `parse()`, etc.
3. Enregistrer le parser avec `parserFactory.register()`

### Running Tests

#### Backend
```bash
cd back
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # Interactive UI
npm run test:coverage # Coverage report
```

#### Frontend
```bash
cd front
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📚 Documentation

Comprehensive documentation is available:

### Backend Documentation (`back/docs/`)
- [API Reference](back/docs/API_REFERENCE.md) - Complete API endpoint documentation
- [Database Schemas](back/docs/DATABASE_SCHEMAS.md) - MongoDB collection structures
- [Deployment Guide](back/docs/DEPLOYMENT.md) - Production deployment instructions
- [Real-time Prices](back/docs/REALTIME_PRICES.md) - Real-time price system guide
- [Parser Architecture](back/PARSER_ARCHITECTURE.md) - CSV parser implementation guide
- [CSRF Implementation](back/CSRF_IMPLEMENTATION.md) - Security implementation details

### Frontend Documentation (`front/docs/`)
- [Component Library](front/docs/COMPONENT_LIBRARY.md) - React component documentation
- [State Management](front/docs/STATE_MANAGEMENT.md) - State management patterns
- [Testing Guide](front/docs/TESTING_GUIDE.md) - Frontend testing practices

## 🚢 Déploiement

### Variables d'environnement en production

**Critiques à changer :**
- `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` : Générer des valeurs cryptographiquement sécurisées
- `COOKIE_SECURE=true` : Activer pour HTTPS uniquement
- `MONGODB_URI` : Pointer vers MongoDB de production
- `REDIS_ENABLED=true` : Activer Redis en production pour les performances
- `NODE_ENV=production`

### Build

```bash
# Backend
cd back
npm run build

# Frontend
cd front
npm run build
```

### Docker (Recommandé)

```bash
# TODO: Ajouter Dockerfile et docker-compose.yml
docker-compose up -d
```

### Recommandations

- Utilisez un reverse proxy (Nginx, Caddy) pour le HTTPS
- Activez Redis pour le cache
- Configurez MongoDB avec authentification et réplication
- Mettez en place un monitoring (ex: PM2, Datadog)
- Sauvegardez régulièrement MongoDB

## 📊 Monitoring

Les logs sont stockés dans `back/logs/` :
- `combined.log` : Tous les logs
- `error.log` : Erreurs uniquement
- Rotation quotidienne automatique

Format des logs : JSON structuré avec timestamps.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation dans `/docs`

## 🗺️ Roadmap

- [ ] Tests unitaires et d'intégration complets
- [ ] Support de plus de courtiers (Saxo, Degiro avancé, etc.)
- [ ] Export PDF des rapports
- [ ] Alertes et notifications
- [ ] Application mobile
- [ ] Support multi-devises
- [ ] Analyse fiscale
- [ ] Comparaison avec indices de référence
