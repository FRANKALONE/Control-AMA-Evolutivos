'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, Calendar, Filter, ChevronDown, RefreshCw, X, ArrowRight, User, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { DropdownFilter } from '@/components/ui/DropdownFilter';
import { JiraIssue } from '@/types/jira';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, differenceInDays, isValid, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TimelinePage() {
    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter States
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [ticketFilter, setTicketFilter] = useState(''); // Ticket ID Search

    // Exclusion States
    const [excludeMode, setExcludeMode] = useState({
        status: false,
        org: false,
        gestor: false,
        assignee: false
    });

    // View State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Sync Scroll Refs
    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    // Tooltip State
    const [hoveredTooltip, setHoveredTooltip] = useState<any | null>(null);

    // Fetch Data
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/jira/evolutivos?includeChildren=true');
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


    // Grid Generation (Month View)
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Extract Options
    const options = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.status))).sort();
        const orgs = Array.from(new Set(issues.map(i => i.organization || 'Sin organización'))).sort();
        const gestors = Array.from(new Set(issues.map(i => i.gestor?.name).filter(Boolean))).sort() as string[];
        // For assignees we ideally want assignees of CHILDREN too, but for now parent assignee + gestor?
        // If we have children loaded, we should scan them.
        const assignees = new Set<string>();
        issues.forEach(i => {
            if (i.assignee?.displayName) assignees.add(i.assignee.displayName);
            if (i.children) {
                i.children.forEach((c: any) => {
                    if (c.fields.assignee?.displayName) assignees.add(c.fields.assignee.displayName);
                });
            }
        });

        return {
            statuses,
            orgs,
            gestors: gestors,
            assignees: Array.from(assignees).sort(),
            keys: issues.map(i => ({ value: i.key, label: i.key, sub: i.summary }))
        };
    }, [issues]);

    // FILTER Logic
    const filteredIssues = issues.filter(issue => {
        const checkFilter = (selected: string[], value: string, isExclude: boolean) => {
            if (selected.length === 0) return true;
            return isExclude ? !selected.includes(value) : selected.includes(value);
        };

        // Ticket Filter
        if (ticketFilter && !issue.key.toLowerCase().includes(ticketFilter.toLowerCase()) && !issue.summary.toLowerCase().includes(ticketFilter.toLowerCase())) {
            return false;
        }

        if (!checkFilter(selectedStatuses, issue.status, excludeMode.status)) return false;

        const orgName = issue.organization || 'Sin organización';
        if (!checkFilter(selectedOrgs, orgName, excludeMode.org)) return false;

        const gestorName = issue.gestor?.name || 'Sin gestor';
        if (!checkFilter(selectedGestors, gestorName, excludeMode.gestor)) return false;

        // Assignee Filter (Parent level check - loose)
        if (selectedAssignees.length > 0) {
            const parentMatch = issue.assignee?.displayName && checkFilter(selectedAssignees, issue.assignee.displayName, excludeMode.assignee);
            const childrenMatch = issue.children?.some((c: any) => c.fields.assignee?.displayName && checkFilter(selectedAssignees, c.fields.assignee.displayName, excludeMode.assignee));
            if (!parentMatch && !childrenMatch) return false;
        }

        return true;
    });

    const hasFilters = selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0 || ticketFilter;

    // Force Empty if no filters
    const finalIssues = hasFilters ? filteredIssues : [];

    // Helper to get Hitos for rendering
    const getVisibleHitos = (issue: JiraIssue) => {
        if (!issue.children) return [];
        let hits = issue.children;

        // Apply Assignee Filter to Hitos
        if (selectedAssignees.length > 0) {
            if (excludeMode.assignee) {
                hits = hits.filter((h: any) => !selectedAssignees.includes(h.fields.assignee?.displayName));
            } else {
                hits = hits.filter((h: any) => selectedAssignees.includes(h.fields.assignee?.displayName));
            }
        }

        return hits;
    };

    const getJiraUrl = (key: string) => {
        const rawDomain = process.env.NEXT_PUBLIC_JIRA_DOMAIN?.replace(/\/$/, '') || '';
        const cleanDomain = rawDomain.replace(/^https?:\/\//, '');
        return cleanDomain ? `https://${cleanDomain}/browse/${key}` : '#';
    };


    return (
        <div className="min-h-screen bg-sea-salt font-sans p-6 md:p-8" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-[95rem] mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-3 rounded-full hover:bg-white hover:shadow-md border border-transparent transition-all bg-white text-blue-grey">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-slate-600">
                                <Calendar className="w-6 h-6" />
                                <span className="text-xs font-bold uppercase tracking-wider">Planificación</span>
                            </div>
                            <h1 className="text-3xl font-bold text-blue-grey">Líneas Temporales</h1>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-antiflash flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-teal/70 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
                    </div>

                    {/* Ticket Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar Ticket / ID..."
                            className="bg-sea-salt border border-antiflash rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-jade w-48"
                            value={ticketFilter}
                            onChange={(e) => setTicketFilter(e.target.value)}
                        />
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
                            onClick={() => {
                                setSelectedStatuses([]); setSelectedOrgs([]); setSelectedGestors([]); setSelectedAssignees([]); setTicketFilter('');
                            }}
                            className="ml-auto px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* TIMELINE VISUALIZATION */}
                <div className="bg-white rounded-[2rem] border border-antiflash shadow-sm overflow-hidden flex flex-col h-[70vh]">
                    {/* Controls */}
                    <div className="p-4 border-b border-antiflash flex items-center justify-between bg-sea-salt/30">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                            <h2 className="text-lg font-bold text-blue-grey capitalize w-48 text-center">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowRight className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => setCurrentMonth(new Date())} className="text-xs font-bold text-teal hover:text-jade transition-colors">
                            Hoy
                        </button>
                    </div>

                    {/* Unified Scroll Container */}
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        {/* Grid Wrapper to ensure min-width */}
                        <div className="min-w-max">

                            {/* Sticky Header Row */}
                            <div className="flex sticky top-0 z-30 shadow-sm bg-sea-salt/50 border-b border-antiflash">
                                {/* Top Left Corner - Sticky Both Axes */}
                                <div className="w-80 flex-shrink-0 p-4 font-bold text-xs text-blue-grey uppercase tracking-wider border-r border-antiflash bg-white z-40 sticky left-0 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
                                    Evolutivo
                                </div>
                                {/* Days Header */}
                                <div className="flex">
                                    {daysInMonth.map(day => (
                                        <div key={day.toISOString()} className={`flex-shrink-0 w-10 text-center text-[10px] py-3 border-r border-antiflash/50 bg-sea-salt/50 ${isToday(day) ? 'bg-jade/10 font-bold text-jade' : 'text-slate-400'}`}>
                                            {format(day, 'd')}
                                            <br />
                                            {format(day, 'EEEEE', { locale: es })}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Body Rows */}
                            <div className="divide-y divide-antiflash">
                                {finalIssues.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-teal/50 gap-2 sticky left-0 w-full p-8">
                                        <Filter className="w-8 h-8 opacity-50" />
                                        <p>{hasFilters ? "No se encontraron resultados." : "Selecciona filtros o busca un ticket para ver la línea temporal."}</p>
                                    </div>
                                ) : (
                                    finalIssues.map(issue => {
                                        const visibleHitos = getVisibleHitos(issue);

                                        return (
                                            <div key={issue.key} className="flex hover:bg-sea-salt/20 transition-colors group">
                                                {/* Sticky Row Header */}
                                                <div className="w-80 flex-shrink-0 p-4 border-r border-antiflash bg-white z-30 sticky left-0 group-hover:bg-sea-salt/20 transition-colors shadow-[4px_0_12px_-4px_rgba(0,0,0,0.02)]">
                                                    <p className="font-bold text-sm text-blue-grey truncate" title={issue.summary}>{issue.summary}</p>
                                                    <a href={getJiraUrl(issue.key)} target="_blank" className="text-xs text-teal font-mono hover:underline">{issue.key}</a>
                                                </div>

                                                {/* Row Timeline Content */}
                                                <div className="flex relative">
                                                    {/* Background Grid Lines */}
                                                    {daysInMonth.map(day => (
                                                        <div key={day.toISOString()} className={`flex-shrink-0 w-10 border-r border-antiflash/30 min-h-[60px] ${isToday(day) ? 'bg-jade/5' : ''}`} />
                                                    ))}

                                                    {/* Hitos Placing */}
                                                    {(() => {
                                                        const startM = startOfMonth(currentMonth);
                                                        const endM = endOfMonth(currentMonth);

                                                        const items = visibleHitos.map((hito: any) => {
                                                            const endDate = hito.fields.duedate ? parseISO(hito.fields.duedate) : null;
                                                            const rawStart = hito.fields.customfield_10124;
                                                            const startDate = rawStart ? parseISO(rawStart) : null;

                                                            if (!endDate) return null;

                                                            const isBar = startDate && isValid(startDate) && (isBefore(startDate, endDate) || isSameDay(startDate, endDate));

                                                            if (isBar) {
                                                                // Overlap Logic: (StartA <= EndB) and (EndA >= StartB)
                                                                if (!(startDate <= endM && endDate >= startM)) return null;
                                                            } else {
                                                                // Point Logic: Must be strictly within the month
                                                                if (endDate < startM || endDate > endM) return null;
                                                            }

                                                            let startIdx, durationDays;

                                                            if (isBar) {
                                                                const s = startDate < startM ? startM : startDate;
                                                                const e = endDate > endM ? endM : endDate;
                                                                startIdx = differenceInDays(s, startM);
                                                                durationDays = differenceInDays(e, s) + 1;
                                                            } else {
                                                                startIdx = endDate.getDate() - 1;
                                                                durationDays = 1;
                                                            }

                                                            return { hito, startIdx, durationDays, isBar, endDate, startDate };
                                                        }).filter(Boolean);

                                                        items.sort((a: any, b: any) => a.startIdx - b.startIdx);

                                                        const tracks: any[] = [];

                                                        const positionedItems = items.map((item: any) => {
                                                            let trackIdx = -1;
                                                            for (let i = 0; i < tracks.length; i++) {
                                                                if (tracks[i] < item.startIdx) {
                                                                    trackIdx = i;
                                                                    break;
                                                                }
                                                            }
                                                            if (trackIdx === -1) {
                                                                trackIdx = tracks.length;
                                                                tracks.push(-1);
                                                            }
                                                            tracks[trackIdx] = item.startIdx + item.durationDays;
                                                            return { ...item, trackIdx };
                                                        });

                                                        return positionedItems.map((m: any) => {
                                                            const { hito, startIdx, durationDays, isBar, endDate, startDate, trackIdx } = m;

                                                            const leftPos = startIdx * 40;
                                                            const width = durationDays * 40;
                                                            const topOffset = 10 + (trackIdx * 24);

                                                            const isClosed = hito.fields.status?.name === 'Cerrado';
                                                            const isOverdue = !isClosed && isBefore(endDate, new Date()) && !isToday(endDate);

                                                            let colorClass = 'bg-blue-500 border-blue-600';
                                                            let glowClass = 'shadow-blue-500/30';

                                                            if (isClosed) { colorClass = 'bg-green-500 border-green-600'; glowClass = 'shadow-green-500/30'; }
                                                            else if (isOverdue) { colorClass = 'bg-red-500 border-red-600'; glowClass = 'shadow-red-500/30'; }

                                                            return (
                                                                <div
                                                                    key={hito.key}
                                                                    className={`absolute h-4 rounded-full shadow-sm cursor-pointer hover:brightness-110 transition-all z-20 flex items-center group/marker ${colorClass} ${glowClass} border ${isBar ? 'justify-start px-2' : 'justify-center w-4'}`}
                                                                    style={{
                                                                        left: `${leftPos + (isBar ? 2 : 12)}px`,
                                                                        width: isBar ? `${width - 4}px` : undefined,
                                                                        top: `${topOffset}px`
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredTooltip({
                                                                            x: rect.left + rect.width / 2,
                                                                            y: rect.top,
                                                                            data: hito,
                                                                            isBar,
                                                                            startDate
                                                                        });
                                                                    }}
                                                                    onMouseLeave={() => setHoveredTooltip(null)}
                                                                >
                                                                    {isBar && width > 60 && (
                                                                        <span className="text-[9px] font-bold text-white truncate drop-shadow-md">{hito.fields.summary}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Fixed Floating Tooltip */}
            {hoveredTooltip && (
                <div
                    className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 w-64 bg-slate-900/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
                    style={{ left: hoveredTooltip.x, top: hoveredTooltip.y - 10 }}
                >
                    <p className="font-bold text-sm mb-2 text-white">{hoveredTooltip.data.fields.summary}</p>

                    <div className="space-y-2 mb-3">
                        {hoveredTooltip.isBar && hoveredTooltip.startDate && (
                            <div className="flex items-center gap-2 text-white/80">
                                <Clock className="w-3.5 h-3.5 text-mint" />
                                <span className="font-mono text-[10px]">
                                    {format(hoveredTooltip.startDate, 'dd/MM')} - {format(parseISO(hoveredTooltip.data.fields.duedate), 'dd/MM')}
                                </span>
                            </div>
                        )}
                        {!hoveredTooltip.isBar && (
                            <div className="flex items-center gap-2 text-white/80">
                                <Calendar className="w-3.5 h-3.5 text-mint" />
                                <span className="font-mono">{hoveredTooltip.data.fields.duedate}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-white/80">
                            <User className="w-3.5 h-3.5 text-mint" />
                            <span>{hoveredTooltip.data.fields.assignee?.displayName || 'Unassigned'}</span>
                        </div>
                    </div>

                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${hoveredTooltip.data.fields.status?.name === 'Cerrado' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        (hoveredTooltip.data.fields.status?.name !== 'Cerrado' && isBefore(parseISO(hoveredTooltip.data.fields.duedate), new Date()) && !isToday(parseISO(hoveredTooltip.data.fields.duedate))) ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                        {hoveredTooltip.data.fields.status?.name}
                    </div>

                    {/* Triangle Arrow */}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-white/10 rotate-45 transform"></div>
                </div>
            )}
        </div>
    );
}

// End of TimelinePage component
