import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import {
    getPalletsForReorganizationAction,
    moveBoxesBetweenPalletsAction,
    MoveBoxesPayload,
} from '@/lib/supabase/actions/palletReorganizeActions';
import { palletKeys } from '@/lib/hooks/queries/usePallets';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const reorganizeKeys = {
    pallets: (locationId: string) => ['pallets-for-reorg', locationId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePalletsForReorganization(warehouseLocationId: string | undefined | null) {
    return useQuery({
        queryKey:  reorganizeKeys.pallets(warehouseLocationId ?? ''),
        queryFn:   () => getPalletsForReorganizationAction(warehouseLocationId!),
        enabled:   !!warehouseLocationId,
        staleTime: 30 * 1000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useMoveBoxesBetweenPallets() {
    const qc       = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: (payload: Omit<MoveBoxesPayload, 'userId'>) =>
            moveBoxesBetweenPalletsAction({ ...payload, userId: user?.id ?? '' }),

        onSuccess: () => {
            // Refresh everything pallet-related
            qc.invalidateQueries({ queryKey: palletKeys.all });
            qc.invalidateQueries({ queryKey: ['pallets-for-reorg'] });
            qc.invalidateQueries({ queryKey: ['warehouse-stats'] });
            qc.invalidateQueries({ queryKey: ['warehouse-inventory'] });
        },
    });
}
