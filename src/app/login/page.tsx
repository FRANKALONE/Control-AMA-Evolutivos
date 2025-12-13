'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Lock, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const message = searchParams.get('message'); // Check for success message

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Credenciales inválidas. Por favor verifica tu email y contraseña.');
            } else {
                router.push('/');
                router.refresh(); // Ensure session updates
            }
        } catch (err) {
            setError('Ocurrió un error inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-sea-salt flex flex-col items-center justify-center p-4">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-jade/5 blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-teal/5 blur-3xl" />
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white p-8 md:p-10 relative z-10 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-grey to-prussian-blue text-white shadow-lg mb-6">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-blue-grey mb-2">Bienvenido</h1>
                    <p className="text-teal font-secondary">Ingresa a tu panel de control Altim</p>
                </div>

                {message === 'password_updated' && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm flex items-center gap-3 mb-6 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <p>Contraseña actualizada correctamente. Por favor, inicia sesión con tu nueva contraseña.</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-blue-grey ml-1">Email Corporativo</label>
                        <div className="relative group">
                            <Mail className="w-5 h-5 text-teal absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-jade" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3.5 pl-12 pr-4 text-prussian-blue placeholder:text-teal/40 outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium"
                                placeholder="usuario@altim.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-blue-grey ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="w-5 h-5 text-teal absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-jade" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3.5 pl-12 pr-4 text-prussian-blue placeholder:text-teal/40 outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-grey to-prussian-blue text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Iniciando...
                            </>
                        ) : (
                            <>
                                Iniciar Sesión
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-teal/60">
                        ¿Olvidaste tu contraseña? <span className="font-bold text-prussian-blue cursor-pointer hover:underline">Contacta a soporte</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
