"use client";

import { ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    snapPoints?: number[];
    footer?: ReactNode;
}

export default function MobileSheet({
    isOpen,
    onClose,
    title,
    children,
    footer,
}: MobileSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="w-full sm:w-[500px] sm:max-w-none flex flex-col p-0"
            >
                {title && (
                    <SheetHeader className="px-4 pt-6 pb-4 border-b border-zinc-200 flex-shrink-0">
                        <SheetTitle>{title}</SheetTitle>
                    </SheetHeader>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                    {children}
                </div>

                {footer && (
                    <div className="border-t border-zinc-200 px-4 py-4 bg-zinc-50 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}