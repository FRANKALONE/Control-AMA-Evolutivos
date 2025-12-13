import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { ReactNode } from 'react';

interface CategoryCardProps {
    title: string;
    subtitle: string;
    count: number;
    icon: ReactNode;
    href: string;
    theme: 'green' | 'orange';
}

export function CategoryCard({ title, subtitle, count, icon, href, theme }: CategoryCardProps) {
    const isGreen = theme === 'green';

    // Theme Styles
    const styles = isGreen ? {
        bg: 'bg-white hover:border-malaquita/50',
        iconBg: 'bg-mint',
        iconColor: 'text-jade',
        countColor: 'text-dark-green',
        accent: 'bg-malaquita'
    } : {
        bg: 'bg-white hover:border-orange-300',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        countColor: 'text-orange-700',
        accent: 'bg-orange-500'
    };

    return (
        <Link href={href} className={cn(
            "group relative p-8 h-80 rounded-[2.5rem] border-2 border-transparent shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden",
            styles.bg
        )}>
            {/* Background Decoration */}
            <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-bl-full opacity-5 group-hover:scale-110 transition-transform duration-700", styles.accent)} />

            <div className="relative z-10">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:rotate-6", styles.iconBg, styles.iconColor)}>
                    {icon}
                </div>
                <h2 className="text-3xl font-bold text-blue-grey mb-1">{title}</h2>
                <p className="text-teal font-secondary font-medium">{subtitle}</p>
            </div>

            <div className="relative z-10 flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-widest text-blue-grey/60 font-bold mb-1">Total Tareas</span>
                    <span className={cn("text-6xl font-bold tracking-tighter", styles.countColor)}>
                        {count}
                    </span>
                </div>
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:translate-x-2", styles.iconBg, styles.iconColor)}>
                    <ArrowRight className="w-6 h-6" />
                </div>
            </div>
        </Link>
    );
}
