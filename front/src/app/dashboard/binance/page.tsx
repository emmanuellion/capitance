'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBinancePortfolio } from '@/hooks/useBinancePortfolio';
import { binanceApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function BinancePortfolioPage() {
    const {
        portfolio,
        portfolioLoading,
        portfolioError,
        lastFetchedAt,
        fetchPortfolio,
        createSnapshot,
    } = useBinancePortfolio();

    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
    const [creatingSnapshot, setCreatingSnapshot] = useState(false);
    const [snapshotSuccess, setSnapshotSuccess] = useState(false);

    // Check if API keys are configured
    useEffect(() => {
        checkConfiguration();
    }, []);

    // Auto-fetch portfolio if configured
    useEffect(() => {
        if (isConfigured === true) {
            fetchPortfolio();
        }
    }, [isConfigured, fetchPortfolio]);

    const checkConfiguration = async () => {
        try {
            const status = await binanceApi.getKeysStatus();
            setIsConfigured(status.configured);
        } catch (err) {
            console.error('Error checking configuration:', err);
            setIsConfigured(false);
        }
    };

    const handleRefresh = () => {
        fetchPortfolio();
        setSnapshotSuccess(false);
    };

    const handleCreateSnapshot = async () => {
        setCreatingSnapshot(true);
        setSnapshotSuccess(false);
        try {
            await createSnapshot();
            setSnapshotSuccess(true);
        } catch (err) {
            console.error('Error creating snapshot:', err);
        } finally {
            setCreatingSnapshot(false);
        }
    };

    // Not configured state
    if (isConfigured === false) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Binance Portfolio Not Configured</CardTitle>
                        <CardDescription>
                            Configure your Binance API keys to view your portfolio
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/settings">
                            <Button>Go to Settings</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isConfigured === null || portfolioLoading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3">Loading portfolio...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (portfolioError) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertDescription>{portfolioError}</AlertDescription>
                </Alert>
                <div className="mt-4">
                    <Button onClick={handleRefresh}>Retry</Button>
                </div>
            </div>
        );
    }

    // No portfolio data
    if (!portfolio) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>No Portfolio Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleRefresh}>Load Portfolio</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formatCurrency = (value: number | null, currency: string = 'USDT') => {
        if (value === null) return 'N/A';
        return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    };

    const formatPercentage = (value: number | null) => {
        if (value === null) return 'N/A';
        const color = value >= 0 ? 'text-green-600' : 'text-red-600';
        const sign = value >= 0 ? '+' : '';
        return <span className={color}>{sign}{value.toFixed(2)}%</span>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Binance Portfolio</h1>
                <div className="flex gap-2">
                    <Link href="/dashboard/binance/history">
                        <Button variant="outline">View History</Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={handleCreateSnapshot}
                        disabled={creatingSnapshot}
                    >
                        {creatingSnapshot ? 'Creating...' : 'Create Snapshot'}
                    </Button>
                    <Button onClick={handleRefresh} disabled={portfolioLoading}>
                        {portfolioLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* Success Message */}
            {snapshotSuccess && (
                <Alert>
                    <AlertDescription>Snapshot created successfully!</AlertDescription>
                </Alert>
            )}

            {/* Last Updated */}
            {lastFetchedAt && (
                <p className="text-sm text-muted-foreground">
                    Last updated: {lastFetchedAt.toLocaleString()}
                </p>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Value (USDT)</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCurrency(portfolio.totals.usdt, 'USDT')}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Value (EUR)</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCurrency(portfolio.totals.eur, 'EUR')}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total P&L (USDT)</CardDescription>
                        <CardTitle className="text-2xl">
                            <span className={portfolio.pnl.pnlTotals.pnlUSDT >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(portfolio.pnl.pnlTotals.pnlUSDT, 'USDT')}
                            </span>
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Assets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Assets</CardTitle>
                    <CardDescription>
                        {portfolio.assets.length} assets • Scanned {portfolio.meta.scannedSymbolsWithTrades} symbols with trades
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Price (USDT)</TableHead>
                                <TableHead className="text-right">Value (USDT)</TableHead>
                                <TableHead className="text-right">Avg Cost</TableHead>
                                <TableHead className="text-right">P&L (USDT)</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {portfolio.assets.slice(0, 20).map((asset) => (
                                <TableRow key={asset.asset}>
                                    <TableCell className="font-medium">{asset.asset}</TableCell>
                                    <TableCell className="text-right">
                                        {asset.quantityNow.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {asset.priceUSDT !== null ? asset.priceUSDT.toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {asset.valueUSDT !== null ? asset.valueUSDT.toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {asset.avgCostUSDT !== null ? asset.avgCostUSDT.toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {asset.pnlUSDT !== null ? (
                                            <span className={asset.pnlUSDT >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {(asset.pnlUSDT >= 0 ? '+' : '')}{asset.pnlUSDT.toLocaleString()}
                                            </span>
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {asset.note === 'AVG_COST_FROM_TRADES' && (
                                            <Badge variant="default">Tracked</Badge>
                                        )}
                                        {asset.note === 'HAS_DEPOSITS_NO_TRADE_COST_BASIS' && (
                                            <Badge variant="secondary">Deposited</Badge>
                                        )}
                                        {asset.note === 'NO_COST_BASIS' && (
                                            <Badge variant="outline">No Cost</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {portfolio.assets.length > 20 && (
                        <p className="text-sm text-muted-foreground mt-4 text-center">
                            Showing top 20 assets. Total: {portfolio.assets.length}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Warnings */}
            {portfolio.warnings && portfolio.warnings.length > 0 && (
                <Alert>
                    <AlertDescription>
                        <strong>Warnings:</strong>
                        <ul className="mt-2 space-y-1">
                            {portfolio.warnings.map((warning, idx) => (
                                <li key={idx} className="text-sm">
                                    {JSON.stringify(warning)}
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
