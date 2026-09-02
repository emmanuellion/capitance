# Capitance

Application web de suivi et d'analyse de portefeuille d'investissement. Elle importe des relevés de plusieurs courtiers, se connecte à Binance, enrichit les positions avec des cours en temps réel et suit l'évolution de la valorisation dans le temps.

Projet personnel, développé en TypeScript de bout en bout.

## Sommaire

- [Aperçu](#aperçu)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancer le projet](#lancer-le-projet)
- [API](#api)
- [Formats de relevés supportés](#formats-de-relevés-supportés)
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Scripts disponibles](#scripts-disponibles)
- [Documentation](#documentation)
- [Déploiement](#déploiement)
- [État du projet](#état-du-projet)
- [Licence](#licence)

## Aperçu

### Portefeuille

- **Import multi-courtiers** : dépôt d'un export CSV, le format est reconnu automatiquement (score de confiance supérieur à 0,7, sinon le fichier est rejeté).
- **Snapshots historiques** : chaque import devient un instantané daté, ce qui permet de reconstituer la courbe de valorisation.
- **Vue par position** : quantité, prix de revient unitaire, cours courant, plus ou moins-value latente.
- **Mapping de symboles** : table de correspondance ISIN / ticker, pré-remplie puis enrichissable, pour relier une ligne de relevé au bon instrument coté.

### Cours en temps réel

Trois fournisseurs sont intégrés, avec cache et rafraîchissement en tâche de fond :

- **Twelve Data** (clé API requise)
- **Yahoo Finance**
- **Alpha Vantage**

Les cours sont mis en cache (Redis si activé, mémoire sinon) et un worker les rafraîchit en arrière-plan pour éviter de saturer les quotas des API.

### Intégration Binance

- Connexion du compte via clé API Binance, chiffrée au repos avec `BINANCE_ENCRYPTION_KEY`.
- Récupération du portefeuille crypto et fusion avec les positions titres.
- Planificateur de snapshot quotidien (`binanceSnapshotScheduler`), heure configurable.

### Sécurité et performance

- Authentification JWT avec rotation des refresh tokens, cookies `HttpOnly`.
- Protection CSRF (Double Submit Cookie).
- Validation stricte des CSV : injection de formules, taille, nombre de lignes et de colonnes.
- Rate limiting, `helmet`, CORS sur liste blanche d'origines.
- Compression gzip/brotli, cache Redis optionnel, virtualisation des grandes tables côté front.
- Logs structurés Winston avec rotation quotidienne.

## Architecture

```
capitance/
├── back/       API REST : Node.js 20+, Express 5, TypeScript (ESM), MongoDB
├── front/      Interface web : Next.js 16 (App Router), React 19, TypeScript
└── desktop/    Emplacement réservé pour une future application desktop (vide)
```

### Backend (`back/`)

```
src/
├── config/        configuration, connexions MongoDB et Redis
├── controllers/   auth, fichiers, snapshots, prix temps réel, Binance
├── errors/        hiérarchie d'erreurs applicatives (AppError et dérivées)
├── middleware/    auth, CSRF, upload, sécurité, gestion d'erreurs
├── models/        accès MongoDB (User, PortfolioSnapshot, BinanceSnapshot,
│                  SymbolMapping, Upload) et création des index
├── routes/        routes legacy (/api) et versionnées (/api/v1)
├── services/
│   └── parsers/   un parser par courtier, détecteur de format, factory
├── types/         types partagés (parser, snapshot)
└── utils/         JWT, chiffrement, logger, validation, dates, nombres
```

Le backend utilise le driver MongoDB natif, sans ORM. Les index sont créés au démarrage.

### Stack

**Backend** : Express 5, driver `mongodb`, `ioredis`, `jsonwebtoken`, `bcryptjs`, `papaparse`, `multer`, `helmet`, `express-rate-limit`, `express-validator`, `winston`, `swagger-ui-express`.

**Frontend** : Next.js 16, React 19, Tailwind CSS v4, TanStack Query, Chart.js via `react-chartjs-2`, Radix UI, `react-hook-form` avec Zod, `react-window`, Framer Motion, `lucide-react`.

**Tests** : Vitest des deux côtés, `mongodb-memory-server` et `redis-mock` côté back, Testing Library et MSW côté front.

## Prérequis

- **Node.js** 20 ou plus : le backend est en ESM et utilise `import.meta.url`
- **MongoDB** 6.0 ou plus, instance locale ou Atlas
- **Redis** 7 ou plus, optionnel en développement, recommandé en production
- Une clé API **Twelve Data** pour les cours temps réel ; l'offre gratuite suffit pour développer

## Installation

```bash
git clone https://github.com/emmanuellion/capitance.git
cd capitance

cd back && npm install
cd ../front && npm install
```

> **À savoir** : `express` est actuellement déclaré dans les `devDependencies` du backend. Une installation de production avec `npm ci --omit=dev` ne l'installera pas.

## Configuration

### Backend (`back/.env`)

Copier `back/.env.example` et compléter.

| Variable | Rôle | Exemple |
|---|---|---|
| `PORT` | Port d'écoute de l'API | `3000` |
| `NODE_ENV` | `development` active Swagger UI | `development` |
| `ALLOWED_ORIGINS` | Origines CORS autorisées, séparées par des virgules | `http://localhost:3001` |
| `MONGODB_URI` | Chaîne de connexion MongoDB | `mongodb://localhost:27017/capitance` |
| `REDIS_ENABLED` | Active le cache Redis | `true` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` | Connexion Redis | `localhost`, `6379` |
| `REDIS_KEY_PREFIX` | Préfixe des clés | `capitance:` |
| `REDIS_DEFAULT_TTL` | TTL par défaut, en secondes | `300` |
| `JWT_ACCESS_SECRET` | Secret des access tokens, 32 caractères minimum | à générer |
| `JWT_REFRESH_SECRET` | Secret des refresh tokens, 32 caractères minimum | à générer |
| `JWT_ACCESS_EXPIRY` | Durée de vie d'un access token | `15m` |
| `JWT_REFRESH_EXPIRY` | Durée de vie d'un refresh token | `7d` |
| `JWT_REFRESH_EXPIRY_REMEMBER` | Idem avec « se souvenir de moi » | `30d` |
| `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAME_SITE` | Cookies d'authentification | `localhost`, `false`, `strict` |
| `EMAIL_SERVICE` | `console` écrit les mails dans les logs | `console` |
| `EMAIL_FROM`, `EMAIL_FROM_NAME` | Expéditeur | `noreply@capitance.com` |
| `FRONTEND_URL` | Base des liens envoyés par mail | `http://localhost:3001` |
| `MIN_PASSWORD_LENGTH` | Longueur minimale des mots de passe | `8` |
| `TWELVE_DATA_API_KEY` | Clé API Twelve Data | à renseigner |
| `TWELVE_DATA_CACHE_TTL` | TTL du cache de cours, en secondes | `120` |
| `BINANCE_ENCRYPTION_KEY` | Chiffrement des clés API Binance, 64 caractères hexadécimaux | à générer |
| `BINANCE_CACHE_TTL` | TTL du cache Binance, en secondes | `300` |
| `BINANCE_SNAPSHOT_TTL` | Rétention des snapshots Binance, en millisecondes | `7776000000` |
| `BINANCE_DAILY_SNAPSHOT_HOUR` | Heure du snapshot quotidien, de 0 à 23 | `0` |

Générer les secrets :

```bash
# JWT, 32 caractères minimum
openssl rand -base64 32

# Clé de chiffrement Binance, 64 caractères hexadécimaux
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (`front/.env.local`)

```env
# Base de l'API, sans le préfixe de version : le client ajoute /api/v1 lui-même
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Lancer le projet

Démarrer MongoDB, et Redis si `REDIS_ENABLED=true`.

```bash
# Terminal 1 : API sur le port 3000
cd back
npm run dev

# Terminal 2 : interface web sur le port 3001
cd front
npm run dev -- -p 3001
```

> **Le port 3001 n'est pas automatique.** Le script `dev` du frontend est un `next dev` nu, qui prend le port 3000 par défaut, celui du backend. Il faut donc passer `-p 3001` explicitement, sous peine de collision. Les valeurs `FRONTEND_URL` et `ALLOWED_ORIGINS` du backend pointent déjà sur 3001.

Une fois lancé :

| | URL |
|---|---|
| Interface web | http://localhost:3001 |
| API | http://localhost:3000/api/v1 |
| Documentation Swagger (développement uniquement) | http://localhost:3000/api-docs |

### Initialiser les correspondances de symboles

```bash
cd back
npm run init:mappings
```

Charge en base les correspondances ISIN / ticker prédéfinies (`src/data/predefinedMappings.ts`), nécessaires pour rattacher les lignes de relevé aux instruments cotés.

## API

L'API est versionnée. Les routes courantes sont sous `/api/v1` :

| Préfixe | Contenu |
|---|---|
| `/api/v1/auth` | inscription, connexion, rafraîchissement de token, vérification d'email, réinitialisation de mot de passe |
| `/api/v1/file` | upload et analyse des relevés CSV |
| `/api/v1/snapshots` | instantanés de portefeuille, historique, positions |
| `/api/v1/realtime` | cours en temps réel |
| `/api/v1/binance` | connexion du compte Binance, portefeuille crypto, snapshots |
| `/api/csrf-token` | récupération du jeton CSRF |

Les anciennes routes montées directement sur `/api` restent disponibles pour compatibilité et renvoient l'en-tête `X-API-Deprecated: true`. Ne pas les utiliser dans du nouveau code.

Le contrat complet est décrit dans `back/openapi.yaml` et servi par Swagger UI sur `/api-docs` quand `NODE_ENV=development`. Voir aussi [API_REFERENCE.md](back/docs/API_REFERENCE.md).

## Formats de relevés supportés

| Courtier | Séparateur / décimale | Parser |
|---|---|---|
| Boursobank | `;` / `,` | `BoursobankSnapshotParser` |
| Fortuneo | `;` / `,` | `FortuneoParser` |
| Bourse Direct | `;` / `,` | `BourseDirectParser` |
| Trade Republic | `,` / `.` | `TradeRepublicParser` |
| Interactive Brokers | `,` / `.` | `InteractiveBrokersParser` |
| Autres | détection heuristique | `GenericCSVParser` |

Le `FormatDetector` interroge chaque parser enregistré et retient celui dont le score de confiance dépasse 0,7. En dessous, le fichier est refusé plutôt que mal interprété.

Détails sur Fortuneo et Bourse Direct : [FORTUNEO_BOURSE_DIRECT.md](back/FORTUNEO_BOURSE_DIRECT.md).
Ajouter un courtier : [PARSER_ARCHITECTURE.md](back/PARSER_ARCHITECTURE.md).

## Sécurité

### Authentification

Access token de 15 minutes, refresh token de 7 jours (30 avec « se souvenir de moi »), rotation à chaque rafraîchissement. Les jetons transitent par des cookies `HttpOnly`, ce qui les met hors de portée d'un XSS. La déconnexion de tous les appareils révoque les refresh tokens.

### CSRF

Pattern Double Submit Cookie : un jeton est posé en cookie sur toutes les requêtes et doit être renvoyé dans l'en-tête `X-CSRF-Token` des requêtes mutantes. Détails : [CSRF_IMPLEMENTATION.md](back/CSRF_IMPLEMENTATION.md).

### Import de fichiers

- Détection des injections de formules (cellules commençant par `=`, `+`, `-` ou `@`).
- Limites : 10 Mo, 10 000 lignes, 50 colonnes.
- Corps de requête plafonné à 10 Mo.

### Rate limiting

5 requêtes par tranche de 15 minutes sur l'authentification, 100 sur le reste de l'API.

### Clés API Binance

Chiffrées avant stockage avec `BINANCE_ENCRYPTION_KEY`. Cette clé ne doit jamais être commitée ni réutilisée entre environnements : la changer rend illisibles les clés déjà enregistrées.

## Tests

```bash
cd back            # ou cd front
npm test           # exécution unique
npm run test:watch # mode watch
npm run test:ui    # interface Vitest
npm run test:coverage
```

Le backend teste ses services de cours (Alpha Vantage, Twelve Data, Yahoo Finance) et l'extraction de symboles, avec `mongodb-memory-server` et `redis-mock` pour isoler les dépendances. Le frontend utilise Testing Library et MSW. Voir [TESTING_GUIDE.md](TESTING_GUIDE.md) et [front/docs/TESTING_GUIDE.md](front/docs/TESTING_GUIDE.md).

## Scripts disponibles

### Backend

| Script | Effet |
|---|---|
| `npm run dev` | Démarrage avec rechargement à chaud (`tsx watch`) |
| `npm run build` | Compilation TypeScript vers `dist/` |
| `npm start` | Exécution de `dist/index.js` |
| `npm run init:mappings` | Chargement des correspondances de symboles |
| `npm test` | Vitest |
| `npm run test:watch`, `test:ui`, `test:coverage` | Variantes Vitest |

ESLint et Prettier sont installés côté backend mais aucun script `lint` ni `format` n'est déclaré ; il faut les appeler via `npx`.

### Frontend

| Script | Effet |
|---|---|
| `npm run dev` | Serveur de développement Next.js, ajouter `-- -p 3001` |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:watch`, `test:ui`, `test:coverage` | Variantes Vitest |

## Documentation

### Backend

- [API_REFERENCE.md](back/docs/API_REFERENCE.md) : endpoints
- [DATABASE_SCHEMAS.md](back/docs/DATABASE_SCHEMAS.md) : collections MongoDB
- [DEPLOYMENT.md](back/docs/DEPLOYMENT.md) : mise en production
- [REALTIME_PRICES.md](back/docs/REALTIME_PRICES.md) : système de cours temps réel
- [PARSER_ARCHITECTURE.md](back/PARSER_ARCHITECTURE.md) : ajouter un parser
- [CSRF_IMPLEMENTATION.md](back/CSRF_IMPLEMENTATION.md) : protection CSRF
- [FORTUNEO_BOURSE_DIRECT.md](back/FORTUNEO_BOURSE_DIRECT.md) : spécificités de ces deux formats

### Frontend

- [COMPONENT_LIBRARY.md](front/docs/COMPONENT_LIBRARY.md) : composants React
- [STATE_MANAGEMENT.md](front/docs/STATE_MANAGEMENT.md) : gestion d'état
- [TESTING_GUIDE.md](front/docs/TESTING_GUIDE.md) : tests frontend

## Déploiement

Guide détaillé : [DEPLOYMENT.md](back/docs/DEPLOYMENT.md).

À changer impérativement en production :

- `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` : valeurs aléatoires distinctes
- `BINANCE_ENCRYPTION_KEY` : 64 caractères hexadécimaux, propre à l'environnement
- `COOKIE_SECURE=true` : obligatoire dès que le site est en HTTPS
- `NODE_ENV=production` : désactive au passage l'exposition de Swagger UI
- `ALLOWED_ORIGINS` : uniquement le domaine du frontend
- `REDIS_ENABLED=true` : le cache n'est plus optionnel à l'échelle

```bash
cd back && npm run build
cd ../front && npm run build
```

Recommandations : reverse proxy pour le TLS (Nginx ou Caddy), MongoDB avec authentification et sauvegardes, supervision du processus Node, surveillance des logs `back/logs/` (`combined.log`, `error.log`, rotation quotidienne, format JSON).

Il n'y a pas encore de `Dockerfile` ni de `docker-compose.yml` dans le dépôt.

## État du projet

Projet personnel en cours de développement. Points ouverts connus :

- `express` est déclaré dans les `devDependencies` du backend au lieu des `dependencies`
- Pas de conteneurisation
- Le dossier `desktop/` est un emplacement réservé, encore vide
- Pas de script `lint` côté backend
- Le port du frontend doit être forcé à la main

### Pistes

- Conteneurisation et pipeline de déploiement
- Support de courtiers supplémentaires (DEGIRO, Saxo)
- Multi-devises et conversion de change
- Export PDF des rapports
- Alertes et notifications
- Comparaison avec des indices de référence

## Licence

Aucun fichier `LICENSE` n'est présent dans le dépôt à ce jour. En l'absence de licence explicite, le code reste sous droit d'auteur classique, tous droits réservés. Ajouter un fichier `LICENSE` pour autoriser explicitement la réutilisation.
