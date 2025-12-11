import OpenAI from "openai";
import { db } from "./db";
import { trucks, drivers, mileageRecords, maintenances, fuelExpenses, extraExpenses } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface FleetHealthSummary {
  truckId: string;
  plate: string;
  model: string;
  year: number;
  totalKm: number;
  mainDriverName: string | null;
  healthScore: number;
  riskLevel: "baixo" | "medio" | "alto";
}

export interface FleetHealthDiagnostic {
  summary: string;
  healthScore: number;
  riskLevel: "baixo" | "medio" | "alto";
  strengths: string[];
  criticalPoints: string[];
  routes: {
    problematicRoutes: string[];
    recommendations: string[];
  };
  drivers: {
    mainDrivers: string[];
    comparison: string;
    recommendations: string[];
  };
  costPrediction: {
    estimatedMaintenanceCost: number;
    nextMaintenanceKm: number;
    nextMaintenanceDate: string;
    warnings: string[];
  };
  fullReport: string;
}

interface TruckDataForDiagnostic {
  truck: {
    id: string;
    number: string;
    plate: string;
    model: string;
    year: number;
    totalKm: number;
    status: string;
    mainDriverName: string | null;
  };
  maintenances: Array<{
    type: string;
    value: number;
    date: Date;
    observations: string | null;
  }>;
  trips: Array<{
    route: string;
    kmTraveled: number;
    valueReceived: number;
    date: Date;
  }>;
  fuelExpenses: Array<{
    liters: number;
    totalCost: number;
    odometer: number;
    date: Date;
  }>;
  extraExpenses: Array<{
    category: string;
    description: string;
    totalCost: number;
    date: Date;
  }>;
}

async function getTruckDataForDiagnostic(truckId: string): Promise<TruckDataForDiagnostic | null> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [truck] = await db
    .select()
    .from(trucks)
    .leftJoin(drivers, eq(trucks.mainDriverId, drivers.id))
    .where(eq(trucks.id, truckId));

  if (!truck) return null;

  const truckMaintenances = await db
    .select()
    .from(maintenances)
    .where(and(eq(maintenances.truckId, truckId), gte(maintenances.date, sixMonthsAgo)))
    .orderBy(desc(maintenances.date));

  const truckTrips = await db
    .select()
    .from(mileageRecords)
    .where(and(eq(mileageRecords.truckId, truckId), gte(mileageRecords.date, sixMonthsAgo)))
    .orderBy(desc(mileageRecords.date));

  const truckFuel = await db
    .select()
    .from(fuelExpenses)
    .where(and(eq(fuelExpenses.truckId, truckId), gte(fuelExpenses.date, sixMonthsAgo)))
    .orderBy(desc(fuelExpenses.date));

  const truckExtras = await db
    .select()
    .from(extraExpenses)
    .where(and(eq(extraExpenses.truckId, truckId), gte(extraExpenses.date, sixMonthsAgo)))
    .orderBy(desc(extraExpenses.date));

  return {
    truck: {
      id: truck.trucks.id,
      number: truck.trucks.number,
      plate: truck.trucks.plate,
      model: truck.trucks.model,
      year: truck.trucks.year,
      totalKm: Number(truck.trucks.totalKm),
      status: truck.trucks.status,
      mainDriverName: truck.drivers?.name || null,
    },
    maintenances: truckMaintenances.map(m => ({
      type: m.type,
      value: Number(m.value),
      date: new Date(m.date),
      observations: m.observations,
    })),
    trips: truckTrips.map(t => ({
      route: t.route,
      kmTraveled: Number(t.kmTraveled),
      valueReceived: Number(t.valueReceived),
      date: new Date(t.date),
    })),
    fuelExpenses: truckFuel.map(f => ({
      liters: Number(f.liters),
      totalCost: Number(f.totalCost),
      odometer: Number(f.odometer),
      date: new Date(f.date),
    })),
    extraExpenses: truckExtras.map(e => ({
      category: e.category,
      description: e.description,
      totalCost: Number(e.totalCost),
      date: new Date(e.date),
    })),
  };
}

