export type Database = {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string;
                    name: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            locations: {
                Row: {
                    id: string;
                    organization_id: string;
                    name: string;
                    address: {
                        street: string;
                        city: string;
                        state: string;
                        zip: string;
                        country?: string;
                    };
                    created_at: string;
                    updated_at: string;
                    is_active: boolean;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    name: string;
                    address: {
                        street: string;
                        city: string;
                        state: string;
                        zip: string;
                        country?: string;
                    };
                    created_at?: string;
                    updated_at?: string;
                    is_active?: boolean;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    name?: string;
                    address?: {
                        street: string;
                        city: string;
                        state: string;
                        zip: string;
                        country?: string;
                    };
                    created_at?: string;
                    updated_at?: string;
                    is_active?: boolean;
                };
            };
            storage_spaces: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    temperature_type: 'frozen' | 'refrigerated' | 'dry';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    temperature_type: 'frozen' | 'refrigerated' | 'dry';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    temperature_type?: 'frozen' | 'refrigerated' | 'dry';
                    created_at?: string;
                    updated_at?: string;
                };
            };
            items: {
                Row: {
                    id: string;
                    organization_id: string;
                    name: string;
                    sku: string | null;
                    category: 'desserts' | 'ingredients' | 'supplies';
                    unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
                    min_quantity: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    name: string;
                    sku?: string | null;
                    category: 'desserts' | 'ingredients' | 'supplies';
                    unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
                    min_quantity?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    name?: string;
                    sku?: string | null;
                    category?: 'desserts' | 'ingredients' | 'supplies';
                    unit_of_measure?: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
                    min_quantity?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            item_locations: {
                Row: {
                    id: string;
                    item_id: string;
                    location_id: string;
                    storage_space_id: string | null;
                    current_quantity: number;
                    min_quantity_override: number | null;
                    last_updated: string;
                };
                Insert: {
                    id?: string;
                    item_id: string;
                    location_id: string;
                    storage_space_id?: string | null;
                    current_quantity?: number;
                    min_quantity_override?: number | null;
                    last_updated?: string;
                };
                Update: {
                    id?: string;
                    item_id?: string;
                    location_id?: string;
                    storage_space_id?: string | null;
                    current_quantity?: number;
                    min_quantity_override?: number | null;
                    last_updated?: string;
                };
            };
            users: {
                Row: {
                    id: string;
                    email: string;
                    role: 'admin' | 'employee' | null;
                    assigned_location_id: string | null;
                    first_name: string | null;
                    last_name: string | null;
                    is_active: boolean;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    role?: 'admin' | 'employee' | null;
                    assigned_location_id?: string | null;
                    first_name?: string | null;
                    last_name?: string | null;
                    is_active?: boolean;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    role?: 'admin' | 'employee' | null;
                    assigned_location_id?: string | null;
                    first_name?: string | null;
                    last_name?: string | null;
                    is_active?: boolean;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            inventory_logs: {
                Row: {
                    id: string;
                    item_id: string;
                    location_id: string;
                    storage_space_id: string | null;
                    user_id: string | null;
                    previous_quantity: number;
                    new_quantity: number;
                    quantity_change: number;
                    action_type: 'count' | 'adjustment' | 'received' | 'used';
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    item_id: string;
                    location_id: string;
                    storage_space_id?: string | null;
                    user_id?: string | null;
                    previous_quantity: number;
                    new_quantity: number;
                    quantity_change: number;
                    action_type: 'count' | 'adjustment' | 'received' | 'used';
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    item_id?: string;
                    location_id?: string;
                    storage_space_id?: string | null;
                    user_id?: string | null;
                    previous_quantity?: number;
                    new_quantity?: number;
                    quantity_change?: number;
                    action_type?: 'count' | 'adjustment' | 'received' | 'used';
                    notes?: string | null;
                    created_at?: string;
                };
            };
            alerts: {
                Row: {
                    id: string;
                    item_id: string;
                    location_id: string;
                    storage_space_id: string | null;
                    alert_type: 'low_stock';
                    triggered_at: string;
                    resolved_at: string | null;
                    notified_users: string[];
                };
                Insert: {
                    id?: string;
                    item_id: string;
                    location_id: string;
                    storage_space_id?: string | null;
                    alert_type: 'low_stock';
                    triggered_at?: string;
                    resolved_at?: string | null;
                    notified_users?: string[];
                };
                Update: {
                    id?: string;
                    item_id?: string;
                    location_id?: string;
                    storage_space_id?: string | null;
                    alert_type?: 'low_stock';
                    triggered_at?: string;
                    resolved_at?: string | null;
                    notified_users?: string[];
                };
            };
            org_invites: {
                Row: {
                    id: string;
                    clerk_invite_id: string;
                    organization_id: string;
                    email: string;
                    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    role: 'admin' | 'employee';
                    clerk_user_id: string | null;
                    assigned_location_id: string | null;
                    accepted_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    clerk_invite_id: string;
                    organization_id: string;
                    email: string;
                    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    role: 'admin' | 'employee';
                    clerk_user_id?: string | null;
                    assigned_location_id?: string | null;
                    accepted_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    clerk_invite_id?: string;
                    organization_id?: string;
                    email?: string;
                    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    role?: 'admin' | 'employee';
                    clerk_user_id?: string | null;
                    assigned_location_id?: string | null;
                    accepted_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
    };
};

// Convenience types
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];
export type StorageSpace = Database['public']['Tables']['storage_spaces']['Row'];
export type Item = Database['public']['Tables']['items']['Row'];
export type ItemLocation = Database['public']['Tables']['item_locations']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type InventoryLog = Database['public']['Tables']['inventory_logs']['Row'];
export type Alert = Database['public']['Tables']['alerts']['Row'];
export type OrgInvite = Database['public']['Tables']['org_invites']['Row'];

// Extended types with relations
export type LocationWithDetails = Location & {
    storage_spaces?: StorageSpace[];
    employee_count?: number;
    total_inventory_value?: number;
};

export type ItemWithLocation = Item & {
    item_locations?: (ItemLocation & {
        location?: Location;
        storage_space?: StorageSpace;
    })[];
};

export type InventoryLogWithDetails = InventoryLog & {
    item?: Item;
    location?: Location;
    storage_space?: StorageSpace;
    user?: User;
};

