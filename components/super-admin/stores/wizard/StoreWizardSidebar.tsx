"use client";

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStep {
    number: number;
    title: string;
    description: string;
}

const STEPS: WizardStep[] = [
    { number: 1, title: 'Store Details',    description: 'Name, address, status' },
    { number: 2, title: 'Storage Spaces',   description: 'Add storage areas' },
    { number: 3, title: 'Assign Items',     description: 'Stock each space' },
    { number: 4, title: 'Invite Admin',     description: 'First store admin' },
    { number: 5, title: 'Confirmation',     description: 'Review & finish' },
];

interface WizardSidebarProps {
    currentStep: number;
    completedSteps: Set<number>;
    onStepClick: (step: number) => void;
}

export default function StoreWizardSidebar({ currentStep, completedSteps, onStepClick }: WizardSidebarProps) {
    const canNavigateTo = (step: number) =>
        completedSteps.has(step) || step === currentStep;

    return (
        <nav className="space-y-1">
            {STEPS.map((step, index) => {
                const isCompleted = completedSteps.has(step.number);
                const isCurrent   = currentStep === step.number;
                const isClickable = canNavigateTo(step.number);
                const isLast      = index === STEPS.length - 1;

                return (
                    <div key={step.number} className="relative">
                        <button
                            onClick={() => isClickable && onStepClick(step.number)}
                            disabled={!isClickable}
                            className={cn(
                                'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                                isCurrent && 'bg-indigo-50',
                                isClickable && !isCurrent && 'hover:bg-zinc-50',
                                !isClickable && 'opacity-50 cursor-not-allowed',
                            )}
                        >
                            <div className={cn(
                                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                                isCompleted && 'bg-indigo-600 border-indigo-600 text-white',
                                isCurrent && !isCompleted && 'border-indigo-600 text-indigo-600',
                                !isCurrent && !isCompleted && 'border-zinc-300 text-zinc-400',
                            )}>
                                {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                            </div>
                            <div className="min-w-0">
                                <p className={cn(
                                    'text-sm font-medium',
                                    isCurrent ? 'text-indigo-600' : isCompleted ? 'text-zinc-900' : 'text-zinc-500',
                                )}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">{step.description}</p>
                            </div>
                        </button>

                        {!isLast && (
                            <div className="absolute left-[1.3rem] top-[2.75rem] w-0.5 h-3">
                                <div className={cn('w-full h-full rounded-full', isCompleted ? 'bg-indigo-600' : 'bg-zinc-200')} />
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