function calculateBasicHealthScore(data: TruckDataForDiagnostic): { score: number; riskLevel: "baixo" | "medio" | "alto" } {
  let score = 100;
  const now = new Date();

  // Age penalty (older trucks lose points)
  const age = now.getFullYear() - data.truck.year;
  if (age > 10) score -= 15;
  else if (age > 5) score -= 8;

  // High mileage penalty
  if (data.truck.totalKm > 500000) score -= 15;
  else if (data.truck.totalKm > 300000) score -= 8;

  // Maintenance frequency analysis
  const maintenanceTypes = data.maintenances.map(m => m.type);
  const motorIssues = maintenanceTypes.filter(t => t.toLowerCase().includes("motor")).length;
  const freioIssues = maintenanceTypes.filter(t => t.toLowerCase().includes("freio")).length;
  
  if (motorIssues > 2) score -= 20;
  else if (motorIssues > 0) score -= 10;
  
  if (freioIssues > 2) score -= 15;
  else if (freioIssues > 0) score -= 5;

  // Total maintenance cost in period
  const totalMaintenanceCost = data.maintenances.reduce((sum, m) => sum + m.value, 0);
  if (totalMaintenanceCost > 50000) score -= 15;
  else if (totalMaintenanceCost > 20000) score -= 8;

  // Fuel efficiency
  const totalKmTrips = data.trips.reduce((sum, t) => sum + t.kmTraveled, 0);
  const totalLiters = data.fuelExpenses.reduce((sum, f) => sum + f.liters, 0);
  if (totalKmTrips > 0 && totalLiters > 0) {
    const kmPerLiter = totalKmTrips / totalLiters;
    if (kmPerLiter < 2) score -= 10;
    else if (kmPerLiter < 2.5) score -= 5;
  }

  // Ensure score stays between 0 and 100
  score = Math.max(0, Math.min(100, score));

  let riskLevel: "baixo" | "medio" | "alto" = "baixo";
  if (score < 50) riskLevel = "alto";
  else if (score < 70) riskLevel = "medio";

  return { score, riskLevel };
}

export async function getFleetHealthSummary(): Promise<FleetHealthSummary[]> {
  const allTrucks = await db
    .select()
    .from(trucks)
    .leftJoin(drivers, eq(trucks.mainDriverId, drivers.id))
    .orderBy(trucks.number);

  const summaries: FleetHealthSummary[] = [];

  for (const truckRow of allTrucks) {
    const data = await getTruckDataForDiagnostic(truckRow.trucks.id);
    if (!data) continue;

    const { score, riskLevel } = calculateBasicHealthScore(data);

    summaries.push({
      truckId: truckRow.trucks.id,
      plate: truckRow.trucks.plate,
      model: truckRow.trucks.model,
      year: truckRow.trucks.year,
      totalKm: Number(truckRow.trucks.totalKm),
      mainDriverName: truckRow.drivers?.name || null,
      healthScore: score,
      riskLevel,
    });
  }

  return summaries;
}

