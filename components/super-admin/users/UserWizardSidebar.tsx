"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStep {
    number: number;
    title: string;
    description: string;
}

const getSteps = (role?: string): WizardStep[] => [
    { number: 1, title: "Role", description: "Select access level" },
    {
        number: 2,
        title:
            role === "admin"
                ? "Locations"
                : role === "super_admin"
                  ? "Access"
                  : "Location",
        description:
            role === "super_admin"
                ? "Full system access"
                : role === "admin"
                  ? "Assign store locations"
                  : "Assign one location",
    },
    { number: 3, title: "Details", description: "Name and email" },
    { number: 4, title: "Review", description: "Confirm and invite" },
];

interface UserWizardSidebarProps {
    currentStep: number;
    completedSteps: Set<number>;
    role?: string;
    onStepClick: (step: number) => void;
}

export default function UserWizardSidebar({
    currentStep,
    completedSteps,
    role,
    onStepClick,
}: UserWizardSidebarProps) {
    const steps = getSteps(role);

    const canNavigateTo = (step: number) =>
        completedSteps.has(step) || step === currentStep;

    return (
        <nav className="grid grid-cols-2 gap-2">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.number);
                const isCurrent = currentStep === step.number;
                const isClickable = canNavigateTo(step.number);

                return (
                    <button
                        key={step.number}
                        onClick={() => isClickable && onStepClick(step.number)}
                        disabled={!isClickable}
                        className={cn(
                            "w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-colors",
                            isCurrent && "bg-indigo-50",
                            isClickable && !isCurrent && "hover:bg-zinc-50",
                            !isClickable && "opacity-40 cursor-not-allowed",
                        )}
                    >
                        <div
                            className={cn(
                                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                                isCompleted &&
                                    "bg-indigo-600 border-indigo-600 text-white",
                                isCurrent &&
                                    !isCompleted &&
                                    "border-indigo-600 text-indigo-600",
                                !isCurrent &&
                                    !isCompleted &&
                                    "border-zinc-200 text-zinc-400",
                            )}
                        >
                            {isCompleted ? (
                                <Check className="w-3.5 h-3.5" />
                            ) : (
                                step.number
                            )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <p
                                className={cn(
                                    "text-xs font-medium leading-tight",
                                    isCurrent
                                        ? "text-indigo-600"
                                        : isCompleted
                                          ? "text-zinc-900"
                                          : "text-zinc-400",
                                )}
                            >
                                {step.title}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5 leading-tight">
                                {step.description}
                            </p>
                        </div>
                    </button>
                );
            })}
        </nav>
    );
}