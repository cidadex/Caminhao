import {
  users,
  trucks,
  mileageRecords,
  maintenances,
  type User,
  type InsertUser,
  type Truck,
  type InsertTruck,
  type MileageRecord,
  type InsertMileageRecord,
  type Maintenance,
  type InsertMaintenance,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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

  getDashboardData(): Promise<{
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalKmTraveled: number;
    totalMaintenanceCost: number;
    truckCount: number;
    monthlyData: Array<{ month: string; revenue: number; maintenance: number }>;
    truckComparison: Array<{ truck: string; grossRevenue: number; netRevenue: number; maintenanceCost: number }>;
    ranking: Array<{ id: string; number: string; netRevenue: number; kmTraveled: number }>;
  }>;

  getReportData(startDate?: Date, endDate?: Date, truckId?: string): Promise<{
    data: Array<{
      truck: { id: string; number: string; plate: string; model: string };
      grossRevenue: number;
      maintenanceCost: number;
      netRevenue: number;
      totalKm: number;
      avgValuePerKm: number;
      tripCount: number;
      maintenanceCount: number;
    }>;
    totals: {
      grossRevenue: number;
      maintenanceCost: number;
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

  async getDashboardData() {
    const allTrucks = await this.getTrucks();
    const allMileage = await db.select().from(mileageRecords);
    const allMaintenances = await db.select().from(maintenances);

    const totalGrossRevenue = allMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
    const totalMaintenanceCost = allMaintenances.reduce((sum, m) => sum + Number(m.value), 0);
    const totalNetRevenue = totalGrossRevenue - totalMaintenanceCost;
    const totalKmTraveled = allMileage.reduce((sum, r) => sum + Number(r.kmTraveled), 0);

    const monthlyMap = new Map<string, { revenue: number; maintenance: number }>();
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    allMileage.forEach((r) => {
      const date = new Date(r.date);
      const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, maintenance: 0 };
      current.revenue += Number(r.valueReceived);
      monthlyMap.set(monthKey, current);
    });

    allMaintenances.forEach((m) => {
      const date = new Date(m.date);
      const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, maintenance: 0 };
      current.maintenance += Number(m.value);
      monthlyMap.set(monthKey, current);
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);

    const truckComparison = allTrucks.map((truck) => {
      const truckMileage = allMileage.filter((r) => r.truckId === truck.id);
      const truckMaintenance = allMaintenances.filter((m) => m.truckId === truck.id);
      const grossRevenue = truckMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
      const maintenanceCost = truckMaintenance.reduce((sum, m) => sum + Number(m.value), 0);

      return {
        truck: `Caminhão ${truck.number}`,
        grossRevenue,
        netRevenue: grossRevenue - maintenanceCost,
        maintenanceCost,
      };
    });

    const ranking = allTrucks
      .map((truck) => {
        const truckMileage = allMileage.filter((r) => r.truckId === truck.id);
        const truckMaintenance = allMaintenances.filter((m) => m.truckId === truck.id);
        const grossRevenue = truckMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
        const maintenanceCost = truckMaintenance.reduce((sum, m) => sum + Number(m.value), 0);
        const kmTraveled = truckMileage.reduce((sum, r) => sum + Number(r.kmTraveled), 0);

        return {
          id: truck.id,
          number: truck.number,
          netRevenue: grossRevenue - maintenanceCost,
          kmTraveled,
        };
      })
      .sort((a, b) => b.netRevenue - a.netRevenue);

    return {
      totalGrossRevenue,
      totalNetRevenue,
      totalKmTraveled,
      totalMaintenanceCost,
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

    let mileageQuery = db.select().from(mileageRecords);
    let maintenanceQuery = db.select().from(maintenances);

    const conditions: any[] = [];
    if (startDate) {
      conditions.push(gte(mileageRecords.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(mileageRecords.date, endDate));
    }
    if (truckId) {
      conditions.push(eq(mileageRecords.truckId, truckId));
    }

    const maintConditions: any[] = [];
    if (startDate) {
      maintConditions.push(gte(maintenances.date, startDate));
    }
    if (endDate) {
      maintConditions.push(lte(maintenances.date, endDate));
    }
    if (truckId) {
      maintConditions.push(eq(maintenances.truckId, truckId));
    }

    const allMileage = conditions.length > 0
      ? await db.select().from(mileageRecords).where(and(...conditions))
      : await db.select().from(mileageRecords);

    const allMaintenances = maintConditions.length > 0
      ? await db.select().from(maintenances).where(and(...maintConditions))
      : await db.select().from(maintenances);

    const data = allTrucks.map((truck) => {
      const truckMileage = allMileage.filter((r) => r.truckId === truck.id);
      const truckMaintenance = allMaintenances.filter((m) => m.truckId === truck.id);
      const grossRevenue = truckMileage.reduce((sum, r) => sum + Number(r.valueReceived), 0);
      const maintenanceCost = truckMaintenance.reduce((sum, m) => sum + Number(m.value), 0);
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
        netRevenue: grossRevenue - maintenanceCost,
        totalKm,
        avgValuePerKm: totalKm > 0 ? grossRevenue / totalKm : 0,
        tripCount: truckMileage.length,
        maintenanceCount: truckMaintenance.length,
      };
    });

    const totals = {
      grossRevenue: data.reduce((sum, d) => sum + d.grossRevenue, 0),
      maintenanceCost: data.reduce((sum, d) => sum + d.maintenanceCost, 0),
      netRevenue: data.reduce((sum, d) => sum + d.netRevenue, 0),
      totalKm: data.reduce((sum, d) => sum + d.totalKm, 0),
    };

    return { data, totals };
  }
}

export const storage = new DatabaseStorage();
