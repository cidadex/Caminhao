import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table with role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
});

// Drivers table (Motoristas)
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  birthDate: timestamp("birth_date"),
  cpf: text("cpf").unique(),
  cnh: text("cnh"),
  cnhExpiry: timestamp("cnh_expiry"),
  phone: text("phone"),
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  healthInsurance: text("health_insurance"),
  status: text("status").notNull().default("active"),
});

// Trucks table
export const trucks = pgTable("trucks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  plate: text("plate").notNull().unique(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  totalKm: decimal("total_km", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  mainDriverId: varchar("main_driver_id").references(() => drivers.id, { onDelete: "set null" }),
});

// Mileage records table
export const mileageRecords = pgTable("mileage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull().references(() => trucks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  kmInitial: decimal("km_initial", { precision: 12, scale: 2 }).notNull(),
  kmFinal: decimal("km_final", { precision: 12, scale: 2 }).notNull(),
  kmTraveled: decimal("km_traveled", { precision: 12, scale: 2 }).notNull(),
  valueReceived: decimal("value_received", { precision: 12, scale: 2 }).notNull(),
  valuePerKm: decimal("value_per_km", { precision: 12, scale: 4 }).notNull(),
  route: text("route").notNull(),
  date: timestamp("date").notNull(),
});

// Maintenances table
export const maintenances = pgTable("maintenances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull().references(() => trucks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  observations: text("observations"),
  receiptUrl: text("receipt_url"),
});

// Fuel expenses table (abastecimentos)
export const fuelExpenses = pgTable("fuel_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull().references(() => trucks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  liters: decimal("liters", { precision: 10, scale: 2 }).notNull(),
  pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 3 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  odometer: decimal("odometer", { precision: 12, scale: 2 }).notNull(),
  vendor: text("vendor"),
  paymentMethod: text("payment_method"),
  receiptUrl: text("receipt_url"),
});

// Extra expenses table (gastos extras)
export const extraExpenses = pgTable("extra_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").references(() => trucks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
});

// Contas a Pagar (Payables) - saídas manuais
export const payables = pgTable("payables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
});

// Routes table (Rotas cadastradas)
export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distance: decimal("distance", { precision: 10, scale: 2 }),
  estimatedTime: text("estimated_time"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
});

// Multas (Traffic Fines)
export const fines = pgTable("fines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").references(() => trucks.id, { onDelete: "set null" }),
  driverId: varchar("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  infraction: text("infraction").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  location: text("location"),
  autoNumber: text("auto_number"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
});

// Contas a Receber (Receivables) - entradas manuais
export const receivables = pgTable("receivables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date"),
  category: text("category").notNull().default("Outros"),
  description: text("description").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  receivedAt: timestamp("received_at"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
});

// Truck Daily Status (Status diário dos caminhões - Calendário)
export const truckDailyStatus = pgTable("truck_daily_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull().references(() => trucks.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("ativo"),
  location: text("location"),
  notes: text("notes"),
});

// Relations - defined AFTER all tables
export const usersRelations = relations(users, ({ many }) => ({
  mileageRecords: many(mileageRecords),
  maintenances: many(maintenances),
  fuelExpenses: many(fuelExpenses),
  extraExpenses: many(extraExpenses),
}));

export const driversRelations = relations(drivers, ({ many }) => ({
  trucks: many(trucks),
}));

export const trucksRelations = relations(trucks, ({ one, many }) => ({
  mainDriver: one(drivers, {
    fields: [trucks.mainDriverId],
    references: [drivers.id],
  }),
  mileageRecords: many(mileageRecords),
  maintenances: many(maintenances),
  fuelExpenses: many(fuelExpenses),
  extraExpenses: many(extraExpenses),
  dailyStatuses: many(truckDailyStatus),
}));

export const truckDailyStatusRelations = relations(truckDailyStatus, ({ one }) => ({
  truck: one(trucks, {
    fields: [truckDailyStatus.truckId],
    references: [trucks.id],
  }),
}));

export const mileageRecordsRelations = relations(mileageRecords, ({ one }) => ({
  truck: one(trucks, {
    fields: [mileageRecords.truckId],
    references: [trucks.id],
  }),
  user: one(users, {
    fields: [mileageRecords.userId],
    references: [users.id],
  }),
}));

export const maintenancesRelations = relations(maintenances, ({ one }) => ({
  truck: one(trucks, {
    fields: [maintenances.truckId],
    references: [trucks.id],
  }),
  user: one(users, {
    fields: [maintenances.userId],
    references: [users.id],
  }),
}));

export const fuelExpensesRelations = relations(fuelExpenses, ({ one }) => ({
  truck: one(trucks, {
    fields: [fuelExpenses.truckId],
    references: [trucks.id],
  }),
  user: one(users, {
    fields: [fuelExpenses.userId],
    references: [users.id],
  }),
}));

export const extraExpensesRelations = relations(extraExpenses, ({ one }) => ({
  truck: one(trucks, {
    fields: [extraExpenses.truckId],
    references: [trucks.id],
  }),
  user: one(users, {
    fields: [extraExpenses.userId],
    references: [users.id],
  }),
}));

export const finesRelations = relations(fines, ({ one }) => ({
  truck: one(trucks, {
    fields: [fines.truckId],
    references: [trucks.id],
  }),
  driver: one(drivers, {
    fields: [fines.driverId],
    references: [drivers.id],
  }),
  user: one(users, {
    fields: [fines.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true });
export const insertMileageRecordSchema = createInsertSchema(mileageRecords).omit({ id: true, kmTraveled: true, valuePerKm: true });
export const insertMaintenanceSchema = createInsertSchema(maintenances).omit({ id: true });
export const insertFuelExpenseSchema = createInsertSchema(fuelExpenses).omit({ id: true });
export const insertExtraExpenseSchema = createInsertSchema(extraExpenses).omit({ id: true });
export const insertPayableSchema = createInsertSchema(payables).omit({ id: true });
export const insertReceivableSchema = createInsertSchema(receivables).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertFineSchema = createInsertSchema(fines).omit({ id: true });
export const insertTruckDailyStatusSchema = createInsertSchema(truckDailyStatus).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucks.$inferSelect;
export type TruckWithDriver = Truck & { mainDriver?: Driver };

export type InsertMileageRecord = z.infer<typeof insertMileageRecordSchema>;
export type MileageRecord = typeof mileageRecords.$inferSelect;

export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type Maintenance = typeof maintenances.$inferSelect;

export type InsertFuelExpense = z.infer<typeof insertFuelExpenseSchema>;
export type FuelExpense = typeof fuelExpenses.$inferSelect;

export type InsertExtraExpense = z.infer<typeof insertExtraExpenseSchema>;
export type ExtraExpense = typeof extraExpenses.$inferSelect;

export type InsertPayable = z.infer<typeof insertPayableSchema>;
export type Payable = typeof payables.$inferSelect;

export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivables.$inferSelect;

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

export type InsertFine = z.infer<typeof insertFineSchema>;
export type Fine = typeof fines.$inferSelect;
export type FineWithDetails = Fine & { truck?: Truck; driver?: Driver };

export type InsertTruckDailyStatus = z.infer<typeof insertTruckDailyStatusSchema>;
export type TruckDailyStatus = typeof truckDailyStatus.$inferSelect;
export type TruckDailyStatusWithTruck = TruckDailyStatus & { truck?: Truck };

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;
