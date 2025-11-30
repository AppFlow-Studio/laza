"use client";

import { useState } from 'react';
import { useLowStockThresholds, useCreateLowStockThreshold, useUpdateLowStockThreshold, useDeleteLowStockThreshold } from '@/lib/hooks/queries/useNotificationPreferences';
import { useItems } from '@/lib/hooks/queries/useItems';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface LowStockThresholdManagerProps {
    organizationId: string;
}

export default function LowStockThresholdManager({ organizationId }: LowStockThresholdManagerProps) {
    const { data: thresholds, isLoading: thresholdsLoading } = useLowStockThresholds(organizationId, { isActive: true });
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: locations, isLoading: locationsLoading } = useLocations();
    const createMutation = useCreateLowStockThreshold();
    const updateMutation = useUpdateLowStockThreshold();
    const deleteMutation = useDeleteLowStockThreshold();

    const [showForm, setShowForm] = useState(false);
    const [editingThreshold, setEditingThreshold] = useState<any>(null);
    const [formData, setFormData] = useState({
        item_id: '',
        category_id: '',
        location_id: '',
        low_threshold: '',
        critical_threshold: '',
        is_active: true,
    });

    const resetForm = () => {
        setFormData({
            item_id: '',
            category_id: '',
            location_id: '',
            low_threshold: '',
            critical_threshold: '',
            is_active: true,
        });
        setEditingThreshold(null);
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const thresholdData = {
                organization_id: organizationId,
                item_id: formData.item_id || null,
                category_id: formData.category_id || null,
                location_id: formData.location_id || null,
                low_threshold: parseFloat(formData.low_threshold),
                critical_threshold: formData.critical_threshold ? parseFloat(formData.critical_threshold) : null,
                is_active: formData.is_active,
            };

            if (editingThreshold) {
                await updateMutation.mutateAsync({
                    id: editingThreshold.id,
                    updates: thresholdData,
                });
                toast.success('Threshold updated');
            } else {
                await createMutation.mutateAsync(thresholdData);
                toast.success('Threshold created');
            }
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save threshold');
        }
    };

    const handleEdit = (threshold: any) => {
        setEditingThreshold(threshold);
        setFormData({
            item_id: threshold.item_id || '',
            category_id: threshold.category_id || '',
            location_id: threshold.location_id || '',
            low_threshold: threshold.low_threshold.toString(),
            critical_threshold: threshold.critical_threshold?.toString() || '',
            is_active: threshold.is_active,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this threshold?')) return;
        try {
            await deleteMutation.mutateAsync({ id, organizationId });
            toast.success('Threshold deleted');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete threshold');
        }
    };

    if (thresholdsLoading || itemsLoading || locationsLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Low Stock Thresholds</CardTitle>
                            <CardDescription>
                                Set custom thresholds for items, categories, or locations
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Threshold
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showForm && (
                        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg space-y-4 bg-zinc-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <select
                                        value={formData.item_id ? 'item' : formData.category_id ? 'category' : 'location'}
                                        onChange={(e) => {
                                            if (e.target.value === 'item') {
                                                setFormData({ ...formData, item_id: '', category_id: '', location_id: '' });
                                            } else if (e.target.value === 'category') {
                                                setFormData({ ...formData, item_id: '', category_id: '', location_id: '' });
                                            } else {
                                                setFormData({ ...formData, item_id: '', category_id: '', location_id: '' });
                                            }
                                        }}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                    >
                                        <option value="item">Item</option>
                                        <option value="category">Category</option>
                                        <option value="location">Location</option>
                                    </select>
                                </div>
                                {formData.item_id || (formData.item_id === '' && !formData.category_id && !formData.location_id) ? (
                                    <div className="space-y-2">
                                        <Label>Item</Label>
                                        <select
                                            value={formData.item_id}
                                            onChange={(e) => setFormData({ ...formData, item_id: e.target.value, category_id: '', location_id: '' })}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                        >
                                            <option value="">Select item</option>
                                            {items?.map((item: any) => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : formData.category_id || (!formData.item_id && formData.category_id === '' && !formData.location_id) ? (
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value, item_id: '', location_id: '' })}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                        >
                                            <option value="">Select category</option>
                                            <option value="desserts">Desserts</option>
                                            <option value="ingredients">Ingredients</option>
                                            <option value="supplies">Supplies</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <select
                                            value={formData.location_id}
                                            onChange={(e) => setFormData({ ...formData, location_id: e.target.value, item_id: '', category_id: '' })}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                        >
                                            <option value="">Select location</option>
                                            {locations?.map((loc: any) => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="low-threshold">Low Threshold</Label>
                                    <Input
                                        id="low-threshold"
                                        type="number"
                                        step="0.01"
                                        value={formData.low_threshold}
                                        onChange={(e) => setFormData({ ...formData, low_threshold: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="critical-threshold">Critical Threshold (optional)</Label>
                                    <Input
                                        id="critical-threshold"
                                        type="number"
                                        step="0.01"
                                        value={formData.critical_threshold}
                                        onChange={(e) => setFormData({ ...formData, critical_threshold: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingThreshold ? 'Update' : 'Create'} Threshold
                                </Button>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {thresholds && thresholds.length > 0 ? (
                        <div className="space-y-2">
                            {thresholds.map((threshold: any) => {
                                const item = items?.find((i: any) => i.id === threshold.item_id);
                                const location = locations?.find((l: any) => l.id === threshold.location_id);
                                const type = threshold.item_id ? 'Item' : threshold.category_id ? 'Category' : 'Location';
                                const name = threshold.item_id
                                    ? item?.name
                                    : threshold.category_id
                                        ? threshold.category_id
                                        : location?.name;

                                return (
                                    <div key={threshold.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <div className="font-medium">{type}: {name}</div>
                                            <div className="text-sm text-zinc-600">
                                                Low: {threshold.low_threshold} |
                                                {threshold.critical_threshold && ` Critical: ${threshold.critical_threshold}`}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(threshold)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(threshold.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-zinc-500 py-8">No custom thresholds configured</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

