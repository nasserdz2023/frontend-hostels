import { ActivityStatus } from "@/lib/api/activities";
import { cn } from "@/lib/utils";

interface ActivityStatusStepperProps {
    status: ActivityStatus | string;
}

// Order matters: Draft -> Pending Dept -> Pending Dir -> Published
// We will display them in this order.
const STEPS = [
    {
        id: "draft",
        label: "مسودة",
        statuses: [ActivityStatus.DRAFT],
    },
    {
        id: "pending_dept",
        label: "بانتظار المصلحة",
        statuses: [ActivityStatus.PENDING_DEPARTMENT],
    },
    {
        id: "pending_dir",
        label: "بانتظار المدير",
        statuses: [ActivityStatus.PENDING_DIRECTOR],
    },
    {
        id: "published",
        label: "منشور / معتمد",
        statuses: [ActivityStatus.APPROVED, ActivityStatus.PUBLISHED, ActivityStatus.ONGOING, ActivityStatus.COMPLETED],
    },
];

export function ActivityStatusStepper({ status }: ActivityStatusStepperProps) {
    let currentStepIndex = 0;

    // Determine rejection
    const isRejected = status === ActivityStatus.REJECTED;
    const isPostponed = status === ActivityStatus.POSTPONED;
    const isReservation = status === ActivityStatus.RESERVATION;

    if (!isRejected && !isPostponed && !isReservation) {
        const foundIndex = STEPS.findIndex((step) => step.statuses.includes(status as ActivityStatus));
        currentStepIndex = foundIndex !== -1 ? foundIndex : 0;

        // Fallback for cancelled
        if (status === ActivityStatus.CANCELLED) currentStepIndex = 3;
    } else {
        // If rejected/postponed/reservation, we treat it specially
        // Usually these are "Terminal" or "Alternate" states
        currentStepIndex = -1;
    }

    return (
        <div className="w-full flex justify-end" dir="rtl">
            <div className="flex border border-gray-300 rounded-sm overflow-hidden bg-white shadow-sm">
                {STEPS.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex; // Future steps in RTL flow?
                    // In RTL:
                    // [ Step 1 ] < [ Step 2 ] < [ Step 3 ] ... No, usually RTL is:
                    // [ Step 1 ] > [ Step 2 ] > [ Step 3 ] Flowing Right to Left visually?
                    // Actually, in Arabic Odoo:
                    // Rightmost is Start. Leftmost is End.
                    // Arrow points Left.

                    // Let's rely on CSS borders to create the arrow effect cleanly.
                    // The visual style in the image is:
                    // [ Text ] >

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "relative flex items-center justify-center px-4 py-2 min-w-[120px] text-sm font-medium transition-colors select-none",
                                // Chevron shape logic using border trick or clipping

                                // Colors
                                isActive
                                    ? "bg-[#714B67] text-white"
                                    : "bg-white text-gray-500 hover:bg-gray-50",

                                // Separator borders for non-active items to mimic the gray divider
                                !isActive && index !== STEPS.length - 1 && "border-s border-gray-200"
                            )}
                            style={{
                                // Custom chevron shape for RTL (Arrow points LEFT)
                                // Polygon: Top Right(0,0), Top Left(15px, 0), Point Left(0, 50%), Bottom Left(15px, 100%), Bottom Right(100%, 100%), Notch Right (100%-15px, 50%)

                                // Wait, standard clip path for arrow pointing RIGHT:
                                // polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)

                                // For RTL (Arrow points LEFT):
                                // We want the point on the LEFT side.
                                // We want the notch on the RIGHT side.

                                // Point Left: (0% 50%)
                                // Top Left Edge: (15px 0%) -> (10% 0%)
                                // Top Right: (100% 0%)
                                // Bottom Right: (100% 100%)
                                // Bottom Left Edge: (15px 100%) -> (10% 100%)
                                // Notch Right: (100% 50%) ?? No, the notch is usually on the "tail".

                                // In a sequence 1 -> 2 -> 3
                                // 1 is Start. 2 is Middle.
                                // In RTL: [1] [2] [3]
                                // 1 is Rightmost. 3 is Leftmost.
                                // Flow is <-----
                                // So 1 points to 2. 1's Left side is a Point. 2's Right side is a Notch.

                                clipPath: index === 0
                                    ? "polygon(0 50%, 15px 0, 100% 0, 100% 100%, 15px 100%)" // Rightmost (Start): Flat Right (100%), Point Left
                                    : index === STEPS.length - 1
                                        ? "polygon(0 50%, 15px 0, 100% 0, calc(100% - 15px) 50%, 100% 100%, 15px 100%)" // Leftmost (End): Notch Right, Point Left (or Flat Left?)
                                        // If it's the last one, usually it's Flat Left?
                                        // Let's make it Flat Left for the very last item? Odoo usually keeps the arrow shape even at the end or flat.
                                        // Let's try Flat Left for end.
                                        : "polygon(0 50%, 15px 0, 100% 0, calc(100% - 15px) 50%, 100% 100%, 15px 100%)", // Middle: Notch Right, Point Left

                                // Overlap logic:
                                // To make them interlock, we need negative margin on the side of the Notch.
                                // The Notch is on the Right.
                                // So marginRight: -15px.
                                marginLeft: index === 0 ? 0 : "-15px",
                                zIndex: STEPS.length - index // Higher z-index for earlier steps so they overlap the later ones correctly?
                                // Actually, if 2 has a Notch on Right, and 1 has a Point on Left.
                                // 1 needs to go UNDER 2? Or 1 goes INTO 2?
                                // 1 (Rightmost) points Left. 2 is to the Left of 1.
                                // [2] [1]
                                // 1 has Point Left. 2 has Notch Right.
                                // 1's Point fits into 2's Notch.
                                // So 1 should generally be on top?
                                // No, usually the "Next" step contains the notch.
                            }}
                        >
                            <span className={cn("ms-2 text-xs font-bold uppercase tracking-wide", isActive ? "text-white" : "text-gray-500")}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}

                {/* If Rejected, we could append a Red block */}
                {/* Special Status Blocks */}
                {isRejected && (
                    <div className="relative flex items-center justify-center px-4 py-2 min-w-[120px] text-sm font-medium bg-red-600 text-white select-none shadow-sm"
                        style={{
                            clipPath: "polygon(0 50%, 15px 0, 100% 0, 100% 100%, 15px 100%)",
                            marginLeft: "-15px",
                            zIndex: 0
                        }}
                    >
                        مرفوض
                    </div>
                )}
                {isReservation && (
                    <div className="relative flex items-center justify-center px-4 py-2 min-w-[120px] text-sm font-medium bg-orange-500 text-white select-none shadow-sm"
                        style={{
                            clipPath: "polygon(0 50%, 15px 0, 100% 0, 100% 100%, 15px 100%)",
                            marginLeft: "-15px",
                            zIndex: 0
                        }}
                    >
                        تحفظ
                    </div>
                )}
                {isPostponed && (
                    <div className="relative flex items-center justify-center px-4 py-2 min-w-[120px] text-sm font-medium bg-yellow-500 text-white select-none shadow-sm"
                        style={{
                            clipPath: "polygon(0 50%, 15px 0, 100% 0, 100% 100%, 15px 100%)",
                            marginLeft: "-15px",
                            zIndex: 0
                        }}
                    >
                        مؤجل
                    </div>
                )}
            </div>
        </div>
    );
}
