'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Layers, AlertTriangle, User, Calendar, Search, X, ArrowRight, Filter, ChevronDown, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';
import { DropdownFilter } from '@/components/ui/DropdownFilter';
import { JiraIssue } from '@/types/jira';

export default function EvolutivosListPage() {
    const params = useParams();
    const type = params.type as string; // 'planificados' | 'sin-planificar'

    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Focus State
    const [focusPerson, setFocusPerson] = useState<string>('');

    // Filter States
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]); // NEW
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Exclusion States (True = Exclude selected, False = Include selected)
    const [excludeMode, setExcludeMode] = useState({
        status: false,
        org: false,
        gestor: false,
        assignee: false
    });

    // UI States for Dropdowns
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const isPlanned = type === 'planificados';
    const title = isPlanned ? 'Planificados' : 'No Planificados';
    const subtitle = isPlanned ? 'Evolutivos con desarrollo agendado (Total Hitos > 0)' : 'Evolutivos sin hitos abiertos (Alertas o Tareas completadas)';
    const themeColor = isPlanned ? 'text-jade' : 'text-orange-600';
    const icon = isPlanned ? <Layers className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />;

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/jira/evolutivos');
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();

            // FILTER by Type
            const typeFiltered = data.filter((i: JiraIssue) =>
                isPlanned ? i.pendingHitos > 0 : i.pendingHitos === 0
            );

            setIssues(typeFiltered);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isPlanned]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Extract Unique Options & People for Focus
    const { options, allPeople } = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.status))).sort();
        const orgs = Array.from(new Set(issues.map(i => i.organization || 'Sin organización'))).sort(); // NEW
        const gestors = Array.from(new Set(issues.map(i => i.gestor?.name).filter(Boolean))).sort() as string[];
        const assignees = Array.from(new Set(issues.map(i => i.assignee?.displayName).filter(Boolean))).sort() as string[];
        const keys = issues.map(i => ({ key: i.key, summary: i.summary })); // Keep key+summary pair

        // Combine unique people for Focus Selector
        const peopleSet = new Set([...gestors, ...assignees]);
        const allPeople = Array.from(peopleSet).sort();

        return { options: { statuses, orgs, gestors, assignees, keys }, allPeople };
    }, [issues]);

    // FILTER Logic
    const filteredIssues = issues.filter(issue => {
        // MAGIC FOCUS MODE
        if (focusPerson) {
            // 1. Person Match (Gestor OR Responsable)
            const isMatch = issue.gestor?.name === focusPerson || issue.assignee?.displayName === focusPerson;
            if (!isMatch) return false;

            // 2. Priority Logic: Overdue OR Upcoming (7 days) OR Undefined
            let date = null;
            if (issue.pendingHitos > 0) date = issue.latestDeadline;
            else date = issue.parentDeadline;

            if (!date) return true; // Undefined = Priority

            const today = new Date();
            const d = new Date(date);
            const diffTime = d.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Priority: Overdue (diffDays < 0) OR Next 7 days
            return diffDays <= 7;
        }

        // STANDARD FILTER MODE (Only if no focus person)

        // 1. Keys (Evolutivo) - Always Inclusion for Keys
        if (selectedKeys.length > 0 && !selectedKeys.includes(issue.key)) return false;

        // Helper for Inlcude/Exclude Logic
        const checkFilter = (selected: string[], value: string, isExclude: boolean) => {
            if (selected.length === 0) return true; // If no items are selected, this filter doesn't apply
            return isExclude ? !selected.includes(value) : selected.includes(value);
        };

        // 2. Status
        if (!checkFilter(selectedStatuses, issue.status, excludeMode.status)) return false;

        // 3. Organization
        const orgName = issue.organization || 'Sin organización';
        if (!checkFilter(selectedOrgs, orgName, excludeMode.org)) return false;

        // 4. Gestor
        const gestorName = issue.gestor?.name || 'Sin gestor';
        if (!checkFilter(selectedGestors, gestorName, excludeMode.gestor)) return false;

        // 5. Assignee
        const assigneeName = issue.assignee?.displayName || 'Sin asignar';
        if (!checkFilter(selectedAssignees, assigneeName, excludeMode.assignee)) return false;

        // 6. Date Range
        // Date Logic (replicated from render to ensure consistency)
        let displayDate: string | null = null;
        if (issue.pendingHitos > 0) {
            displayDate = issue.latestDeadline || null; // "Sin fijar" is technically null for range comparison usually, unless we want to filter FOR "Sin fijar"
        } else {
            displayDate = issue.parentDeadline || null;
        }

        if (dateRange.start && (!displayDate || displayDate < dateRange.start)) return false;
        if (dateRange.end && (!displayDate || displayDate > dateRange.end)) return false;

        return true;
    });

    // Helper for Jira URL
    const getJiraUrl = (key: string) => {
        const rawDomain = process.env.NEXT_PUBLIC_JIRA_DOMAIN?.replace(/\/$/, '') || '';
        const cleanDomain = rawDomain.replace(/^https?:\/\//, '');
        return cleanDomain ? `https://${cleanDomain}/browse/${key}` : '#';
    };

    const clearFilters = () => {
        setFocusPerson(''); // Clear Focus
        setSelectedKeys([]);
        setSelectedStatuses([]);
        setSelectedOrgs([]);
        setSelectedGestors([]);
        setSelectedAssignees([]);
        setDateRange({ start: '', end: '' });
        setExcludeMode({ status: false, org: false, gestor: false, assignee: false });
    };

    const hasFilters = selectedKeys.length > 0 || selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0 || dateRange.start || dateRange.end;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sea-salt">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-malaquita border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-prussian-blue font-medium animate-pulse">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sea-salt font-sans p-6 md:p-8" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-[90rem] mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-3 rounded-full hover:bg-white hover:shadow-md border border-transparent transition-all bg-white text-blue-grey">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className={`flex items-center gap-2 mb-1 ${themeColor}`}>
                                {icon}
                                <span className="text-xs font-bold uppercase tracking-wider">{isPlanned ? 'En Desarrollo' : 'Atención Requerida'}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-blue-grey">{title}</h1>
                            <p className="text-teal font-secondary">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchList}
                        className="p-3 bg-white text-teal rounded-full hover:shadow-md hover:bg-mint/20 hover:text-jade transition-all border border-transparent"
                        title="Actualizar lista"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* MAGIC FOCUS BOX (Only for Planificados) */}
                {isPlanned && (
                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-[2px] rounded-2xl shadow-lg">
                        <div className="bg-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                                    <Zap className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-prussian-blue">Haz Foco 🔮</h3>
                                    <p className="text-blue-grey/80 text-sm max-w-lg">
                                        Dime quién eres y te mostraré lo que debes priorizar (Vencidos, Próximos 7 días o Sin Fecha).
                                    </p>
                                </div>
                            </div>

                            <div className="relative w-full md:w-80">
                                <DropdownFilter
                                    label={focusPerson || "Selecciona tu nombre..."}
                                    options={allPeople.map(p => ({ value: p, label: p }))}
                                    selected={focusPerson ? [focusPerson] : []}
                                    onChange={(sel: string[]) => {
                                        // Single select behavior
                                        setFocusPerson(sel.length > 0 ? sel[sel.length - 1] : '');
                                    }}
                                    isOpen={activeDropdown === 'focus'}
                                    onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'focus' ? null : 'focus'); }}
                                    searchable
                                />
                                {focusPerson && (
                                    <button
                                        onClick={() => setFocusPerson('')}
                                        className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs text-red-500 hover:text-red-700 underline"
                                    >
                                        Borrar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Bar (Disabled/Dimmed if Focus Mode is Active) */}
                <div className={`bg-white p-4 rounded-2xl shadow-sm border border-antiflash flex flex-wrap items-center gap-3 transition-opacity ${focusPerson ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <div className="flex items-center gap-2 text-teal/70 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
                    </div>

                    {/* Evolutivo Filter */}
                    <DropdownFilter
                        label="Evolutivo"
                        options={options.keys.map(k => ({ value: k.key, label: k.key, sub: k.summary }))}
                        selected={selectedKeys}
                        onChange={setSelectedKeys}
                        isOpen={activeDropdown === 'keys'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'keys' ? null : 'keys'); }}
                        searchable
                    />

                    {/* Status Filter */}
                    <DropdownFilter
                        label="Estado"
                        options={options.statuses.map(s => ({ value: s, label: s }))}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                        isOpen={activeDropdown === 'status'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
                        isExcluded={excludeMode.status}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, status: !prev.status }))}
                    />

                    {/* Organization Filter */}
                    <DropdownFilter
                        label="Organización"
                        options={options.orgs.map(o => ({ value: o, label: o }))}
                        selected={selectedOrgs}
                        onChange={setSelectedOrgs}
                        isOpen={activeDropdown === 'org'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'org' ? null : 'org'); }}
                        searchable
                        isExcluded={excludeMode.org}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, org: !prev.org }))}
                    />

                    {/* Gestor Filter */}
                    <DropdownFilter
                        label="Gestor"
                        options={options.gestors.map(g => ({ value: g, label: g }))}
                        selected={selectedGestors}
                        onChange={setSelectedGestors}
                        isOpen={activeDropdown === 'gestor'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'gestor' ? null : 'gestor'); }}
                        isExcluded={excludeMode.gestor}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, gestor: !prev.gestor }))}
                    />

                    {/* Responsable Filter */}
                    <DropdownFilter
                        label="Responsable"
                        options={options.assignees.map(a => ({ value: a, label: a }))}
                        selected={selectedAssignees}
                        onChange={setSelectedAssignees}
                        isOpen={activeDropdown === 'assignee'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }}
                        isExcluded={excludeMode.assignee}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, assignee: !prev.assignee }))}
                    />

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-sea-salt/50 px-3 py-2 rounded-lg border border-antiflash">
                        <Calendar className="w-4 h-4 text-teal/50" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-xs text-blue-grey focus:ring-0 p-0"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-teal/30">-</span>
                        <input
                            type="date"
                            className="bg-transparent border-none text-xs text-blue-grey focus:ring-0 p-0"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>

                    {/* Clear Button */}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2rem] border border-antiflash shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-prussian-blue">
                            <thead className="bg-sea-salt/50 text-blue-grey font-bold uppercase text-xs tracking-wider border-b border-antiflash">
                                <tr>
                                    <th className="px-8 py-5">Evolutivo</th>
                                    <th className="px-6 py-5">Organización</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-6 py-5">Gestor</th>
                                    <th className="px-6 py-5">Responsable</th>
                                    <th className="px-6 py-5 text-center">Hitos</th>
                                    <th className="px-8 py-5 text-right">Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-antiflash">
                                {filteredIssues.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-teal/50 font-secondary">
                                            {issues.length === 0 ? "No hay evolutivos en esta categoría." : "No se encontraron resultados para tus filtros."}
                                        </td>
                                    </tr>
                                ) : filteredIssues.map((issue) => {
                                    // Date Logic REPEATED for rendering (UI purposes)
                                    let displayDate: string | null = null;
                                    let isParentDate = false;
                                    let isSinFijar = false;

                                    if (issue.pendingHitos > 0) {
                                        if (issue.latestDeadline) {
                                            displayDate = issue.latestDeadline;
                                        } else {
                                            displayDate = "Sin fijar";
                                            isSinFijar = true;
                                        }
                                    } else {
                                        // Fallback to parent
                                        displayDate = issue.parentDeadline || null;
                                        isParentDate = !!issue.parentDeadline;
                                    }

                                    // Overdue check
                                    const today = new Date().toISOString().split('T')[0];
                                    const isOverdue = displayDate && displayDate !== "Sin fijar" && displayDate < today;

                                    return (
                                        <tr key={issue.key} className="hover:bg-sea-salt/30 transition-colors group">

                                            {/* Evolutivo Summary */}
                                            <td className="px-8 py-5">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1 p-1.5 rounded-md bg-opacity-10 text-opacity-100 ${isPlanned ? 'bg-mint text-jade' : 'bg-orange-100 text-orange-600'}`}>
                                                        {isPlanned ? <Layers className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-blue-grey text-base mb-1 line-clamp-2">{issue.summary}</p>
                                                        <a
                                                            href={getJiraUrl(issue.key)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-mono font-bold text-teal bg-antiflash px-2 py-1 rounded-md hover:bg-white transition-all inline-flex items-center gap-1"
                                                        >
                                                            {issue.key}
                                                            <span className="text-[10px] opacity-70">↗</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Organization */}
                                            <td className="px-6 py-5">
                                                {issue.organization ? (
                                                    <span className="text-sm font-medium text-blue-grey break-words">{issue.organization}</span>
                                                ) : (
                                                    <span className="text-teal/40 italic text-xs">Sin org.</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {issue.status}
                                                </span>
                                            </td>

                                            {/* Gestor */}
                                            <td className="px-6 py-5">
                                                {issue.gestor ? (
                                                    <div className="flex items-center gap-2">
                                                        {issue.gestor.avatar ? (
                                                            <img src={issue.gestor.avatar} alt="" className="w-6 h-6 rounded-full" />
                                                        ) : (
                                                            <User className="w-6 h-6 p-1 bg-antiflash rounded-full text-teal" />
                                                        )}
                                                        <span className="font-medium text-prussian-blue">{issue.gestor.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-teal/40 italic">Sin gestor</span>
                                                )}
                                            </td>

                                            {/* Responsable */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-blue-grey">{issue.assignee?.displayName || 'Sin asignar'}</span>
                                                </div>
                                            </td>

                                            {/* Hitos Count */}
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${issue.totalHitos > 0 ? 'bg-mint text-jade' : 'bg-orange-100 text-orange-700'}`}>
                                                    {issue.pendingHitos}
                                                    {issue.totalHitos === 0 && <span className="ml-1 opacity-50 text-[10px]">(Total: 0)</span>}
                                                </span>
                                            </td>

                                            {/* Deadline */}
                                            <td className="px-8 py-5 text-right whitespace-nowrap">
                                                {displayDate ? (
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-xs shadow-sm ${isSinFijar
                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                        : isOverdue
                                                            ? 'bg-red-100 text-red-700 border-red-200'
                                                            : isParentDate
                                                                ? 'bg-orange-50 text-orange-800 border-antiflash'
                                                                : 'bg-white text-blue-grey border-antiflash'
                                                        }`} title={isSinFijar ? "Hitos abiertos sin fecha definida" : isOverdue ? "¡Vencido!" : isParentDate ? "Fecha del Evolutivo (Padre)" : "Fecha del último Hito"}>
                                                        <Calendar className={`w-3.5 h-3.5 ${isSinFijar ? 'text-amber-600' : isOverdue ? 'text-red-500' : isParentDate ? 'text-orange-500' : 'text-teal'
                                                            }`} />
                                                        {displayDate}
                                                    </div>
                                                ) : (
                                                    <span className="text-teal/40 text-xs">—</span>
                                                )}
                                            </td>

                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
