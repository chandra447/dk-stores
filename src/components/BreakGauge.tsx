import { motion } from 'motion/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BreakGaugeProps {
    used: number;
    allowed: number;
}

export function BreakGauge({ used, allowed }: BreakGaugeProps) {
    // Calculate scale:
    const maxScale = Math.max(allowed * 1.4, used * 1.1);
    const allowedPercent = (allowed / maxScale) * 100;
    const usedPercent = Math.min(100, (used / maxScale) * 100);
    const isExceeded = used > allowed;

    const formatToHHMM = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
    };

    return (
        <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Break Time</span>
                <span className={`font-mono text-xs ${isExceeded ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                    {formatToHHMM(used)} <span className="text-muted-foreground/50">/</span> {formatToHHMM(allowed)}
                </span>
            </div>

            <div className="relative h-6 w-full">
                {/* Track */}
                <div className="absolute inset-0 bg-accent rounded-full shadow-inner overflow-hidden">
                    {/* Fill Bar */}
                    <motion.div
                        className={`h-full rounded-full shadow-sm relative transition-colors duration-300 ${isExceeded
                                ? "bg-red-500"
                                : "bg-green-500"
                            }`}
                        initial={{ width: 0 }}
                        animate={{
                            width: `${usedPercent}%`,
                            backgroundColor: isExceeded ? "#ef4444" : "#22c55e" // Force color via animation to be safe
                        }}
                        transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    >
                        {/* Glossy shine effect */}
                        <div className="absolute inset-x-0 top-0 h-[50%] bg-white/20 rounded-t-full" />
                    </motion.div>
                </div>

                {/* Allowed Marker (Arrow) */}
                <div
                    className="absolute top-0 bottom-0 w-0 flex flex-col items-center justify-center z-10"
                    style={{ left: `${allowedPercent}%` }}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="h-full w-4 flex flex-col items-center justify-center group cursor-help -ml-2">
                                {/* The Arrow/Line */}
                                <div className="h-full w-0.5 bg-white/50 group-hover:bg-white transition-colors relative">
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white drop-shadow-md" />
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white drop-shadow-md" />
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Limit: {formatToHHMM(allowed)}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
