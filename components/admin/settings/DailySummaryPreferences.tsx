"use client";

import { useState, useEffect } from 'react';
import {
    useDailySummaryPreferences,
    useUpdateDailySummaryPreferences,
    useNotificationPreferences,
    useUpdateNotificationPreferences
} from '@/lib/hooks/queries/useNotificationPreferences';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import { Clock, Calendar } from 'lucide-react';

interface DailySummaryPreferencesProps {
    organizationId: string;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export default function DailySummaryPreferences({ organizationId }: DailySummaryPreferencesProps) {
    const { data: preferences, isLoading: isLoadingSummary } = useDailySummaryPreferences(organizationId);
    const { data: notificationPrefs, isLoading: isLoadingNotification } = useNotificationPreferences(organizationId);
    const { data: locations } = useLocations();
    const updateSummaryMutation = useUpdateDailySummaryPreferences();
    const updateNotificationMutation = useUpdateNotificationPreferences();

    const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
    const [summarySchedule, setSummarySchedule] = useState('08:00');
    const [summaryDays, setSummaryDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [summaryFormat, setSummaryFormat] = useState<'detailed' | 'concise'>('detailed');
    const [groupByLocation, setGroupByLocation] = useState(false);
    const [locationsToInclude, setLocationsToInclude] = useState<string[]>([]);
    const [includeUpdatedItems, setIncludeUpdatedItems] = useState(true);
    const [includeStorageUtilization, setIncludeStorageUtilization] = useState(true);
    const [includeLowStockItems, setIncludeLowStockItems] = useState(true);
    const [includeEmployeeActivity, setIncludeEmployeeActivity] = useState(true);
    const [includeComparisonMetrics, setIncludeComparisonMetrics] = useState(true);
    const [includeTrendingItems, setIncludeTrendingItems] = useState(false);
    const [minSignificanceThreshold, setMinSignificanceThreshold] = useState(10);

    useEffect(() => {
        if (notificationPrefs) {
            setDailySummaryEnabled(notificationPrefs.daily_summary_enabled ?? true);
            // Convert TIME format (HH:MM:SS) to input format (HH:MM)
            if (notificationPrefs.daily_summary_schedule) {
                const timeStr = notificationPrefs.daily_summary_schedule;
                setSummarySchedule(timeStr.substring(0, 5)); // Extract HH:MM from HH:MM:SS
            }
            // Parse JSONB array of days
            if (notificationPrefs.daily_summary_days) {
                const days = Array.isArray(notificationPrefs.daily_summary_days)
                    ? notificationPrefs.daily_summary_days
                    : JSON.parse(notificationPrefs.daily_summary_days as any);
                setSummaryDays(days.map((d: any) => typeof d === 'string' ? parseInt(d) : d));
            }
        }
    }, [notificationPrefs]);

    useEffect(() => {
        if (preferences) {
            setSummaryFormat(preferences.summary_format || 'detailed');
            setGroupByLocation(preferences.group_by_location ?? false);
            setLocationsToInclude(preferences.locations_to_include || []);
            setIncludeUpdatedItems(preferences.include_updated_items ?? true);
            setIncludeStorageUtilization(preferences.include_storage_utilization ?? true);
            setIncludeLowStockItems(preferences.include_low_stock_items ?? true);
            setIncludeEmployeeActivity(preferences.include_employee_activity ?? true);
            setIncludeComparisonMetrics(preferences.include_comparison_metrics ?? true);
            setIncludeTrendingItems(preferences.include_trending_items ?? false);
            setMinSignificanceThreshold(preferences.min_significance_threshold ?? 10);
        }
    }, [preferences]);

    const handleSave = async () => {
        try {
            // Convert HH:MM to HH:MM:SS format for database
            const scheduleTime = summarySchedule.length === 5
                ? `${summarySchedule}:00`
                : summarySchedule;

            // Save notification preferences (schedule and days)
            await updateNotificationMutation.mutateAsync({
                organizationId,
                updates: {
                    daily_summary_enabled: dailySummaryEnabled,
                    daily_summary_schedule: scheduleTime,
                    daily_summary_days: summaryDays,
                },
            });

            // Save daily summary content preferences
            await updateSummaryMutation.mutateAsync({
                organizationId,
                updates: {
                    include_updated_items: includeUpdatedItems,
                    include_storage_utilization: includeStorageUtilization,
                    include_low_stock_items: includeLowStockItems,
                    include_employee_activity: includeEmployeeActivity,
                    include_comparison_metrics: includeComparisonMetrics,
                    include_trending_items: includeTrendingItems,
                    min_significance_threshold: minSignificanceThreshold,
                    summary_format: summaryFormat,
                    group_by_location: groupByLocation,
                    locations_to_include: locationsToInclude,
                },
            });

            toast.success('Daily summary preferences updated');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save preferences');
        }
    };

    const toggleDay = (day: number) => {
        if (summaryDays.includes(day)) {
            setSummaryDays(summaryDays.filter(d => d !== day));
        } else {
            setSummaryDays([...summaryDays, day].sort());
        }
    };

    const toggleLocation = (locationId: string) => {
        if (locationsToInclude.includes(locationId)) {
            setLocationsToInclude(locationsToInclude.filter(id => id !== locationId));
        } else {
            setLocationsToInclude([...locationsToInclude, locationId]);
        }
    };

    if (isLoadingSummary || isLoadingNotification) {
        return <LoadingSkeleton />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Daily Summary Preferences</CardTitle>
                <CardDescription>
                    Configure when and what information is included in your daily summary emails
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Schedule Section */}
                <div className="space-y-4 p-4 bg-zinc-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-zinc-600" />
                        <Label className="text-base font-medium">Schedule</Label>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div>
                            <Label className="text-sm font-medium">Enable Daily Summary</Label>
                            <p className="text-xs text-zinc-600 mt-0.5">
                                Receive daily summary emails
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dailySummaryEnabled}
                                onChange={(e) => setDailySummaryEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Schedule Time */}
                    {dailySummaryEnabled && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-zinc-600" />
                                    <Label htmlFor="summary-schedule">Send Time</Label>
                                </div>
                                <Input
                                    id="summary-schedule"
                                    type="time"
                                    value={summarySchedule}
                                    onChange={(e) => setSummarySchedule(e.target.value)}
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-zinc-600">
                                    Time in your organization's timezone (set in General settings)
                                </p>
                            </div>

                            {/* Days of Week */}
                            <div className="space-y-2">
                                <Label>Send On Days</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <label
                                            key={day.value}
                                            className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${summaryDays.includes(day.value)
                                                ? 'bg-indigo-50 border-indigo-300'
                                                : 'bg-white border-zinc-200 hover:bg-zinc-50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={summaryDays.includes(day.value)}
                                                onChange={() => toggleDay(day.value)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm font-medium">{day.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-600">
                                    Select which days of the week to receive daily summaries
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Content Sections */}
                <div className="space-y-4">
                    <Label className="text-base font-medium">Include in Summary</Label>
                    <div className="space-y-3">
                        {[
                            { key: 'updatedItems', label: 'Updated Items Today', value: includeUpdatedItems, setter: setIncludeUpdatedItems },
                            { key: 'storageUtilization', label: 'Storage Utilization', value: includeStorageUtilization, setter: setIncludeStorageUtilization },
                            { key: 'lowStockItems', label: 'Low Stock Items', value: includeLowStockItems, setter: setIncludeLowStockItems },
                            { key: 'employeeActivity', label: 'Employee Activity', value: includeEmployeeActivity, setter: setIncludeEmployeeActivity },
                            { key: 'comparisonMetrics', label: 'Comparison Metrics', value: includeComparisonMetrics, setter: setIncludeComparisonMetrics },
                            { key: 'trendingItems', label: 'Trending Items', value: includeTrendingItems, setter: setIncludeTrendingItems },
                        ].map(({ key, label, value, setter }) => (
                            <label key={key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50">
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) => setter(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="flex-1">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Summary Format */}
                <div className="space-y-2">
                    <Label>Summary Format</Label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="detailed"
                                checked={summaryFormat === 'detailed'}
                                onChange={(e) => setSummaryFormat(e.target.value as any)}
                                className="w-4 h-4"
                            />
                            <span>Detailed</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="concise"
                                checked={summaryFormat === 'concise'}
                                onChange={(e) => setSummaryFormat(e.target.value as any)}
                                className="w-4 h-4"
                            />
                            <span>Concise</span>
                        </label>
                    </div>
                </div>

                {/* Minimum Significance Threshold */}
                <div className="space-y-2">
                    <Label htmlFor="significance-threshold">Minimum Significance Threshold</Label>
                    <Input
                        id="significance-threshold"
                        type="number"
                        value={minSignificanceThreshold}
                        onChange={(e) => setMinSignificanceThreshold(parseInt(e.target.value) || 10)}
                    />
                    <p className="text-sm text-zinc-600">
                        Minimum unit change to show in summary (filters out minor updates)
                    </p>
                </div>

                {/* Group by Location */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                    <div>
                        <Label className="text-base font-medium">Group by Location</Label>
                        <p className="text-sm text-zinc-600 mt-1">
                            Send separate emails for each location
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={groupByLocation}
                            onChange={(e) => setGroupByLocation(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {/* Locations to Include */}
                {locations && locations.length > 0 && (
                    <div className="space-y-2">
                        <Label>Locations to Include</Label>
                        <p className="text-sm text-zinc-600">
                            {locationsToInclude.length === 0 ? 'All locations will be included' : 'Select specific locations'}
                        </p>
                        <div className="space-y-2">
                            {locations.map((location: any) => (
                                <label key={location.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-zinc-50">
                                    <input
                                        type="checkbox"
                                        checked={locationsToInclude.includes(location.id)}
                                        onChange={() => toggleLocation(location.id)}
                                        className="w-4 h-4"
                                    />
                                    <span>{location.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={updateSummaryMutation.isPending || updateNotificationMutation.isPending}
                    >
                        {updateSummaryMutation.isPending || updateNotificationMutation.isPending
                            ? 'Saving...'
                            : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

