"use client";

import { Sheet } from 'react-modal-sheet';
import { ReactNode } from 'react';

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    snapPoints?: number[];
    footer?: ReactNode;
}

export default function MobileSheet({ isOpen, onClose, title, children, snapPoints = [0, 0.5, 0.7, 1], footer }: MobileSheetProps) {
    return (
        <Sheet isOpen={isOpen} onClose={onClose} snapPoints={snapPoints}  initialSnap={snapPoints[2]}>

            <Sheet.Container className=''>
                <Sheet.Header />
                <Sheet.Content className=''>
                    <div className="flex flex-col h-full bg-white rounded-t-2xl max-h-[95vh] ">
                        {title && (
                            <div className="px-4 pt-6 pb-4 border-b border-zinc-200 flex-shrink-0">
                                <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 h-full">
                            {children}
                        </div>
                        {footer && (
                            <div className="border-t border-zinc-200 px-4 py-4 bg-zinc-50 flex-shrink-0">
                                {footer}
                            </div>
                        )}
                    </div>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={onClose} />
        </Sheet>
    );
}

