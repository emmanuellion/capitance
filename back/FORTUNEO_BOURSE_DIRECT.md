# Parsers Fortuneo et Bourse Direct

Ce document explique comment utiliser les parsers pour les fichiers CSV de **Fortuneo** et **Bourse Direct**.

## 📋 Table des matières

- [Fortuneo](#fortuneo)
- [Bourse Direct](#bourse-direct)
- [Format CSV attendu](#format-csv-attendu)
- [Personnalisation](#personnalisation)
- [Dépannage](#dépannage)

---

## 🏦 Fortuneo

### Format CSV attendu

Le parser Fortuneo attend un fichier CSV avec les colonnes suivantes (les noms peuvent varier légèrement) :

| Colonne | Nom alternatif | Description |
|---------|----------------|-------------|
| `Libellé` | `Libelle`, `Name` | Nom de l'actif |
| `Code ISIN` | `CodeISIN`, `ISIN` | Code ISIN de l'actif |
| `Quantité` | `Quantite`, `Quantity` | Nombre de titres |
| `PRU` | - | Prix de Revient Unitaire |
| `Cours` | `Price`, `CurrentPrice` | Prix actuel du titre |
| `Valorisation` | `Valeur`, `Value` | Valeur totale de la position |
| `+/- Value latente` | `ValueLatente`, `PlusMoinsValue` | Gain ou perte en valeur |
| `% +/- Value` | `ValuePercentage`, `Performance` | Gain ou perte en pourcentage |

### Exemple de fichier CSV Fortuneo

```csv
Libellé;Code ISIN;Quantité;PRU;Cours;Valorisation;+/- Value latente;% +/- Value
APPLE INC;US0378331005;10;150,50;175,25;1752,50;247,50;16,44
TOTAL ENERGIES;FR0000120271;25;45,20;52,80;1320,00;190,00;16,81
```

### Export depuis Fortuneo

Pour exporter votre portefeuille depuis Fortuneo :

1. Connectez-vous à votre compte Fortuneo
2. Allez dans **Bourse** > **Portefeuille**
3. Cliquez sur **Exporter** ou **Télécharger**
4. Sélectionnez le format **CSV**
5. Téléchargez le fichier

---

## 🏦 Bourse Direct

### Format CSV attendu

Le parser Bourse Direct attend un fichier CSV avec les colonnes suivantes :

| Colonne | Nom alternatif | Description |
|---------|----------------|-------------|
| `Valeur` | `Libelle`, `Name` | Nom de l'actif |
| `ISIN` | `Code ISIN` | Code ISIN de l'actif |
| `Qté` | `Qte`, `Quantite`, `Quantity` | Nombre de titres |
| `PRU` | - | Prix de Revient Unitaire |
| `Cours` | `Price`, `CurrentPrice` | Prix actuel du titre |
| `Valorisation` | `Valeur`, `Value` | Valeur totale de la position |
| `+/- value` | `PlusMoinsValue`, `GainLoss` | Gain ou perte en valeur |
| `Perf %` | `Perf`, `Performance %` | Gain ou perte en pourcentage |

### Exemple de fichier CSV Bourse Direct

```csv
Valeur;ISIN;Qté;PRU;Cours;Valorisation;+/- value;Perf %
APPLE INC;US0378331005;10;150,50;175,25;1752,50;247,50;16,44%
TOTAL ENERGIES;FR0000120271;25;45,20;52,80;1320,00;190,00;16,81%
```

### Export depuis Bourse Direct

Pour exporter votre portefeuille depuis Bourse Direct :

1. Connectez-vous à votre compte Bourse Direct
2. Allez dans **Portefeuille**
3. Cliquez sur **Exporter** ou l'icône de téléchargement
4. Sélectionnez le format **CSV** ou **Excel** (puis convertir en CSV)
5. Téléchargez le fichier

---

## ⚙️ Format CSV attendu

### Points communs des deux formats

Les deux parsers supportent :

- **Séparateur** : point-virgule (`;`) ou virgule (`,`)
- **Format des nombres** : format français avec espace ou point pour les milliers et virgule pour les décimales
  - Exemples : `1 234,56` ou `1234,56` ou `1.234,56`
- **Format des pourcentages** : avec ou sans le symbole `%`
  - Exemples : `16,44%` ou `16,44`
- **Encodage** : UTF-8 avec ou sans BOM

### Exemples de nombres valides

```
150,50         → 150.50
1 234,56       → 1234.56
1.234,56       → 1234.56
-50,25         → -50.25
16,44%         → 16.44
```

---

## 🔧 Personnalisation

Si votre fichier CSV a un format légèrement différent, vous pouvez modifier les parsers :

### Modifier le parser Fortuneo

Fichier : `back/src/services/parsers/FortuneoParser.ts`

1. **Modifier les colonnes attendues** :
   ```typescript
   private readonly expectedHeaders = [
     'libelle',      // Changez selon vos colonnes
     'codeisin',
     'quantite',
     // ... autres colonnes
   ];
   ```

2. **Ajouter des alias de colonnes** :
   Dans la méthode `parseRow()`, ajoutez vos noms de colonnes :
   ```typescript
   const libelle = row.libelle || row.libellé || row['Libellé'] || row.name || row['VotreColonne'];
   ```

### Modifier le parser Bourse Direct

Fichier : `back/src/services/parsers/BourseDirectParser.ts`

Même principe que pour Fortuneo.

### Exemple de personnalisation

Si votre CSV Fortuneo utilise "Nom" au lieu de "Libellé" :

```typescript
// Dans parseRow()
const libelle = row.libelle || row.libellé || row['Libellé'] || row.nom || row.name;
```

---

## 🔍 Dépannage

### Problème : "Unable to detect format"

**Solution** :
1. Vérifiez que votre CSV contient bien les colonnes requises
2. Ouvrez le CSV dans un éditeur de texte et vérifiez :
   - La première ligne contient les en-têtes
   - Le séparateur est bien `;` ou `,`
   - Il n'y a pas de lignes vides au début

**Exemple de première ligne valide (Fortuneo)** :
```
Libellé;Code ISIN;Quantité;PRU;Cours;Valorisation;+/- Value latente;% +/- Value
```

### Problème : "Row skipped: missing ISIN"

**Solution** :
- Assurez-vous que chaque ligne de position contient un code ISIN valide
- Les lignes de sous-totaux ou totaux seront automatiquement ignorées

### Problème : Valeurs numériques incorrectes

**Solution** :
1. Vérifiez le format des nombres dans votre CSV
2. Les nombres doivent utiliser :
   - Virgule (`,`) pour les décimales
   - Espace ou point pour les milliers (optionnel)

**Exemple correct** :
```
1 234,56    ✅
1234,56     ✅
1.234,56    ✅
```

**Exemple incorrect** :
```
1234.56     ❌ (point décimal au lieu de virgule)
1,234.56    ❌ (format américain)
```

### Problème : Caractères spéciaux mal affichés

**Solution** :
1. Assurez-vous que votre CSV est encodé en **UTF-8**
2. Si vous utilisez Excel :
   - Ouvrez le CSV dans un éditeur de texte (Notepad++, VS Code)
   - Sauvegardez avec l'encodage **UTF-8**

---

## 📝 Notes importantes

1. **Format détecté automatiquement** : Vous n'avez pas besoin de spécifier le format, il sera détecté automatiquement en fonction des colonnes présentes.

2. **Compatibilité** : Les parsers sont conçus pour être flexibles et accepter plusieurs variantes des noms de colonnes.

3. **Sécurité** : Tous les parsers incluent la protection contre les injections CSV (cellules commençant par `=`, `+`, `-`, `@`).

4. **Multi-devises** : Pour l'instant, seul l'EUR est supporté. Les autres devises seront converties en EUR dans les prochaines versions.

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes avec les parsers :

1. Vérifiez ce document de dépannage
2. Consultez le fichier `PARSER_ARCHITECTURE.md` pour comprendre l'architecture
3. Ouvrez une issue sur GitHub avec :
   - Un exemple de votre CSV (sans données sensibles)
   - Le message d'erreur exact
   - La version de l'application

---

**Dernière mise à jour** : Janvier 2025
