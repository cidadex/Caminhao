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

// Trucks table
export const trucks = pgTable("trucks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  plate: text("plate").notNull().unique(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  totalKm: decimal("total_km", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
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

// Relations - defined AFTER all tables
export const usersRelations = relations(users, ({ many }) => ({
  mileageRecords: many(mileageRecords),
  maintenances: many(maintenances),
}));

export const trucksRelations = relations(trucks, ({ many }) => ({
  mileageRecords: many(mileageRecords),
  maintenances: many(maintenances),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true });
export const insertMileageRecordSchema = createInsertSchema(mileageRecords).omit({ id: true, kmTraveled: true, valuePerKm: true });
export const insertMaintenanceSchema = createInsertSchema(maintenances).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucks.$inferSelect;

export type InsertMileageRecord = z.infer<typeof insertMileageRecordSchema>;
export type MileageRecord = typeof mileageRecords.$inferSelect;

export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type Maintenance = typeof maintenances.$inferSelect;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;
