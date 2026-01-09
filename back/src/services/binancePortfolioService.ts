import crypto from "crypto";

// ====== Configuration ======
const BASE = "https://api.binance.com";
const RECV_WINDOW = 5000;
const HTTP_TIMEOUT_MS = 15_000;

// Robustness knobs
const CONCURRENCY = 6;              // parallel symbol scans
const MAX_SYMBOLS_SCAN = 5000;      // safety, TRADING symbols may be ~1000-2000
const TRADES_PAGE_LIMIT = 1000;     // max allowed by Binance
const TRADE_PAGINATION_MAX_PAGES = 50; // safety per symbol
const RATE_LIMIT_BACKOFF_MS = 1200; // on -1003 / 429

// In-memory caches (simple)
let cachedExchangeInfo = null;
let cachedExchangeInfoAt = 0;
const EXCHANGEINFO_TTL_MS = 6 * 60 * 60 * 1000; // 6h

let cachedTickerPrices = null;
let cachedTickerAt = 0;
const TICKER_TTL_MS = 5_000; // 5s

// -------------------- Utils --------------------
function safeString(v) {
    return typeof v === "string" ? v.trim() : "";
}

function hmacSHA256(queryString, secret) {
    return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

function withTimeout(ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
    const { signal, cancel } = withTimeout(HTTP_TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...opts, signal });
        const text = await res.text();
        let json;
        try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

        if (!res.ok) {
            const code = json?.code;
            const msg = json?.msg || json?.message || text || res.statusText;
            const err = new Error(`Binance HTTP ${res.status}: ${msg}`);
            err.binance = { httpStatus: res.status, code, msg };
            throw err;
        }
        return json;
    } catch (e) {
        if (e.name === "AbortError") {
            const err = new Error("Upstream timeout calling Binance");
            err.binance = { timeout: true };
            throw err;
        }
        throw e;
    } finally {
        cancel();
    }
}

async function signedGet(path, apiKey, apiSecret, paramsObj = {}) {
    const timestamp = Date.now();
    const params = new URLSearchParams({
        ...paramsObj,
        timestamp: String(timestamp),
        recvWindow: String(RECV_WINDOW),
    });
    const signature = hmacSHA256(params.toString(), apiSecret);
    params.append("signature", signature);

    const url = `${BASE}${path}?${params.toString()}`;
    return fetchJson(url, {
        method: "GET",
        headers: { "X-MBX-APIKEY": apiKey },
    });
}

// Retry wrapper for rate limit
async function withRateLimitRetry(fn, warnings) {
    try {
        return await fn();
    } catch (e) {
        const code = e?.binance?.code;
        const http = e?.binance?.httpStatus;
        // Typical rate limit signals: HTTP 429 or code -1003
        if (http === 429 || code === -1003) {
            warnings.push({ type: "RATE_LIMIT", detail: e.binance });
            await sleep(RATE_LIMIT_BACKOFF_MS);
            return await fn();
        }
        throw e;
    }
}

// -------------------- Market data (cached) --------------------
async function getExchangeInfoCached(warnings) {
    const now = Date.now();
    if (cachedExchangeInfo && (now - cachedExchangeInfoAt) < EXCHANGEINFO_TTL_MS) {
        return cachedExchangeInfo;
    }
    const data = await withRateLimitRetry(
        () => fetchJson(`${BASE}/api/v3/exchangeInfo`),
        warnings
    );
    cachedExchangeInfo = data;
    cachedExchangeInfoAt = now;
    return data;
}

async function getTickerPricesCached(warnings) {
    const now = Date.now();
    if (cachedTickerPrices && (now - cachedTickerAt) < TICKER_TTL_MS) {
        return cachedTickerPrices;
    }
    const data = await withRateLimitRetry(
        () => fetchJson(`${BASE}/api/v3/ticker/price`),
        warnings
    );
    const prices = new Map();
    for (const p of data) {
        const price = Number(p.price);
        if (Number.isFinite(price)) prices.set(p.symbol, price);
    }
    cachedTickerPrices = prices;
    cachedTickerAt = now;
    return prices;
}

