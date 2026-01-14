import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, TruckDailyStatusWithTruck } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Truck as TruckIcon,
  Wrench,
  Moon,
  Square,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  ativo: { label: "Ativo", color: "bg-green-500", icon: TruckIcon, textColor: "text-green-500" },
  manutencao: { label: "Manutenção", color: "bg-yellow-500", icon: Wrench, textColor: "text-yellow-500" },
  pernoite: { label: "Pernoite", color: "bg-blue-500", icon: Moon, textColor: "text-blue-500" },
  parado: { label: "Parado", color: "bg-red-500", icon: Square, textColor: "text-red-500" },
};

type StatusType = keyof typeof statusConfig;

const statusFormSchema = z.object({
  truckId: z.string().min(1, "Selecione um caminhão"),
  status: z.enum(["ativo", "manutencao", "pernoite", "parado"], { required_error: "Selecione um status" }),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type StatusFormData = z.infer<typeof statusFormSchema>;

function StatusFormDialog({
  open,
  onOpenChange,
  trucks,
  selectedDate,
  existingStatuses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
  selectedDate: Date;
  existingStatuses: TruckDailyStatusWithTruck[];
}) {
  const { toast } = useToast();

  const form = useForm<StatusFormData>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      truckId: "",
      status: "ativo",
      location: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: StatusFormData) => {
      return apiRequest("POST", "/api/truck-daily-status", {
        ...data,
        date: selectedDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/truck-daily-status"] });
      toast({ title: "Status salvo com sucesso" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar status", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: StatusFormData) => {
    mutation.mutate(data);
  };

  const trucksWithStatus = existingStatuses.map(s => s.truckId);
  const availableTrucks = trucks.filter(t => !trucksWithStatus.includes(t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Status - {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</DialogTitle>
          <DialogDescription>
            Defina o status do caminhão para esta data
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caminhão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-truck">
                        <SelectValue placeholder="Selecione o caminhão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTrucks.length === 0 ? (
                        <SelectItem value="none" disabled>Todos os caminhões já têm status</SelectItem>
                      ) : (
                        availableTrucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.number} - {truck.plate}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(statusConfig) as [StatusType, typeof statusConfig.ativo][]).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <Button
                            key={key}
                            type="button"
                            variant={field.value === key ? "default" : "outline"}
                            className={cn("justify-start gap-2", field.value === key && config.color)}
                            onClick={() => field.onChange(key)}
                            data-testid={`status-${key}`}
                          >
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </Button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: São Paulo, SP"
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observações adicionais..."
                      rows={2}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-status">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DayCell({
  date,
  statuses,
  isCurrentMonth,
  onAddClick,
  onStatusClick,
}: {
  date: Date;
  statuses: TruckDailyStatusWithTruck[];
  isCurrentMonth: boolean;
  onAddClick: () => void;
  onStatusClick: (status: TruckDailyStatusWithTruck) => void;
}) {
  const isToday = isSameDay(date, new Date());
  
  return (
    <div
      className={cn(
        "min-h-[100px] border p-1 transition-colors",
        isCurrentMonth ? "bg-card" : "bg-muted/30",
        isToday && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-sm font-medium",
          !isCurrentMonth && "text-muted-foreground",
          isToday && "text-primary font-bold"
        )}>
          {format(date, "d")}
        </span>
        {isCurrentMonth && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onAddClick}
            data-testid={`button-add-status-${format(date, "yyyy-MM-dd")}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="space-y-0.5 overflow-y-auto max-h-[70px]">
        {statuses.map((status) => {
          const config = statusConfig[status.status as StatusType];
          return (
            <button
              key={status.id}
              onClick={() => onStatusClick(status)}
              className={cn(
                "w-full text-left text-xs px-1 py-0.5 rounded truncate flex items-center gap-1",
                config?.color,
                "text-white hover:opacity-80 transition-opacity"
              )}
              data-testid={`status-item-${status.id}`}
            >
              <span className="truncate">{status.truck?.number || "?"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusDetailDialog({
  open,
  onOpenChange,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: TruckDailyStatusWithTruck | null;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!status) return;
      return apiRequest("DELETE", `/api/truck-daily-status/${status.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/truck-daily-status"] });
      toast({ title: "Status removido" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover status", description: error.message, variant: "destructive" });
    },
  });

  if (!status) return null;

  const config = statusConfig[status.status as StatusType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Detalhes do Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Caminhão:</span>
            <span>{status.truck?.number} - {status.truck?.plate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <span className={cn("px-2 py-0.5 rounded text-white text-sm", config?.color)}>
              {config?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Data:</span>
            <span>{format(new Date(status.date), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          {status.location && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Local:</span>
              <span>{status.location}</span>
            </div>
          )}
          {status.notes && (
            <div>
              <span className="font-medium">Observações:</span>
              <p className="text-sm text-muted-foreground mt-1">{status.notes}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-delete-status"
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TruckDailyStatusWithTruck | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const { data: trucks = [], isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: statuses = [], isLoading: statusesLoading } = useQuery<TruckDailyStatusWithTruck[]>({
    queryKey: ["/api/truck-daily-status", calendarStart.toISOString(), calendarEnd.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/truck-daily-status?startDate=${calendarStart.toISOString()}&endDate=${calendarEnd.toISOString()}`);
      if (!response.ok) throw new Error("Failed to fetch statuses");
      return response.json();
    },
  });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getStatusesForDay = (date: Date) => {
    return statuses.filter(s => isSameDay(new Date(s.date), date));
  };

  const handleAddClick = (date: Date) => {
    setSelectedDate(date);
    setFormDialogOpen(true);
  };

  const handleStatusClick = (status: TruckDailyStatusWithTruck) => {
    setSelectedStatus(status);
    setDetailDialogOpen(true);
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (trucksLoading || statusesLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendário de Status</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium min-w-[150px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {(Object.entries(statusConfig) as [StatusType, typeof statusConfig.ativo][]).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded", config.color)} />
              <Icon className={cn("h-4 w-4", config.textColor)} />
              <span className="text-sm">{config.label}</span>
            </div>
          );
        })}
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-[700px]">
          <div className="grid grid-cols-7">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center font-medium border-b bg-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const dayStatuses = getStatusesForDay(day);
              return (
                <DayCell
                  key={day.toISOString()}
                  date={day}
                  statuses={dayStatuses}
                  isCurrentMonth={isCurrentMonth}
                  onAddClick={() => handleAddClick(day)}
                  onStatusClick={handleStatusClick}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {trucks.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <TruckIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum caminhão cadastrado.</p>
            <p className="text-sm">Cadastre caminhões primeiro para registrar status diários.</p>
          </CardContent>
        </Card>
      )}

      {selectedDate && (
        <StatusFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          trucks={trucks}
          selectedDate={selectedDate}
          existingStatuses={getStatusesForDay(selectedDate)}
        />
      )}

      <StatusDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        status={selectedStatus}
      />
    </div>
  );
}
