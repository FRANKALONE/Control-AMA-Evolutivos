'use client';

import { useEffect, useState } from 'react';
import { Trash2, ArrowLeft, Database, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPage() {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/metrics');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setMetrics(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteMetric = async (id: number) => {
        if (!confirm('¿Estás seguro de borrar este registro?')) return;
        try {
            await fetch('/api/admin/metrics', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
            });
            fetchMetrics();
        } catch (err) {
            alert('Error deleting');
        }
    };

    const deleteAll = async () => {
        if (!confirm('¿ATENCIÓN! ¿Borrar TODO el histórico? Esta acción no se puede deshacer.')) return;
        try {
            await fetch('/api/admin/metrics', {
                method: 'DELETE',
                body: JSON.stringify({ all: true }),
            });
            fetchMetrics();
        } catch (err) {
            alert('Error deleting all');
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    return (
        <div className="min-h-screen bg-sea-salt font-sans p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/" className="inline-flex items-center text-teal hover:text-malaquita transition-colors mb-4">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Volver al Dashboard
                        </Link>
                        <h1 className="text-4xl font-bold text-blue-grey flex items-center gap-3">
                            <Database className="w-8 h-8 text-malaquita" />
                            Administración
                        </h1>
                        <p className="text-teal mt-2">Gestión del histórico de Evolutivos Activos.</p>
                    </div>

                    {metrics.length > 0 && (
                        <button
                            onClick={deleteAll}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-5 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 border border-red-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            Borrar Todo
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-antiflash overflow-hidden">
                    <div className="p-6 border-b border-antiflash bg-white/50 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-prussian-blue">Registro Diario</h2>
                        <p className="text-sm text-teal/80">Monitorización de valores de "Evolutivos en Curso"</p>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-teal">Cargando datos...</div>
                    ) : metrics.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center gap-3 text-teal/60">
                            <Database className="w-12 h-12 opacity-20" />
                            <p>No hay registros almacenados todavía.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-sea-salt/50 text-xs uppercase text-teal font-secondary font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4 text-center">Cantidad</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-antiflash">
                                    {metrics.map((m) => (
                                        <tr key={m.id} className="hover:bg-sea-salt/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-prussian-blue">
                                                {format(new Date(m.date), "d 'de' MMMM, yyyy", { locale: es })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-malaquita/10 text-dark-green font-bold text-sm">
                                                    {m.count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => deleteMetric(m.id)}
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Borrar registro"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
