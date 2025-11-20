"use client";

import { Sheet } from 'react-modal-sheet';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReactNode } from 'react';

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    snapPoints?: number[];
}

export default function MobileSheet({ isOpen, onClose, title, children, snapPoints = [0.5, 0.9] }: MobileSheetProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Sheet isOpen={isOpen} onClose={onClose} snapPoints={snapPoints}>
                <Sheet.Container>
                    {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
                    {children}
                </Sheet.Container>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    {title && <DialogTitle>{title}</DialogTitle>}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}

