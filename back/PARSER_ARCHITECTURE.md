# Parser Architecture - Guide Complet

Ce document explique l'architecture du système de parsing CSV et comment ajouter le support d'un nouveau courtier.

## 📐 Architecture Générale

Le système de parsing utilise le **Factory Pattern** avec détection automatique du format. Chaque courtier a son propre parser qui implémente une interface commune.

```
┌─────────────────┐
│   CSV File      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ParserFactory   │◄─────────┐
│  .detectFormat  │          │
└────────┬────────┘          │
         │                   │
         ▼                   │
┌─────────────────┐          │
│ Specific Parser │          │
│  .canParse()    │          │
│  .parse()       │          │
└────────┬────────┘          │
         │                   │
         │                   │
    ┌────┴────┐              │
    │ Parser  │              │
    │Registry │──────────────┘
    └─────────┘
```

## 🏗️ Composants Principaux

### 1. BaseSnapshotParser (Interface)

Classe abstraite de base que tous les parsers doivent étendre.

**Fichier**: `src/services/parsers/ISnapshotParser.ts`

```typescript
export abstract class BaseSnapshotParser {
    // Format identifier
    abstract readonly formatType: SnapshotFormatType;
    abstract readonly formatName: string;

    // Must implement
    abstract canParse(fileContent: string): boolean;
    abstract parse(fileContent: string): Promise<ParseResult>;
    abstract getExpectedHeaders(): string[];
    abstract getColumnMapping(): ColumnMapping;

    // Utility method provided
    protected parseCSV(fileContent: string): any[];
}
```

### 2. ParserFactory

Gère l'enregistrement et la détection automatique des parsers.

**Fichier**: `src/services/parsers/ParserFactory.ts`

**Méthodes clés**:
- `register(parser)`: Enregistre un nouveau parser
- `detectFormat(fileContent)`: Teste tous les parsers et retourne le meilleur match
- `getParser(formatType)`: Récupère un parser spécifique

### 3. Parsers Spécifiques

Chaque courtier a son propre parser dans `src/services/parsers/`:

- `BoursobankSnapshotParser.ts`
- `TradeRepublicParser.ts`
- `InteractiveBrokersParser.ts`
- `GenericCSVParser.ts` (fallback)

## 🆕 Ajouter un Nouveau Parser

### Étape 1: Analyser le Format CSV

Avant de commencer, vous devez comprendre le format CSV du courtier :

1. **Obtenir un exemple** de fichier CSV du courtier
2. **Identifier**:
   - Le séparateur (`,`, `;`, `\t`)
   - Le format des nombres (`1,234.56` ou `1.234,56`)
   - Les noms de colonnes
   - Les colonnes essentielles (ISIN, quantité, prix, etc.)
   - La présence d'un header

**Exemple de structure**:
```csv
Name;ISIN;Quantity;Buying Price;Current Price;Value
Apple Inc.;US0378331005;10;150,50;165,25;1652,50
```

### Étape 2: Créer la Classe Parser

Créez un nouveau fichier dans `src/services/parsers/`.

**Template**:

