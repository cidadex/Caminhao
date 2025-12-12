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
  truckId: string;
  truckLabel: string;
  healthScore: number;
  riskLevel: "baixo" | "medio" | "alto";
  summary: {
    overview: string;
  };
  sections: {
    vehicleHealth: {
      title: string;
      text: string;
      mainIssues: string[];
      positivePoints: string[];
    };
    routes: {
      title: string;
      text: string;
      riskyRoutes: string[];
      recommendations: string[];
    };
    drivers: {
      title: string;
      text: string;
      mainDrivers: Array<{
        nome: string;
        resumo: string;
      }>;
      recommendations: string[];
    };
    costForecast: {
      title: string;
      text: string;
      estimatedMonthlyMaintenanceCost: number;
      nextMaintenanceSuggestion: string;
      alerts: string[];
    };
  };
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
  const avgKmPerLiter = totalLiters > 0 ? totalKmTrips / totalLiters : 0;

  // Build input data for AI
  const inputData = {
    truck: {
      id: data.truck.id,
      placa: data.truck.plate,
      modelo: data.truck.model,
      ano: data.truck.year,
      km_atual: data.truck.totalKm,
      motorista_principal: data.truck.mainDriverName ? {
        id: "m1",
        nome: data.truck.mainDriverName
      } : null
    },
    maintenance_history: data.maintenances.map(m => ({
      data: m.date.toISOString().split("T")[0],
      tipo: m.type,
      km_no_momento: data.truck.totalKm,
      valor: m.value,
      observacoes: m.observations || ""
    })),
    trip_history: data.trips.map(t => ({
      data_saida: t.date.toISOString().split("T")[0],
      data_chegada: t.date.toISOString().split("T")[0],
      origem: t.route.split(" - ")[0] || t.route,
      destino: t.route.split(" - ")[1] || t.route,
      distancia_km: t.kmTraveled,
      valor_recebido: t.valueReceived,
      incidentes: "nenhum"
    })),
    driver_stats: {
      motoristas: data.truck.mainDriverName ? [{
        id: "m1",
        nome: data.truck.mainDriverName,
        km_rodados: totalKmTrips,
        consumo_medio_litro_por_km: totalLiters > 0 ? totalLiters / totalKmTrips : 0,
        qtd_incidentes: 0,
        tipos_incidentes: []
      }] : []
    },
    period_summary: {
      periodo_descricao: "ultimos 6 meses",
      km_total_no_periodo: totalKmTrips,
      custo_total_manutencao_no_periodo: totalMaintenanceCost,
      qtd_manutencoes: data.maintenances.length,
      qtd_viagens: totalTrips,
      qtd_incidentes: 0
    }
  };

  // Build the prompt for the AI
  const prompt = `Você é um analista especialista em gestão de frota de caminhões. 
Sua função é receber dados consolidados de UM caminhão e produzir um DIAGNÓSTICO COMPLETO, estruturado e objetivo, em formato JSON, pronto para ser exibido em tela e usado em gráficos.

Você SEMPRE deve:
- Analisar manutenção, trechos (rotas) e motoristas.
- Calcular uma NOTA DE SAÚDE do caminhão entre 0 e 100 (health_score).
- Classificar o nível de risco em "baixo", "medio" ou "alto" (risk_level).
- Gerar textos explicativos para o dono de uma pequena transportadora, em linguagem simples.
- NUNCA mudar a estrutura do JSON pedida.

Com base nos dados recebidos em ${JSON.stringify(inputData)}, você deve:

1. Avaliar a frequência e o tipo das manutenções.
2. Avaliar o uso do caminhão (km rodados, tipo de rota, incidência de problemas).
3. Comparar sinais de desgaste elevado, manutenção atrasada, muitos incidentes, consumo alto de combustível, etc.
4. Avaliar o comportamento dos motoristas que dirigem esse caminhão.
5. Estimar, de forma aproximada, custos futuros de manutenção se o padrão atual continuar.

### SAÍDA

Responda SEMPRE em JSON seguindo exatamente esta estrutura:

{
  "truck_id": "string",
  "truck_label": "string", 
  "health_score": 0-100,
  "risk_level": "baixo" | "medio" | "alto",
  "summary": {
    "overview": "texto curto explicando o estado geral do caminhão em 2 a 4 frases."
  },
  "sections": {
    "vehicle_health": {
      "title": "Saúde do caminhão",
      "text": "texto explicando situação de manutenção, problemas recorrentes, se está em dia ou não, etc.",
      "main_issues": ["lista de problemas principais em formato de frase curta"],
      "positive_points": ["lista de pontos positivos em formato de frase curta"]
    },
    "routes": {
      "title": "Trechos e rotas",
      "text": "texto analisando os trechos, desgaste por rota, incidentes em determinadas rotas, etc.",
      "risky_routes": ["se houver, listar rotas consideradas mais críticas"],
      "recommendations": ["recomendações relacionadas a rotas, velocidade, planejamento de viagens"]
    },
    "drivers": {
      "title": "Motoristas",
      "text": "texto analisando o impacto dos motoristas no caminhão (consumo, incidentes etc.).",
      "main_drivers": [
        {
          "nome": "string",
          "resumo": "resumo do comportamento desse motorista com esse caminhão"
        }
      ],
      "recommendations": ["recomendações de treinamento, mudança de escala, cuidados específicos"]
    },
    "cost_forecast": {
      "title": "Previsão de custos e manutenção",
      "text": "texto explicando a previsão aproximada de custos se o padrão atual continuar.",
      "estimated_monthly_maintenance_cost": numero_aproximado_sem_simbolo,
      "next_maintenance_suggestion": "frase com sugestão de quando fazer a próxima manutenção",
      "alerts": ["alertas importantes sobre risco de quebra, necessidade de manutenção urgente, etc."]
    }
  }
}

Regras IMPORTANTES:
- "health_score" deve ser um número de 0 a 100 (pode ser inteiro).
- "risk_level" deve ser coerente com a nota: 0-40: "alto", 41-70: "medio", 71-100: "baixo"
- Use linguagem simples, direta, sem termos técnicos demais.
- Não inclua comentários fora do JSON.
- Não invente dados: use apenas padrões coerentes com os números fornecidos.`;

  try {
    console.log("Calling OpenAI API for truck diagnostic...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    console.log("OpenAI response received:", JSON.stringify(response, null, 2));
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content in AI response. Full response:", response);
      throw new Error("No response from AI");
    }
    
    console.log("AI content:", content);

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
      truckId: aiResult.truck_id || data.truck.id,
      truckLabel: aiResult.truck_label || `${data.truck.plate} - ${data.truck.model}`,
      healthScore: aiResult.health_score || score,
      riskLevel: aiResult.risk_level || riskLevel,
      summary: {
        overview: aiResult.summary?.overview || ""
      },
      sections: {
        vehicleHealth: {
          title: aiResult.sections?.vehicle_health?.title || "Saúde do Caminhão",
          text: aiResult.sections?.vehicle_health?.text || "",
          mainIssues: aiResult.sections?.vehicle_health?.main_issues || [],
          positivePoints: aiResult.sections?.vehicle_health?.positive_points || []
        },
        routes: {
          title: aiResult.sections?.routes?.title || "Trechos e Rotas",
          text: aiResult.sections?.routes?.text || "",
          riskyRoutes: aiResult.sections?.routes?.risky_routes || [],
          recommendations: aiResult.sections?.routes?.recommendations || []
        },
        drivers: {
          title: aiResult.sections?.drivers?.title || "Motoristas",
          text: aiResult.sections?.drivers?.text || "",
          mainDrivers: aiResult.sections?.drivers?.main_drivers || [],
          recommendations: aiResult.sections?.drivers?.recommendations || []
        },
        costForecast: {
          title: aiResult.sections?.cost_forecast?.title || "Previsão de Custos",
          text: aiResult.sections?.cost_forecast?.text || "",
          estimatedMonthlyMaintenanceCost: Number(aiResult.sections?.cost_forecast?.estimated_monthly_maintenance_cost) || 0,
          nextMaintenanceSuggestion: aiResult.sections?.cost_forecast?.next_maintenance_suggestion || "",
          alerts: aiResult.sections?.cost_forecast?.alerts || []
        }
      }
    };
  } catch (error) {
    console.error("Error generating AI diagnostic:", error);
    
    // Fallback to basic diagnostic without AI
    return {
      truckId: data.truck.id,
      truckLabel: `${data.truck.plate} - ${data.truck.model}`,
      healthScore: score,
      riskLevel,
      summary: {
        overview: `Caminhão ${data.truck.plate} (${data.truck.model} ${data.truck.year}) com ${data.truck.totalKm.toLocaleString("pt-BR")} km rodados. ${riskLevel === "alto" ? "Necessita atenção urgente." : riskLevel === "medio" ? "Requer monitoramento." : "Em bom estado."}`
      },
      sections: {
        vehicleHealth: {
          title: "Saúde do Caminhão",
          text: "Diagnóstico gerado com dados básicos. Para análise completa, registre mais viagens e manutenções.",
          mainIssues: score < 70 ? ["Revisar histórico de manutenções"] : [],
          positivePoints: score >= 70 ? ["Bom histórico geral de manutenção"] : []
        },
        routes: {
          title: "Trechos e Rotas",
          text: "Dados insuficientes para análise detalhada de rotas.",
          riskyRoutes: [],
          recommendations: ["Monitorar consumo de combustível por rota"]
        },
        drivers: {
          title: "Motoristas",
          text: "Dados insuficientes para comparação de motoristas.",
          mainDrivers: data.truck.mainDriverName ? [{ nome: data.truck.mainDriverName, resumo: "Motorista principal" }] : [],
          recommendations: ["Registrar mais viagens para análise detalhada"]
        },
        costForecast: {
          title: "Previsão de Custos",
          text: "Estimativa baseada em dados limitados.",
          estimatedMonthlyMaintenanceCost: totalMaintenanceCost / 6,
          nextMaintenanceSuggestion: `Próxima manutenção sugerida em ${(data.truck.totalKm + 10000).toLocaleString("pt-BR")} km`,
          alerts: ["Análise baseada em dados limitados"]
        }
      }
    };
  }
}
