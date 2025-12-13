'use client';

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, ChevronDown, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function UserMenu() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!session?.user) return null;

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-white pl-3 pr-4 py-2 rounded-full border border-antiflash hover:border-jade shadow-sm hover:shadow-md transition-all group"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jade to-malaquita flex items-center justify-center text-white font-bold shadow-sm">
                    {session.user.image ? (
                        <img src={session.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <span className="text-sm">{session.user.name?.[0]?.toUpperCase() || "U"}</span>
                    )}
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-sm font-bold text-blue-grey leading-none group-hover:text-jade transition-colors">
                        {session.user.name}
                    </p>
                    <p className="text-[10px] text-teal font-medium uppercase tracking-wider">
                        {(session.user as any).role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                    </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-teal transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-antiflash overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-antiflash bg-sea-salt/30">
                        <p className="text-sm font-bold text-prussian-blue truncate">{session.user.email}</p>
                    </div>

                    <div className="p-2">
                        {(session.user as any).role === 'ADMIN' && (
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-blue-grey hover:bg-sea-salt rounded-lg transition-colors mb-1"
                            >
                                <Shield className="w-4 h-4 text-jade" />
                                Panel Admin
                            </Link>
                        )}

                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
