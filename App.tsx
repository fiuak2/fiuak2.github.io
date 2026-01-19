
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
  Target
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
        
        // FILTRADO DE CALIDAD: Solo horario operativo real (7:10 a 22:50)
        if (hour < 7 || (hour === 7 && min < 10)) return null;
        if (hour > 22 || (hour === 22 && min > 50)) return null;

        const date = new Date(y, m - 1, d, hour, min);
        let dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
        // Normalizar "Luness" a "Lunes"
        dayName = dayName.replace(/ss$/, 's');
        
        return {
          timestamp: date.toISOString(),
          occupancy: Math.round(parseFloat(occupancyStr)) || 0,
          dayOfWeek: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          hour: hour
        };
      } catch (e) { return null; }
    }).filter((d): d is AforoEntry => d !== null && d.occupancy > 5); 
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SHEET_URL}&t=${Date.now()}`);
      const text = await response.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setRawData(parsed);
        setLastSync(new Date());
      }
    } catch (err) { setError("Fallo de conexión"); }
    finally { setIsLoading(false); }
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

    const dayHistory = rawData.filter(d => d.dayOfWeek.toLowerCase() === selectedDay.toLowerCase());
    const absoluteMax = dayHistory.reduce((prev, curr) => (curr.occupancy > prev.occupancy ? curr : prev), dayHistory[0]);
    const absoluteMin = dayHistory.reduce((prev, curr) => (curr.occupancy < prev.occupancy ? curr : prev), dayHistory[0]);

    const sortedByOcc = [...filteredData].sort((a, b) => a.occupancy - b.occupancy);
    const bestHour = sortedByOcc[0].hour;
    const nextHour = filteredData.find(f => f.hour === bestHour + 1);
    const trendDir = (nextHour?.occupancy || 0) > sortedByOcc[0].occupancy ? 'up' : 'down';
    const nonExactHour = `${bestHour}:${trendDir === 'up' ? '15' : '45'}`;

    return { 
      mean: meanValue, 
      median: medianValue, 
      p25: p25Value, 
      stdDev: Math.round(stdDevValue), 
      max: absoluteMax?.occupancy, 
      maxDate: absoluteMax?.timestamp,
      min: absoluteMin?.occupancy, 
      minDate: absoluteMin?.timestamp,
      golden: nonExactHour
    };
  }, [filteredData, rawData, selectedDay]);

  const stabilityPercentage = useMemo(() => {
    if (!localStats) return 0;
    return Math.max(0, 100 - localStats.stdDev);
  }, [localStats]);

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeGymData(rawData, selectedDay);
      setPrediction(res);
    } catch (e) {} finally { setIsAnalyzing(false); }
  };

  return (
    <div className="min-h-screen pb-20 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase tracking-tight">GymFlow Predictor</h1>
          <p className="text-slate-400 text-sm">XFitness Abrantes • Análisis Estratégico de Aforo</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-2 glass-panel rounded-xl hover:text-emerald-400 transition-colors">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={runAiAnalysis} className="px-6 py-2 bg-emerald-500 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all">
            <BrainCircuit size={18} /> Predecir {selectedDay}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-emerald-500 shadow-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Activity size={10}/> Aforo Actual</p>
          <span className="text-4xl font-bold">{rawData[rawData.length-1]?.occupancy || '--'}%</span>
        </div>
        <div className="glass-panel p-6 rounded-3xl group relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <ShieldCheck size={80} />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><ShieldCheck size={10}/> Estabilidad {selectedDay}</p>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">{stabilityPercentage}%</span>
            <div className={`p-1 rounded-md ${stabilityPercentage > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Info size={14} />
            </div>
          </div>
          <p className={`text-[9px] font-bold mt-2 ${stabilityPercentage > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stabilityPercentage > 80 ? '✓ ALTA FIABILIDAD' : '⚠ DÍA VOLÁTIL'}
          </p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-transparent">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Trophy size={10} className="text-purple-400"/> Hora de Oro</p>
          <span className="text-4xl font-bold text-purple-400">{prediction?.goldenHour || localStats?.golden || '--:--'}</span>
        </div>
        <div className="glass-panel p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Día de consulta:</p>
          <select value={selectedDay} onChange={(e)=>setSelectedDay(e.target.value)} className="w-full bg-slate-800 p-2 rounded-lg font-bold text-sm outline-none border border-slate-700 hover:border-emerald-500 transition-colors">
            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><TrendingUp size={20} className="text-emerald-400" /> Curva de Ocupación Promedio</h2>
            <OccupancyLineChart data={filteredData} title={`Afluencia típica de los ${selectedDay}`} />
          </div>

          <div className="glass-panel p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400"><BarChart3 size={20} /> Análisis Profundo ({selectedDay})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="bg-slate-800/50 p-5 rounded-2xl flex-1 border border-slate-700">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Media</p>
                    <p className="text-3xl font-bold">{localStats?.mean}%</p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-2xl flex-1 border border-slate-700">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Mediana</p>
                    <p className="text-3xl font-bold">{localStats?.median}%</p>
                  </div>
                </div>
                <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="font-bold text-blue-400">Interpretación:</span> Tu media ({localStats?.mean}%) es mayor que la mediana ({localStats?.median}%). Esto indica que los <span className="text-blue-400 font-bold">{selectedDay}</span> el gimnasio tiene <strong>picos breves</strong> que elevan el promedio, pero el 50% del tiempo el aforo real es inferior al {localStats?.median}%.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="bg-slate-800/50 p-5 rounded-2xl flex-1 border border-slate-700 relative overflow-hidden group">
                    <Target className="absolute -right-2 -bottom-2 text-emerald-500/10 group-hover:scale-110 transition-transform" size={40} />
                    <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1"><ArrowDown size={10} /> Percentil 25</p>
                    <p className="text-3xl font-bold text-emerald-400">{localStats?.p25}%</p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-2xl flex-1 border border-slate-700 relative overflow-hidden group">
                    <Dices className="absolute -right-2 -bottom-2 text-amber-500/10 group-hover:scale-110 transition-transform" size={40} />
                    <p className="text-[10px] text-amber-400 font-bold uppercase mb-1 flex items-center gap-1">Volatilidad</p>
                    <p className="text-3xl font-bold text-amber-400">{localStats?.stdDev}%</p>
                  </div>
                </div>
                <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="text-emerald-400 shrink-0 mt-1" size={16} />
                    <div className="text-xs text-slate-200 leading-relaxed space-y-3">
                      <div>
                        <span className="font-bold text-emerald-400 block mb-1">Percentil 25 ({localStats?.p25}%): Tu apuesta segura</span>
                        Indica que el 25% de los registros históricos están por debajo de este valor. Si el aforo actual se acerca a este número, es el momento perfecto para ir.
                      </div>
                      <div>
                        <span className="font-bold text-amber-400 block mb-1">Volatilidad ({localStats?.stdDev}%): El factor riesgo</span>
                        Mide cuánto varía el aforo de una semana a otra. Una volatilidad baja {"(< 15)"} significa que los datos son muy fiables. Una alta {"(> 20)"} indica que hoy podría ser un día "raro".
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-3xl border border-blue-500/10 bg-blue-500/5">
            <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><Info size={16}/> Guía de Fiabilidad de la Estabilidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-900/50 rounded-xl border border-emerald-500/20">
                <p className="font-bold text-emerald-400 mb-2">{" > 85%"} - Muy Fiable</p>
                <p className="text-slate-400">Los datos son consistentes semana tras semana. Puedes confiar plenamente en las predicciones para planificar tu rutina.</p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl border border-amber-500/20">
                <p className="font-bold text-amber-400 mb-2">70% a 85% - Moderado</p>
                <p className="text-slate-400">Hay variaciones ocasionales. Te recomendamos usar el Percentil 25 como tu guía principal para asegurar hueco.</p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl border border-red-500/20">
                <p className="font-bold text-red-400 mb-2">{" < 70%"} - Poco Fiable</p>
                <p className="text-slate-400">Mucha varianza histórica. Los datos pueden fallar hoy; consulta el aforo en tiempo real antes de salir de casa.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl h-fit border border-emerald-500/20 sticky top-8 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400"><BrainCircuit size={20} /> IA Predictiva Gemini</h2>
          {prediction ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 shadow-inner">
                <p className="text-lg font-bold text-emerald-100 leading-snug">{prediction.recommendation}</p>
              </div>
              <p className="text-sm text-slate-400 italic leading-relaxed border-l-2 border-slate-700 pl-4">"{prediction.analysis}"</p>
              <div className="pt-6 border-t border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-widest">Estado hoy</span>
                <span className={`px-4 py-1.5 rounded-full font-bold shadow-sm ${prediction.statistics.trend === 'down' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {prediction.statistics.trend === 'down' ? 'RECOMENDADO' : 'EVITAR PICOS'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Zap className="mx-auto mb-4 text-slate-800 animate-pulse" size={48} />
              <p className="text-sm px-4">Pulsa en "Predecir {selectedDay}" para que la IA detecte si hoy es un día óptimo para entrenar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
