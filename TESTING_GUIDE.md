# Guide de Test - Capitance

Ce guide vous aide à tester les nouvelles fonctionnalités implémentées.

## 🔍 1. Tester Swagger UI

### Démarrer le backend

```bash
cd back
npm run dev
```

### Accéder à la documentation

1. Ouvrez votre navigateur
2. Allez sur : **http://localhost:3000/api-docs**
3. Vous devriez voir la documentation Swagger UI

### Ce que vous devriez voir

- Liste complète des endpoints API
- Schémas de données
- Possibilité de tester les endpoints directement
- Authentification documentée

## 🛡️ 2. Tester la Protection CSRF

### Option A : Test avec l'Application Frontend

#### 1. Démarrer backend et frontend

```bash
# Terminal 1 - Backend
cd back
npm run dev

# Terminal 2 - Frontend
cd front
npm run dev
```

#### 2. Ouvrir l'application

- Frontend : **http://localhost:3001**

#### 3. Tester le flux complet

1. **Ouvrir DevTools** (F12) → Onglet **Network**
2. **Créer un compte** ou **se connecter**
3. **Vérifier dans Network** :
   - La première requête GET récupère un cookie `csrf-token`
   - Les requêtes POST/DELETE incluent le header `X-CSRF-Token`

#### 4. Vérifier dans Console

```javascript
// Dans la console du navigateur, vérifier le cookie CSRF
document.cookie.split(';').find(c => c.includes('csrf-token'))
```

### Option B : Test avec cURL

#### 1. Obtenir le token CSRF

```bash
# Récupérer le token et sauvegarder les cookies
curl -c cookies.txt http://localhost:3000/api/csrf-token

# Vous devriez voir :
# {"success":true,"token":"abc123..."}
```

#### 2. Extraire le token du cookie

```bash
# Windows (PowerShell)
$token = (Get-Content cookies.txt | Select-String "csrf-token" | ForEach-Object { ($_ -split "\t")[-1] })

# Linux/Mac
TOKEN=$(cat cookies.txt | grep csrf-token | awk '{print $NF}')
```

#### 3. Tester une requête protégée

```bash
# Tentative SANS token CSRF (devrait échouer)
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"email":"test@example.com","password":"password123"}' \
  http://localhost:3000/api/v1/auth/login

# Résultat attendu : 403 Forbidden
# {"success":false,"message":"CSRF token missing...","code":"CSRF_TOKEN_MISSING"}
```

```bash
# Tentative AVEC token CSRF (devrait réussir)
# Windows PowerShell
curl -b cookies.txt `
  -H "Content-Type: application/json" `
  -H "X-CSRF-Token: $token" `
  -X POST `
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\"}' `
  http://localhost:3000/api/v1/auth/login

# Linux/Mac
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -X POST \
  -d '{"email":"test@example.com","password":"password123"}' \
  http://localhost:3000/api/v1/auth/login
```

### Option C : Test avec Postman

1. **Récupérer le token** :
   - GET `http://localhost:3000/api/csrf-token`
   - Postman sauvegarde automatiquement le cookie

2. **Copier le token** de la réponse

3. **Faire une requête protégée** :
   - POST `http://localhost:3000/api/v1/auth/login`
   - Headers :
     - `Content-Type: application/json`
     - `X-CSRF-Token: <le_token_copié>`
   - Body (JSON) :
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```

## 🔒 3. Tester la Sécurité CSV

### Préparer un fichier de test malveillant

Créez un fichier `malicious.csv` :

```csv
name;isin;quantity;buyingPrice;lastPrice;amount;amountVariation;variation
=cmd|'/c calc'|!A1;US0378331005;10;100;110;1100;100;10%
+1+1;US0378331005;5;100;110;550;50;10%
-1-1;US0378331005;3;100;110;330;30;10%
@SUM(A1:A10);US0378331005;2;100;110;220;20;10%
Normal Stock;US0378331005;1;100;110;110;10;10%
```

### Uploader le fichier

1. **Connectez-vous** à l'application
2. **Allez dans "Fichiers"**
3. **Uploadez** `malicious.csv`

### Vérifier la protection

Le fichier devrait être **rejeté** avec un message :
```
"Fichier CSV invalide ou dangereux"
"Potential CSV injection detected"
```

### Vérifier les logs backend

Dans les logs du backend, vous devriez voir :
```
CSV validation warnings
Potential CSV injection detected (cell starts with dangerous character: '=')
```

## 📊 4. Tester Redis (Optionnel)

### Si Redis est activé

#### 1. Vérifier que Redis est démarré

```bash
redis-cli ping
# Devrait répondre : PONG
```

#### 2. Démarrer l'application avec Redis

```bash
# Dans back/.env
REDIS_ENABLED=true
```

#### 3. Faire des requêtes

```bash
# Se connecter
# Faire une requête pour les snapshots
# Refaire la même requête

# Vérifier dans les logs : "Cache hit" pour la 2ème requête
```

#### 4. Vérifier le cache Redis

```bash
redis-cli

# Lister les clés
KEYS capitance:*

# Voir le contenu d'une clé
GET capitance:snapshots:user:123:*
```

## ✅ Checklist Complète

- [ ] Swagger UI accessible sur http://localhost:3000/api-docs
- [ ] Token CSRF récupéré sur `/api/csrf-token`
- [ ] Requêtes POST/DELETE sans token → 403 CSRF_TOKEN_MISSING
- [ ] Requêtes POST/DELETE avec token → Succès
- [ ] Frontend inclut automatiquement le header X-CSRF-Token
- [ ] Fichier CSV avec formules malveillantes rejeté
- [ ] Redis fonctionne et met en cache (si activé)
- [ ] Logs backend montrent les validations CSV
- [ ] Shutdown graceful (Ctrl+C ferme Redis et MongoDB proprement)

## 🐛 Dépannage

### Swagger ne s'affiche pas

- Vérifiez que vous êtes en mode développement (`NODE_ENV=development`)
- Vérifiez les logs : "Swagger UI available at /api-docs"
- Vérifiez que le fichier `back/openapi.yaml` existe

### CSRF token missing

- Vérifiez que le cookie est bien envoyé : `credentials: 'include'`
- Vérifiez que le header `X-CSRF-Token` est présent
- Vérifiez dans DevTools → Application → Cookies

### CSV non rejeté

- Vérifiez les logs backend pour voir les validations
- Le fichier doit avoir l'extension `.csv`
- Le MIME type doit être `text/csv`

### Redis connection failed

- Vérifiez que Redis est démarré : `redis-cli ping`
- L'application continue de fonctionner sans Redis (mode dégradé)
- Les logs montrent : "Redis is disabled. Caching will be skipped."

## 📝 Notes

- **Développement** : Swagger est activé uniquement en mode dev
- **Production** : CSRF et validation CSV sont toujours actifs
- **Redis** : Optionnel mais recommandé en production
- **Logs** : Consultez `back/logs/` pour le détail des opérations