// -------------------- Account data --------------------
async function getSpotBalances(apiKey, apiSecret, warnings) {
    const data = await withRateLimitRetry(
        () => signedGet("/api/v3/account", apiKey, apiSecret, {}),
        warnings
    );

    return (data.balances || [])
        .map(b => {
            const free = Number(b.free);
            const locked = Number(b.locked);
            const total = free + locked;
            return { asset: b.asset, free, locked, total };
        })
        .filter(b => Number.isFinite(b.total) && b.total > 0);
}

// Deposits / Withdrawals (SAPI)
async function getAllDeposits(apiKey, apiSecret, warnings) {
    const out = [];
    let startTime = undefined;
    // Safety loop
    for (let i = 0; i < 20; i++) {
        const params = {};
        if (startTime) params.startTime = String(startTime);
        params.status = "1"; // success (optional)
        params.limit = "1000";
        const data = await withRateLimitRetry(
            () => signedGet("/sapi/v1/capital/deposit/hisrec", apiKey, apiSecret, params),
            warnings
        );
        const rows = Array.isArray(data) ? data : (data?.rows || data?.data || []);
        if (!rows.length) break;

        out.push(...rows);

        // advance startTime (ms) using last insertTime/time
        const last = rows[rows.length - 1];
        const t = Number(last.insertTime ?? last.successTime ?? last.timestamp ?? last.time);
        if (!Number.isFinite(t)) break;
        startTime = t + 1;

        // If fewer than limit, likely done
        if (rows.length < 1000) break;
    }
    return out;
}

async function getAllWithdrawals(apiKey, apiSecret, warnings) {
    const out = [];
    let startTime = undefined;
    for (let i = 0; i < 20; i++) {
        const params = {};
        if (startTime) params.startTime = String(startTime);
        params.status = "6"; // completed (optional; Binance uses numeric statuses)
        params.limit = "1000";

        const data = await withRateLimitRetry(
            () => signedGet("/sapi/v1/capital/withdraw/history", apiKey, apiSecret, params),
            warnings
        );
        const rows = Array.isArray(data) ? data : (data?.rows || data?.data || []);
        if (!rows.length) break;

        out.push(...rows);

        const last = rows[rows.length - 1];
        const t = Number(last.applyTime ? Date.parse(last.applyTime) : (last.successTime ?? last.timestamp ?? last.time));
        if (!Number.isFinite(t)) break;
        startTime = t + 1;

        if (rows.length < 1000) break;
    }
    return out;
}

