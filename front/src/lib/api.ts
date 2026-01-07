const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Array<{ field: string; message: string }>;
    code?: string;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string,
        public errors?: Array<{ field: string; message: string }>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// ========== CSRF Token Management ==========
class CsrfTokenManager {
    private token: string | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize CSRF token from server
     */
    async init(): Promise<void> {
        // If already initializing, return the existing promise
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                const response = await fetch(`${API_URL}/api/csrf-token`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    this.token = data.token;
                } else {
                    console.error('Failed to fetch CSRF token');
                }
            } catch (error) {
                console.error('Error fetching CSRF token:', error);
            }
        })();

        return this.initPromise;
    }

    /**
     * Get current CSRF token (initialize if needed)
     */
    async getToken(): Promise<string | null> {
        if (!this.token) {
            await this.init();
        }
        return this.token;
    }

    /**
     * Refresh CSRF token from server
     */
    async refresh(): Promise<void> {
        this.token = null;
        this.initPromise = null;
        await this.init();
    }

    /**
     * Check if method requires CSRF token
     */
    requiresCsrf(method: string): boolean {
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    }
}

// Global CSRF token manager
const csrfManager = new CsrfTokenManager();

/**
 * Initialize CSRF token on app startup
 * Should be called once when the app loads
 */
export async function initializeCsrf(): Promise<void> {
    await csrfManager.init();
}

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retryOnUnauth: boolean = true,
    retryOnCsrf: boolean = true
): Promise<Response> {
    // Get CSRF token if method requires it
    const method = options.method || 'GET';
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (csrfManager.requiresCsrf(method)) {
        const csrfToken = await csrfManager.getToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include', // CRITICAL: Include cookies
        headers,
    });

    // If 403 CSRF error, refresh token and retry
    if (response.status === 403 && retryOnCsrf) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.code === 'CSRF_TOKEN_MISSING' || errorData.code === 'CSRF_TOKEN_INVALID') {
            await csrfManager.refresh();
            return fetchWithRetry(url, options, retryOnUnauth, false);
        }
    }

    // If 401 and we haven't retried, try to refresh token
    if (response.status === 401 && retryOnUnauth) {
        const refreshResponse = await fetch(`${API_URL}/api/${API_VERSION}/auth/refresh-token`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-Token': await csrfManager.getToken() || '',
            },
        });

        if (refreshResponse.ok) {
            // Retry original request
            return fetchWithRetry(url, options, false, retryOnCsrf);
        }
    }

    return response;
}

// Special fetch for file uploads (no Content-Type header)
async function fetchFileWithRetry(
    url: string,
    options: RequestInit,
    retryOnUnauth: boolean = true,
    retryOnCsrf: boolean = true
): Promise<Response> {
    // Get CSRF token for file uploads (always POST)
    const headers: HeadersInit = { ...options.headers };
    const csrfToken = await csrfManager.getToken();
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
    });

    // If 403 CSRF error, refresh token and retry
    if (response.status === 403 && retryOnCsrf) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.code === 'CSRF_TOKEN_MISSING' || errorData.code === 'CSRF_TOKEN_INVALID') {
            await csrfManager.refresh();
            return fetchFileWithRetry(url, options, retryOnUnauth, false);
        }
    }

    // If 401 and we haven't retried, try to refresh token
    if (response.status === 401 && retryOnUnauth) {
        const refreshResponse = await fetch(`${API_URL}/api/${API_VERSION}/auth/refresh-token`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-Token': await csrfManager.getToken() || '',
            },
        });

        if (refreshResponse.ok) {
            // Retry original request
            return fetchFileWithRetry(url, options, false, retryOnCsrf);
        }
    }

    return response;
}

export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    // Build full URL with versioned API
    let finalEndpoint = endpoint;

    // If endpoint doesn't start with /api/v, add version
    if (!endpoint.startsWith('/api/v')) {
        if (endpoint.startsWith('/api/')) {
            // Replace /api/ with /api/v1/
            finalEndpoint = endpoint.replace('/api/', `/api/${API_VERSION}/`);
        } else {
            // Add /api/v1/ prefix
            finalEndpoint = `/api/${API_VERSION}${endpoint}`;
        }
    }

    const url = `${API_URL}${finalEndpoint}`;

    console.log(url);

    const response = await fetchWithRetry(url, options);

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
        throw new ApiError(
            data.message || 'An error occurred',
            response.status,
            data.code,
            data.errors
        );
    }

    return data.data as T;
}

