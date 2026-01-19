
import { GoogleGenAI, Type } from "@google/genai";
import { AforoEntry, PredictionResult } from "../types";

export const analyzeGymData = async (data: AforoEntry[], currentDay: string): Promise<PredictionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const dayData = data.filter(d => 
    d.dayOfWeek.toLowerCase() === currentDay.toLowerCase() && 
    d.occupancy > 5
  );
  
  const hourlyStats = Array.from({ length: 18 }, (_, i) => i + 6).map(h => {
    const atHour = dayData.filter(d => d.hour === h);
    if (atHour.length === 0) return null;
    const avg = Math.round(atHour.reduce((a, b) => a + b.occupancy, 0) / atHour.length);
    return `${h}h: ${avg}%`;
  }).filter(Boolean).join(', ');

  const prompt = `
    Analiza el aforo histórico del gimnasio XFitness Abrantes para los ${currentDay}s.
    Datos promedios horarios: ${hourlyStats}
    
    Contexto: El usuario quiere evitar gente y encontrar el momento más tranquilo. 
    Tarea:
    1. Identifica la 'Ventana de Oportunidad' (donde el aforo es más bajo y estable).
    2. Genera una 'Hora de Oro' que NO sea exacta (ej: 14:25 en lugar de 14:00) basándote en cuándo empieza a bajar el flujo.
    3. Explica brevemente la diferencia entre la media y la mediana detectada en los datos.
    4. Evalúa la estabilidad basándote en que estos son promedios.
    
    Responde estrictamente en formato JSON siguiendo el esquema proporcionado.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendation: { type: Type.STRING },
          goldenHour: { type: Type.STRING },
          analysis: { type: Type.STRING },
          statistics: {
            type: Type.OBJECT,
            properties: {
              mean: { type: Type.NUMBER },
              median: { type: Type.NUMBER },
              percentile25: { type: Type.NUMBER },
              stdDev: { type: Type.NUMBER },
              max: { type: Type.NUMBER },
              min: { type: Type.NUMBER },
              bestHour: { type: Type.STRING },
              trend: { type: Type.STRING, description: "Must be 'up', 'down', or 'stable'" }
            },
            required: ["mean", "median", "percentile25", "stdDev", "max", "min", "bestHour", "trend"]
          }
        },
        required: ["recommendation", "goldenHour", "analysis", "statistics"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Respuesta vacía de la IA");
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Formato de respuesta inválido");
  }
};
