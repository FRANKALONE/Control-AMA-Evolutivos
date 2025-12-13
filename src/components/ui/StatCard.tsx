import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    count: number;
    icon: ReactNode;
    color: string;
    href?: string;
    filterParam?: string; // e.g. 'unassigned' or a manager ID
}

export function StatCard({ title, count, icon, color, href = "#", filterParam }: StatCardProps) {
    // Color mapping logic (extracted from page.tsx)
    const colorStyles: any = {
        red: "bg-red-50 text-red-600 border-red-100 hover:border-red-300",
        orange: "bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300",
        amber: "bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300",
        blue: "bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300",
        purple: "bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-300", // New for Active Evolutivos
    };

    const activeStyle = colorStyles[color] || colorStyles.blue;

    // Clean URL construction
    // If filterParam is present, append query param. Otherwise just base href.
    // NOTE: 'href' usually comes with params in current usage, but let's standardize.
    // Current usage ex: href={`/list/${stat.id}?manager=${selectedManager}`}
    // We will just pass the full href for now to avoid breaking logic.

    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg relative overflow-hidden",
                activeStyle.replace('bg-', 'bg-white hover:bg-') // Base white, hover tinted? No, original had bg-color-50
            )}
        >
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none", activeStyle.split(' ')[0])} />

            {/* Actually, let's stick closer to the original exact simplified structure to avoid breaking visual tests */}
            {/* Original was: className={`p-6 rounded-2xl border transition-all hover:shadow-lg group relative overflow-hidden flex flex-col justify-between ${s.bg} ${s.border}`} */}

            {/* Let's re-implement exact original styles but adaptable */}
            <div className={cn(
                "absolute inset-0 opacity-40 transition-opacity group-hover:opacity-100",
                activeStyle.split(' ')[0] // The bg color class
            )} />

            <div className="relative z-10 flex items-center gap-4">
                <div className={cn(
                    "p-3 rounded-xl bg-white shadow-sm transition-transform group-hover:scale-110",
                    activeStyle.split(' ')[1] // The text color class usually works for icon too? No, let's keep it simple.
                )}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5 text-blue-grey">{title}</p>
                    <h3 className="text-3xl font-bold text-blue-grey">{count}</h3>
                </div>
            </div>

            <div className={cn(
                "relative z-10 w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 shadow-sm",
                activeStyle.split(' ')[1]
            )}>
                <ArrowRight className="w-4 h-4" />
            </div>
        </Link>
    );
}

// Need 'cn' utility if not exists, user likely has it or uses clsx/twMerge inline?
// In page.tsx: function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
// I should create src/lib/utils.ts as well if not exists.
