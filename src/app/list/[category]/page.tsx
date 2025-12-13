'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Layers, AlertTriangle, User, Calendar, Search, X, ArrowRight, Filter, ChevronDown, RefreshCw, ListTodo, Building2, Component } from 'lucide-react';
import Link from 'next/link';

export default function HitosListPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const category = params.category as string;
    const managerFilterParam = searchParams.get('manager');

    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter States
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

    // Exclusion States
    const [excludeMode, setExcludeMode] = useState({
        status: false,
        org: false,
        gestor: false,
        assignee: false
    });

    // UI States
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const titles: any = {
        expired: 'Tareas Vencidas',
        today: 'Vencen Hoy',
        upcoming: 'Próximas Tareas',
        others: 'Otras Tareas'
    };

    const subtitles: any = {
        expired: 'Hitos cuya fecha de entrega ya ha pasado.',
        today: 'Hitos que deben entregarse el día de hoy.',
        upcoming: 'Hitos programados para los próximos 7 días.',
        others: 'Hitos futuros o sin fecha crítica inminente.'
    };

    const getTheme = (cat: string) => {
        switch (cat) {
            case 'expired': return { text: 'text-red-700', icon: <AlertTriangle className="w-6 h-6" />, bgIcon: 'bg-red-100', textIcon: 'text-red-600' };
            case 'today': return { text: 'text-orange-700', icon: <Calendar className="w-6 h-6" />, bgIcon: 'bg-orange-100', textIcon: 'text-orange-600' };
            case 'upcoming': return { text: 'text-yellow-700', icon: <ArrowRight className="w-6 h-6" />, bgIcon: 'bg-yellow-100', textIcon: 'text-yellow-600' };
            default: return { text: 'text-blue-grey', icon: <ListTodo className="w-6 h-6" />, bgIcon: 'bg-mint', textIcon: 'text-jade' };
        }
    };

    const theme = getTheme(category);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/jira/issues');
            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();

            // Filter based on category
            let categoryIssues = (json.issues && json.issues[category]) ? json.issues[category] : [];

            // Pre-filter by Manager Param if exists (Dashboard Link)
            if (managerFilterParam && managerFilterParam !== 'unassigned') {
                categoryIssues = categoryIssues.filter((i: any) => i.gestor?.id === managerFilterParam);
            } else if (managerFilterParam === 'unassigned') {
                categoryIssues = categoryIssues.filter((i: any) => !i.gestor || !i.gestor.id);
            }

            setIssues(categoryIssues);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [category, managerFilterParam]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Extract Unique Options
    const options = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.fields.status?.name))).sort();
        // Organization logic: API returns enriched 'organization' field now?
        // Wait, issue structure from route.ts returns { ...issue, gestor, organization }
        // Let's verify data structure access.
        const orgs = Array.from(new Set(issues.map(i => i.organization || 'Sin organización'))).sort();
        const gestors = Array.from(new Set(issues.map(i => i.gestor?.name).filter(Boolean))).sort();
        const assignees = Array.from(new Set(issues.map(i => i.fields.assignee?.displayName).filter(Boolean))).sort();

        return { statuses, orgs, gestors, assignees };
    }, [issues]);

    // FILTER Logic
    const filteredIssues = issues.filter(issue => {
        const checkFilter = (selected: string[], value: string, isExclude: boolean) => {
            if (selected.length === 0) return true;
            return isExclude ? !selected.includes(value) : selected.includes(value);
        };

        // 1. Status
        if (!checkFilter(selectedStatuses, issue.fields.status?.name, excludeMode.status)) return false;

        // 2. Organization
        const orgName = issue.organization || 'Sin organización';
        if (!checkFilter(selectedOrgs, orgName, excludeMode.org)) return false;

        // 3. Gestor
        const gestorName = issue.gestor?.name || 'Sin gestor';
        if (!checkFilter(selectedGestors, gestorName, excludeMode.gestor)) return false;

        // 4. Assignee
        const assigneeName = issue.fields.assignee?.displayName || 'Sin asignar';
        if (!checkFilter(selectedAssignees, assigneeName, excludeMode.assignee)) return false;

        return true;
    });

    const getJiraUrl = (key: string) => {
        const rawDomain = process.env.NEXT_PUBLIC_JIRA_DOMAIN?.replace(/\/$/, '') || '';
        const cleanDomain = rawDomain.replace(/^https?:\/\//, '');
        return cleanDomain ? `https://${cleanDomain}/browse/${key}` : '#';
    };

    const clearFilters = () => {
        setSelectedStatuses([]);
        setSelectedOrgs([]);
        setSelectedGestors([]);
        setSelectedAssignees([]);
        setExcludeMode({ status: false, org: false, gestor: false, assignee: false });
    };

    const hasFilters = selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0;

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
                            <div className={`flex items-center gap-2 mb-1 ${theme.text}`}>
                                {theme.icon}
                                <span className="text-xs font-bold uppercase tracking-wider">{category.toUpperCase()}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-blue-grey">{titles[category] || 'Listado'}</h1>
                            <p className="text-teal font-secondary">{subtitles[category]}</p>
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

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-antiflash flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-teal/70 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
                    </div>

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
                                    <th className="px-8 py-5">Hito / Tarea</th>
                                    <th className="px-6 py-5 bg-opacity-50">Evolutivo (Padre)</th>
                                    <th className="px-6 py-5">Organización</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-6 py-5">Gestor</th>
                                    <th className="px-6 py-5">Responsable</th>
                                    <th className="px-8 py-5 text-right">Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-antiflash">
                                {filteredIssues.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-teal/50 font-secondary">
                                            {issues.length === 0 ? "No hay tareas en esta categoría." : "No se encontraron resultados para tus filtros."}
                                        </td>
                                    </tr>
                                ) : filteredIssues.map((issue) => {
                                    const parent = issue.fields.parent;
                                    const isOverdue = new Date(issue.fields.duedate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0] && issue.fields.status?.name !== 'Cerrado';

                                    return (
                                        <tr key={issue.key} className="hover:bg-sea-salt/30 transition-colors group">
                                            {/* Summary */}
                                            <td className="px-8 py-5">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1 p-1.5 rounded-md bg-opacity-10 text-opacity-100 ${theme.bgIcon} ${theme.textIcon}`}>
                                                        <ListTodo className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-blue-grey text-base mb-1 line-clamp-2">{issue.fields.summary}</p>
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

                                            {/* Parent */}
                                            <td className="px-6 py-5 bg-sea-salt/10 border-l border-r border-transparent">
                                                {parent ? (
                                                    <div className="flex flex-col">
                                                        <p className="text-dark-green font-semibold text-sm line-clamp-2 max-w-[200px]" title={parent.fields?.summary}>{parent.fields?.summary || 'Sin Título'}</p>
                                                        <a
                                                            href={getJiraUrl(parent.key)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-mono hover:underline transition-colors mt-0.5 text-teal"
                                                        >
                                                            {parent.key}
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-teal/30 italic text-xs">Sin padre</span>
                                                )}
                                            </td>

                                            {/* Org */}
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
                                                    {issue.fields.status?.name}
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
                                                    <span className="text-sm text-blue-grey">{issue.fields.assignee?.displayName || 'Sin asignar'}</span>
                                                </div>
                                            </td>

                                            {/* Deadline */}
                                            <td className="px-8 py-5 text-right whitespace-nowrap">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-xs shadow-sm ${isOverdue
                                                        ? 'bg-red-100 text-red-700 border-red-200'
                                                        : 'bg-white text-blue-grey border-antiflash'
                                                    }`}>
                                                    <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-teal'}`} />
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

// Reusable Filter Component (Same as Evolutivos)
function DropdownFilter({ label, options, selected, onChange, isOpen, onToggle, searchable = false, isExcluded = false, onToggleExclusion }: any) {
    const [search, setSearch] = useState('');

    const filteredOptions = searchable
        ? options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${selected.length > 0
                    ? (isExcluded ? 'bg-red-50 border-red-200 text-red-600 font-bold' : 'bg-mint/20 border-jade text-jade font-bold')
                    : 'bg-white border-antiflash text-blue-grey hover:border-teal/30'
                    }`}
            >
                {label}
                {selected.length > 0 && <span className={`text-white text-[10px] px-1.5 rounded-full ${isExcluded ? 'bg-red-500' : 'bg-jade'}`}>{isExcluded ? '!' : ''}{selected.length}</span>}
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute top-full text-black mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-antiflash z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Exclusion Toggle */}
                    {onToggleExclusion && (
                        <div className="p-2 border-b border-antiflash bg-sea-salt/50 flex justify-between items-center text-xs">
                            <span className="text-teal/60 font-bold uppercase tracking-wider">Modo Filtro</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleExclusion(); }}
                                className={`px-2 py-1 rounded transition-colors font-bold ${isExcluded ? 'bg-red-100 text-red-600' : 'bg-mint text-jade'}`}
                            >
                                {isExcluded ? 'Excluir Selección' : 'Incluir Selección'}
                            </button>
                        </div>
                    )}

                    {searchable && (
                        <div className="p-2 border-b border-antiflash bg-sea-salt/30">
                            <input
                                type="text"
                                className="w-full px-2 py-1.5 text-xs bg-white border border-antiflash rounded-md focus:outline-none focus:border-jade"
                                placeholder={`Buscar ${label}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="overflow-y-auto max-h-60 p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-teal/50">Sin resultados</div>
                        ) : (
                            filteredOptions.map((opt: any) => {
                                const isSelected = selected.includes(opt.value);
                                return (
                                    <div
                                        key={opt.value}
                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs ${isSelected ? (isExcluded ? 'bg-red-50 text-red-600' : 'bg-mint/30 text-jade') : 'hover:bg-sea-salt text-blue-grey'}`}
                                        onClick={() => {
                                            if (isSelected) onChange(selected.filter((s: string) => s !== opt.value));
                                            else onChange([...selected, opt.value]);
                                        }}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? (isExcluded ? 'bg-red-500 border-red-500' : 'bg-jade border-jade') : 'border-teal/30 bg-white'}`}>
                                            {isSelected && <ArrowRight className="h-2.5 w-2.5 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold truncate">{opt.label}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
