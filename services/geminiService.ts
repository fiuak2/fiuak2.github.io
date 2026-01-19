
import { GoogleGenAI, Type } from "@google/genai";
import { AforoEntry, PredictionResult } from "../types";

export const analyzeGymData = async (data: AforoEntry[], currentDay: string): Promise<PredictionResult> => {
  // Always initialize a new GoogleGenAI instance using the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Filtrar datos válidos (>5% para evitar cierres y horario real)
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
    Datos horarios: ${hourlyStats}
    
    Contexto: El usuario quiere evitar gente. 
    Tarea:
    1. Identifica la 'Ventana de Oportunidad' (donde el aforo es más bajo y estable).
    2. Genera una 'Hora de Oro' que NO sea exacta (ej: 14:25 en lugar de 14:00) basándote en cuándo empieza a bajar el flujo.
    3. Explica la diferencia entre la media y la mediana detectada.
    4. Evalúa la estabilidad (si los lunes son siempre iguales o varían mucho).
  `;

  // Upgrading to gemini-3-pro-preview for complex reasoning and interpretation of statistical gym data
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
    // Access the text property directly on the GenerateContentResponse object
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid AI response format");
  }
};