```typescript
import { BaseSnapshotParser } from './ISnapshotParser.js';
import { SnapshotFormatType } from '../../types/snapshot.types.js';
import type { NormalizedPosition } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ParseWarning, ColumnMapping } from '../../types/parser.types.js';
import { parseFrenchNumber, parseGermanNumber, parsePercentage } from '../../utils/numberUtils.js';
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';
import { parserFactory } from './ParserFactory.js';
import Papa from 'papaparse';

/**
 * Parser for [BROKER_NAME] CSV exports
 *
 * Expected format:
 * - Separator: [, ou ; ou \t]
 * - Number format: [French/German/US]
 * - Headers: [list main headers]
 * - Currency: [EUR/USD/etc]
 */
export class BrokerNameParser extends BaseSnapshotParser {
    readonly formatType = 'broker_name_snapshot' as SnapshotFormatType;
    readonly formatName = 'Broker Name Portfolio';

    private readonly expectedHeaders = [
        'isin',    // Adjust based on actual CSV
        'name',
        'quantity',
        'price',
        // ... other headers
    ];

    getExpectedHeaders(): string[] {
        return this.expectedHeaders;
    }

    /**
     * Determines if this parser can handle the given file
     * Should be unique enough to avoid false positives
     */
    canParse(fileContent: string): boolean {
        try {
            const firstLine = fileContent.split('\n')[0];
            if (!firstLine) return false;

            const normalizedHeaders = firstLine.toLowerCase();

            // Check for unique identifiers specific to this broker
            // Examples:
            // - Specific header combination
            // - Unique header names
            // - Broker name in file
            const hasUniqueHeader1 = normalizedHeaders.includes('unique_column_name');
            const hasIsin = normalizedHeaders.includes('isin') || normalizedHeaders.includes('symbol');
            const hasQuantity = normalizedHeaders.includes('quantity') || normalizedHeaders.includes('shares');

            return hasUniqueHeader1 && hasIsin && hasQuantity;
        } catch (error) {
            return false;
        }
    }

    /**
     * Parse the CSV file into normalized positions
     */
    async parse(fileContent: string): Promise<ParseResult> {
        const errors: ParseError[] = [];
        const warnings: ParseWarning[] = [];
        const positions: NormalizedPosition[] = [];

        try {
            // Option 1: Use Papa Parse (recommended for complex CSVs)
            const parseResult = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                delimiter: ';', // or auto-detect
                transformHeader: (header: string) => header.toLowerCase().trim(),
            });

            if (parseResult.errors.length > 0) {
                parseResult.errors.forEach(err => {
                    errors.push({
                        row: err.row !== undefined ? err.row + 2 : 0,
                        field: err.code || 'unknown',
                        message: err.message,
                        severity: 'error',
                    });
                });
            }

            const rows = parseResult.data as any[];

            // Option 2: Use built-in parseCSV (simpler)
            // const rows = this.parseCSV(fileContent);

            // Process each row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                try {
                    // Skip invalid rows
                    if (!row.isin || row.isin.trim() === '') {
                        warnings.push({
                            row: i + 2,
                            message: 'Row skipped: missing ISIN',
                        });
                        continue;
                    }

                    const position = this.parseRow(row);

                    // Validate parsed position
                    if (position.quantity <= 0) {
                        errors.push({
                            row: i + 2,
                            field: 'quantity',
                            message: `Invalid quantity: ${position.quantity}`,
                            severity: 'error',
                        });
                        continue;
                    }

                    positions.push(position);
                } catch (error) {
                    errors.push({
                        row: i + 2,
                        field: 'row',
                        message: error instanceof Error ? error.message : 'Failed to parse row',
                        severity: 'error',
                    });
                }
            }

            // Build result
            const success = errors.length === 0 && positions.length > 0;
            const confidence = this.calculateConfidence(fileContent, errors.length, warnings.length);

            return {
                success,
                positions,
                errors,
                warnings,
                metadata: {
                    formatType: this.formatType,
                    bankName: 'Broker Name',
                    detectionConfidence: confidence,
                    parseWarnings: warnings.map(w => w.message),
                },
            };
        } catch (error) {
            return {
                success: false,
                positions: [],
                errors: [{
                    row: 0,
                    field: 'file',
                    message: error instanceof Error ? error.message : 'Failed to parse file',
                    severity: 'error',
                }],
                metadata: {
                    formatType: this.formatType,
                    bankName: 'Broker Name',
                    detectionConfidence: 0.3,
                },
            };
        }
    }

    /**
     * Parse a single row into NormalizedPosition
     */
    private parseRow(row: any): NormalizedPosition {
        // Parse numeric values (choose appropriate function)
        // parseFrenchNumber: for "1.234,56" format
        // parseGermanNumber: for "1.234,56" format (alias)
        // parseFloat: for "1234.56" format
        const quantity = parseFrenchNumber(row.quantity);
        const buyingPrice = parseFrenchNumber(row.buyingprice);
        const currentPrice = parseFrenchNumber(row.currentprice);

        // Calculate derived values
        const totalInvested = quantity * buyingPrice;
        const currentValue = quantity * currentPrice;
        const gainLoss = currentValue - totalInvested;
        const gainLossPercentage = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

        // Return normalized position with sanitized strings
        return {
            isin: sanitizeCsvCell(row.isin?.trim()),
            assetName: sanitizeCsvCell(row.name?.trim()),
            quantity,
            currentPrice,
            currentValue,
            averageBuyingPrice: buyingPrice,
            totalInvested,
            gainLoss,
            gainLossPercentage,
            currency: 'EUR', // or extract from CSV
            // Optional fields
            intradayVariation: row.intradayvariation ? parseFrenchNumber(row.intradayvariation) : undefined,
            intradayVariationPercentage: row.intradayvariation ? parsePercentage(row.intradayvariation) : undefined,
        };
    }

    /**
     * Calculate detection confidence (0 to 1)
     */
    private calculateConfidence(fileContent: string, errorCount: number, warningCount: number): number {
        let confidence = 0.95; // Start high for specific parsers

        // Reduce confidence based on errors
        if (errorCount > 0) {
            confidence -= errorCount * 0.1;
        }

        if (warningCount > 0) {
            confidence -= warningCount * 0.02;
        }

        return Math.max(0.3, Math.min(1, confidence));
    }

    /**
     * Return column mapping for reference
     */
    getColumnMapping(): ColumnMapping {
        return {
            isin: 'isin',
            assetName: 'name',
            quantity: 'quantity',
            currentPrice: 'currentprice',
            buyingPrice: 'buyingprice',
        };
    }
}

// IMPORTANT: Auto-register the parser
parserFactory.register(new BrokerNameParser());
```

