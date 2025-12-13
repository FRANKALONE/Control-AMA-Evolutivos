'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function SetupPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!res.ok) {
                throw new Error('Error al actualizar contraseña');
            }

            // 1. Password updated in DB.
            // 2. Token is STALE (has mustChangePassword=true).
            // 3. We cannot refresh token easily without re-login logic.
            // 4. Safest: Logout and ask to login again.
            await signOut({ callbackUrl: '/login?message=password_updated' });

        } catch (err) {
            setError('Hubo un problema al guardar tu contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-sea-salt flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-antiflash p-8 relative">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-jade/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-jade" />
                    </div>
                    <h1 className="text-2xl font-bold text-blue-grey">Configura tu Contraseña</h1>
                    <p className="text-teal mt-2 text-sm">Por seguridad, debes cambiar tu contraseña temporal.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-3 animate-in fade-in">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase text-teal mb-1">Nueva Contraseña</label>
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 pl-4 pr-10 outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all text-blue-grey font-medium"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-teal/50 hover:text-teal transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-teal mb-1">Confirmar Contraseña</label>
                        <input
                            required
                            type="password"
                            className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 px-4 outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all text-blue-grey font-medium"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-jade to-malaquita text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar y Continuar'}
                        </button>

                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="text-sm text-teal hover:text-red-500 font-medium transition-colors"
                        >
                            Cancelar y Salir
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
