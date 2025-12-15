'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Filter, X, Clock, User, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { DropdownFilter } from '@/components/ui/DropdownFilter';
import { JiraIssue } from '@/types/jira';

// Simple Modal for Worklogs
function WorklogModal({ issue, onClose }: { issue: any, onClose: () => void }) {
    const [worklogs, setWorklogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (issue?.id) {
            setLoading(true);
            fetch(`/api/tempo/worklogs?issueId=${issue.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setWorklogs(data);
                    } else {
                        console.error('Tempo data invalid', data);
                        setWorklogs([]);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [issue]);

    if (!issue) return null;

    // Aggregate by author
    const byAuthor: Record<string, number> = {};
    worklogs.forEach((w: any) => {
        const authorName = w.author?.displayName || 'Desconocido';
        byAuthor[authorName] = (byAuthor[authorName] || 0) + w.timeSpentSeconds;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">Imputaciones: {issue.key}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin h-6 w-6 border-2 border-indigo-500 rounded-full border-t-transparent"></div></div>
                    ) : Object.keys(byAuthor).length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No hay imputaciones registradas.</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(byAuthor).sort(([, a], [, b]) => b - a).map(([author, seconds]) => {
                                const hours = (seconds / 3600).toFixed(2);
                                return (
                                    <div key={author} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {author.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-700 text-sm">{author}</span>
                                        </div>
                                        <span className="font-mono font-bold text-gray-900">{hours} h</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                    <span className="text-xs text-gray-500 mr-2">Total Imputado (Jira):</span>
                    <span className="font-bold text-indigo-600 text-lg">
                        {((issue.timespent || 0) / 3600).toFixed(2)} h
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function AvancesPage() {
    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]); // New Gestor State
    const [ticketFilter, setTicketFilter] = useState('');

    const [showNoLogged, setShowNoLogged] = useState(false);
    const [showNoEstimate, setShowNoEstimate] = useState(false);
    const [showCriticalOnly, setShowCriticalOnly] = useState(false);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [selectedWorklogIssue, setSelectedWorklogIssue] = useState<any>(null);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/jira/evolutivos?includeChildren=false'); // We focus on Parents for now
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            setIssues(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const options = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.status))).sort();
        const orgs = Array.from(new Set(issues.map(i => i.organization || 'Sin organización'))).sort();
        const assignees = Array.from(new Set(issues.map(i => i.assignee?.displayName).filter(Boolean))).sort() as string[];
        const gestors = Array.from(new Set(issues.map(i => i.gestor?.name || 'Sin Gestor'))).sort();
        return { statuses, orgs, assignees, gestors };
    }, [issues]);

    // Helper for percentage
    const getProgress = (issue: any) => {
        const estimated = issue.timeoriginalestimate || 0;
        const logged = issue.timespent || 0;
        if (estimated === 0) return logged > 0 ? 999 : 0; // 999 to treat as very critical if unprojected work done
        return (logged / estimated) * 100;
    };

    const filteredIssues = useMemo(() => {
        let result = issues.filter(issue => {
            if (ticketFilter && !issue.key.toLowerCase().includes(ticketFilter.toLowerCase()) && !issue.summary.toLowerCase().includes(ticketFilter.toLowerCase())) return false;

            if (selectedStatuses.length > 0 && !selectedStatuses.includes(issue.status)) return false;
            if (selectedOrgs.length > 0 && !selectedOrgs.includes(issue.organization || 'Sin organización')) return false;
            if (selectedAssignees.length > 0 && (!issue.assignee?.displayName || !selectedAssignees.includes(issue.assignee.displayName))) return false;
            if (selectedGestors.length > 0 && !selectedGestors.includes(issue.gestor?.name || 'Sin Gestor')) return false;

            // EXCLUDE Specific Billing Modes
            const EXCLUDED_BILLING_MODES = ['T&M contra bolsa', 'T&M Facturable'];
            if (issue.billingMode && EXCLUDED_BILLING_MODES.includes(issue.billingMode)) return false;

            // New Boolean Filters logic
            // If toggle is ON, we ONLY show items matching that criteria
            // OR checks? User said "sacar de la lista... todos aquellos que..." - usually implies filtering TO see them.
            // Let's assume inclusive OR for the toggles if both are on? Or strict AND?
            // Usually toggle filters in lists narrow down.
            // "Sacar de la lista" -> "Show me only those".

            if (showNoLogged && (issue.timespent || 0) === 0) return false;
            if (showNoEstimate && (issue.timeoriginalestimate || 0) === 0) return false;

            // Critical Filter: ONLY show > 100%
            if (showCriticalOnly) {
                const pct = getProgress(issue);
                if (pct <= 100) return false;
            }

            return true;
        });

        // Default Sort: Progress % DESC
        result.sort((a, b) => getProgress(b) - getProgress(a));

        return result;
    }, [issues, ticketFilter, selectedStatuses, selectedOrgs, selectedAssignees, selectedGestors, showNoLogged, showNoEstimate, showCriticalOnly]);

    const hasFilters = selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedAssignees.length > 0 || selectedGestors.length > 0 || ticketFilter || showNoLogged || showNoEstimate || showCriticalOnly;

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando avances...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-8" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-3 rounded-full hover:bg-white hover:shadow-md transition-all bg-white text-slate-600">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-indigo-600">
                                <Clock className="w-6 h-6" />
                                <span className="text-xs font-bold uppercase tracking-wider">Control de Tiempos</span>
                            </div>
                            <h1 className="text-3xl font-bold text-slate-800">Avance de Proyectos</h1>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-400 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 w-48"
                        value={ticketFilter}
                        onChange={(e) => setTicketFilter(e.target.value)}
                    />
                    <DropdownFilter label="Estado" options={options.statuses.map(s => ({ value: s, label: s }))} selected={selectedStatuses} onChange={setSelectedStatuses} isOpen={activeDropdown === 'status'} onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }} />
                    <DropdownFilter label="Gestor" options={options.gestors.map(g => ({ value: g, label: g }))} selected={selectedGestors} onChange={setSelectedGestors} isOpen={activeDropdown === 'gestor'} onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'gestor' ? null : 'gestor'); }} />
                    <DropdownFilter label="Responsable" options={options.assignees.map(a => ({ value: a, label: a }))} selected={selectedAssignees} onChange={setSelectedAssignees} isOpen={activeDropdown === 'assignee'} onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }} />

                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    {/* Quick Toggles */}
                    <button
                        onClick={() => setShowCriticalOnly(!showCriticalOnly)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${showCriticalOnly
                            ? 'bg-red-500 text-white border-red-600 shadow-md ring-2 ring-red-200'
                            : 'bg-white text-red-500 border-red-100 hover:bg-red-50'
                            }`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Proyectos Críticos
                    </button>

                    <button
                        onClick={() => setShowNoLogged(!showNoLogged)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showNoLogged
                            ? 'bg-slate-800 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        Ocultar Sin Imputar
                    </button>
                    <button
                        onClick={() => setShowNoEstimate(!showNoEstimate)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showNoEstimate
                            ? 'bg-slate-800 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        Ocultar Sin Estimación
                    </button>

                    {hasFilters && (
                        <button onClick={() => { setSelectedStatuses([]); setSelectedOrgs([]); setSelectedAssignees([]); setSelectedGestors([]); setTicketFilter(''); setShowNoLogged(false); setShowNoEstimate(false); setShowCriticalOnly(false); }} className="ml-auto px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1">
                            <X className="w-3 h-3" /> Limpiar
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-end text-sm font-medium text-slate-500">
                    Showing <span className="font-bold text-indigo-600 mx-1">{filteredIssues.length}</span> projects
                </div>

                {/* Grid of Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredIssues.map(issue => {
                        const estimatedSeconds = issue.timeoriginalestimate || 0;
                        const loggedSeconds = issue.timespent || 0;

                        // Convert to hours
                        const estimatedHours = estimatedSeconds / 3600;
                        const loggedHours = loggedSeconds / 3600;

                        // Calculate percentage
                        let percentage = 0;
                        if (estimatedHours > 0) {
                            percentage = (loggedHours / estimatedHours) * 100;
                        } else if (loggedHours > 0) {
                            percentage = 100; // Over budget effectively if 0 estimate
                        }

                        const barWidth = Math.min(100, percentage);

                        // Color Logic
                        let progressColor = 'bg-indigo-500';
                        if (percentage > 100) progressColor = 'bg-red-500';
                        else if (percentage > 85) progressColor = 'bg-orange-500';
                        else if (percentage < 50) progressColor = 'bg-green-500';

                        return (
                            <div key={issue.key} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                                {percentage > 100 && (
                                    <div className="absolute top-0 right-0 p-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${issue.status === 'Cerrado' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {issue.status}
                                        </span>
                                        <span className="font-mono text-xs text-slate-400">{issue.key}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-700 line-clamp-2 h-12" title={issue.summary}>{issue.summary}</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1 font-medium text-slate-500">
                                            <span>Progreso Presupuesto</span>
                                            <span>{percentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${barWidth}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Data Points */}
                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Estimado</p>
                                            <p className="text-xl font-bold text-slate-700">{estimatedHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">h</span></p>
                                        </div>
                                        <div
                                            className="cursor-pointer group hover:bg-slate-50 -m-2 p-2 rounded-lg transition-colors"
                                            onClick={() => setSelectedWorklogIssue(issue)}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Imputado</p>
                                                <ChevronDown className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <p className={`text-xl font-bold ${loggedHours > estimatedHours ? 'text-red-500' : 'text-indigo-600'}`}>
                                                {loggedHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">h</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Assignee */}
                                <div className="mt-4 pt-4 flex items-center gap-2 text-xs text-slate-500">
                                    <User className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{issue.assignee?.displayName || 'Sin Asignar'}</span>
                                </div>
                            </div>
                        );
                    })}

                    {filteredIssues.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400">
                            <Clock className="w-12 h-12 mb-4 opacity-20" />
                            <p>No se encontraron proyectos con los filtros actuales.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedWorklogIssue && (
                <WorklogModal issue={selectedWorklogIssue} onClose={() => setSelectedWorklogIssue(null)} />
            )}
        </div>
    );
}