### Étape 3: Enregistrer le Format

Ajoutez le nouveau type de format dans `src/types/snapshot.types.ts` :

```typescript
export enum SnapshotFormatType {
    BOURSOBANK_SNAPSHOT = 'boursobank_snapshot',
    TRADE_REPUBLIC_SNAPSHOT = 'trade_republic_snapshot',
    INTERACTIVE_BROKERS = 'interactive_brokers',
    BROKER_NAME_SNAPSHOT = 'broker_name_snapshot', // NEW
    GENERIC_CSV = 'generic_csv',
}
```

### Étape 4: Importer le Parser

Dans `src/services/parsers/Parser.ts`, importez votre nouveau parser :

```typescript
import './BoursobankSnapshotParser.js';
import './TradeRepublicParser.js';
import './InteractiveBrokersParser.js';
import './BrokerNameParser.js'; // NEW - This auto-registers the parser
import './GenericCSVParser.js'; // Keep as last (fallback)
```

**⚠️ Important** : L'ordre d'import peut affecter la détection. Les parsers spécifiques doivent être importés avant le `GenericCSVParser`.

### Étape 5: Tester

1. **Créer des tests** avec des fichiers CSV réels du courtier
2. **Vérifier la détection** : Le bon parser est-il sélectionné ?
3. **Vérifier le parsing** : Les données sont-elles correctement extraites ?
4. **Tester les edge cases** :
   - Fichiers vides
   - Colonnes manquantes
   - Valeurs invalides
   - Caractères spéciaux

```typescript
// Test example
const parser = new BrokerNameParser();
const canParse = parser.canParse(csvContent);
const result = await parser.parse(csvContent);

console.log('Can parse:', canParse);
console.log('Success:', result.success);
console.log('Positions:', result.positions.length);
console.log('Errors:', result.errors);
```

## 🔧 Utilitaires Disponibles

### Parsing de Nombres

```typescript
import { parseFrenchNumber, parseGermanNumber, parsePercentage } from '../../utils/numberUtils.js';

// Format français : 1.234,56 → 1234.56
const value = parseFrenchNumber('1.234,56'); // 1234.56

// Format allemand (alias de parseFrenchNumber)
const value = parseGermanNumber('1.234,56'); // 1234.56

// Format US : 1,234.56 → 1234.56
const value = parseFloat('1,234.56'.replace(/,/g, '')); // 1234.56

// Pourcentages : 12,5% → 12.5
const pct = parsePercentage('12,5%'); // 12.5
```

