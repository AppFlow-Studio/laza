"use client";

import { useState, useEffect } from 'react';
import { useDailySummaryPreferences, useUpdateDailySummaryPreferences } from '@/lib/hooks/queries/useNotificationPreferences';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import toast from 'react-hot-toast';

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
    const { data: preferences, isLoading } = useDailySummaryPreferences(organizationId);
    const { data: locations } = useLocations();
    const updateMutation = useUpdateDailySummaryPreferences();

    const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
    const [summarySchedule, setSummarySchedule] = useState('08:00:00');
    const [summaryDays, setSummaryDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [summaryFormat, setSummaryFormat] = useState<'detailed' | 'concise'>('detailed');
    const [groupByLocation, setGroupByLocation] = useState(false);
    const [locationsToInclude, setLocationsToInclude] = useState<string[]>([]);
    const [includeInventoryValue, setIncludeInventoryValue] = useState(true);
    const [includeUpdatedItems, setIncludeUpdatedItems] = useState(true);
    const [includeStorageUtilization, setIncludeStorageUtilization] = useState(true);
    const [includeLowStockItems, setIncludeLowStockItems] = useState(true);
    const [includeEmployeeActivity, setIncludeEmployeeActivity] = useState(true);
    const [includeComparisonMetrics, setIncludeComparisonMetrics] = useState(true);
    const [includeTrendingItems, setIncludeTrendingItems] = useState(false);
    const [minSignificanceThreshold, setMinSignificanceThreshold] = useState(10);

    useEffect(() => {
        if (preferences) {
            setDailySummaryEnabled(true); // Controlled by parent notification preferences
            setSummarySchedule('08:00:00'); // From notification preferences
            setSummaryDays(preferences.locations_to_include || [1, 2, 3, 4, 5]);
            setSummaryFormat(preferences.summary_format || 'detailed');
            setGroupByLocation(preferences.group_by_location ?? false);
            setLocationsToInclude(preferences.locations_to_include || []);
            setIncludeInventoryValue(preferences.include_inventory_value ?? true);
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
            await updateMutation.mutateAsync({
                organizationId,
                updates: {
                    include_inventory_value: includeInventoryValue,
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

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Daily Summary Preferences</CardTitle>
                <CardDescription>
                    Configure what information is included in your daily summary emails
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Content Sections */}
                <div className="space-y-4">
                    <Label className="text-base font-medium">Include in Summary</Label>
                    <div className="space-y-3">
                        {[
                            { key: 'inventoryValue', label: 'Inventory Value', value: includeInventoryValue, setter: setIncludeInventoryValue },
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
                    <Button onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

