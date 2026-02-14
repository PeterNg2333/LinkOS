import { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import { useCounterStore } from './store';
import type { SystemInfo } from '@/env';

const App: FunctionalComponent = () => {
    const { count, increment, decrement, reset } = useCounterStore();
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGetSystemInfo = async () => {
        setLoading(true);
        try {
            const info = await window.electronAPI.getSystemInfo();
            setSystemInfo(info);
        } catch (err) {
            console.error('Failed to get system info:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center p-6 select-none">
            <div class="w-full max-w-lg space-y-6">
                {/* Header */}
                <div class="text-center space-y-2">
                    <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        LinkOS Desktop
                    </h1>
                    <p class="text-sm text-slate-400 tracking-wide">
                        Electron Forge · Preact · Zustand · Tailwind CSS
                    </p>
                </div>

                {/* Counter Card */}
                <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl shadow-indigo-500/10">
                    <h2 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                        Zustand Counter
                    </h2>
                    <div class="flex items-center justify-between">
                        <span class="text-6xl font-extrabold tabular-nums bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                            {count}
                        </span>
                        <div class="flex gap-2">
                            <button
                                onClick={decrement}
                                class="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-150 flex items-center justify-center text-lg font-bold"
                            >
                                −
                            </button>
                            <button
                                onClick={increment}
                                class="w-10 h-10 rounded-xl bg-indigo-500/80 hover:bg-indigo-500 active:scale-95 transition-all duration-150 flex items-center justify-center text-lg font-bold shadow-lg shadow-indigo-500/30"
                            >
                                +
                            </button>
                            <button
                                onClick={reset}
                                class="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-150 text-xs font-semibold uppercase tracking-wider"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* System Info Card */}
                <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl shadow-purple-500/10">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            System Info
                        </h2>
                        <span class="text-[10px] font-mono text-slate-500">
                            IPC · contextBridge
                        </span>
                    </div>

                    <button
                        onClick={handleGetSystemInfo}
                        disabled={loading}
                        class="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-150 text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading…' : 'Get System Info'}
                    </button>

                    {systemInfo && (
                        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <InfoItem label="Platform" value={systemInfo.platform} />
                            <InfoItem label="Architecture" value={systemInfo.arch} />
                            <InfoItem label="Hostname" value={systemInfo.hostname} />
                            <InfoItem label="Node.js" value={`v${systemInfo.nodeVersion}`} />
                            <InfoItem label="Electron" value={`v${systemInfo.electronVersion}`} />
                            <InfoItem label="CPU" value={systemInfo.cpuModel} />
                            <InfoItem label="CPU Cores" value={String(systemInfo.cpuCores)} />
                            <InfoItem label="Total Memory" value={`${systemInfo.totalMemoryGB} GB`} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p class="text-center text-[11px] text-slate-600">
                    contextIsolation: true · sandbox: true · nodeIntegration: false
                </p>
            </div>
        </div>
    );
};

const InfoItem: FunctionalComponent<{ label: string; value: string }> = ({ label, value }) => (
    <div class="rounded-lg bg-white/5 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
        <div class="text-xs font-medium text-slate-200 truncate" title={value}>{value}</div>
    </div>
);

export default App;