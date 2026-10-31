"use client";

import { useState, useEffect } from 'react';
import { useNotificationPreferences, useUpdateNotificationPreferences, useCreateNotificationPreferences } from '@/lib/hooks/queries/useNotificationPreferences';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import { X, Plus } from 'lucide-react';

interface GeneralNotificationPreferencesProps {
    organizationId: string;
    locationId?: string;
}

export default function GeneralNotificationPreferences({ organizationId, locationId }: GeneralNotificationPreferencesProps) {
    const { user } = useUser();
    const { data: preferences, isLoading } = useNotificationPreferences(organizationId, locationId);
    const updateMutation = useUpdateNotificationPreferences();
    const createMutation = useCreateNotificationPreferences();

    const [primaryEmail, setPrimaryEmail] = useState('');
    const [secondaryEmails, setSecondaryEmails] = useState<string[]>([]);
    const [newSecondaryEmail, setNewSecondaryEmail] = useState('');
    const [timezone, setTimezone] = useState('America/New_York');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailFormat, setEmailFormat] = useState<'html' | 'plain'>('html');

    useEffect(() => {
        if (preferences) {
            setPrimaryEmail(preferences.primary_email || user?.emailAddresses[0]?.emailAddress || '');
            setSecondaryEmails(preferences.secondary_emails || []);
            setTimezone(preferences.timezone || 'America/New_York');
            setNotificationsEnabled(preferences.notifications_enabled ?? true);
            setEmailFormat(preferences.email_format || 'html');
        } else if (user?.emailAddresses[0]?.emailAddress) {
            setPrimaryEmail(user.emailAddresses[0].emailAddress);
        }
    }, [preferences, user]);

    const handleSave = async () => {
        try {
            const updates = {
                primary_email: primaryEmail,
                secondary_emails: secondaryEmails,
                timezone,
                notifications_enabled: notificationsEnabled,
                email_format: emailFormat,
            };

            if (preferences) {
                await updateMutation.mutateAsync({ organizationId, updates, locationId });
                toast.success('Preferences updated successfully');
            } else {
                await createMutation.mutateAsync({ organizationId, data: updates, locationId });
                toast.success('Preferences created successfully');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to save preferences');
        }
    };

    const addSecondaryEmail = () => {
        if (newSecondaryEmail && !secondaryEmails.includes(newSecondaryEmail)) {
            setSecondaryEmails([...secondaryEmails, newSecondaryEmail]);
            setNewSecondaryEmail('');
        }
    };

    const removeSecondaryEmail = (email: string) => {
        setSecondaryEmails(secondaryEmails.filter(e => e !== email));
    };

    if (isLoading) {
        return <LoadingSkeleton className='h-full w-full' />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Notification Preferences</CardTitle>
                <CardDescription>
                    Configure basic email notification settings for your organization
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Global Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                    <div>
                        <Label className="text-base font-medium">Enable Notifications</Label>
                        <p className="text-sm text-zinc-600 mt-1">
                            Master switch for all email notifications
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => setNotificationsEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {/* Primary Email */}
                <div className="space-y-2">
                    <Label htmlFor="primary-email">Primary Email Address</Label>
                    <Input
                        id="primary-email"
                        type="email"
                        value={primaryEmail}
                        onChange={(e) => setPrimaryEmail(e.target.value)}
                        placeholder="admin@example.com"
                    />
                    <p className="text-sm text-zinc-600">
                        Main email address for receiving notifications
                    </p>
                </div>

                {/* Secondary Emails */}
                <div className="space-y-2">
                    <Label>Secondary Email Addresses</Label>
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            value={newSecondaryEmail}
                            onChange={(e) => setNewSecondaryEmail(e.target.value)}
                            placeholder="additional@example.com"
                            onKeyPress={(e) => e.key === 'Enter' && addSecondaryEmail()}
                        />
                        <Button type="button" onClick={addSecondaryEmail} variant="outline">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    {secondaryEmails.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {secondaryEmails.map((email) => (
                                <div key={email} className="flex items-center justify-between p-2 bg-zinc-50 rounded">
                                    <span className="text-sm">{email}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSecondaryEmail(email)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-sm text-zinc-600">
                        Additional email addresses to receive notifications
                    </p>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                        id="timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="UTC">UTC</option>
                    </select>
                    <p className="text-sm text-zinc-600">
                        Timezone for scheduling notifications
                    </p>
                </div>

                {/* Email Format */}
                <div className="space-y-2">
                    <Label>Email Format</Label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="html"
                                checked={emailFormat === 'html'}
                                onChange={(e) => setEmailFormat(e.target.value as 'html' | 'plain')}
                                className="w-4 h-4"
                            />
                            <span>HTML</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="plain"
                                checked={emailFormat === 'plain'}
                                onChange={(e) => setEmailFormat(e.target.value as 'html' | 'plain')}
                                className="w-4 h-4"
                            />
                            <span>Plain Text</span>
                        </label>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
                        {updateMutation.isPending || createMutation.isPending ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}