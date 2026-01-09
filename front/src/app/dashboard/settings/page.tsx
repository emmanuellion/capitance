'use client';

import { useState, useEffect } from 'react';
import { binanceApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPage() {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [configuredAt, setConfiguredAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Check if keys are already configured
    useEffect(() => {
        checkKeysStatus();
    }, []);

    const checkKeysStatus = async () => {
        try {
            const status = await binanceApi.getKeysStatus();
            setIsConfigured(status.configured);
            setConfiguredAt(status.configuredAt);
        } catch (err: any) {
            console.error('Error checking keys status:', err);
        }
    };

    const handleTestConnection = async () => {
        if (!apiKey || !apiSecret) {
            setError('Please enter both API key and secret');
            return;
        }

        setTesting(true);
        setError(null);
        setSuccess(null);

        try {
            // Test by calling setApiKeys (it validates before saving)
            await binanceApi.setApiKeys(apiKey, apiSecret);
            setSuccess('API keys are valid and have been saved!');
            setIsConfigured(true);
            setConfiguredAt(new Date());
            setApiKey('');
            setApiSecret('');
        } catch (err: any) {
            setError(err.message || 'Failed to validate API keys');
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!apiKey || !apiSecret) {
            setError('Please enter both API key and secret');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await binanceApi.setApiKeys(apiKey, apiSecret);
            setSuccess('API keys saved successfully!');
            setIsConfigured(true);
            setConfiguredAt(new Date());
            setApiKey('');
            setApiSecret('');
        } catch (err: any) {
            setError(err.message || 'Failed to save API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            await binanceApi.deleteApiKeys();
            setSuccess('API keys deleted successfully');
            setIsConfigured(false);
            setConfiguredAt(null);
            setShowDeleteConfirm(false);
        } catch (err: any) {
            setError(err.message || 'Failed to delete API keys');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Binance Settings</h1>

            {/* Status Card */}
            {isConfigured && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>API Keys Status</CardTitle>
                        <CardDescription>Your Binance API keys are configured</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Configured since: {configuredAt ? new Date(configuredAt).toLocaleString() : 'Unknown'}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Update Keys
                                </Button>
                                {showDeleteConfirm ? (
                                    <div className="flex gap-2 items-center">
                                        <Button
                                            variant="destructive"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                        >
                                            {deleting ? 'Deleting...' : 'Confirm Delete'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        Delete Keys
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <CardTitle>{isConfigured ? 'Update' : 'Configure'} Binance API Keys</CardTitle>
                    <CardDescription>
                        Enter your Binance API credentials to connect your portfolio
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Alerts */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {/* Form */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                                id="apiKey"
                                type="text"
                                placeholder="Enter your Binance API key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                disabled={loading || testing}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="apiSecret">API Secret</Label>
                            <Input
                                id="apiSecret"
                                type="password"
                                placeholder="Enter your Binance API secret"
                                value={apiSecret}
                                onChange={(e) => setApiSecret(e.target.value)}
                                disabled={loading || testing}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleTestConnection}
                                disabled={loading || testing || !apiKey || !apiSecret}
                                variant="outline"
                            >
                                {testing ? 'Testing...' : 'Test Connection'}
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={loading || testing || !apiKey || !apiSecret}
                            >
                                {loading ? 'Saving...' : 'Save Keys'}
                            </Button>
                        </div>
                    </div>

                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">How to get your Binance API keys:</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Log in to your Binance account</li>
                            <li>Go to Profile → API Management</li>
                            <li>Create a new API key</li>
                            <li>Enable &quot;Enable Reading&quot; permission only</li>
                            <li>DO NOT enable trading or withdrawal permissions</li>
                            <li>Copy your API key and secret and paste them here</li>
                        </ol>
                        <p className="mt-3 text-sm text-muted-foreground">
                            <strong>Security note:</strong> Your API keys are encrypted before storage.
                            Only enable &quot;Read&quot; permissions for maximum security.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
