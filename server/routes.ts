import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import {
  insertTruckSchema,
  insertMileageRecordSchema,
  insertMaintenanceSchema,
  loginSchema,
} from "@shared/schema";

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

  app.get("/api/trucks", authMiddleware as any, async (_req: Request, res: Response) => {
    try {
      const trucks = await storage.getTrucks();
      res.json(trucks);
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

        let csv = "Caminhão,Placa,Viagens,KM Total,Faturamento Bruto,Manutenções,Faturamento Líquido,Média R$/KM\n";
        data.data.forEach((row) => {
          csv += `"${row.truck.number}","${row.truck.plate}",${row.tripCount},${row.totalKm},${row.grossRevenue.toFixed(2)},${row.maintenanceCost.toFixed(2)},${row.netRevenue.toFixed(2)},${row.avgValuePerKm.toFixed(2)}\n`;
        });
        csv += `\nTOTAIS,,${data.data.reduce((s, r) => s + r.tripCount, 0)},${data.totals.totalKm},${data.totals.grossRevenue.toFixed(2)},${data.totals.maintenanceCost.toFixed(2)},${data.totals.netRevenue.toFixed(2)},\n`;

        return res.send(csv);
      }

      if (format === "excel") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=relatorio.csv");

        let csv = "Caminhão;Placa;Viagens;KM Total;Faturamento Bruto;Manutenções;Faturamento Líquido;Média R$/KM\n";
        data.data.forEach((row) => {
          csv += `"${row.truck.number}";"${row.truck.plate}";${row.tripCount};${row.totalKm};${row.grossRevenue.toFixed(2).replace(".", ",")};${row.maintenanceCost.toFixed(2).replace(".", ",")};${row.netRevenue.toFixed(2).replace(".", ",")};${row.avgValuePerKm.toFixed(2).replace(".", ",")}\n`;
        });
        csv += `\nTOTAIS;;${data.data.reduce((s, r) => s + r.tripCount, 0)};${data.totals.totalKm};${data.totals.grossRevenue.toFixed(2).replace(".", ",")};${data.totals.maintenanceCost.toFixed(2).replace(".", ",")};${data.totals.netRevenue.toFixed(2).replace(".", ",")};\n`;

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
          doc.text(`  Manutenções: R$ ${row.maintenanceCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
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

  return httpServer;
}
