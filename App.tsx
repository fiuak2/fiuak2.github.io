
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Info, 
  RefreshCw,
  BrainCircuit,
  Zap,
  HelpCircle,
  Trophy,
  ArrowDown,
  ShieldCheck,
  BarChart3,
  Dices,
  Target,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { AforoEntry, PredictionResult } from './types';
import { analyzeGymData } from './services/geminiService';
import { OccupancyLineChart } from './components/Charts';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT_GeDgDmRMSiJMCfvtFHRGtEAvljoqyNAanCDxJkBXt603SQeY98veTzEv02Zt2BGbsv3DyR2Ehzci/pub?gid=0&single=true&output=csv";

const App: React.FC = () => {
  const [rawData, setRawData] = useState<AforoEntry[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(
    new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date()).charAt(0).toUpperCase() + 
    new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date()).slice(1).replace(/ss$/, 's')
  );
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseCSV = (text: string): AforoEntry[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    return lines.slice(1).map((line) => {
      const columns = line.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim());
      if (columns.length < 3) return null;
      try {
        const fechaStr = columns[0];
        const horaStr = columns[1];
        const occupancyStr = columns[2].replace('%', '').replace(',', '.').trim();
        const dateParts = fechaStr.split(/[\/\-]/).map(n => parseInt(n));
        const timeParts = horaStr.split(':').map(n => parseInt(n));
        let [d, m, y] = dateParts;
        if (y < 100) y += 2000;
        const hour = timeParts[0];
        const min = timeParts[1] || 0;
        
        const date = new Date(y, m - 1, d, hour, min);
        let dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
        dayName = dayName.replace(/ss$/, 's');
        
        return {
          timestamp: date.toISOString(),
          occupancy: Math.round(parseFloat(occupancyStr)) || 0,
          dayOfWeek: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          hour: hour
        };
      } catch (e) { return null; }
    }).filter((d): d is AforoEntry => d !== null && d.occupancy > 2); 
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SHEET_URL}&t=${Date.now()}`);
      if (!response.ok) throw new Error("Error en red");
      const text = await response.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setRawData(parsed);
        setLastSync(new Date());
        setError(null);
      } else {
        setError("No hay datos disponibles en el archivo");
      }
    } catch (err) { 
      setError("Fallo al conectar con Google Sheets"); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 180000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredData = useMemo(() => {
    const dayData = rawData.filter(d => d.dayOfWeek.toLowerCase() === selectedDay.toLowerCase());
    const hourlyMap: Record<number, number[]> = {};
    dayData.forEach(d => {
      if (!hourlyMap[d.hour]) hourlyMap[d.hour] = [];
      hourlyMap[d.hour].push(d.occupancy);
    });
    return Object.keys(hourlyMap).map(h => ({
      timestamp: '',
      dayOfWeek: selectedDay,
      hour: parseInt(h),
      occupancy: Math.round(hourlyMap[parseInt(h)].reduce((a, b) => a + b, 0) / hourlyMap[parseInt(h)].length)
    })).sort((a, b) => a.hour - b.hour);
  }, [rawData, selectedDay]);

  const localStats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const values = filteredData.map(d => d.occupancy).sort((a, b) => a - b);
    const meanValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const medianValue = values[Math.floor(values.length / 2)];
    const p25Value = values[Math.floor(values.length * 0.25)];
    
    const squareDiffs = values.map(v => Math.pow(v - meanValue, 2));
    const stdDevValue = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);

    const sortedByOcc = [...filteredData].sort((a, b) => a.occupancy - b.occupancy);
    const bestHour = sortedByOcc[0]?.hour || 14;
    const nextHour = filteredData.find(f => f.hour === bestHour + 1);
    const trendDir = (nextHour?.occupancy || 0) > (sortedByOcc[0]?.occupancy || 0) ? 'up' : 'down';
    const nonExactHour = `${bestHour}:${trendDir === 'up' ? '15' : '45'}`;

    return { 
      mean: meanValue, 
      median: medianValue, 
      p25: p25Value, 
      stdDev: Math.round(stdDevValue), 
      max: values[values.length-1], 
      min: values[0], 
      golden: nonExactHour
    };
  }, [filteredData]);

  const stabilityPercentage = useMemo(() => {
    if (!localStats) return 0;
    return Math.max(0, Math.min(100, 100 - (localStats.stdDev * 2)));
  }, [localStats]);

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeGymData(rawData, selectedDay);
      setPrediction(res);
    } catch (e: any) {
      console.error("AI Analysis Error:", e);
      alert("Error al conectar con la IA de Gemini. Verifica tu conexión.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl text-center max-w-md">
          <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Error de Sincronización</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button onClick={fetchData} className="px-6 py-2 bg-emerald-500 rounded-xl font-bold flex items-center gap-2 mx-auto">
            <RefreshCw size={18} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase tracking-tight">GymFlow Predictor</h1>
          <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
            XFitness Abrantes <span className="w-1 h-1 bg-slate-600 rounded-full"></span> 
            {lastSync ? `Sincronizado ${lastSync.toLocaleTimeString()}` : 'Cargando datos...'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={fetchData} className="p-3 glass-panel rounded-2xl hover:text-emerald-400 transition-all active:scale-90">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={runAiAnalysis} 
            disabled={isAnalyzing || rawData.length === 0}
            className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
            <span>{prediction ? 'Actualizar Análisis' : 'Analizar con IA'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-emerald-500 shadow-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-widest"><Activity size={10}/> Aforo Actual</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white">{rawData[rawData.length-1]?.occupancy || '--'}</span>
            <span className="text-xl font-bold text-slate-500">%</span>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-widest"><ShieldCheck size={10}/> Estabilidad {selectedDay}</p>
          <div className="flex items-center gap-3">
            <span className="text-5xl font-black text-white">{stabilityPercentage}%</span>
            <div className={`p-1.5 rounded-lg ${stabilityPercentage > 75 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Zap size={16} fill="currentColor" />
            </div>
          </div>
          <p className={`text-[10px] font-bold mt-2 tracking-wide ${stabilityPercentage > 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stabilityPercentage > 75 ? 'ALTA CONFIANZA' : 'PRECISIÓN MEDIA'}
          </p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest"><Trophy size={10} className="text-purple-400"/> Hora de Oro</p>
          <span className="text-5xl font-black text-purple-400">{prediction?.goldenHour || localStats?.golden || '--:--'}</span>
          <p className="text-[10px] text-purple-300/60 mt-2 font-medium">Basado en históricos de {selectedDay}</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Cambiar consulta:</p>
          <select 
            value={selectedDay} 
            onChange={(e)=>setSelectedDay(e.target.value)} 
            className="w-full bg-slate-800/80 p-3 rounded-2xl font-bold text-sm outline-none border border-slate-700 hover:border-emerald-500/50 transition-all appearance-none cursor-pointer"
          >
            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <p className="text-[9px] text-slate-500 mt-2 text-center font-medium">Mostrando promedios históricos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-8"><TrendingUp size={22} className="text-emerald-400" /> Curva de Afluencia Típica</h2>
            <OccupancyLineChart data={filteredData} title={`${selectedDay} (Basado en últimos 30 días)`} />
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-slate-800/50">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-cyan-400"><BarChart3 size={22} /> Análisis de Datos ({selectedDay})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-wider">Media</p>
                    <p className="text-4xl font-black text-white">{localStats?.mean}%</p>
                  </div>
                  <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-wider">Mediana</p>
                    <p className="text-4xl font-black text-white">{localStats?.median}%</p>
                  </div>
                </div>
                <div className="p-6 bg-cyan-500/5 rounded-2xl border border-cyan-500/10">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    <span className="font-extrabold text-cyan-400 mr-1">TIPS:</span> 
                    Los <span className="text-cyan-400 font-bold">{selectedDay}</span> {localStats && localStats.mean > localStats.median ? 'el aforo es engañoso: hay picos muy altos que inflan la media.' : 'el flujo es muy constante durante todo el día.'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                    <Target className="absolute -right-2 -bottom-2 text-emerald-500/5 group-hover:scale-110 transition-transform" size={44} />
                    <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1 tracking-wider flex items-center gap-1"><ArrowDown size={10} /> P. 25</p>
                    <p className="text-4xl font-black text-emerald-400">{localStats?.p25}%</p>
                  </div>
                  <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
                    <Dices className="absolute -right-2 -bottom-2 text-amber-500/5 group-hover:scale-110 transition-transform" size={44} />
                    <p className="text-[10px] text-amber-400 font-bold uppercase mb-1 tracking-wider">Varianza</p>
                    <p className="text-4xl font-black text-amber-400">{localStats?.stdDev}%</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-inner">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="text-slate-500 shrink-0 mt-0.5" size={16} />
                    <div className="text-[11px] text-slate-400 leading-relaxed space-y-2">
                      <p><strong className="text-emerald-400">Percentil 25:</strong> Indica que el 25% de las veces estarás por debajo de este aforo. Es el valor ideal para ir tranquilo.</p>
                      <p><strong className="text-amber-400">Varianza:</strong> Si es baja {"(<12%)"}, el gimnasio se comporta igual todos los {selectedDay}.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-8 rounded-[2.5rem] h-fit border border-emerald-500/20 sticky top-8 shadow-2xl bg-gradient-to-b from-emerald-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400"><BrainCircuit size={22} /> Predicción IA</h2>
              <div className="px-2 py-1 bg-emerald-500/10 rounded-md text-[9px] font-black text-emerald-400 tracking-tighter uppercase">Gemini 3 Pro</div>
            </div>
            
            {prediction ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <p className="text-base font-bold text-white leading-relaxed">{prediction.recommendation}</p>
                </div>
                
                <div className="relative p-6 bg-slate-800/30 rounded-3xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 italic leading-relaxed">
                    <span className="text-slate-600 text-lg font-serif">"</span>
                    {prediction.analysis}
                    <span className="text-slate-600 text-lg font-serif">"</span>
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-800/50 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Estado</span>
                  <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-[11px] shadow-sm ${prediction.statistics.trend === 'down' ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${prediction.statistics.trend === 'down' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                    {prediction.statistics.trend === 'down' ? 'HORARIO ÓPTIMO' : 'ALTA AFLUENCIA'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                  <Zap className="text-slate-600" size={32} />
                </div>
                <p className="text-sm font-medium text-slate-400 px-8">
                  {isAnalyzing ? 'Calculando predicción...' : "Pulsa 'Analizar con IA' para obtener recomendaciones personalizadas."}
                </p>
              </div>
            )}
          </div>
          
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/50 text-[10px] text-slate-500 flex items-center justify-between">
            <span className="font-bold uppercase tracking-widest">Version 1.3.0</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-400">Documentación</a>
              <a href="#" className="hover:text-emerald-400">Privacidad</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
