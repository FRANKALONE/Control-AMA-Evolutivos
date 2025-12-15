'use client';

import { useState } from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle, Brain } from 'lucide-react';
// If react-markdown is not installed, I will simply display text with whitespace-pre-wrap

interface AnalysisModalProps {
    issueKey: string;
    isOpen: boolean;
    onClose: () => void;
}

export function AnalysisModal({ issueKey, isOpen, onClose }: AnalysisModalProps) {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const runAnalysis = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ issueKey })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error analyzing');
            setAnalysis(data.insight);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-run on open if not already present? Or wait for user?
    // Let's auto-run for better UX if it's the first time
    if (!analysis && !loading && !error) {
        runAnalysis();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-antiflash flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-prussian-blue">Análisis Inteligente</h2>
                            <p className="text-sm text-blue-grey">Evolutivo {issueKey}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-antiflash rounded-full transition-colors text-blue-grey">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-sea-salt/30">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
                            <p className="text-indigo-900 font-medium animate-pulse">Consultando a la IA...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && analysis && (
                        <div className="prose prose-sm max-w-none text-blue-grey">
                            {/* Simple Markdown Rendering Fallback */}
                            <div className="whitespace-pre-wrap font-secondary leading-relaxed space-y-4">
                                {analysis.split('###').map((section, idx) => {
                                    if (!section.trim()) return null;
                                    const [title, ...content] = section.split('\n');
                                    // If it's the first split (before first ###), checking validity
                                    if (idx === 0 && !section.startsWith('#')) {
                                        // likely introduction
                                        return <p key={idx}>{section}</p>;
                                    }

                                    const cleanTitle = title.trim();

                                    // Determining color/icon based on title keywords
                                    let headerClass = "text-indigo-700 border-l-4 border-indigo-400 pl-3";
                                    if (cleanTitle.includes('Riesgos') || cleanTitle.includes('Problemas')) headerClass = "text-red-700 border-l-4 border-red-400 pl-3 bg-red-50 py-1";
                                    if (cleanTitle.includes('Recomendación')) headerClass = "text-emerald-700 border-l-4 border-emerald-400 pl-3 bg-emerald-50 py-1";

                                    return (
                                        <div key={idx} className="mb-6">
                                            <h3 className={`text-lg font-bold mb-2 ${headerClass}`}>{cleanTitle}</h3>
                                            <p className="text-gray-700">{content.join('\n').trim()}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-antiflash bg-white flex justify-end">
                    <button
                        onClick={runAnalysis}
                        className="px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                        disabled={loading}
                    >
                        <Sparkles className="w-4 h-4" />
                        Regenerar
                    </button>
                    <button
                        onClick={onClose}
                        className="ml-2 px-6 py-2 bg-prussian-blue text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
