'use client';

import { useEffect, useState } from 'react';
import { Trash2, UserPlus, Shield, Mail, Lock, User as UserIcon, X, Loader2, ArrowLeft, Copy, Check, Key, Activity, Calendar, Pencil, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Create / Edit Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editUserId, setEditUserId] = useState<number | null>(null);

    // Reset Password State
    const [showResetModal, setShowResetModal] = useState(false);
    const [userToReset, setUserToReset] = useState<any>(null);
    const [resetPassword, setResetPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // Result Modal State (for Create only)
    const [createdUser, setCreatedUser] = useState<{ email: string, tempPassword: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'USER',
        password: '', // Only for creation
        jiraGestorName: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const [jiraUsers, setJiraUsers] = useState<any[]>([]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJiraUsers = async () => {
        try {
            // Fetch with empty query to get list, or "altim" if needed. 
            // Jira often returns recent users for empty query.
            const res = await fetch('/api/jira/users?query=');
            if (res.ok) {
                const data = await res.json();
                setJiraUsers(data);
            }
        } catch (error) {
            console.error("Error fetching Jira users", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchJiraUsers();
    }, []);

    const openCreateModal = () => {
        setIsEditing(false);
        setEditUserId(null);
        setFormData({ name: '', email: '', role: 'USER', password: '', jiraGestorName: '' });
        setShowModal(true);
    };

    const openEditModal = (user: any) => {
        setIsEditing(true);
        setEditUserId(user.id);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'USER',
            password: '', // Ignored on update
            jiraGestorName: user.jiraGestorName || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = isEditing ? `/api/users/${editUserId}/update` : '/api/users';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                setShowModal(false);
                setFormData({ name: '', email: '', role: 'USER', password: '', jiraGestorName: '' });

                if (!isEditing) {
                    // Show success modal with credentials only on create
                    setCreatedUser({ email: data.email, tempPassword: data.tempPassword });
                }

                fetchUsers();
            } else {
                alert(`Error al ${isEditing ? 'editar' : 'crear'} usuario`);
            }
        } catch (error) {
            alert('Error inesperado');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToReset) return;
        setResetLoading(true);

        try {
            const passwordToSend = resetPassword || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();

            const res = await fetch(`/api/users/${userToReset.id}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordToSend })
            });

            if (res.ok) {
                setShowResetModal(false);
                setCreatedUser({ email: userToReset.email, tempPassword: passwordToSend });
                setResetPassword('');
                setUserToReset(null);
                fetchUsers();
            } else {
                alert('Error al resetear contraseña');
            }
        } catch (error) {
            alert('Error inesperado');
        } finally {
            setResetLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) fetchUsers();
        } catch (error) {
            alert('Error eliminando usuario');
        }
    };

    const copyToClipboard = () => {
        if (createdUser) {
            const text = `Hola, tus credenciales han sido actualizadas.\n\nAccede aquí: http://localhost:3000/login\nUsuario: ${createdUser.email}\nNueva Contraseña temporal: ${createdUser.tempPassword}`;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-sea-salt font-sans p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/admin" className="inline-flex items-center text-teal hover:text-malaquita transition-colors mb-4">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Volver a Admin
                        </Link>
                        <h1 className="text-4xl font-bold text-blue-grey flex items-center gap-3">
                            <UserIcon className="w-8 h-8 text-malaquita" />
                            Gestión de Usuarios
                        </h1>
                        <p className="text-teal mt-2">Administra el acceso, monitorea la actividad y asigna gestores.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="bg-gradient-to-r from-jade to-malaquita text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" />
                        Nuevo Usuario
                    </button>
                </div>

                {/* Users List */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-antiflash overflow-hidden overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-teal flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            Cargando usuarios...
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-sea-salt/50 text-xs uppercase text-teal font-bold tracking-wider">
                                <tr>
                                    <th className="px-8 py-5">Usuario</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-6 py-5">Usuario JIRA</th>
                                    <th className="px-6 py-5">Última Conexión</th>
                                    <th className="px-6 py-5">Role</th>
                                    <th className="px-6 py-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-antiflash">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-sea-salt/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-full" alt="" />
                                                <div>
                                                    <p className="font-bold text-blue-grey">{user.name}</p>
                                                    <p className="text-xs text-teal">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${user.mustChangePassword ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {user.mustChangePassword ? (
                                                    <><Activity className="w-3 h-3 mr-1" /> Pendiente</>
                                                ) : (
                                                    <><Check className="w-3 h-3 mr-1" /> Activo</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-blue-grey font-medium">
                                            {user.jiraGestorName ? (
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
                                                    <Briefcase className="w-3 h-3" />
                                                    {user.jiraGestorName}
                                                </span>
                                            ) : (
                                                <span className="text-teal/40 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-blue-grey">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-teal/50" />
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : <span className="text-teal/50 italic">Nunca</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {user.role === 'ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-gray-400 hover:text-jade hover:bg-jade/10 rounded-lg transition-all"
                                                    title="Editar usuario"
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setUserToReset(user);
                                                        setShowResetModal(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                                    title="Resetear Contraseña"
                                                >
                                                    <Key className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Eliminar usuario"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-prussian-blue/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-sea-salt rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-2xl font-bold text-blue-grey mb-2">{isEditing ? 'Editar Usuario' : 'Invitar Usuario'}</h2>
                        <p className="text-sm text-teal mb-6">
                            {isEditing ? 'Modifica los datos del usuario.' : 'El usuario recibirá una contraseña temporal.'}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-teal mb-1">Nombre</label>
                                <div className="relative">
                                    <UserIcon className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="Nombre completo"
                                        className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium text-blue-grey"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-teal mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                    <input
                                        required
                                        type="email"
                                        placeholder="usuario@altim.com"
                                        className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium text-blue-grey"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {!isEditing && (
                                <div>
                                    <label className="block text-xs font-bold uppercase text-teal mb-1">Contraseña Inicial (Opcional)</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Dejar vacío para generar automática"
                                            className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium text-blue-grey"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-teal mt-1 ml-1">* Si lo dejas vacío, el sistema creará una segura.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase text-teal mb-1">Rol</label>
                                <select
                                    className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 px-4 focus:outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium text-blue-grey appearance-none cursor-pointer"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="USER">Usuario</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-teal mb-1">Usuario JIRA</label>
                                <div className="relative">
                                    <Briefcase className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                    <select
                                        className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 pl-10 pr-8 focus:outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium text-blue-grey appearance-none cursor-pointer"
                                        value={formData.jiraGestorName}
                                        onChange={e => setFormData({ ...formData, jiraGestorName: e.target.value })}
                                    >
                                        <option value="">Seleccionar Usuario...</option>
                                        {jiraUsers.map((jiraUser: any) => (
                                            <option key={jiraUser.accountId} value={jiraUser.displayName}>
                                                {jiraUser.displayName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[10px] text-teal mt-1 ml-1">* Usado para filtrar evolutivos.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-blue-grey to-prussian-blue text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 mt-4 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? 'Guardar Cambios' : 'Generar Invitación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && userToReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-prussian-blue/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowResetModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-sea-salt rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <Key className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-blue-grey">Resetear Contraseña</h2>
                                <p className="text-sm text-teal">{userToReset.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-teal mb-1">Nueva Contraseña (Opcional)</label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Dejar vacío para generar automática"
                                        className="w-full bg-sea-salt/50 border border-antiflash rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-jade focus:ring-4 focus:ring-jade/10 transition-all font-medium text-blue-grey"
                                        value={resetPassword}
                                        onChange={e => setResetPassword(e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-teal mt-1 ml-1">* El usuario deberá cambiarla al iniciar sesión.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 mt-4 flex items-center justify-center gap-2"
                            >
                                {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resetear Credenciales'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal (Temp Password / Reset) */}
            {createdUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-prussian-blue/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative border-l-4 border-jade">
                        <button
                            onClick={() => setCreatedUser(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-sea-salt rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-jade/10 flex items-center justify-center mb-4">
                                <Check className="w-8 h-8 text-jade" />
                            </div>
                            <h2 className="text-2xl font-bold text-blue-grey">Credenciales Generadas</h2>
                            <p className="text-sm text-teal mt-2">Comparte esta información con el usuario.</p>
                        </div>

                        <div className="bg-sea-salt rounded-xl p-6 mb-6 space-y-4">
                            <div>
                                <p className="text-xs font-bold uppercase text-teal/60 mb-1">Usuario</p>
                                <p className="text-lg font-mono font-medium text-prussian-blue">{createdUser.email}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-teal/60 mb-1">Contraseña Temporal</p>
                                <p className="text-2xl font-mono font-bold text-jade tracking-wider">{createdUser.tempPassword}</p>
                            </div>
                        </div>

                        <button
                            onClick={copyToClipboard}
                            className="w-full bg-white border border-antiflash text-blue-grey hover:border-jade hover:text-jade font-bold py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5" /> Copiado
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" /> Copiar Credenciales
                                </>
                            )}
                        </button>
                        <p className="text-xs text-center text-teal/60 mt-4">El usuario deberá cambiar su contraseña al entrar.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
