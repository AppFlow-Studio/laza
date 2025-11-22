"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// export function useInventorySubscription(locationId: string | null) {
//     const queryClient = useQueryClient();

//     useEffect(() => {
//         if (!locationId) return;

//         const channel = supabase
//             .channel(`inventory:${locationId}`)
//             .on(
//                 'postgres_changes',
//                 {
//                     event: '*',
//                     schema: 'public',
//                     table: 'item_locations',
//                     filter: `location_id=eq.${locationId}`,
//                 },
//                 (payload) => {
//                     queryClient.invalidateQueries({ queryKey: ['inventory', 'location', locationId] });
//                     queryClient.invalidateQueries({ queryKey: ['alerts'] });

//                     if (payload.eventType === 'UPDATE') {
//                         toast.success('Inventory updated', { duration: 2000 });
//                     }
//                 }
//             )
//             .subscribe();

//         return () => {
//             supabase.removeChannel(channel);
//         };
//     }, [locationId, supabase, queryClient]);
// }

// export function useInventoryLogsSubscription() {
//     const queryClient = useQueryClient();

//     useEffect(() => {
//         const channel = supabase
//             .channel('inventory-logs')
//             .on(
//                 'postgres_changes',
//                 {
//                     event: 'INSERT',
//                     schema: 'public',
//                     table: 'inventory_logs',
//                 },
//                 () => {
//                     queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
//                 }
//             )
//             .subscribe();

//         return () => {
//             supabase.removeChannel(channel);
//         };
//     }, [supabase, queryClient]);
// }

// export function useAlertsSubscription() {
//     const supabase = useSupabaseClient();
//     const queryClient = useQueryClient();

//     useEffect(() => {
//         const channel = supabase
//             .channel('alerts')
//             .on(
//                 'postgres_changes',
//                 {
//                     event: 'INSERT',
//                     schema: 'public',
//                     table: 'alerts',
//                     filter: 'resolved_at=is.null',
//                 },
//                 (payload) => {
//                     queryClient.invalidateQueries({ queryKey: ['alerts'] });
//                     toast.error('New low stock alert!', { duration: 5000 });
//                 }
//             )
//             .subscribe();

//         return () => {
//             supabase.removeChannel(channel);
//         };
//     }, [supabase, queryClient]);
// }

// export function useEmployeesSubscription() {
//     const supabase = useSupabaseClient();
//     const queryClient = useQueryClient();

//     useEffect(() => {
//         const channel = supabase
//             .channel('employees')
//             .on(
//                 'postgres_changes',
//                 {
//                     event: '*',
//                     schema: 'public',
//                     table: 'users',
//                     filter: 'role=neq.null',
//                 },
//                 () => {
//                     queryClient.invalidateQueries({ queryKey: ['employees'] });
//                 }
//             )
//             .subscribe();

//         return () => {
//             supabase.removeChannel(channel);
//         };
//     }, [supabase, queryClient]);
// }