export async function generateTruckDiagnostic(truckId: string): Promise<FleetHealthDiagnostic | null> {
  const data = await getTruckDataForDiagnostic(truckId);
  if (!data) return null;

  const { score, riskLevel } = calculateBasicHealthScore(data);

  // Calculate some statistics for the prompt
  const totalMaintenanceCost = data.maintenances.reduce((sum, m) => sum + m.value, 0);
  const totalTrips = data.trips.length;
  const totalKmTrips = data.trips.reduce((sum, t) => sum + t.kmTraveled, 0);
  const totalRevenue = data.trips.reduce((sum, t) => sum + t.valueReceived, 0);
  const totalFuelCost = data.fuelExpenses.reduce((sum, f) => sum + f.totalCost, 0);
  const totalLiters = data.fuelExpenses.reduce((sum, f) => sum + f.liters, 0);

  // Build the prompt for the AI
  const prompt = `Você é um especialista em gestão de frotas de caminhões. Analise os dados do caminhão abaixo e gere um diagnóstico completo.

DADOS DO CAMINHÃO:
- Número: ${data.truck.number}
- Placa: ${data.truck.plate}
- Modelo: ${data.truck.model}
- Ano: ${data.truck.year}
- KM Total: ${data.truck.totalKm.toLocaleString("pt-BR")} km
- Status: ${data.truck.status}
- Motorista Principal: ${data.truck.mainDriverName || "Não definido"}

HISTÓRICO DE MANUTENÇÕES (últimos 6 meses):
${data.maintenances.length > 0 
  ? data.maintenances.map(m => `- ${m.type}: R$ ${m.value.toFixed(2)} em ${m.date.toLocaleDateString("pt-BR")}${m.observations ? ` (${m.observations})` : ""}`).join("\n")
  : "Nenhuma manutenção registrada"}
Total gasto em manutenções: R$ ${totalMaintenanceCost.toFixed(2)}

VIAGENS (últimos 6 meses):
- Total de viagens: ${totalTrips}
- Total de KM rodados: ${totalKmTrips.toLocaleString("pt-BR")} km
- Faturamento total: R$ ${totalRevenue.toFixed(2)}
- Rotas realizadas: ${Array.from(new Set(data.trips.map(t => t.route))).join(", ") || "Nenhuma"}

COMBUSTÍVEL (últimos 6 meses):
- Gasto total: R$ ${totalFuelCost.toFixed(2)}
- Litros abastecidos: ${totalLiters.toFixed(0)}
- Média km/L: ${totalLiters > 0 ? (totalKmTrips / totalLiters).toFixed(2) : "N/A"}

Gere um diagnóstico em JSON com a seguinte estrutura:
{
  "resumo_geral": "texto resumindo o estado do caminhão em 2-3 frases simples",
  "nota_saude": ${score},
  "nivel_risco": "${riskLevel}",
  "pontos_fortes": ["lista de pontos positivos"],
  "pontos_criticos": ["lista de pontos que precisam atenção"],
  "trechos_problematicos": ["rotas ou trechos que podem estar causando desgaste"],
  "recomendacoes_rotas": ["sugestões para otimizar rotas"],
  "motoristas_principais": ["nomes dos motoristas que mais usam o caminhão"],
  "comparacao_motoristas": "texto comparando comportamento dos motoristas se houver dados",
  "recomendacoes_motoristas": ["sugestões de treinamento ou mudanças"],
  "custo_manutencao_estimado_proximos_6_meses": número estimado em reais,
  "proximo_km_manutencao": km sugerido para próxima manutenção preventiva,
  "proxima_data_manutencao": "data sugerida formato DD/MM/AAAA",
  "alertas": ["avisos importantes sobre riscos futuros"],
  "relatorio_completo": "texto detalhado com toda a análise em linguagem simples para donos de transportadoras"
}

Responda APENAS com o JSON, sem texto adicional.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Clean and parse JSON response - handle markdown code blocks
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7);
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    let aiResult: any;
    try {
      aiResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", cleanedContent);
      throw new Error("Invalid JSON response from AI");
    }

    return {
      summary: aiResult.resumo_geral || "",
      healthScore: score,
      riskLevel,
      strengths: aiResult.pontos_fortes || [],
      criticalPoints: aiResult.pontos_criticos || [],
      routes: {
        problematicRoutes: aiResult.trechos_problematicos || [],
        recommendations: aiResult.recomendacoes_rotas || [],
      },
      drivers: {
        mainDrivers: aiResult.motoristas_principais || [data.truck.mainDriverName].filter(Boolean),
        comparison: aiResult.comparacao_motoristas || "",
        recommendations: aiResult.recomendacoes_motoristas || [],
      },
      costPrediction: {
        estimatedMaintenanceCost: aiResult.custo_manutencao_estimado_proximos_6_meses || 0,
        nextMaintenanceKm: aiResult.proximo_km_manutencao || data.truck.totalKm + 10000,
        nextMaintenanceDate: aiResult.proxima_data_manutencao || "",
        warnings: aiResult.alertas || [],
      },
      fullReport: aiResult.relatorio_completo || "",
    };
  } catch (error) {
    console.error("Error generating AI diagnostic:", error);
    
    // Fallback to basic diagnostic without AI
    return {
      summary: `Caminhão ${data.truck.plate} (${data.truck.model} ${data.truck.year}) com ${data.truck.totalKm.toLocaleString("pt-BR")} km rodados. ${riskLevel === "alto" ? "Necessita atenção urgente." : riskLevel === "medio" ? "Requer monitoramento." : "Em bom estado."}`,
      healthScore: score,
      riskLevel,
      strengths: score >= 70 ? ["Bom histórico geral de manutenção"] : [],
      criticalPoints: score < 70 ? ["Revisar histórico de manutenções"] : [],
      routes: {
        problematicRoutes: [],
        recommendations: ["Monitorar consumo de combustível por rota"],
      },
      drivers: {
        mainDrivers: data.truck.mainDriverName ? [data.truck.mainDriverName] : [],
        comparison: "Dados insuficientes para comparação",
        recommendations: ["Registrar mais viagens para análise detalhada"],
      },
      costPrediction: {
        estimatedMaintenanceCost: totalMaintenanceCost * 0.8,
        nextMaintenanceKm: data.truck.totalKm + 10000,
        nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
        warnings: ["Análise baseada em dados limitados"],
      },
      fullReport: "Diagnóstico gerado com dados básicos. Para análise completa, registre mais viagens e manutenções.",
    };
  }
}
