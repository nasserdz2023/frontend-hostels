"use client";

import * as React from "react";
import { Check, CircleDot, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Step {
    id: number;
    label: string;
    description?: string;
}

interface StepperProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (step: number) => void;
    completedSteps?: number[];
    errorSteps?: number[];
    allowJumpToAnyStep?: boolean;
    progress?: number; // Optional: field-based progress percentage
    className?: string;
}

export function Stepper({
    steps,
    currentStep,
    onStepClick,
    completedSteps = [],
    errorSteps = [],
    className,
    allowJumpToAnyStep = false,
    progress: externalProgress,
}: StepperProps) {
    // Use external progress if provided, otherwise calculate based on steps
    const progress = externalProgress ?? Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
    const t = useTranslations('common');
    const isFieldBasedProgress = externalProgress !== undefined;

    return (
        <div className={cn("w-full space-y-4", className)}>
            {/* Progress Bar & Percentage */}
            <div className="flex items-center gap-4">
                {isFieldBasedProgress && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {t('completionPercentage')}
                    </span>
                )}
                <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-in-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-end">
                    {progress}%
                </span>
            </div>

            <div className="relative flex items-center justify-between px-2">
                {/* Connector Lines */}
                <div className="absolute start-0 top-1/2 w-full -translate-y-1/2 px-4 -z-10">
                    <div className="h-[2px] w-full bg-muted" />
                </div>

                {steps.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isCurrent = currentStep === step.id;
                    const isError = errorSteps.includes(step.id);
                    // Allow click if explicitly allowed OR standard logic (visited/current)
                    const isClickable = onStepClick && (allowJumpToAnyStep || isCompleted || isCurrent || step.id < currentStep);

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center bg-background px-2">
                            <button
                                type="button"
                                disabled={!isClickable}
                                onClick={() => isClickable && onStepClick?.(step.id)}
                                className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                                    isError
                                        ? "border-destructive bg-destructive text-destructive-foreground"
                                        : isCompleted
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : isCurrent
                                                ? "border-primary bg-background text-primary ring-4 ring-primary/20"
                                                : "border-muted-foreground/30 bg-background text-muted-foreground",
                                    isClickable && "hover:scale-110 cursor-pointer"
                                )}
                            >
                                {isError ? (
                                    <span className="text-lg font-bold">!</span>
                                ) : isCompleted ? (
                                    <Check className="h-6 w-6" />
                                ) : (
                                    index + 1
                                )}
                            </button>
                            <div className="absolute top-12 flex w-32 flex-col items-center text-center">
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        isCurrent ? "text-primary" : "text-muted-foreground",
                                        isError && "text-destructive"
                                    )}
                                >
                                    {step.label}
                                </span>
                                {step.description && (
                                    <span className="text-xs text-muted-foreground hidden sm:block">
                                        {step.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Spacing for labels */}
            <div className="h-16" />
        </div>
    );
}