// Auth API methods
export const authApi = {
    register: (data: { email: string; password: string; confirmPassword: string }) =>
        apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    login: (data: { email: string; password: string; rememberMe?: boolean }) =>
        apiRequest<{ user: { _id: string; email: string; isVerified: boolean } }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    logout: () =>
        apiRequest('/api/auth/logout', {
            method: 'POST',
        }),

    getCurrentUser: () =>
        apiRequest<{ user: { _id: string; email: string; isVerified: boolean } }>('/api/auth/me'),

    verifyEmail: (token: string) =>
        apiRequest(`/api/auth/verify-email/${token}`),

    forgotPassword: (email: string) =>
        apiRequest('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    resetPassword: (data: { token: string; newPassword: string; confirmPassword: string }) =>
        apiRequest('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    refreshToken: () =>
        apiRequest('/api/auth/refresh-token', {
            method: 'POST',
        }),
};

// File interface
export interface FileInfo {
    _id: string;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
}

// File API methods
export const fileApi = {
    getFiles: (userId: string) =>
        apiRequest<FileInfo[]>(`/api/file/getFile/${userId}`),

    uploadFile: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchFileWithRetry(`${API_URL}/api/${API_VERSION}/file/addFile`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new ApiError(
                data.message || 'Upload failed',
                response.status,
                data.code,
                data.errors
            );
        }

        return data.data;
    },

    deleteFile: (filename: string) =>
        apiRequest('/api/file/removeFile', {
            method: 'DELETE',
            body: JSON.stringify({ filename }),
        }),
};

// Snapshot interfaces
export interface NormalizedPosition {
    isin: string;
    assetName: string;
    quantity: number;
    currentPrice: number;
    currentValue: number;
    averageBuyingPrice: number; // PRU
    totalInvested: number;
    gainLoss: number;
    gainLossPercentage: number;
    intradayVariation?: number;
    intradayVariationPercentage?: number;
    currency?: string;
}

export interface SnapshotMetadata {
    formatType: string;
    bankName: string;
    detectionConfidence?: number;
    parseWarnings?: string[];
}

export interface PortfolioSnapshot {
    _id: string;
    uploadId: string;
    userId: string;
    snapshotDate: Date;
    positions: NormalizedPosition[];
    metadata: SnapshotMetadata;
    totalValue: number;
    totalInvested: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
    createdAt: Date;
}

export interface TimelineEntry {
    date: Date;
    totalValue: number;
    totalInvested: number;
    gainLoss: number;
    snapshotCount: number;
}

export interface PositionHistory {
    isin: string;
    assetName: string;
    history: Array<{
        date: Date;
        quantity: number;
        price: number;
        value: number;
        gainLoss: number;
    }>;
}

// Type aliases for compatibility with analytics components
export interface Position {
    isin: string;
    assetName: string;
    quantity: number;
    pru: number;
    totalInvested: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercentage: number;
    allocationPercentage: number;
}

export interface AnalysisMetrics {
    totalInvested: number;
    totalValue: number;
    totalGainLoss: number;
    returnPercentage: number;
    positions: Position[];
    timeline: Array<{
        date: Date;
        portfolioValue: number;
        cashFlow: number;
        operationType: string;
    }>;
}

// Snapshot API methods
export const snapshotApi = {
    // Get all snapshots with optional filters
    getSnapshots: (params?: {
        startDate?: Date;
        endDate?: Date;
        formatType?: string;
        limit?: number;
        offset?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate.toISOString());
        if (params?.endDate) queryParams.append('endDate', params.endDate.toISOString());
        if (params?.formatType) queryParams.append('formatType', params.formatType);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const query = queryParams.toString();
        return apiRequest<PortfolioSnapshot[]>(
            `/api/snapshots${query ? `?${query}` : ''}`
        );
    },

    // Get single snapshot by ID
    getSnapshot: (snapshotId: string) =>
        apiRequest<PortfolioSnapshot>(`/api/snapshots/${snapshotId}`),

    // Get timeline aggregation
    getTimeline: (params?: { startDate?: Date; endDate?: Date }) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate.toISOString());
        if (params?.endDate) queryParams.append('endDate', params.endDate.toISOString());

        const query = queryParams.toString();
        return apiRequest<TimelineEntry[]>(`/api/snapshots/timeline${query ? `?${query}` : ''}`);
    },

    // Get position history
    getPositionHistory: (isin: string) =>
        apiRequest<PositionHistory>(`/api/snapshots/position/${isin}`),

    // Reprocess all uploads
    reprocessAll: () =>
        apiRequest<{
            successCount: number;
            errorCount: number;
            totalFiles: number;
            errors?: Array<{ filename: string; error: string }>;
        }>('/api/snapshots/reprocess-all', {
            method: 'POST',
        }),

    // Delete snapshot
    deleteSnapshot: (snapshotId: string) =>
        apiRequest(`/api/snapshots/${snapshotId}`, {
            method: 'DELETE',
        }),
};
