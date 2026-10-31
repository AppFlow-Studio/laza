/**
 * lib/utils/errorMessages.ts
 *
 * Centralized error message handling. Translates raw database/network errors
 * into user-friendly messages. Used across all mutations and server actions.
 */

/**
 * Translate a raw error into a user-friendly message.
 * Handles common Supabase, network, and Clerk error patterns.
 */
export function getFriendlyErrorMessage(error: unknown): string {
    const msg = getErrorString(error);

    // ── Network / connectivity ───────────────────────────────────────────────
    if (isNetworkError(msg)) {
        return 'Connection lost. Please check your internet and try again.';
    }

    // ── Clerk session / auth ─────────────────────────────────────────────────
    if (isSessionExpiredError(msg)) {
        return 'Your session has expired. Please sign in again.';
    }

    // ── RLS / permission ─────────────────────────────────────────────────────
    if (isRLSViolation(msg)) {
        return 'You don\'t have permission to perform this action.';
    }

    // ── Concurrent modification / stock ──────────────────────────────────────
    if (isStockConflictError(msg)) {
        return 'Stock levels have changed. Data is being refreshed — please review and try again.';
    }

    if (isConcurrentFulfillmentError(msg)) {
        return 'This ticket was already fulfilled or modified. Refreshing data...';
    }

    // ── Ticket status conflicts ──────────────────────────────────────────────
    if (isTerminalStatusError(msg)) {
        return 'This ticket has already been completed and cannot be modified.';
    }

    if (isCancelBlockedError(msg)) {
        return 'This order can no longer be cancelled — it\'s already being processed.';
    }

    // ── Unique constraint / duplicate ────────────────────────────────────────
    if (isDuplicateError(msg)) {
        return 'This record already exists. Please refresh and try again.';
    }

    // ── Not found ────────────────────────────────────────────────────────────
    if (isNotFoundError(msg)) {
        return 'The requested record was not found. It may have been deleted.';
    }

    // ── Validation from server ───────────────────────────────────────────────
    if (msg.includes('required') || msg.includes('invalid') || msg.includes('must be')) {
        // Pass through validation messages as they're typically already clear
        return msg;
    }

    // ── PostgreSQL / generic database ────────────────────────────────────────
    if (isRawDatabaseError(msg)) {
        return 'Something went wrong. Please try again.';
    }

    // ── Fallback: use the message if it looks human-readable, else generic ──
    if (msg.length > 0 && msg.length < 200 && !msg.includes('PGRST') && !msg.includes('42P')) {
        return msg;
    }

    return 'Something went wrong. Please try again.';
}

// ─── Error classification helpers ────────────────────────────────────────────

function getErrorString(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const e = error as Record<string, unknown>;
        if (typeof e.message === 'string') return e.message;
        if (typeof e.error === 'string') return e.error;
    }
    return '';
}

export function isNetworkError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('failed to fetch') ||
        lower.includes('network') ||
        lower.includes('econnrefused') ||
        lower.includes('enotfound') ||
        lower.includes('timeout') ||
        lower.includes('aborted') ||
        lower.includes('err_internet_disconnected')
    );
}

export function isSessionExpiredError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('session') ||
        lower.includes('jwt expired') ||
        lower.includes('token') ||
        lower.includes('unauthorized') ||
        lower.includes('401') ||
        lower.includes('not authenticated')
    );
}

export function isRLSViolation(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('row-level security') ||
        lower.includes('rls') ||
        lower.includes('policy') ||
        lower.includes('permission denied') ||
        lower.includes('403') ||
        (lower.includes('new row violates') && lower.includes('policy'))
    );
}

export function isStockConflictError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('insufficient') &&
        (lower.includes('stock') || lower.includes('quantity'))
    );
}

export function isConcurrentFulfillmentError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('already fulfilled') ||
        lower.includes('already confirmed') ||
        lower.includes('already processed') ||
        (lower.includes('status') && lower.includes('terminal'))
    );
}

export function isTerminalStatusError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('terminal') ||
        lower.includes('cannot transition') ||
        (lower.includes('status') && (
            lower.includes('confirmed') ||
            lower.includes('cancelled') ||
            lower.includes('rejected')
        ) && lower.includes('cannot'))
    );
}

export function isCancelBlockedError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('cannot cancel') ||
        (lower.includes('cancellation') && lower.includes('only allowed'))
    );
}

function isDuplicateError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('duplicate') ||
        lower.includes('unique constraint') ||
        lower.includes('already exists') ||
        lower.includes('23505')
    );
}

function isNotFoundError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('not found') ||
        lower.includes('pgrst116') ||
        lower.includes('no rows')
    );
}

function isRawDatabaseError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('postgresql') ||
        lower.includes('relation') ||
        lower.includes('column') ||
        lower.includes('syntax error') ||
        lower.includes('pgrst') ||
        lower.includes('42p') ||
        lower.includes('42703') ||
        lower.includes('42601') ||
        lower.includes('supabase') && lower.includes('error')
    );
}