### Sécurité CSV

```typescript
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';

// Protège contre les injections CSV
const safe = sanitizeCsvCell('=cmd'); // '=cmd (préfixé avec ')
const safe = sanitizeCsvCell('Normal text'); // 'Normal text'
```

### Papa Parse

```typescript
import Papa from 'papaparse';

const result = Papa.parse(csvContent, {
    header: true,              // First row is headers
    skipEmptyLines: true,      // Skip empty lines
    delimiter: ';',            // or 'auto' to detect
    transformHeader: (h) => h.toLowerCase().trim(),
    dynamicTyping: false,      // Keep as strings for manual parsing
});
```

## 📝 Bonnes Pratiques

### 1. Detection robuste avec `canParse()`

```typescript
canParse(fileContent: string): boolean {
    try {
        const firstLine = fileContent.split('\n')[0].toLowerCase();

        // ✅ Good: Check for multiple unique identifiers
        return firstLine.includes('broker_unique_column') &&
               firstLine.includes('isin') &&
               firstLine.includes('quantity');

        // ❌ Bad: Too generic
        return firstLine.includes('isin');
    } catch {
        return false;
    }
}
```

### 2. Gestion des erreurs

```typescript
// ✅ Collecter les erreurs, ne pas throw
errors.push({
    row: i + 2,
    field: 'quantity',
    message: 'Invalid quantity value',
    severity: 'error',
});

// ❌ Ne pas throw immédiatement
throw new Error('Invalid quantity');
```

### 3. Sanitization des chaînes

```typescript
// ✅ Toujours sanitize les inputs utilisateur
isin: sanitizeCsvCell(row.isin?.trim()),
assetName: sanitizeCsvCell(row.name?.trim()),

// ❌ Ne jamais utiliser directement
isin: row.isin,
```

### 4. Validation des données

```typescript
// ✅ Valider avant d'ajouter
if (position.quantity <= 0) {
    errors.push({ ... });
    continue;
}
if (!position.isin || position.isin.trim() === '') {
    warnings.push({ ... });
    continue;
}

positions.push(position);
```

### 5. Calculs cohérents

```typescript
// ✅ Calculs standardisés
const totalInvested = quantity * buyingPrice;
const currentValue = quantity * currentPrice;
const gainLoss = currentValue - totalInvested;
const gainLossPercentage = totalInvested > 0
    ? (gainLoss / totalInvested) * 100
    : 0;
```

## 🐛 Débogage

### Log des détails de parsing

```typescript
import logger from '../../utils/logger.js';

logger.debug('Parsing row', {
    row: i,
    isin: row.isin,
    quantity: row.quantity
});
```

### Tester la détection

```typescript
import { parserFactory } from './ParserFactory.js';

const detection = await parserFactory.detectFormat(csvContent);
console.log('Detected:', detection);
// {
//   formatType: 'broker_name_snapshot',
//   confidence: 0.95,
//   parser: BrokerNameParser
// }
```

## 📚 Exemples Complets

Consultez les parsers existants pour des exemples complets :

- **Simple** : `BoursobankSnapshotParser.ts`
- **Avec Papa Parse** : `TradeRepublicParser.ts`
- **Avec heuristiques** : `GenericCSVParser.ts`

## ✅ Checklist avant Pull Request

- [ ] Le parser étend `BaseSnapshotParser`
- [ ] `canParse()` est suffisamment spécifique
- [ ] Tous les champs requis de `NormalizedPosition` sont remplis
- [ ] Les chaînes sont sanitizées avec `sanitizeCsvCell()`
- [ ] Les erreurs sont collectées, pas levées
- [ ] Le type de format est ajouté dans `SnapshotFormatType`
- [ ] Le parser est importé dans `Parser.ts`
- [ ] Le parser est auto-enregistré avec `parserFactory.register()`
- [ ] Des tests ont été effectués avec de vrais fichiers CSV
- [ ] La documentation a été mise à jour

## 🆘 Support

Des questions ? Consultez :
- Les parsers existants comme exemples
- Les types dans `src/types/`
- Les issues GitHub pour les problèmes similaires
