import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import {
  insertTruckSchema,
  insertDriverSchema,
  insertMileageRecordSchema,
  insertMaintenanceSchema,
  insertFuelExpenseSchema,
  insertExtraExpenseSchema,
  insertRouteSchema,
  loginSchema,
  trucks,
  drivers,
  mileageRecords,
  maintenances,
  fuelExpenses,
  extraExpenses,
} from "@shared/schema";
import { getFleetHealthSummary, generateTruckDiagnostic } from "./fleet-health";

const JWT_SECRET = process.env.SESSION_SECRET || "truckflow-secret-key-2024";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Tipo de arquivo não permitido"));
  },
});

interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token inválido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token expirado ou inválido" });
  }
}

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado" });
  }
  next();
}

async function seedDefaultUsers() {
  const adminExists = await storage.getUserByUsername("admin");
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      role: "admin",
    });
  }

  const userExists = await storage.getUserByUsername("user");
  if (!userExists) {
    const hashedPassword = await bcrypt.hash("user123", 10);
    await storage.createUser({
      username: "user",
      password: hashedPassword,
      name: "Usuário",
      role: "user",
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDefaultUsers();

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      const { username, password } = validation.data;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Senha incorreta" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, name: user.name, role: user.role },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Drivers routes
  app.get("/api/drivers", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const driversList = await storage.getDrivers();
      res.json(driversList);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ message: "Erro ao buscar motoristas" });
    }
  });

  app.post("/api/drivers", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const validation = insertDriverSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.errors });
      }
      const driver = await storage.createDriver(validation.data);
      res.status(201).json(driver);
    } catch (error: any) {
      console.error("Error creating driver:", error);
      if (error.message?.includes("unique") || error.code === "23505") {
        return res.status(400).json({ message: "Motorista com este CPF já existe" });
      }
      res.status(500).json({ message: "Erro ao criar motorista" });
    }
  });

  app.patch("/api/drivers/:id", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const driver = await storage.updateDriver(id, req.body);
      if (!driver) {
        return res.status(404).json({ message: "Motorista não encontrado" });
      }
      res.json(driver);
    } catch (error: any) {
      console.error("Error updating driver:", error);
      res.status(500).json({ message: "Erro ao atualizar motorista" });
    }
  });

  app.delete("/api/drivers/:id", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDriver(id);
      if (!deleted) {
        return res.status(404).json({ message: "Motorista não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting driver:", error);
      res.status(500).json({ message: "Erro ao excluir motorista" });
    }
  });

  // Fleet Health routes
  app.get("/api/fleet-health", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const summary = await getFleetHealthSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching fleet health:", error);
      res.status(500).json({ message: "Erro ao buscar saúde da frota" });
    }
  });

  app.get("/api/fleet-health/:truckId/diagnostic", authMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { truckId } = req.params;
      const diagnostic = await generateTruckDiagnostic(truckId);
      if (!diagnostic) {
        return res.status(404).json({ message: "Caminhão não encontrado" });
      }
      res.json(diagnostic);
    } catch (error) {
      console.error("Error generating diagnostic:", error);
      res.status(500).json({ message: "Erro ao gerar diagnóstico" });
    }
  });

  // Trucks routes
  app.get("/api/trucks", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const trucksList = await storage.getTrucksWithDrivers();
      res.json(trucksList);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      res.status(500).json({ message: "Erro ao buscar caminhões" });
    }
  });

  app.post("/api/trucks", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const validation = insertTruckSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.errors });
      }

      const truck = await storage.createTruck(validation.data);
      res.status(201).json(truck);
    } catch (error: any) {
      console.error("Error creating truck:", error);
      if (error.message?.includes("unique") || error.code === "23505") {
        return res.status(400).json({ message: "Caminhão com este número ou placa já existe" });
      }
      res.status(500).json({ message: "Erro ao criar caminhão" });
    }
  });

  app.patch("/api/trucks/:id", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const truck = await storage.updateTruck(id, req.body);
      if (!truck) {
        return res.status(404).json({ message: "Caminhão não encontrado" });
      }
      res.json(truck);
    } catch (error: any) {
      console.error("Error updating truck:", error);
      if (error.message?.includes("unique") || error.code === "23505") {
        return res.status(400).json({ message: "Caminhão com este número ou placa já existe" });
      }
      res.status(500).json({ message: "Erro ao atualizar caminhão" });
    }
  });

  app.delete("/api/trucks/:id", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTruck(id);
      if (!deleted) {
        return res.status(404).json({ message: "Caminhão não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting truck:", error);
      res.status(500).json({ message: "Erro ao excluir caminhão" });
    }
  });

  app.get("/api/mileage", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const records = await storage.getMileageRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching mileage records:", error);
      res.status(500).json({ message: "Erro ao buscar registros" });
    }
  });

  app.post("/api/mileage", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const data = {
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
      };

      const kmInitial = Number(data.kmInitial);
      const kmFinal = Number(data.kmFinal);
      const valueReceived = Number(data.valueReceived);

      if (kmFinal <= kmInitial) {
        return res.status(400).json({ message: "KM final deve ser maior que KM inicial" });
      }

      const kmTraveled = kmFinal - kmInitial;
      const valuePerKm = valueReceived / kmTraveled;

      const record = await storage.createMileageRecord({
        ...data,
        kmInitial: String(kmInitial),
        kmFinal: String(kmFinal),
        valueReceived: String(valueReceived),
        kmTraveled: String(kmTraveled),
        valuePerKm: String(valuePerKm),
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating mileage record:", error);
      res.status(500).json({ message: "Erro ao criar registro" });
    }
  });

  app.get("/api/maintenances", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const maintenances = await storage.getMaintenances();
      res.json(maintenances);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      res.status(500).json({ message: "Erro ao buscar manutenções" });
    }
  });

  app.post("/api/maintenances", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const data = {
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        value: String(req.body.value),
      };

      const maintenance = await storage.createMaintenance(data);
      res.status(201).json(maintenance);
    } catch (error) {
      console.error("Error creating maintenance:", error);
      res.status(500).json({ message: "Erro ao criar manutenção" });
    }
  });

  app.get("/api/fuel-expenses", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const expenses = await storage.getFuelExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching fuel expenses:", error);
      res.status(500).json({ message: "Erro ao buscar abastecimentos" });
    }
  });

  app.post("/api/fuel-expenses", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const liters = Number(req.body.liters);
      const pricePerLiter = Number(req.body.pricePerLiter);
      const totalCost = liters * pricePerLiter;

      const data = {
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        liters: String(liters),
        pricePerLiter: String(pricePerLiter),
        totalCost: String(totalCost),
        odometer: String(req.body.odometer),
      };

      const expense = await storage.createFuelExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating fuel expense:", error);
      res.status(500).json({ message: "Erro ao criar abastecimento" });
    }
  });

  app.get("/api/extra-expenses", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const expenses = await storage.getExtraExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching extra expenses:", error);
      res.status(500).json({ message: "Erro ao buscar gastos extras" });
    }
  });

  app.post("/api/extra-expenses", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const data = {
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        totalCost: String(req.body.totalCost),
        truckId: req.body.truckId || null,
      };

      const expense = await storage.createExtraExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating extra expense:", error);
      res.status(500).json({ message: "Erro ao criar gasto extra" });
    }
  });

  app.post("/api/upload", authMiddleware as any, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.get("/api/dashboard", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const data = await storage.getDashboardData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
    }
  });

  app.get("/api/reports", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, truckId } = req.query;
      const data = await storage.getReportData(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        truckId as string | undefined
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching report data:", error);
      res.status(500).json({ message: "Erro ao buscar dados do relatório" });
    }
  });

  app.get("/api/reports/export", authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, truckId, format } = req.query;
      const data = await storage.getReportData(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        truckId as string | undefined
      );

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=relatorio.csv");

        let csv = "Caminhão,Placa,Viagens,KM Total,Faturamento Bruto,Manutenção,Combustível,Extras,Custo Total,Faturamento Líquido,Média R$/KM\n";
        data.data.forEach((row) => {
          csv += `"${row.truck.number}","${row.truck.plate}",${row.tripCount},${row.totalKm},${row.grossRevenue.toFixed(2)},${row.maintenanceCost.toFixed(2)},${row.fuelCost.toFixed(2)},${row.extraCost.toFixed(2)},${row.totalCost.toFixed(2)},${row.netRevenue.toFixed(2)},${row.avgValuePerKm.toFixed(2)}\n`;
        });
        csv += `\nTOTAIS,,${data.data.reduce((s, r) => s + r.tripCount, 0)},${data.totals.totalKm},${data.totals.grossRevenue.toFixed(2)},${data.totals.maintenanceCost.toFixed(2)},${data.totals.fuelCost.toFixed(2)},${data.totals.extraCost.toFixed(2)},${data.totals.totalCost.toFixed(2)},${data.totals.netRevenue.toFixed(2)},\n`;

        return res.send(csv);
      }

      if (format === "excel") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=relatorio.csv");

        let csv = "Caminhão;Placa;Viagens;KM Total;Faturamento Bruto;Manutenção;Combustível;Extras;Custo Total;Faturamento Líquido;Média R$/KM\n";
        data.data.forEach((row) => {
          csv += `"${row.truck.number}";"${row.truck.plate}";${row.tripCount};${row.totalKm};${row.grossRevenue.toFixed(2).replace(".", ",")};${row.maintenanceCost.toFixed(2).replace(".", ",")};${row.fuelCost.toFixed(2).replace(".", ",")};${row.extraCost.toFixed(2).replace(".", ",")};${row.totalCost.toFixed(2).replace(".", ",")};${row.netRevenue.toFixed(2).replace(".", ",")};${row.avgValuePerKm.toFixed(2).replace(".", ",")}\n`;
        });
        csv += `\nTOTAIS;;${data.data.reduce((s, r) => s + r.tripCount, 0)};${data.totals.totalKm};${data.totals.grossRevenue.toFixed(2).replace(".", ",")};${data.totals.maintenanceCost.toFixed(2).replace(".", ",")};${data.totals.fuelCost.toFixed(2).replace(".", ",")};${data.totals.extraCost.toFixed(2).replace(".", ",")};${data.totals.totalCost.toFixed(2).replace(".", ",")};${data.totals.netRevenue.toFixed(2).replace(".", ",")};\n`;

        return res.send(csv);
      }

      if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=relatorio.pdf");

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc.fontSize(20).text("TruckFlow - Relatório de Frota", { align: "center" });
        doc.moveDown();

        const formatDate = (d: Date) => d.toLocaleDateString("pt-BR");
        const dateRange = startDate && endDate
          ? `Período: ${formatDate(new Date(startDate as string))} - ${formatDate(new Date(endDate as string))}`
          : "Período: Todos os registros";
        doc.fontSize(12).text(dateRange, { align: "center" });
        doc.moveDown(2);

        doc.fontSize(14).text("Resumo Geral", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Faturamento Bruto: R$ ${data.totals.grossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
        doc.text(`Gastos com Manutenção: R$ ${data.totals.maintenanceCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
        doc.text(`Gastos com Combustível: R$ ${data.totals.fuelCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
        doc.text(`Gastos Extras: R$ ${data.totals.extraCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
        doc.text(`Custo Operacional Total: R$ ${data.totals.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
        doc.text(`Faturamento Líquido: R$ ${data.totals.netRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
        doc.text(`Total de KM: ${data.totals.totalKm.toLocaleString("pt-BR")} km`);
        doc.moveDown(2);

        doc.fontSize(14).text("Detalhamento por Caminhão", { underline: true });
        doc.moveDown();

        data.data.forEach((row) => {
          doc.fontSize(12).text(`Caminhão ${row.truck.number} - ${row.truck.plate}`, { continued: false });
          doc.fontSize(10);
          doc.text(`  Modelo: ${row.truck.model}`);
          doc.text(`  Viagens: ${row.tripCount} | KM Total: ${row.totalKm.toLocaleString("pt-BR")} km`);
          doc.text(`  Faturamento Bruto: R$ ${row.grossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.text(`  Manutenção: R$ ${row.maintenanceCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.text(`  Combustível: R$ ${row.fuelCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.text(`  Gastos Extras: R$ ${row.extraCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.text(`  Custo Total: R$ ${row.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.text(`  Faturamento Líquido: R$ ${row.netRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.text(`  Média R$/KM: R$ ${row.avgValuePerKm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          doc.moveDown();
        });

        doc.moveDown();
        doc.fontSize(8).text(`Relatório gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });

        doc.end();
        return;
      }

      res.status(400).json({ message: "Formato inválido" });
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Erro ao exportar relatório" });
    }
  });

  app.get("/api/reports/maintenance", authMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, truckId } = req.query;
      const allMaintenances = await storage.getMaintenances();
      
      let filtered = allMaintenances;
      if (startDate) {
        filtered = filtered.filter(m => new Date(m.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(m => new Date(m.date) <= new Date(endDate as string));
      }
      if (truckId && truckId !== "all") {
        filtered = filtered.filter(m => m.truckId === truckId);
      }

      const totalValue = filtered.reduce((sum, m) => sum + Number(m.value), 0);
      const typeBreakdown = filtered.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + Number(m.value);
        return acc;
      }, {} as Record<string, number>);

      const truckBreakdown = filtered.reduce((acc, m) => {
        const key = m.truck?.number || "Sem Caminhão";
        acc[key] = (acc[key] || 0) + Number(m.value);
        return acc;
      }, {} as Record<string, number>);

      res.json({
        records: filtered,
        totals: {
          count: filtered.length,
          totalValue,
          avgValue: filtered.length > 0 ? totalValue / filtered.length : 0,
        },
        byType: Object.entries(typeBreakdown).map(([type, value]) => ({ type, value })),
        byTruck: Object.entries(truckBreakdown).map(([truck, value]) => ({ truck, value })),
      });
    } catch (error) {
      console.error("Error fetching maintenance report:", error);
      res.status(500).json({ message: "Erro ao buscar relatório de manutenção" });
    }
  });

  app.get("/api/reports/fuel", authMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, truckId } = req.query;
      const allFuel = await storage.getFuelExpenses();
      
      let filtered = allFuel;
      if (startDate) {
        filtered = filtered.filter(f => new Date(f.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(f => new Date(f.date) <= new Date(endDate as string));
      }
      if (truckId && truckId !== "all") {
        filtered = filtered.filter(f => f.truckId === truckId);
      }

      const totalCost = filtered.reduce((sum, f) => sum + Number(f.totalCost), 0);
      const totalLiters = filtered.reduce((sum, f) => sum + Number(f.liters), 0);
      const avgPricePerLiter = filtered.length > 0 ? totalCost / totalLiters : 0;

      const vendorBreakdown = filtered.reduce((acc, f) => {
        const key = f.vendor || "Não informado";
        if (!acc[key]) acc[key] = { cost: 0, liters: 0 };
        acc[key].cost += Number(f.totalCost);
        acc[key].liters += Number(f.liters);
        return acc;
      }, {} as Record<string, { cost: number; liters: number }>);

      const truckBreakdown = filtered.reduce((acc, f) => {
        const key = f.truck?.number || "Sem Caminhão";
        if (!acc[key]) acc[key] = { cost: 0, liters: 0 };
        acc[key].cost += Number(f.totalCost);
        acc[key].liters += Number(f.liters);
        return acc;
      }, {} as Record<string, { cost: number; liters: number }>);

      res.json({
        records: filtered,
        totals: {
          count: filtered.length,
          totalCost,
          totalLiters,
          avgPricePerLiter,
        },
        byVendor: Object.entries(vendorBreakdown).map(([vendor, data]) => ({ vendor, ...data })),
        byTruck: Object.entries(truckBreakdown).map(([truck, data]) => ({ truck, ...data })),
      });
    } catch (error) {
      console.error("Error fetching fuel report:", error);
      res.status(500).json({ message: "Erro ao buscar relatório de combustível" });
    }
  });

  app.get("/api/reports/extras", authMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, truckId } = req.query;
      const allExtras = await storage.getExtraExpenses();
      
      let filtered = allExtras;
      if (startDate) {
        filtered = filtered.filter(e => new Date(e.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(e => new Date(e.date) <= new Date(endDate as string));
      }
      if (truckId && truckId !== "all") {
        if (truckId === "none") {
          filtered = filtered.filter(e => !e.truckId);
        } else {
          filtered = filtered.filter(e => e.truckId === truckId);
        }
      }

      const totalCost = filtered.reduce((sum, e) => sum + Number(e.totalCost), 0);

      const categoryBreakdown = filtered.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.totalCost);
        return acc;
      }, {} as Record<string, number>);

      const truckBreakdown = filtered.reduce((acc, e) => {
        const key = e.truck?.number || "Geral";
        acc[key] = (acc[key] || 0) + Number(e.totalCost);
        return acc;
      }, {} as Record<string, number>);

      res.json({
        records: filtered,
        totals: {
          count: filtered.length,
          totalCost,
          avgCost: filtered.length > 0 ? totalCost / filtered.length : 0,
        },
        byCategory: Object.entries(categoryBreakdown).map(([category, value]) => ({ category, value })),
        byTruck: Object.entries(truckBreakdown).map(([truck, value]) => ({ truck, value })),
      });
    } catch (error) {
      console.error("Error fetching extras report:", error);
      res.status(500).json({ message: "Erro ao buscar relatório de gastos extras" });
    }
  });

  app.get("/api/reports/mileage", authMiddleware as any, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, truckId } = req.query;
      const allMileage = await storage.getMileageRecords();
      
      let filtered = allMileage;
      if (startDate) {
        filtered = filtered.filter(m => new Date(m.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(m => new Date(m.date) <= new Date(endDate as string));
      }
      if (truckId && truckId !== "all") {
        filtered = filtered.filter(m => m.truckId === truckId);
      }

      const totalKm = filtered.reduce((sum, m) => sum + Number(m.kmTraveled), 0);
      const totalRevenue = filtered.reduce((sum, m) => sum + Number(m.valueReceived), 0);
      const avgValuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;

      const routeBreakdown = filtered.reduce((acc, m) => {
        if (!acc[m.route]) acc[m.route] = { count: 0, km: 0, revenue: 0 };
        acc[m.route].count++;
        acc[m.route].km += Number(m.kmTraveled);
        acc[m.route].revenue += Number(m.valueReceived);
        return acc;
      }, {} as Record<string, { count: number; km: number; revenue: number }>);

      const truckBreakdown = filtered.reduce((acc, m) => {
        const key = m.truck?.number || "Sem Caminhão";
        if (!acc[key]) acc[key] = { trips: 0, km: 0, revenue: 0 };
        acc[key].trips++;
        acc[key].km += Number(m.kmTraveled);
        acc[key].revenue += Number(m.valueReceived);
        return acc;
      }, {} as Record<string, { trips: number; km: number; revenue: number }>);

      res.json({
        records: filtered,
        totals: {
          tripCount: filtered.length,
          totalKm,
          totalRevenue,
          avgValuePerKm,
          avgTripDistance: filtered.length > 0 ? totalKm / filtered.length : 0,
        },
        byRoute: Object.entries(routeBreakdown).map(([route, data]) => ({ route, ...data })),
        byTruck: Object.entries(truckBreakdown).map(([truck, data]) => ({ truck, ...data })),
      });
    } catch (error) {
      console.error("Error fetching mileage report:", error);
      res.status(500).json({ message: "Erro ao buscar relatório de quilometragem" });
    }
  });

  // Payables (Contas a Pagar) routes
  app.get("/api/payables", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const payables = await storage.getPayables();
      res.json(payables);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar contas a pagar" });
    }
  });

  app.post("/api/payables", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const payable = await storage.createPayable({
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        paidAt: req.body.paidAt ? new Date(req.body.paidAt) : null,
      });
      res.status(201).json(payable);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar conta a pagar" });
    }
  });

  app.patch("/api/payables/:id", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const data: any = { ...req.body };
      if (data.date) data.date = new Date(data.date);
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.paidAt) data.paidAt = new Date(data.paidAt);
      
      const payable = await storage.updatePayable(req.params.id, data);
      if (!payable) return res.status(404).json({ message: "Conta não encontrada" });
      res.json(payable);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar conta a pagar" });
    }
  });

  app.delete("/api/payables/:id", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deletePayable(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Conta não encontrada" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir conta a pagar" });
    }
  });

  // Receivables (Contas a Receber) routes
  app.get("/api/receivables", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const receivables = await storage.getReceivables();
      res.json(receivables);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar contas a receber" });
    }
  });

  app.post("/api/receivables", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const receivable = await storage.createReceivable({
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        receivedAt: req.body.receivedAt ? new Date(req.body.receivedAt) : null,
      });
      res.status(201).json(receivable);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar conta a receber" });
    }
  });

  app.patch("/api/receivables/:id", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const data: any = { ...req.body };
      if (data.date) data.date = new Date(data.date);
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.receivedAt) data.receivedAt = new Date(data.receivedAt);
      
      const receivable = await storage.updateReceivable(req.params.id, data);
      if (!receivable) return res.status(404).json({ message: "Conta não encontrada" });
      res.json(receivable);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar conta a receber" });
    }
  });

  app.delete("/api/receivables/:id", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteReceivable(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Conta não encontrada" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir conta a receber" });
    }
  });

  // Routes (Rotas cadastradas)
  app.get("/api/routes", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar rotas" });
    }
  });

  app.post("/api/routes", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = insertRouteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const route = await storage.createRoute(parsed.data);
      res.status(201).json(route);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar rota" });
    }
  });

  app.patch("/api/routes/:id", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const route = await storage.updateRoute(req.params.id, req.body);
      if (!route) return res.status(404).json({ message: "Rota não encontrada" });
      res.json(route);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar rota" });
    }
  });

  app.delete("/api/routes/:id", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteRoute(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Rota não encontrada" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir rota" });
    }
  });

  // Financial Summary route
  app.get("/api/financial-summary", authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const allPayables = await storage.getPayables();
      const allReceivables = await storage.getReceivables();
      const allMileage = await storage.getMileageRecords();
      const allMaintenance = await storage.getMaintenances();
      const allFuel = await storage.getFuelExpenses();
      const allExtra = await storage.getExtraExpenses();

      const filterByDate = (date: Date) => {
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      };

      const filteredPayables = allPayables.filter(p => filterByDate(new Date(p.date)));
      const filteredReceivables = allReceivables.filter(r => filterByDate(new Date(r.date)));
      const filteredMileage = allMileage.filter(m => filterByDate(new Date(m.date)));
      const filteredMaintenance = allMaintenance.filter(m => filterByDate(new Date(m.date)));
      const filteredFuel = allFuel.filter(f => filterByDate(new Date(f.date)));
      const filteredExtra = allExtra.filter(e => filterByDate(new Date(e.date)));

      const totalFreteReceivables = filteredMileage.reduce((sum, m) => sum + Number(m.valueReceived), 0);
      const totalManualReceivables = filteredReceivables.reduce((sum, r) => sum + Number(r.value), 0);
      const totalReceivables = totalFreteReceivables + totalManualReceivables;

      const totalManualPayables = filteredPayables.reduce((sum, p) => sum + Number(p.value), 0);
      const totalMaintenance = filteredMaintenance.reduce((sum, m) => sum + Number(m.value), 0);
      const totalFuel = filteredFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
      const totalExtraExpenses = filteredExtra.reduce((sum, e) => sum + Number(e.totalCost), 0);
      const totalPayables = totalManualPayables + totalMaintenance + totalFuel + totalExtraExpenses;

      const netProfit = totalReceivables - totalPayables;

      const pendingPayables = filteredPayables.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.value), 0);
      const paidPayables = filteredPayables.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.value), 0);
      const pendingReceivables = filteredReceivables.filter(r => r.status === "pending").reduce((sum, r) => sum + Number(r.value), 0);
      const receivedReceivables = filteredReceivables.filter(r => r.status === "received").reduce((sum, r) => sum + Number(r.value), 0);

      res.json({
        receivables: {
          frete: totalFreteReceivables,
          manual: totalManualReceivables,
          total: totalReceivables,
          pending: pendingReceivables,
          received: receivedReceivables + totalFreteReceivables,
        },
        payables: {
          manual: totalManualPayables,
          maintenance: totalMaintenance,
          fuel: totalFuel,
          extras: totalExtraExpenses,
          total: totalPayables,
          pending: pendingPayables,
          paid: paidPayables + totalMaintenance + totalFuel + totalExtraExpenses,
        },
        netProfit,
        profitMargin: totalReceivables > 0 ? (netProfit / totalReceivables) * 100 : 0,
      });
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo financeiro" });
    }
  });

  app.post("/api/admin/seed-demo-data", authMiddleware as any, adminMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const existingTrucks = await storage.getTrucks();
      if (existingTrucks.length > 0) {
        await db.delete(extraExpenses);
        await db.delete(fuelExpenses);
        await db.delete(maintenances);
        await db.delete(mileageRecords);
        await db.delete(trucks);
      }

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

      const insertedTrucks = [];
      for (const truckData of trucksData) {
        const truck = await storage.createTruck(truckData);
        insertedTrucks.push(truck);
      }

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
      let mileageCount = 0;
      let fuelCount = 0;
      let maintenanceCount = 0;
      let extraCount = 0;

      for (const truck of insertedTrucks) {
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
            
            await storage.createMileageRecord({
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
            mileageCount++;
            currentKm += kmTraveled;
          }

          const fillingsThisMonth = Math.floor(Math.random() * 3) + 2;
          const vendors = ["Posto Ipiranga", "Posto BR", "Posto Shell", "Posto Texaco", "Posto Ale"];
          const paymentMethods = ["Dinheiro", "Cartão Frota", "PIX", "Cartão Crédito"];

          for (let fill = 0; fill < fillingsThisMonth; fill++) {
            const fillDate = new Date(today);
            fillDate.setMonth(fillDate.getMonth() - monthsAgo);
            fillDate.setDate(Math.floor(Math.random() * 28) + 1);
            
            const liters = Math.floor(Math.random() * 150) + 100;
            const pricePerLiter = (Math.random() * 0.3 + 5.2).toFixed(3);
            const totalCost = (liters * parseFloat(pricePerLiter)).toFixed(2);
            
            await storage.createFuelExpense({
              truckId: truck.id,
              userId: userId,
              date: fillDate,
              liters: String(liters),
              pricePerLiter: pricePerLiter,
              totalCost: totalCost,
              odometer: String(currentKm),
              vendor: vendors[Math.floor(Math.random() * vendors.length)],
              paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
              receiptUrl: null,
            });
            fuelCount++;
          }
        }

        const maintenanceTypes = [
          { type: "Troca de óleo", minValue: 250, maxValue: 450 },
          { type: "Troca de pneus", minValue: 800, maxValue: 1500 },
          { type: "Revisão de freios", minValue: 350, maxValue: 700 },
          { type: "Manutenção preventiva", minValue: 400, maxValue: 800 },
          { type: "Troca de filtros", minValue: 150, maxValue: 350 },
        ];

        const maintCount = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < maintCount; i++) {
          const maintType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
          const maintDate = new Date(today);
          maintDate.setMonth(maintDate.getMonth() - Math.floor(Math.random() * 6));
          maintDate.setDate(Math.floor(Math.random() * 28) + 1);
          
          const value = Math.floor(Math.random() * (maintType.maxValue - maintType.minValue)) + maintType.minValue;
          
          await storage.createMaintenance({
            truckId: truck.id,
            userId: userId,
            date: maintDate,
            type: maintType.type,
            observations: `${maintType.type} - Caminhão ${truck.number}`,
            value: String(value),
            receiptUrl: null,
          });
          maintenanceCount++;
        }

        const extraCategories = [
          { category: "Pedágio", minValue: 30, maxValue: 120 },
          { category: "Estacionamento", minValue: 15, maxValue: 50 },
          { category: "Alimentação", minValue: 25, maxValue: 80 },
          { category: "Hospedagem", minValue: 60, maxValue: 150 },
          { category: "Lavagem", minValue: 40, maxValue: 100 },
        ];

        const extCount = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < extCount; i++) {
          const cat = extraCategories[Math.floor(Math.random() * extraCategories.length)];
          const expDate = new Date(today);
          expDate.setMonth(expDate.getMonth() - Math.floor(Math.random() * 6));
          expDate.setDate(Math.floor(Math.random() * 28) + 1);
          
          const value = Math.floor(Math.random() * (cat.maxValue - cat.minValue)) + cat.minValue;
          
          await storage.createExtraExpense({
            truckId: truck.id,
            userId: userId,
            date: expDate,
            category: cat.category,
            description: `${cat.category} - Caminhão ${truck.number}`,
            totalCost: String(value),
            notes: null,
            receiptUrl: null,
          });
          extraCount++;
        }
      }

      res.json({
        success: true,
        message: "Dados de demonstração criados com sucesso!",
        summary: {
          trucks: insertedTrucks.length,
          mileageRecords: mileageCount,
          fuelExpenses: fuelCount,
          maintenances: maintenanceCount,
          extraExpenses: extraCount,
        },
      });
    } catch (error) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ message: "Erro ao criar dados de demonstração" });
    }
  });

  return httpServer;
}
