import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SuperAdminStore {
	// Currently focused store location (null = all stores)
	selectedStoreId: string | null;
	setSelectedStoreId: (id: string | null) => void;

	// Filter preferences
	filters: {
		category: string | null;
		status: string | null;
		searchQuery: string;
	};
	setFilter: (key: keyof SuperAdminStore['filters'], value: string | null) => void;
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

export const useSuperAdminStore = create<SuperAdminStore>()(
	persist(
		(set) => ({
			// Store selection
			selectedStoreId: null,
			setSelectedStoreId: (id) => set({ selectedStoreId: id }),

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
			name: 'super-admin-store',
			partialize: (state) => ({
				selectedStoreId: state.selectedStoreId,
				filters: state.filters,
				viewMode: state.viewMode,
				cachedLocations: state.cachedLocations,
				cachedItems: state.cachedItems,
			}),
		}
	)
);