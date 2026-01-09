'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useBinancePortfolio } from '@/hooks/useBinancePortfolio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BinanceHistoryPage() {
    const {
        snapshots,
        snapshotsLoading,
        snapshotsError,
        timeline,
        timelineLoading,
        fetchSnapshots,
        fetchTimeline,
    } = useBinancePortfolio();

    useEffect(() => {
        fetchSnapshots({ limit: 30 });
        fetchTimeline();
    }, [fetchSnapshots, fetchTimeline]);

    const formatCurrency = (value: number | null, currency: string = 'USDT') => {
        if (value === null) return 'N/A';
        return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (snapshotsLoading || timelineLoading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3">Loading history...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Binance Portfolio History</h1>
                <Link href="/dashboard/binance">
                    <Button variant="outline">Back to Portfolio</Button>
                </Link>
            </div>

            {/* Timeline Summary */}
            {timeline.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Portfolio Evolution</CardTitle>
                        <CardDescription>
                            {timeline.length} snapshots over the last 90 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Latest Value</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(timeline[0]?.totalValueUSDT)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Oldest Value</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(timeline[timeline.length - 1]?.totalValueUSDT)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Change</p>
                                <p className="text-2xl font-bold">
                                    {timeline.length > 1 && (
                                        <span
                                            className={
                                                timeline[0].totalValueUSDT >= timeline[timeline.length - 1].totalValueUSDT
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }
                                        >
                                            {(((timeline[0].totalValueUSDT - timeline[timeline.length - 1].totalValueUSDT) /
                                                timeline[timeline.length - 1].totalValueUSDT) * 100).toFixed(2)}%
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Snapshots Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Snapshots</CardTitle>
                    <CardDescription>
                        Detailed portfolio snapshots
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {snapshotsError ? (
                        <p className="text-destructive">{snapshotsError}</p>
                    ) : snapshots.length === 0 ? (
                        <p className="text-muted-foreground">No snapshots found</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total Value (USDT)</TableHead>
                                    <TableHead className="text-right">Total Value (EUR)</TableHead>
                                    <TableHead className="text-right">P&L (USDT)</TableHead>
                                    <TableHead className="text-right">Assets</TableHead>
                                    <TableHead className="text-right">Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {snapshots.map((snapshot) => (
                                    <TableRow key={snapshot._id}>
                                        <TableCell className="font-medium">
                                            {formatDate(snapshot.snapshotDate)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(snapshot.totalValueUSDT)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(snapshot.totalValueEUR, 'EUR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span
                                                className={snapshot.totalPnlUSDT >= 0 ? 'text-green-600' : 'text-red-600'}
                                            >
                                                {(snapshot.totalPnlUSDT >= 0 ? '+' : '')}
                                                {formatCurrency(snapshot.totalPnlUSDT)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">{snapshot.assetCount}</TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {formatDate(snapshot.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Timeline Table */}
            {timeline.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Timeline</CardTitle>
                        <CardDescription>
                            Daily portfolio values
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {timeline.slice(0, 10).map((entry, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center p-3 border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{formatDate(entry.date)}</p>
                                        {idx > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                Change: {' '}
                                                <span
                                                    className={
                                                        entry.totalValueUSDT >= timeline[idx - 1].totalValueUSDT
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                    }
                                                >
                                                    {(((entry.totalValueUSDT - timeline[idx - 1].totalValueUSDT) /
                                                        timeline[idx - 1].totalValueUSDT) * 100).toFixed(2)}%
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{formatCurrency(entry.totalValueUSDT)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatCurrency(entry.totalValueEUR, 'EUR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {timeline.length > 10 && (
                            <p className="text-sm text-muted-foreground mt-4 text-center">
                                Showing 10 most recent entries. Total: {timeline.length}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
