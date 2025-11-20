"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-6 border border-zinc-200 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Something went wrong</h2>
                        <p className="text-zinc-600 mb-4">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <Button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                        >
                            Reload Page
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

