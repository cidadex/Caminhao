import {
  users,
  trucks,
  mileageRecords,
  maintenances,
  fuelExpenses,
  extraExpenses,
  type User,
  type InsertUser,
  type Truck,
  type InsertTruck,
  type MileageRecord,
  type InsertMileageRecord,
  type Maintenance,
  type InsertMaintenance,
  type FuelExpense,
  type InsertFuelExpense,
  type ExtraExpense,
  type InsertExtraExpense,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTrucks(): Promise<Truck[]>;
  getTruck(id: string): Promise<Truck | undefined>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  updateTruck(id: string, truck: Partial<InsertTruck>): Promise<Truck | undefined>;
  deleteTruck(id: string): Promise<boolean>;

  getMileageRecords(): Promise<(MileageRecord & { truck?: Truck })[]>;
  getMileageRecordsByTruck(truckId: string): Promise<MileageRecord[]>;
  createMileageRecord(record: InsertMileageRecord & { kmTraveled: string; valuePerKm: string }): Promise<MileageRecord>;

  getMaintenances(): Promise<(Maintenance & { truck?: Truck })[]>;
  getMaintenancesByTruck(truckId: string): Promise<Maintenance[]>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;

  getFuelExpenses(): Promise<(FuelExpense & { truck?: Truck })[]>;
  getFuelExpensesByTruck(truckId: string): Promise<FuelExpense[]>;
  createFuelExpense(expense: InsertFuelExpense): Promise<FuelExpense>;

  getExtraExpenses(): Promise<(ExtraExpense & { truck?: Truck })[]>;
  getExtraExpensesByTruck(truckId: string): Promise<ExtraExpense[]>;
  createExtraExpense(expense: InsertExtraExpense): Promise<ExtraExpense>;

  getDashboardData(): Promise<{
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalKmTraveled: number;
    totalMaintenanceCost: number;
    totalFuelCost: number;
    totalExtraCost: number;
    totalOperationalCost: number;
    truckCount: number;
    monthlyData: Array<{ month: string; revenue: number; maintenance: number; fuel: number; extra: number }>;
    truckComparison: Array<{ truck: string; grossRevenue: number; netRevenue: number; maintenanceCost: number; fuelCost: number; extraCost: number }>;
    ranking: Array<{ id: string; number: string; netRevenue: number; kmTraveled: number }>;
  }>;

  getReportData(startDate?: Date, endDate?: Date, truckId?: string): Promise<{
    data: Array<{
      truck: { id: string; number: string; plate: string; model: string };
      grossRevenue: number;
      maintenanceCost: number;
      fuelCost: number;
      extraCost: number;
      totalCost: number;
      netRevenue: number;
      totalKm: number;
      avgValuePerKm: number;
      tripCount: number;
      maintenanceCount: number;
      fuelCount: number;
      extraCount: number;
    }>;
    totals: {
      grossRevenue: number;
      maintenanceCost: number;
      fuelCost: number;
      extraCost: number;
      totalCost: number;
      netRevenue: number;
      totalKm: number;
    };
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTrucks(): Promise<Truck[]> {
    return db.select().from(trucks).orderBy(trucks.number);
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck || undefined;
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const [newTruck] = await db.insert(trucks).values(truck).returning();
    return newTruck;
  }

  async updateTruck(id: string, truckData: Partial<InsertTruck>): Promise<Truck | undefined> {
    const [updated] = await db
      .update(trucks)
      .set(truckData)
      .where(eq(trucks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTruck(id: string): Promise<boolean> {
    const result = await db.delete(trucks).where(eq(trucks.id, id)).returning();
    return result.length > 0;
  }

  async getMileageRecords(): Promise<(MileageRecord & { truck?: Truck })[]> {
    const records = await db
      .select()
      .from(mileageRecords)
      .leftJoin(trucks, eq(mileageRecords.truckId, trucks.id))
      .orderBy(desc(mileageRecords.date));

    return records.map((r) => ({
      ...r.mileage_records,
      truck: r.trucks || undefined,
    }));
  }

  async getMileageRecordsByTruck(truckId: string): Promise<MileageRecord[]> {
    return db
      .select()
      .from(mileageRecords)
      .where(eq(mileageRecords.truckId, truckId))
      .orderBy(desc(mileageRecords.date));
  }

  async createMileageRecord(
    record: InsertMileageRecord & { kmTraveled: string; valuePerKm: string }
  ): Promise<MileageRecord> {
    const [newRecord] = await db.insert(mileageRecords).values(record).returning();
    
    await db
      .update(trucks)
      .set({ totalKm: sql`${trucks.totalKm}::numeric + ${record.kmTraveled}::numeric` })
      .where(eq(trucks.id, record.truckId));

    return newRecord;
  }

  async getMaintenances(): Promise<(Maintenance & { truck?: Truck })[]> {
    const records = await db
      .select()
      .from(maintenances)
      .leftJoin(trucks, eq(maintenances.truckId, trucks.id))
      .orderBy(desc(maintenances.date));

    return records.map((r) => ({
      ...r.maintenances,
      truck: r.trucks || undefined,
    }));
  }

  async getMaintenancesByTruck(truckId: string): Promise<Maintenance[]> {
    return db
      .select()
      .from(maintenances)
      .where(eq(maintenances.truckId, truckId))
      .orderBy(desc(maintenances.date));
  }

  async createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance> {
    const [newMaintenance] = await db.insert(maintenances).values(maintenance).returning();
    return newMaintenance;
  }

  async getFuelExpenses(): Promise<(FuelExpense & { truck?: Truck })[]> {
    const records = await db
      .select()
      .from(fuelExpenses)
      .leftJoin(trucks, eq(fuelExpenses.truckId, trucks.id))
      .orderBy(desc(fuelExpenses.date));

    return records.map((r) => ({
      ...r.fuel_expenses,
      truck: r.trucks || undefined,
    }));
  }

  async getFuelExpensesByTruck(truckId: string): Promise<FuelExpense[]> {
    return db
      .select()
      .from(fuelExpenses)
      .where(eq(fuelExpenses.truckId, truckId))
      .orderBy(desc(fuelExpenses.date));
  }

  async createFuelExpense(expense: InsertFuelExpense): Promise<FuelExpense> {
    const [newExpense] = await db.insert(fuelExpenses).values(expense).returning();
    return newExpense;
  }

  async getExtraExpenses(): Promise<(ExtraExpense & { truck?: Truck })[]> {
    const records = await db
      .select()
      .from(extraExpenses)
      .leftJoin(trucks, eq(extraExpenses.truckId, trucks.id))
      .orderBy(desc(extraExpenses.date));

    return records.map((r) => ({
      ...r.extra_expenses,
      truck: r.trucks || undefined,
    }));
  }

  async getExtraExpensesByTruck(truckId: string): Promise<ExtraExpense[]> {
    return db
      .select()
      .from(extraExpenses)
      .where(eq(extraExpenses.truckId, truckId))
      .orderBy(desc(extraExpenses.date));
  }

  async createExtraExpense(expense: InsertExtraExpense): Promise<ExtraExpense> {
    const [newExpense] = await db.insert(extraExpenses).values(expense).returning();
    return newExpense;
  }

  async getDashboardData() {
    const allTrucks = await this.getTrucks();
    const allMileage = await db.select().from(mileageRecords);
    const allMaintenances = await db.select().from(maintenances);
    const allFuel = await db.select().from(fuelExpenses);
    const allExtra = await db.select().from(extraExpenses);

    const totalGrossRevenue = allMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
    const totalMaintenanceCost = allMaintenances.reduce((sum, m) => sum + Number(m.value), 0);
    const totalFuelCost = allFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
    const totalExtraCost = allExtra.reduce((sum, e) => sum + Number(e.totalCost), 0);
    const totalOperationalCost = totalMaintenanceCost + totalFuelCost + totalExtraCost;
    const totalNetRevenue = totalGrossRevenue - totalOperationalCost;
    const totalKmTraveled = allMileage.reduce((sum, r) => sum + Number(r.kmTraveled), 0);

    const monthlyMap = new Map<string, { revenue: number; maintenance: number; fuel: number; extra: number }>();
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    allMileage.forEach((r) => {
      const date = new Date(r.date);
      const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, maintenance: 0, fuel: 0, extra: 0 };
      current.revenue += Number(r.valueReceived);
      monthlyMap.set(monthKey, current);
    });

    allMaintenances.forEach((m) => {
      const date = new Date(m.date);
      const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, maintenance: 0, fuel: 0, extra: 0 };
      current.maintenance += Number(m.value);
      monthlyMap.set(monthKey, current);
    });

    allFuel.forEach((f) => {
      const date = new Date(f.date);
      const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, maintenance: 0, fuel: 0, extra: 0 };
      current.fuel += Number(f.totalCost);
      monthlyMap.set(monthKey, current);
    });

    allExtra.forEach((e) => {
      const date = new Date(e.date);
      const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, maintenance: 0, fuel: 0, extra: 0 };
      current.extra += Number(e.totalCost);
      monthlyMap.set(monthKey, current);
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);

    const truckComparison = allTrucks.map((truck) => {
      const truckMileage = allMileage.filter((r) => r.truckId === truck.id);
      const truckMaintenance = allMaintenances.filter((m) => m.truckId === truck.id);
      const truckFuel = allFuel.filter((f) => f.truckId === truck.id);
      const truckExtra = allExtra.filter((e) => e.truckId === truck.id);
      const grossRevenue = truckMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
      const maintenanceCost = truckMaintenance.reduce((sum, m) => sum + Number(m.value), 0);
      const fuelCost = truckFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
      const extraCost = truckExtra.reduce((sum, e) => sum + Number(e.totalCost), 0);

      return {
        truck: `Caminhão ${truck.number}`,
        grossRevenue,
        netRevenue: grossRevenue - maintenanceCost - fuelCost - extraCost,
        maintenanceCost,
        fuelCost,
        extraCost,
      };
    });

    const ranking = allTrucks
      .map((truck) => {
        const truckMileage = allMileage.filter((r) => r.truckId === truck.id);
        const truckMaintenance = allMaintenances.filter((m) => m.truckId === truck.id);
        const truckFuel = allFuel.filter((f) => f.truckId === truck.id);
        const truckExtra = allExtra.filter((e) => e.truckId === truck.id);
        const grossRevenue = truckMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
        const maintenanceCost = truckMaintenance.reduce((sum, m) => sum + Number(m.value), 0);
        const fuelCost = truckFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
        const extraCost = truckExtra.reduce((sum, e) => sum + Number(e.totalCost), 0);
        const kmTraveled = truckMileage.reduce((sum, r) => sum + Number(r.kmTraveled), 0);

        return {
          id: truck.id,
          number: truck.number,
          netRevenue: grossRevenue - maintenanceCost - fuelCost - extraCost,
          kmTraveled,
        };
      })
      .sort((a, b) => b.netRevenue - a.netRevenue);

    return {
      totalGrossRevenue,
      totalNetRevenue,
      totalKmTraveled,
      totalMaintenanceCost,
      totalFuelCost,
      totalExtraCost,
      totalOperationalCost,
      truckCount: allTrucks.length,
      monthlyData,
      truckComparison,
      ranking,
    };
  }

  async getReportData(startDate?: Date, endDate?: Date, truckId?: string) {
    const allTrucks = truckId
      ? await db.select().from(trucks).where(eq(trucks.id, truckId))
      : await this.getTrucks();

    const conditions: any[] = [];
    if (startDate) conditions.push(gte(mileageRecords.date, startDate));
    if (endDate) conditions.push(lte(mileageRecords.date, endDate));
    if (truckId) conditions.push(eq(mileageRecords.truckId, truckId));

    const maintConditions: any[] = [];
    if (startDate) maintConditions.push(gte(maintenances.date, startDate));
    if (endDate) maintConditions.push(lte(maintenances.date, endDate));
    if (truckId) maintConditions.push(eq(maintenances.truckId, truckId));

    const fuelConditions: any[] = [];
    if (startDate) fuelConditions.push(gte(fuelExpenses.date, startDate));
    if (endDate) fuelConditions.push(lte(fuelExpenses.date, endDate));
    if (truckId) fuelConditions.push(eq(fuelExpenses.truckId, truckId));

    const extraConditions: any[] = [];
    if (startDate) extraConditions.push(gte(extraExpenses.date, startDate));
    if (endDate) extraConditions.push(lte(extraExpenses.date, endDate));
    if (truckId) extraConditions.push(eq(extraExpenses.truckId, truckId));

    const allMileage = conditions.length > 0
      ? await db.select().from(mileageRecords).where(and(...conditions))
      : await db.select().from(mileageRecords);

    const allMaintenances = maintConditions.length > 0
      ? await db.select().from(maintenances).where(and(...maintConditions))
      : await db.select().from(maintenances);

    const allFuel = fuelConditions.length > 0
      ? await db.select().from(fuelExpenses).where(and(...fuelConditions))
      : await db.select().from(fuelExpenses);

    const allExtra = extraConditions.length > 0
      ? await db.select().from(extraExpenses).where(and(...extraConditions))
      : await db.select().from(extraExpenses);

    const data = allTrucks.map((truck) => {
      const truckMileage = allMileage.filter((r) => r.truckId === truck.id);
      const truckMaintenance = allMaintenances.filter((m) => m.truckId === truck.id);
      const truckFuel = allFuel.filter((f) => f.truckId === truck.id);
      const truckExtra = allExtra.filter((e) => e.truckId === truck.id);
      
      const grossRevenue = truckMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
      const maintenanceCost = truckMaintenance.reduce((sum, m) => sum + Number(m.value), 0);
      const fuelCost = truckFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
      const extraCost = truckExtra.reduce((sum, e) => sum + Number(e.totalCost), 0);
      const totalCost = maintenanceCost + fuelCost + extraCost;
      const totalKm = truckMileage.reduce((sum, r) => sum + Number(r.kmTraveled), 0);

      return {
        truck: {
          id: truck.id,
          number: truck.number,
          plate: truck.plate,
          model: truck.model,
        },
        grossRevenue,
        maintenanceCost,
        fuelCost,
        extraCost,
        totalCost,
        netRevenue: grossRevenue - totalCost,
        totalKm,
        avgValuePerKm: totalKm > 0 ? grossRevenue / totalKm : 0,
        tripCount: truckMileage.length,
        maintenanceCount: truckMaintenance.length,
        fuelCount: truckFuel.length,
        extraCount: truckExtra.length,
      };
    });

    const totals = {
      grossRevenue: data.reduce((sum, d) => sum + d.grossRevenue, 0),
      maintenanceCost: data.reduce((sum, d) => sum + d.maintenanceCost, 0),
      fuelCost: data.reduce((sum, d) => sum + d.fuelCost, 0),
      extraCost: data.reduce((sum, d) => sum + d.extraCost, 0),
      totalCost: data.reduce((sum, d) => sum + d.totalCost, 0),
      netRevenue: data.reduce((sum, d) => sum + d.netRevenue, 0),
      totalKm: data.reduce((sum, d) => sum + d.totalKm, 0),
    };

    return { data, totals };
  }
}

export const storage = new DatabaseStorage();
