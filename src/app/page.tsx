'use client';

import { useEffect, useState } from 'react';
import { Layers, AlertTriangle, Calendar, Clock, ArrowRight, TrendingUp, Zap, User, AlertCircle, ArrowUpRight, ListTodo } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatCard } from '@/components/ui/StatCard';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { JiraIssue, DashboardStats, JiraUser } from '@/types/jira';
import UserMenu from '@/components/UserMenu';

interface DashboardData {
  summary: DashboardStats;
  issues: {
    expired: JiraIssue[];
    today: JiraIssue[];
    upcoming: JiraIssue[];
    others: JiraIssue[];
  };
  managers: JiraUser[];
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/jira/issues');
        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.error || `Error ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
        console.warn("Using mock data due to error");
        setData({
          summary: { expired: 0, today: 0, upcoming: 0, others: 0 },
          issues: { expired: [], today: [], upcoming: [], others: [] },
          managers: []
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch Evolutivos List
  const [evolutivosList, setEvolutivosList] = useState<JiraIssue[]>([]);

  useEffect(() => {
    async function fetchEvolutivos() {
      try {
        const res = await fetch('/api/jira/evolutivos');
        if (res.ok) {
          const data = await res.json();
          setEvolutivosList(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchEvolutivos();
  }, []);

  const [selectedManager, setSelectedManager] = useState<string>('');

  // Compute filtered Evolutivos stats
  const getFilteredEvolutivosStats = () => {
    let list = evolutivosList;

    // Filter by Manager if selected
    if (selectedManager) {
      if (selectedManager === 'unassigned') {
        list = list.filter((i) => !i.gestor || !i.gestor.id);
      } else {
        list = list.filter((i) => i.gestor?.id === selectedManager);
      }
    }

    const planned = list.filter((i) => i.pendingHitos > 0).length;
    const unplanned = list.filter((i) => i.pendingHitos === 0).length;

    return { planned, unplanned };
  };

  const evolutivoStats = getFilteredEvolutivosStats();

  // Compute filtered data
  const getFilteredSummary = () => {
    if (!data) return { expired: 0, today: 0, upcoming: 0, others: 0 };
    if (!selectedManager) return data.summary;

    const filterFn = (i: JiraIssue) => {
      if (selectedManager === 'unassigned') return !i.gestor || !i.gestor.id;
      return i.gestor?.id === selectedManager;
    };

    return {
      expired: data.issues.expired.filter(filterFn).length,
      today: data.issues.today.filter(filterFn).length,
      upcoming: data.issues.upcoming.filter(filterFn).length,
      others: data.issues.others.filter(filterFn).length,
      activeEvolutivos: data.summary.activeEvolutivos
    };
  };

  // Calculate Health Stats
  const getHealthStats = () => {
    let list = evolutivosList;
    // Filter by Manager if selected
    if (selectedManager) {
      if (selectedManager === 'unassigned') {
        list = list.filter((i) => !i.gestor || !i.gestor.id);
      } else {
        list = list.filter((i) => i.gestor?.id === selectedManager);
      }
    }

    // Only consider projects with estimations > 0 to precise calculation
    const measurableProjects = list.filter(i => (i.timeoriginalestimate || 0) > 0);
    if (measurableProjects.length === 0) return { percent: 100, label: 'Sin Estimaciones' }; // Default to good if no data

    const healthyProjects = measurableProjects.filter(i => {
      const est = i.timeoriginalestimate || 0;
      const spent = i.timespent || 0;
      return spent <= est;
    });

    const percent = Math.round((healthyProjects.length / measurableProjects.length) * 100);
    return { percent, label: `${healthyProjects.length} / ${measurableProjects.length} en tiempo` };
  };

  const healthStats = getHealthStats();

  const stats = getFilteredSummary();
  const managers = data?.managers || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sea-salt">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-malaquita border-t-transparent rounded-full animate-spin"></div>
          <p className="text-prussian-blue font-medium animate-pulse">Cargando Evolutivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sea-salt text-prussian-blue font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="mb-2">
              <Image
                src="/logo-new.jpg"
                alt="Logo App"
                width={220}
                height={80}
                className="object-contain mix-blend-multiply"
                priority
              />
            </div>
            <p className="text-teal font-secondary text-xl">
              Gestión operativa de evolutivos y hitos.
            </p>
            <div className="flex items-center gap-2 mt-4">
              {/* Removed Link */}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Manager Filter */}
            <div className="relative group z-20">
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-antiflash shadow-sm hover:border-malaquita/50 transition-all cursor-pointer">
                <User className="w-5 h-5 text-jade" />
                <select
                  className="bg-transparent font-medium text-prussian-blue outline-none cursor-pointer appearance-none pr-8"
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                >
                  <option value="">Todos los Gestores</option>
                  <option value="unassigned" className="text-teal font-bold bg-antiflash">⚠️ Sin asignar</option>
                  {managers.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ArrowUpRight className="w-4 h-4 text-teal/50 absolute right-4 pointer-events-none rotate-90" />
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-sm border border-antiflash transition-transform hover:scale-105">
              <Calendar className="w-5 h-5 text-jade" />
              <span className="text-base font-medium text-prussian-blue capitalize">
                {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* 1. Stats Grid (Fichas de Hitos) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Vencidas (Critical = Red) */}
          <StatCard
            title="Vencidas"
            count={stats.expired}
            icon={<AlertTriangle className="w-8 h-8" />}
            color="red"
            href={`/list/expired?manager=${selectedManager}`}
          />
          <StatCard
            title="Para Hoy"
            count={stats.today}
            icon={<Calendar className="w-8 h-8" />}
            color="amber"
            href={`/list/today?manager=${selectedManager}`}
          />
          <StatCard
            title="Próximos 7 Días"
            count={stats.upcoming}
            icon={<Clock className="w-8 h-8" />}
            color="blue"
            href={`/list/upcoming?manager=${selectedManager}`}
          />
        </div>

        {/* 2. Timeline Entry Point (Línea Temporal) */}
        <div className="w-full">
          <Link href="/timeline" className="block group relative bg-gradient-to-r from-slate-800 to-blue-grey rounded-[2rem] p-8 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Explorar Líneas Temporales</h2>
                  <p className="text-white/70 font-secondary">Visualiza la planificación de hitos en un cronograma interactivo.</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:translate-x-2 transition-transform">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        </div>


        {/* 3. Evolutivos Section (Evolutivos en Curso) */}
        <div className="w-full">
          <div className="bg-white rounded-[2rem] p-8 border border-antiflash shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-blue-grey">Evolutivos en Curso</h2>
                <p className="text-teal mt-1 font-secondary">Gestión de desarrollos planificados y alertas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card: Planificados */}
              <CategoryCard
                title="Planificados"
                subtitle="Con hitos definidos"
                count={evolutivoStats.planned}
                icon={<Layers className="w-8 h-8" />}
                href="/evolutivos/planificados"
                theme="green"
              />

              {/* Card: No Planificados */}
              <CategoryCard
                title="No Planificados"
                subtitle="Sin hitos / Alertas"
                count={evolutivoStats.unplanned}
                icon={<AlertTriangle className="w-8 h-8" />}
                href="/evolutivos/sin-planificar"
                theme="orange"
              />
            </div>
          </div>
        </div>

        {/* 4. KPI: Project Health (Presupuesto) (Salud Presupuestaria) */}
        <div className="w-full">
          <Link href="/avances" className="block group">
            <div className={`rounded-2xl p-6 border transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between
                    ${healthStats.percent >= 80 ? 'bg-green-50 border-green-100' :
                healthStats.percent >= 60 ? 'bg-orange-50 border-orange-100' :
                  'bg-red-50 border-red-100'
              }
                 `}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-colors
                           ${healthStats.percent >= 80 ? 'bg-green-100 text-green-600' :
                    healthStats.percent >= 60 ? 'bg-orange-100 text-orange-600' :
                      'bg-red-100 text-red-600'}
                        `}>
                  <ListTodo className="w-8 h-8" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold mb-1 ${healthStats.percent >= 80 ? 'text-green-800' :
                    healthStats.percent >= 60 ? 'text-orange-800' :
                      'text-red-800'
                    }`}>
                    {healthStats.percent}% Salud Presupuestaria
                  </h2>
                  <p className={`font-secondary ${healthStats.percent >= 80 ? 'text-green-600' :
                    healthStats.percent >= 60 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                    Proyectos en tiempo ({healthStats.label}). Click para detalle.
                  </p>
                </div>
              </div>

              <div className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide bg-white/50 border border-white/20
                         ${healthStats.percent >= 80 ? 'text-green-700' :
                  healthStats.percent >= 60 ? 'text-orange-700' :
                    'text-red-700'
                }
                    `}>
                VER DETALLE
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div >
  );
}

