import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminStore {
    // Current selected location
    selectedLocationId: string | null;
    setSelectedLocationId: (id: string | null) => void;

    // Filter preferences
    filters: {
        category: string | null;
        status: string | null;
        searchQuery: string;
    };
    setFilter: (key: keyof AdminStore['filters'], value: string | null) => void;
    clearFilters: () => void;

    // UI state
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    mobileSheetOpen: boolean;
    setMobileSheetOpen: (open: boolean) => void;

    // View preferences
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;

    // Cached data (for offline support)
    cachedLocations: any[];
    setCachedLocations: (locations: any[]) => void;
    cachedItems: any[];
    setCachedItems: (items: any[]) => void;
}

export const useAdminStore = create<AdminStore>()(
    persist(
        (set) => ({
            // Location
            selectedLocationId: null,
            setSelectedLocationId: (id) => set({ selectedLocationId: id }),

            // Filters
            filters: {
                category: null,
                status: null,
                searchQuery: '',
            },
            setFilter: (key, value) =>
                set((state) => ({
                    filters: { ...state.filters, [key]: value },
                })),
            clearFilters: () =>
                set({
                    filters: {
                        category: null,
                        status: null,
                        searchQuery: '',
                    },
                }),

            // UI state
            sidebarOpen: true,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            mobileSheetOpen: false,
            setMobileSheetOpen: (open) => set({ mobileSheetOpen: open }),

            // View mode
            viewMode: 'grid',
            setViewMode: (mode) => set({ viewMode: mode }),

            // Cached data
            cachedLocations: [],
            setCachedLocations: (locations) => set({ cachedLocations: locations }),
            cachedItems: [],
            setCachedItems: (items) => set({ cachedItems: items }),
        }),
        {
            name: 'admin-store',
            partialize: (state) => ({
                selectedLocationId: state.selectedLocationId,
                filters: state.filters,
                viewMode: state.viewMode,
                cachedLocations: state.cachedLocations,
                cachedItems: state.cachedItems,
            }),
        }
    )
);

