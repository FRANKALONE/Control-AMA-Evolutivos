'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, User, FileText, Component, AlertCircle, ListTodo } from 'lucide-react';
import Link from 'next/link';

export default function ListPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const category = params.category as string;
    const managerFilter = searchParams.get('manager');

    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const titles: any = {
        expired: 'Tareas Vencidas',
        today: 'Vencen Hoy',
        upcoming: 'Próximas Tareas',
        others: 'Otras Tareas'
    };

    // Color definitions based on category
    const getTheme = (cat: string) => {
        switch (cat) {
            case 'expired': return {
                bg: 'bg-red-50',
                text: 'text-red-700',
                border: 'border-red-200',
                iconBg: 'bg-red-100',
                iconText: 'text-red-600',
                accent: 'text-red-600',
                headerText: 'text-red-800'
            };
            case 'today': return {
                bg: 'bg-orange-50',
                text: 'text-orange-700',
                border: 'border-orange-200',
                iconBg: 'bg-orange-100',
                iconText: 'text-orange-600',
                accent: 'text-orange-600',
                headerText: 'text-orange-800'
            };
            case 'upcoming': return {
                bg: 'bg-yellow-50',
                text: 'text-yellow-700',
                border: 'border-yellow-200',
                iconBg: 'bg-yellow-100',
                iconText: 'text-yellow-600',
                accent: 'text-yellow-600',
                headerText: 'text-yellow-800'
            };
            default: return {
                bg: 'bg-sea-salt',
                text: 'text-blue-grey',
                border: 'border-antiflash',
                iconBg: 'bg-mint',
                iconText: 'text-jade',
                accent: 'text-teal',
                headerText: 'text-blue-grey'
            };
        }
    };

    const theme = getTheme(category);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/jira/issues');
                if (!res.ok) {
                    const errorJson = await res.json().catch(() => ({}));
                    throw new Error(errorJson.error || `Error ${res.status}: ${res.statusText}`);
                }
                const json = await res.json();

                // Filter based on category
                let categoryIssues = (json.issues && json.issues[category]) ? json.issues[category] : [];

                // Filter by Manager if param exists
                if (managerFilter) {
                    categoryIssues = categoryIssues.filter((i: any) => i.manager?.id === managerFilter);
                }

                setIssues(categoryIssues);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [category, managerFilter]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sea-salt">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-malaquita border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-prussian-blue font-medium animate-pulse">Cargando detalles...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sea-salt text-prussian-blue font-sans p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <p className="font-medium">Error cargando datos: {error}</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className={`p-3 rounded-full hover:bg-white hover:shadow-md border border-transparent transition-all ${theme.iconText} ${theme.iconBg} bg-opacity-50`}>
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className={`text-3xl font-bold ${theme.headerText}`}>
                            {titles[category] || 'Listado de Tareas'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme.iconBg.replace('bg-', 'bg-')}`} style={{ backgroundColor: 'currentColor' }} />
                            <p className={`text-sm font-secondary uppercase tracking-wider ${theme.accent}`}>Vista detallada y jerárquica</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2rem] border border-antiflash shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-prussian-blue">
                            <thead className={`border-b ${theme.border} ${theme.bg} bg-opacity-50 text-blue-grey font-bold uppercase text-xs tracking-wider`}>
                                <tr>
                                    <th className="px-8 py-5">Hito / Tarea</th>
                                    <th className="px-6 py-5">Responsable</th>
                                    <th className="px-6 py-5 bg-opacity-50">Evolutivo (Padre)</th>
                                    <th className="px-6 py-5 bg-opacity-50">Organización</th>
                                    <th className="px-8 py-5 text-right">Fecha Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-antiflash">
                                {issues.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-teal/50 font-secondary">
                                            No hay tareas en esta categoría.
                                        </td>
                                    </tr>
                                ) : issues.map((issue: any) => {
                                    const parent = issue.fields.parent;
                                    // Organization field can be tricky, it returns an array usually if it exists
                                    const orgs = issue.fields.organizations || [];
                                    const orgName = orgs.length > 0 ? orgs[0].name : '—';

                                    // Robust URL construction: Strip protocol from env var if present, then add https://
                                    const rawDomain = process.env.NEXT_PUBLIC_JIRA_DOMAIN?.replace(/\/$/, '') || '';
                                    const cleanDomain = rawDomain.replace(/^https?:\/\//, '');
                                    const jiraBaseUrl = cleanDomain ? `https://${cleanDomain}` : '#';

                                    return (
                                        <tr key={issue.key} className="hover:bg-sea-salt/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1 p-1 rounded-md shadow-sm ${theme.iconBg} ${theme.iconText}`}>
                                                        <ListTodo className="w-3 h-3" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-blue-grey text-base mb-1">{issue.fields.summary}</p>
                                                        <a
                                                            href={`${jiraBaseUrl}/browse/${issue.key}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`text-xs font-mono font-bold ${theme.accent} bg-antiflash px-2 py-1 rounded-md hover:bg-white transition-all inline-flex items-center gap-1 group-hover:shadow-sm`}
                                                        >
                                                            {issue.key}
                                                            <span className="text-[10px] opacity-70">↗</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-antiflash to-white border border-white shadow-sm flex items-center justify-center text-xs font-bold text-teal uppercase">
                                                        {issue.fields.assignee?.displayName?.charAt(0) || <User className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-prussian-blue">{issue.fields.assignee?.displayName || 'Sin asignar'}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Parent Column */}
                                            <td className={`px-6 py-5 bg-opacity-10 group-hover:bg-opacity-20 transition-colors border-l border-r border-transparent group-hover:border-antiflash/50 ${theme.bg}`}>
                                                {parent ? (
                                                    <div className="flex items-start gap-2">
                                                        <FileText className={`w-4 h-4 mt-0.5 ${theme.iconText}`} />
                                                        <div className="flex flex-col">
                                                            <p className="text-dark-green font-semibold text-sm line-clamp-1">{parent.fields?.summary || 'Sin Título'}</p>
                                                            <a
                                                                href={`${jiraBaseUrl}/browse/${parent.key}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`text-xs font-mono hover:underline transition-colors inline-block mt-0.5 ${theme.accent}`}
                                                            >
                                                                {parent.key}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-teal/30 italic text-sm">Sin padre</span>
                                                )}
                                            </td>

                                            {/* Organization Column */}
                                            <td className={`px-6 py-5 bg-opacity-10 group-hover:bg-opacity-20 transition-colors border-r border-transparent group-hover:border-antiflash/50 ${theme.bg}`}>
                                                <div className="flex items-center gap-2 text-prussian-blue">
                                                    <Building2 className="w-4 h-4 text-teal/50" />
                                                    <span className="font-medium">{orgName}</span>
                                                </div>
                                            </td>

                                            <td className="px-8 py-5 text-right">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border ${theme.border} text-blue-grey font-bold text-xs shadow-sm transition-all`}>
                                                    <Calendar className={`w-3.5 h-3.5 ${theme.iconText}`} />
                                                    {issue.fields.duedate}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
