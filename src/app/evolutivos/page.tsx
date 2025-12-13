'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Layers, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { JiraIssue } from '@/types/jira';

export default function EvolutivosPage() {
    const [stats, setStats] = useState({ planned: 0, unplanned: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/jira/evolutivos');
                if (res.ok) {
                    const data = await res.json();
                    // Logic: Planned = Has ANY hitos (totalHitos > 0). Unplanned = 0 hitos.
                    const planned = data.filter((i: JiraIssue) => i.totalHitos > 0).length;
                    const unplanned = data.filter((i: JiraIssue) => i.totalHitos === 0).length;
                    setStats({ planned, unplanned });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sea-salt">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-malaquita animate-spin" />
                    <p className="text-prussian-blue font-medium animate-pulse">Analizando Evolutivos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sea-salt font-sans p-6 md:p-8 flex flex-col">
            <div className="max-w-5xl mx-auto w-full space-y-12 flex-1 flex flex-col">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-3 rounded-full hover:bg-white hover:shadow-md border border-transparent transition-all bg-malaquita/10 text-dark-green">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold text-blue-grey">Evolutivos en Curso</h1>
                        <p className="text-teal mt-1 font-secondary text-lg">Selecciona el tipo de visualización</p>
                    </div>
                </div>

                {/* Cards Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 items-center content-center pb-20">

                    {/* Card: Planificados */}
                    <CategoryCard
                        title="Planificados"
                        subtitle="Con hitos definidos"
                        count={stats.planned}
                        icon={<Layers className="w-8 h-8" />}
                        href="/evolutivos/planificados"
                        theme="green"
                    />

                    {/* Card: No Planificados */}
                    <CategoryCard
                        title="No Planificados"
                        subtitle="Sin hitos / Alertas"
                        count={stats.unplanned}
                        icon={<AlertTriangle className="w-8 h-8" />}
                        href="/evolutivos/sin-planificar"
                        theme="orange"
                    />
                </div>
            </div>
        </div>
    );
}
