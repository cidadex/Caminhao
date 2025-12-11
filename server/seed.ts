import { db } from "./db";
import { users, trucks, mileageRecords, maintenances, fuelExpenses, extraExpenses } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Iniciando seed do banco de dados...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const [admin] = await db.insert(users).values({
    username: "admin",
    password: adminPassword,
    name: "Administrador",
    role: "admin",
  }).onConflictDoNothing().returning();

  const userPassword = await bcrypt.hash("usuario123", 10);
  const [regularUser] = await db.insert(users).values({
    username: "operador",
    password: userPassword,
    name: "João Silva",
    role: "user",
  }).onConflictDoNothing().returning();

  const userId = admin?.id || (await db.select().from(users).limit(1))[0].id;

  console.log("Usuários criados!");

  const trucksData = [
    { number: "001", plate: "ABC-1234", model: "Volvo FH 540", year: 2022, status: "active" as const, totalKm: "45320" },
    { number: "002", plate: "DEF-5678", model: "Scania R450", year: 2021, status: "active" as const, totalKm: "62150" },
    { number: "003", plate: "GHI-9012", model: "Mercedes Actros", year: 2023, status: "active" as const, totalKm: "28400" },
    { number: "004", plate: "JKL-3456", model: "DAF XF 530", year: 2022, status: "maintenance" as const, totalKm: "51200" },
    { number: "005", plate: "MNO-7890", model: "Iveco S-Way", year: 2021, status: "active" as const, totalKm: "73800" },
    { number: "006", plate: "PQR-1357", model: "Volvo FH 460", year: 2020, status: "active" as const, totalKm: "98500" },
    { number: "007", plate: "STU-2468", model: "Scania S500", year: 2023, status: "active" as const, totalKm: "15600" },
    { number: "008", plate: "VWX-3579", model: "Mercedes Arocs", year: 2019, status: "inactive" as const, totalKm: "125000" },
  ];

  const insertedTrucks = await db.insert(trucks).values(trucksData).onConflictDoNothing().returning();
  const allTrucks = insertedTrucks.length > 0 ? insertedTrucks : await db.select().from(trucks);
  
  console.log(`${allTrucks.length} caminhões criados!`);

  const mileageData: any[] = [];
  const routes = [
    "São Paulo, SP → Rio de Janeiro, RJ",
    "Curitiba, PR → Florianópolis, SC",
    "Belo Horizonte, MG → Brasília, DF",
    "Porto Alegre, RS → São Paulo, SP",
    "Salvador, BA → Recife, PE",
    "Goiânia, GO → Campo Grande, MS",
    "Campinas, SP → Ribeirão Preto, SP",
    "Fortaleza, CE → Natal, RN",
    "São Paulo, SP → Curitiba, PR",
    "Rio de Janeiro, RJ → Vitória, ES",
  ];

  const today = new Date();
  
  for (const truck of allTrucks) {
    let currentKm = Math.floor(Math.random() * 50000) + 100000;
    
    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const tripsThisMonth = Math.floor(Math.random() * 4) + 2;
      
      for (let trip = 0; trip < tripsThisMonth; trip++) {
        const tripDate = new Date(today);
        tripDate.setMonth(tripDate.getMonth() - monthsAgo);
        tripDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const route = routes[Math.floor(Math.random() * routes.length)];
        const kmTraveled = Math.floor(Math.random() * 800) + 400;
        const valuePerKm = (Math.random() * 2 + 3).toFixed(4);
        const valueReceived = (kmTraveled * parseFloat(valuePerKm)).toFixed(2);
        
        mileageData.push({
          truckId: truck.id,
          userId: userId,
          date: tripDate,
          route: route,
          kmInitial: String(currentKm),
          kmFinal: String(currentKm + kmTraveled),
          kmTraveled: String(kmTraveled),
          valueReceived: valueReceived,
          valuePerKm: valuePerKm,
        });
        
        currentKm += kmTraveled;
      }
    }
  }

  await db.insert(mileageRecords).values(mileageData).onConflictDoNothing();
  console.log(`${mileageData.length} registros de quilometragem criados!`);

  const maintenanceTypes = [
    { type: "Troca de óleo", minValue: 800, maxValue: 1500 },
    { type: "Troca de pneus", minValue: 3000, maxValue: 8000 },
    { type: "Revisão de freios", minValue: 1500, maxValue: 4000 },
    { type: "Manutenção preventiva", minValue: 2000, maxValue: 5000 },
    { type: "Troca de filtros", minValue: 500, maxValue: 1200 },
    { type: "Alinhamento e balanceamento", minValue: 300, maxValue: 600 },
    { type: "Revisão elétrica", minValue: 800, maxValue: 2500 },
    { type: "Troca de embreagem", minValue: 4000, maxValue: 8000 },
  ];

  const maintenanceData: any[] = [];

  for (const truck of allTrucks) {
    const maintenanceCount = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < maintenanceCount; i++) {
      const maintType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
      const maintDate = new Date(today);
      maintDate.setMonth(maintDate.getMonth() - Math.floor(Math.random() * 6));
      maintDate.setDate(Math.floor(Math.random() * 28) + 1);
      
      const value = Math.floor(Math.random() * (maintType.maxValue - maintType.minValue)) + maintType.minValue;
      
      maintenanceData.push({
        truckId: truck.id,
        userId: userId,
        date: maintDate,
        type: maintType.type,
        observations: `${maintType.type} - Caminhão ${truck.number}`,
        value: String(value),
        receiptUrl: null,
      });
    }
  }

  await db.insert(maintenances).values(maintenanceData).onConflictDoNothing();
  console.log(`${maintenanceData.length} registros de manutenção criados!`);

  const fuelData: any[] = [];
  const vendors = [
    "Posto Ipiranga",
    "Posto BR",
    "Posto Shell",
    "Posto Texaco",
    "Posto Ale",
    "Posto Petrobras",
  ];
  const paymentMethods = ["Dinheiro", "Cartão Frota", "PIX", "Cartão Crédito"];

  for (const truck of allTrucks) {
    let currentOdometer = Math.floor(Math.random() * 50000) + 100000;
    
    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const fillingsThisMonth = Math.floor(Math.random() * 6) + 4;
      
      for (let fill = 0; fill < fillingsThisMonth; fill++) {
        const fillDate = new Date(today);
        fillDate.setMonth(fillDate.getMonth() - monthsAgo);
        fillDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const liters = Math.floor(Math.random() * 300) + 200;
        const pricePerLiter = (Math.random() * 0.5 + 5.5).toFixed(3);
        const totalCost = (liters * parseFloat(pricePerLiter)).toFixed(2);
        const kmDriven = Math.floor(Math.random() * 500) + 300;
        
        fuelData.push({
          truckId: truck.id,
          userId: userId,
          date: fillDate,
          liters: String(liters),
          pricePerLiter: pricePerLiter,
          totalCost: totalCost,
          odometer: String(currentOdometer),
          vendor: vendors[Math.floor(Math.random() * vendors.length)],
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          receiptUrl: null,
        });
        
        currentOdometer += kmDriven;
      }
    }
  }

  await db.insert(fuelExpenses).values(fuelData).onConflictDoNothing();
  console.log(`${fuelData.length} registros de combustível criados!`);

  const extraCategories = [
    { category: "Pedágio", minValue: 50, maxValue: 500 },
    { category: "Estacionamento", minValue: 20, maxValue: 100 },
    { category: "Alimentação", minValue: 30, maxValue: 150 },
    { category: "Hospedagem", minValue: 100, maxValue: 300 },
    { category: "Lavagem", minValue: 50, maxValue: 200 },
    { category: "Documentação", minValue: 100, maxValue: 500 },
    { category: "Multa", minValue: 150, maxValue: 2000 },
    { category: "Seguro", minValue: 500, maxValue: 3000 },
    { category: "Outros", minValue: 50, maxValue: 500 },
  ];

  const extraData: any[] = [];

  for (const truck of allTrucks) {
    const extraCount = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < extraCount; i++) {
      const cat = extraCategories[Math.floor(Math.random() * extraCategories.length)];
      const expDate = new Date(today);
      expDate.setMonth(expDate.getMonth() - Math.floor(Math.random() * 6));
      expDate.setDate(Math.floor(Math.random() * 28) + 1);
      
      const value = Math.floor(Math.random() * (cat.maxValue - cat.minValue)) + cat.minValue;
      
      extraData.push({
        truckId: truck.id,
        userId: userId,
        date: expDate,
        category: cat.category,
        description: `${cat.category} - Caminhão ${truck.number}`,
        totalCost: String(value),
        notes: null,
        receiptUrl: null,
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    const cat = extraCategories[Math.floor(Math.random() * extraCategories.length)];
    const expDate = new Date(today);
    expDate.setMonth(expDate.getMonth() - Math.floor(Math.random() * 6));
    expDate.setDate(Math.floor(Math.random() * 28) + 1);
    
    const value = Math.floor(Math.random() * (cat.maxValue - cat.minValue)) + cat.minValue;
    
    extraData.push({
      truckId: null,
      userId: userId,
      date: expDate,
      category: cat.category,
      description: `${cat.category} - Gasto Geral da Empresa`,
      totalCost: String(value),
      notes: "Despesa administrativa geral",
      receiptUrl: null,
    });
  }

  await db.insert(extraExpenses).values(extraData).onConflictDoNothing();
  console.log(`${extraData.length} registros de gastos extras criados!`);

  console.log("\nSeed concluído com sucesso!");
  console.log("\nCredenciais de acesso:");
  console.log("  Admin: admin / admin123");
  console.log("  Usuário: operador / usuario123");
  
  process.exit(0);
}

seed().catch((error) => {
  console.error("Erro no seed:", error);
  process.exit(1);
});
