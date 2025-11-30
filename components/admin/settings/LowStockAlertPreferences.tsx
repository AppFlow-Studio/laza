"use client";

import { useState, useEffect } from 'react';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/lib/hooks/queries/useNotificationPreferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import toast from 'react-hot-toast';

interface LowStockAlertPreferencesProps {
    organizationId: string;
}

export default function LowStockAlertPreferences({ organizationId }: LowStockAlertPreferencesProps) {
    const { data: preferences, isLoading } = useNotificationPreferences(organizationId);
    const updateMutation = useUpdateNotificationPreferences();

    const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = useState(true);
    const [deliveryMode, setDeliveryMode] = useState<'immediate' | 'digest' | 'both'>('immediate');
    const [digestSchedule, setDigestSchedule] = useState('');
    const [quietHoursStart, setQuietHoursStart] = useState('');
    const [quietHoursEnd, setQuietHoursEnd] = useState('');

    useEffect(() => {
        if (preferences) {
            setLowStockAlertsEnabled(preferences.low_stock_alerts_enabled ?? true);
            setDeliveryMode(preferences.low_stock_delivery_mode || 'immediate');
            setDigestSchedule(preferences.low_stock_digest_schedule || '08:00:00');
            setQuietHoursStart(preferences.quiet_hours_start || '');
            setQuietHoursEnd(preferences.quiet_hours_end || '');
        }
    }, [preferences]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({
                organizationId,
                updates: {
                    low_stock_alerts_enabled: lowStockAlertsEnabled,
                    low_stock_delivery_mode: deliveryMode,
                    low_stock_digest_schedule: deliveryMode === 'digest' || deliveryMode === 'both' ? digestSchedule : null,
                    quiet_hours_start: quietHoursStart || null,
                    quiet_hours_end: quietHoursEnd || null,
                },
            });
            toast.success('Low stock alert preferences updated');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save preferences');
        }
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Low Stock Alert Preferences</CardTitle>
                <CardDescription>
                    Configure how and when you receive low stock notifications
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Enable Low Stock Alerts */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                    <div>
                        <Label className="text-base font-medium">Enable Low Stock Alerts</Label>
                        <p className="text-sm text-zinc-600 mt-1">
                            Receive notifications when items fall below threshold
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={lowStockAlertsEnabled}
                            onChange={(e) => setLowStockAlertsEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {/* Delivery Mode */}
                <div className="space-y-2">
                    <Label>Delivery Mode</Label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50">
                            <input
                                type="radio"
                                value="immediate"
                                checked={deliveryMode === 'immediate'}
                                onChange={(e) => setDeliveryMode(e.target.value as any)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="font-medium">Immediate</div>
                                <div className="text-sm text-zinc-600">Send alerts as soon as they occur</div>
                            </div>
                        </label>
                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50">
                            <input
                                type="radio"
                                value="digest"
                                checked={deliveryMode === 'digest'}
                                onChange={(e) => setDeliveryMode(e.target.value as any)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="font-medium">Digest</div>
                                <div className="text-sm text-zinc-600">Group alerts and send at scheduled times</div>
                            </div>
                        </label>
                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50">
                            <input
                                type="radio"
                                value="both"
                                checked={deliveryMode === 'both'}
                                onChange={(e) => setDeliveryMode(e.target.value as any)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="font-medium">Both</div>
                                <div className="text-sm text-zinc-600">Send immediate alerts and daily digest</div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Digest Schedule */}
                {(deliveryMode === 'digest' || deliveryMode === 'both') && (
                    <div className="space-y-2">
                        <Label htmlFor="digest-schedule">Digest Schedule</Label>
                        <Input
                            id="digest-schedule"
                            type="time"
                            value={digestSchedule}
                            onChange={(e) => setDigestSchedule(e.target.value)}
                        />
                        <p className="text-sm text-zinc-600">
                            Time to send daily digest of low stock alerts
                        </p>
                    </div>
                )}

                {/* Quiet Hours */}
                <div className="space-y-4">
                    <div>
                        <Label>Quiet Hours</Label>
                        <p className="text-sm text-zinc-600 mt-1">
                            Suppress immediate alerts during these hours (digest will still be sent)
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quiet-start">Start Time</Label>
                            <Input
                                id="quiet-start"
                                type="time"
                                value={quietHoursStart}
                                onChange={(e) => setQuietHoursStart(e.target.value)}
                                placeholder="22:00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quiet-end">End Time</Label>
                            <Input
                                id="quiet-end"
                                type="time"
                                value={quietHoursEnd}
                                onChange={(e) => setQuietHoursEnd(e.target.value)}
                                placeholder="08:00"
                            />
                        </div>
                    </div>
                    {quietHoursStart && quietHoursEnd && (
                        <p className="text-sm text-zinc-500">
                            Alerts will be suppressed from {quietHoursStart} to {quietHoursEnd}
                        </p>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