// Trades: Binance requires symbol; we scan all TRADING symbols.
// Pagination: use fromId if you have >1000 trades on a symbol.
async function getAllTradesAllSymbols(apiKey, apiSecret, exchangeInfo, warnings) {
    const symbols = (exchangeInfo.symbols || [])
        .filter(s => s.status === "TRADING")
        .map(s => s.symbol)
        .slice(0, MAX_SYMBOLS_SCAN);

    const tradesBySymbol = new Map();

    let idx = 0;
    async function worker() {
        while (idx < symbols.length) {
            const symbol = symbols[idx++];
            // Fetch all pages for this symbol
            const all = [];
            let fromId = undefined;

            for (let page = 0; page < TRADE_PAGINATION_MAX_PAGES; page++) {
                const params = { symbol, limit: String(TRADES_PAGE_LIMIT) };
                if (fromId != null) params.fromId = String(fromId);

                let pageTrades;
                try {
                    pageTrades = await withRateLimitRetry(
                        () => signedGet("/api/v3/myTrades", apiKey, apiSecret, params),
                        warnings
                    );
                } catch (e) {
                    // If the user has no permission or symbol not allowed, skip
                    // But generally myTrades returns [] if no trades.
                    // On errors other than rate-limit, record and skip this symbol.
                    warnings.push({ type: "TRADE_SYMBOL_ERROR", symbol, detail: e.binance || e.message });
                    break;
                }

                if (!Array.isArray(pageTrades) || pageTrades.length === 0) break;

                all.push(...pageTrades);

                // If returned less than limit, done
                if (pageTrades.length < TRADES_PAGE_LIMIT) break;

                // Continue using last trade id + 1
                const last = pageTrades[pageTrades.length - 1];
                if (last?.id == null) break;
                fromId = Number(last.id) + 1;
            }

            if (all.length) tradesBySymbol.set(symbol, all);
        }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    return tradesBySymbol;
}

// -------------------- Pricing & PnL --------------------
function usdtToEurRate(prices) {
    if (prices.has("USDTEUR")) return prices.get("USDTEUR");
    if (prices.has("EURUSDT")) return 1 / prices.get("EURUSDT");
    return null;
}

function pickBestSymbol(asset, tradingSymbols) {
    const priority = ["USDT", "EUR", "FDUSD", "USDC", "BTC", "ETH", "BNB"];
    for (const q of priority) {
        const sym = `${asset}${q}`;
        if (tradingSymbols.has(sym)) return { symbol: sym, quote: q };
    }
    return null;
}

function getPriceInUSDT(asset, tradingSymbols, prices) {
    if (asset === "USDT") return 1;
    if (asset === "EUR") return null;

    if (asset === "USDC" || asset === "FDUSD") {
        if (prices.has(`${asset}USDT`)) return prices.get(`${asset}USDT`);
        return 1;
    }

    const chosen = pickBestSymbol(asset, tradingSymbols);
    if (!chosen) return null;

    const p = prices.get(chosen.symbol);
    if (!p) return null;

    if (chosen.quote === "USDT") return p;

    if (chosen.quote === "EUR") {
        if (prices.has("EURUSDT")) return p * prices.get("EURUSDT");
        if (prices.has("USDTEUR")) return p / prices.get("USDTEUR");
        return null;
    }

    if (chosen.quote === "USDC" || chosen.quote === "FDUSD") return p;

    const bridgeToUSDT = prices.get(`${chosen.quote}USDT`);
    if (bridgeToUSDT) return p * bridgeToUSDT;

    const quoteToEUR = prices.get(`${chosen.quote}EUR`);
    if (quoteToEUR) {
        if (prices.has("EURUSDT")) return p * quoteToEUR * prices.get("EURUSDT");
        if (prices.has("USDTEUR")) return p * quoteToEUR / prices.get("USDTEUR");
    }

    return null;
}

function computeCostBasisAndPnl({
                                    balances,
                                    tradesBySymbol,
                                    deposits,
                                    withdrawals,
                                    exchangeInfo,
                                    prices,
                                }) {
    const warnings = [];

    const fx = usdtToEurRate(prices);
    const eurToUsdt = fx ? (1 / fx) : null;

    // build map symbol->(baseAsset, quoteAsset)
    const symbolInfo = new Map();
    for (const s of exchangeInfo.symbols || []) {
        if (s.status === "TRADING") {
            symbolInfo.set(s.symbol, { base: s.baseAsset, quote: s.quoteAsset });
        }
    }

    // State per asset for trade-derived cost basis
    const state = new Map(); // asset -> { qty, costUSDT }
    const getState = (a) => state.get(a) || { qty: 0, costUSDT: 0 };

    // Flatten trades and sort by time
    const allTrades = [];
    for (const [symbol, trades] of tradesBySymbol.entries()) {
        for (const t of trades) allTrades.push({ symbol, t });
    }
    allTrades.sort((a, b) => Number(a.t.time) - Number(b.t.time));

    for (const { symbol, t } of allTrades) {
        const info = symbolInfo.get(symbol);
        if (!info) continue;
        const base = info.base;
        const quote = info.quote;

        const qty = Number(t.qty);
        const quoteQty = Number(t.quoteQty);
        const commission = Number(t.commission);
        const commissionAsset = t.commissionAsset;

        if (!Number.isFinite(qty) || !Number.isFinite(quoteQty)) continue;

        // Convert quoteQty to USDT for cost basis
        let quoteUSDT = null;
        if (quote === "USDT") quoteUSDT = quoteQty;
        else if (quote === "EUR" && eurToUsdt) quoteUSDT = quoteQty * eurToUsdt;
        else if (quote === "FDUSD" || quote === "USDC") quoteUSDT = quoteQty; // approx 1:1 to USDT
        else {
            // Try bridge using quoteUSDT price
            const bridge = prices.get(`${quote}USDT`);
            if (bridge) quoteUSDT = quoteQty * bridge;
        }
        if (quoteUSDT == null) continue;

        const cur = getState(base);

        if (t.isBuyer) {
            let qtyReceived = qty;
            if (commissionAsset === base && Number.isFinite(commission)) {
                qtyReceived = Math.max(0, qtyReceived - commission);
            }
            cur.qty += qtyReceived;
            cur.costUSDT += quoteUSDT;
        } else {
            // sell: reduce qty and cost proportionally (avg cost)
            let qtySold = qty;
            if (commissionAsset === base && Number.isFinite(commission)) {
                qtySold = qtySold + commission;
            }
            if (cur.qty > 0) {
                const avgCost = cur.costUSDT / cur.qty;
                const remove = avgCost * Math.min(qtySold, cur.qty);
                cur.qty = Math.max(0, cur.qty - qtySold);
                cur.costUSDT = Math.max(0, cur.costUSDT - remove);
            }
        }

        state.set(base, cur);
    }

    // Apply withdrawals: reduce qty and cost proportionally
    for (const w of withdrawals) {
        const coin = w.coin || w.asset || w.currency;
        const amount = Number(w.amount || w.qty || w.value);
        if (!coin || !Number.isFinite(amount) || amount <= 0) continue;

        const cur = getState(coin);
        if (cur.qty > 0) {
            const avg = cur.costUSDT / cur.qty;
            const remove = avg * Math.min(amount, cur.qty);
            cur.qty = Math.max(0, cur.qty - amount);
            cur.costUSDT = Math.max(0, cur.costUSDT - remove);
            state.set(coin, cur);
        }
    }

    // Deposits: we do NOT add cost basis (unknown). We'll track depositQty separately.
    const depositQty = new Map();
    for (const d of deposits) {
        const coin = d.coin || d.asset || d.currency;
        const amount = Number(d.amount || d.qty || d.value);
        if (!coin || !Number.isFinite(amount) || amount <= 0) continue;
        depositQty.set(coin, (depositQty.get(coin) || 0) + amount);
    }

    // Build result per current balance asset
    const tradingSymbols = new Set(
        (exchangeInfo.symbols || []).filter(s => s.status === "TRADING").map(s => s.symbol)
    );

    const rate = fx;
    const assets = [];
    let totalPnlUSDT = 0;
    let totalPnlEUR = 0;

    for (const b of balances) {
        const asset = b.asset;
        const qtyNow = b.total;

        const cur = state.get(asset) || { qty: 0, costUSDT: 0 };
        const avgCost = cur.qty > 0 ? (cur.costUSDT / cur.qty) : null;

        const priceUSDT = getPriceInUSDT(asset, tradingSymbols, prices);
        const valueUSDT = priceUSDT != null ? qtyNow * priceUSDT : null;
        const valueEUR = valueUSDT != null && rate != null ? valueUSDT * rate : null;

        // P&L only on "trade-explained" qty, capped by current qty
        const qtyForPnl = Math.min(qtyNow, cur.qty);
        const pnlUSDT = (avgCost != null && priceUSDT != null) ? (priceUSDT - avgCost) * qtyForPnl : null;
        const pnlEUR = (pnlUSDT != null && rate != null) ? pnlUSDT * rate : null;

        if (pnlUSDT != null) totalPnlUSDT += pnlUSDT;
        if (pnlEUR != null) totalPnlEUR += pnlEUR;

        const depQ = depositQty.get(asset) || 0;

        assets.push({
            asset,
            quantityNow: qtyNow,
            priceUSDT,
            valueUSDT,
            valueEUR,
            tradeQtyBasis: cur.qty,
            tradeCostUSDT: cur.costUSDT,
            avgCostUSDT: avgCost,
            pnlUSDT,
            pnlEUR,
            depositQtyObserved: depQ,
            note:
                (depQ > 0 && cur.qty === 0)
                    ? "HAS_DEPOSITS_NO_TRADE_COST_BASIS"
                    : (avgCost == null ? "NO_COST_BASIS" : "AVG_COST_FROM_TRADES"),
        });
    }

    assets.sort((a, b) => (b.valueUSDT ?? 0) - (a.valueUSDT ?? 0));

    return {
        assets,
        pnlTotals: {
            pnlUSDT: Number(totalPnlUSDT.toFixed(8)),
            pnlEUR: rate ? Number(totalPnlEUR.toFixed(8)) : null,
        },
        warnings,
    };
}

// -------------------- Main Service Function --------------------
/**
 * Récupère le portfolio complet d'un compte Binance
 * @param {string} apiKey - Clé API Binance
 * @param {string} apiSecret - Clé secrète Binance
 * @returns {Promise<Object>} Données du portfolio incluant balances, P&L, etc.
 */
export async function getPortfolio(apiKey, apiSecret) {
    const warnings = [];

    try {
        // Validation des paramètres
        apiKey = safeString(apiKey);
        apiSecret = safeString(apiSecret);

        if (!apiKey || !apiSecret) {
            throw new Error("Missing apiKey or apiSecret");
        }

        // Récupération des données de marché et du compte
        const exchangeInfo = await getExchangeInfoCached(warnings);
        const prices = await getTickerPricesCached(warnings);
        const balances = await getSpotBalances(apiKey, apiSecret, warnings);

        // Récupération des dépôts, retraits et trades en parallèle
        const [deposits, withdrawals, tradesBySymbol] = await Promise.all([
            withRateLimitRetry(() => getAllDeposits(apiKey, apiSecret, warnings), warnings),
            withRateLimitRetry(() => getAllWithdrawals(apiKey, apiSecret, warnings), warnings),
            getAllTradesAllSymbols(apiKey, apiSecret, exchangeInfo, warnings),
        ]);

        // Calcul des totaux (valeur)
        const tradingSymbols = new Set(
            (exchangeInfo.symbols || []).filter(s => s.status === "TRADING").map(s => s.symbol)
        );
        const fx = usdtToEurRate(prices);

        let totalUSDT = 0;
        let totalEUR = 0;

        const valuedAssets = balances.map(b => {
            const priceUSDT = getPriceInUSDT(b.asset, tradingSymbols, prices);
            const valueUSDT = priceUSDT != null ? b.total * priceUSDT : null;
            const valueEUR = (valueUSDT != null && fx != null) ? valueUSDT * fx : null;
            if (valueUSDT != null) totalUSDT += valueUSDT;
            if (valueEUR != null) totalEUR += valueEUR;
            return { ...b, priceUSDT, valueUSDT, valueEUR };
        });

        // Calcul du coût de base et du P&L
        const pnl = computeCostBasisAndPnl({
            balances,
            tradesBySymbol,
            deposits,
            withdrawals,
            exchangeInfo,
            prices,
        });

        return {
            ok: true,
            totals: {
                usdt: Number(totalUSDT.toFixed(8)),
                eur: (fx != null) ? Number(totalEUR.toFixed(8)) : null,
                usdtToEurRate: fx,
            },
            assets: valuedAssets.sort((a, b) => (b.valueUSDT ?? 0) - (a.valueUSDT ?? 0)),
            pnl,
            meta: {
                computedAt: new Date().toISOString(),
                recvWindow: RECV_WINDOW,
                scannedSymbolsWithTrades: tradesBySymbol.size,
                scannedSymbolsTotal: Math.min((exchangeInfo.symbols || []).filter(s => s.status === "TRADING").length, MAX_SYMBOLS_SCAN),
                concurrency: CONCURRENCY,
            },
            warnings,
        };
    } catch (e) {
        return {
            ok: false,
            error: e.message || "Unknown error",
            binance: e.binance || null,
            warnings,
        };
    }
}

// Export de la configuration pour permettre la personnalisation
export const config = {
    BASE,
    RECV_WINDOW,
    HTTP_TIMEOUT_MS,
    CONCURRENCY,
    MAX_SYMBOLS_SCAN,
    TRADES_PAGE_LIMIT,
    TRADE_PAGINATION_MAX_PAGES,
    RATE_LIMIT_BACKOFF_MS,
    EXCHANGEINFO_TTL_MS,
    TICKER_TTL_MS,
};

// Fonction pour vider les caches si nécessaire
export function clearCache() {
    cachedExchangeInfo = null;
    cachedExchangeInfoAt = 0;
    cachedTickerPrices = null;
    cachedTickerAt = 0;
}
