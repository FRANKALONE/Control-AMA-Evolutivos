'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, AlertCircle, Calendar, Clock, CheckCircle2, User, ArrowUpRight, MoreHorizontal, FileText, CheckCircle, ListTodo } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [data, setData] = useState<any>(null);
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
          issues: { expired: [], today: [], upcoming: [], others: [] }
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const [selectedManager, setSelectedManager] = useState<string>('');

  // Compute filtered data
  const getFilteredSummary = () => {
    if (!data) return { expired: 0, today: 0, upcoming: 0, others: 0 };
    if (!selectedManager) return data.summary;

    const filterFn = (i: any) => i.manager?.id === selectedManager;
    return {
      expired: data.issues.expired.filter(filterFn).length,
      today: data.issues.today.filter(filterFn).length,
      upcoming: data.issues.upcoming.filter(filterFn).length,
      others: data.issues.others.filter(filterFn).length,
    };
  };

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
            <h1 className="text-5xl font-bold tracking-tight text-blue-grey mb-2 font-sans">
              Hola, Equipo <span className="text-malaquita">Altim</span>
            </h1>
            <p className="text-teal font-secondary text-xl">
              Gestión operativa de evolutivos y hitos.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-malaquita/10 text-dark-green rounded-full text-sm font-bold border border-malaquita/20">
                <div className="w-2 h-2 rounded-full bg-malaquita animate-pulse" />
                {data?.summary?.activeEvolutivos || 0} Evolutivos en curso
              </span>
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
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Vencidas (Critical = Red) */}
          <StatCard
            title="Vencidas"
            count={stats.expired}
            icon={<ListTodo className="w-6 h-6" />}
            color="text-red-600"
            bgColor="bg-red-50"
            borderColor="border-red-100"
            href={`/list/expired${selectedManager ? '?manager=' + selectedManager : ''}`}
          />

          {/* Card: Vencen Hoy (Warning = Orange) */}
          <StatCard
            title="Vencen Hoy"
            count={stats.today}
            icon={<Clock className="w-6 h-6" />}
            color="text-orange-600"
            bgColor="bg-orange-50"
            borderColor="border-orange-100"
            href={`/list/today${selectedManager ? '?manager=' + selectedManager : ''}`}
          />

          {/* Card: Próximos 7 días (Caution = Yellow) */}
          <StatCard
            title="Próximos 7 días"
            count={stats.upcoming}
            icon={<ArrowUpRight className="w-6 h-6" />}
            color="text-yellow-700"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-100"
            href={`/list/upcoming${selectedManager ? '?manager=' + selectedManager : ''}`}
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Simplified Task List / Placeholder */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-antiflash shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-blue-grey">Listado de Evolutivos</h2>
                <p className="text-teal mt-1 font-secondary">Vista general de tareas activas</p>
              </div>
              <button className="p-2 hover:bg-antiflash rounded-full transition-colors text-jade">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Empty State / Loading */}
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border-2 border-dashed border-antiflash rounded-3xl bg-sea-salt/30">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                <FileText className="w-8 h-8 text-jade" />
              </div>
              <div>
                <p className="text-lg font-medium text-prussian-blue">Selecciona una categoría arriba</p>
                <p className="text-sm text-teal/80">
                  Pulsa en las tarjetas para ver el detalle de los tickets.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-prussian-blue rounded-[2rem] p-8 text-white shadow-xl overflow-hidden relative group">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-malaquita" />
                Estado del Servicio
              </h3>
              <div className="space-y-8 font-secondary">
                <div>
                  <p className="text-white/60 text-sm mb-1 uppercase tracking-widest">Total Tareas Activas</p>
                  <p className="text-5xl font-bold text-white tracking-tight">{
                    (data?.summary?.expired || 0) +
                    (data?.summary?.today || 0) +
                    (data?.summary?.upcoming || 0) +
                    (data?.summary?.others || 0)
                  }</p>
                </div>
                <div className="h-px bg-white/10" />
                <div>
                  <p className="text-white/60 text-sm mb-1 uppercase tracking-widest">SLA Global</p>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-medium text-malaquita">98.5%</p>
                    <span className="text-sm text-jade mb-1.5">▲ 2.1%</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative circle */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-jade/20 rounded-full blur-3xl group-hover:bg-malaquita/20 transition-colors duration-700" />
            <div className="absolute top-10 right-10 w-20 h-20 bg-teal/20 rounded-full blur-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Updated component to support new colors
function StatCard({ title, count, icon, color, bgColor, borderColor, href }: any) {
  const Component = href ? Link : 'div';
  return (
    <Component
      href={href || '#'}
      className={cn(
        "group bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden",
        borderColor || "border-antiflash"
      )}
    >
      <div className={`absolute top-0 right-0 p-16 rounded-bl-full opacity-10 ${bgColor} group-hover:scale-150 transition-transform duration-700 ease-out`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3.5 rounded-2xl ${bgColor} ${color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
            {icon}
          </div>
          {href && <ArrowUpRight className="w-5 h-5 text-neutral-300 group-hover:text-jade transition-colors" />}
        </div>
        <div>
          <p className="text-sm font-bold opacity-80 font-secondary uppercase tracking-wider mb-1 text-current">{title}</p>
          <h3 className="text-5xl font-bold text-blue-grey tracking-tighter group-hover:translate-x-1 transition-transform">{count}</h3>
        </div>
      </div>
    </Component>
  );
}
