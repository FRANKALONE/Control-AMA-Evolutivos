import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowRight, X } from 'lucide-react';

interface DropdownFilterProps {
    label: string;
    options: { value: string; label: string; sub?: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    isOpen: boolean;
    onToggle: (e: any) => void;
    searchable?: boolean;
    isExcluded?: boolean;
    onToggleExclusion?: () => void;
}

export function DropdownFilter({
    label,
    options,
    selected,
    onChange,
    isOpen,
    onToggle,
    searchable = false,
    isExcluded = false,
    onToggleExclusion
}: DropdownFilterProps) {
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Auto-focus search input when opening
    // We can't easily auto-focus without a ref to the input, but standard behavior is fine.

    // Filter options based on search
    const filteredOptions = searchable
        ? options.filter((o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            o.sub?.toLowerCase().includes(search.toLowerCase())
        )
        : options;

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()} ref={dropdownRef}>
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
                            filteredOptions.map((opt) => {
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
                                            {opt.sub && <p className="text-[10px] text-teal/70 truncate">{opt.sub}</p>}
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
