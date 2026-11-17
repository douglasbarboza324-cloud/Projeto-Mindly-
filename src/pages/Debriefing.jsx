import React, { useState, useEffect } from "react";
import { ListTodo, Plus, Sparkles, Brain, Trash2, Check, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localData } from "@/api/localData";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { toast } from "@/components/ui/use-toast";

const PRIORITY_STYLES = {
  baixa: "bg-blue-100 text-blue-700",
  media: "bg-amber-100 text-amber-700",
  alta: "bg-red-100 text-red-700",
};

export default function Debriefing() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [agenda, setAgenda] = useState(null);
  const [mindfulness, setMindfulness] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await localData.tasks.list("-created_date", 50);
      setTasks(data);
    } catch (error) {
      toast({ title: "Erro ao carregar tarefas", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const title = newTask.trim();
    const scheduledDate = moment().add(1, "day").format("YYYY-MM-DD");
    const optimisticTask = {
      id: tempId,
      title,
      status: "pendente",
      scheduled_date: scheduledDate,
    };
    setTasks((prev) => [optimisticTask, ...prev]);
    setNewTask("");
    try {
      const task = await localData.tasks.create({
        title,
        status: "pendente",
        scheduled_date: scheduledDate,
      });
      setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)));
    } catch (error) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast({ title: "Erro ao adicionar tarefa", description: error.message, variant: "destructive" });
    }
  };

  const toggleTask = async (task) => {
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    const prevStatus = task.status;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      await localData.tasks.update(task.id, { status: newStatus });
    } catch (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: prevStatus } : t)));
      toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
    }
  };

  const deleteTask = async (id) => {
    try {
      await localData.tasks.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      toast({ title: "Erro ao excluir tarefa", description: error.message, variant: "destructive" });
    }
  };

  const generateAgenda = async () => {
    setGenerating(true);
    try {
      const pendingTasks = tasks
        .filter((task) => task.status === "pendente")
        .sort((a, b) => ["alta", "media", "baixa"].indexOf(a.priority || "media") - ["alta", "media", "baixa"].indexOf(b.priority || "media"));
      const generatedAgenda = [];
      let minutes = 9 * 60;

      pendingTasks.forEach((task, index) => {
        if (index > 0 && index % 2 === 0) {
          generatedAgenda.push({
            horario: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
            atividade: "Pausa para descansar",
            tipo: "pausa",
          });
          minutes += 15;
        }

        generatedAgenda.push({
          horario: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
          atividade: task.title,
          tipo: "tarefa",
        });
        const duration = Number(task.estimated_minutes);
        minutes += Number.isFinite(duration) && duration > 0 ? Math.min(duration, 180) : 30;
      });

      if (generatedAgenda.length === 0) {
        generatedAgenda.push({ horario: "09:00", atividade: "Reserve um momento para escolher suas prioridades", tipo: "pausa" });
      }

      const highPriorityCount = pendingTasks.filter((task) => task.priority === "alta").length;
      setAgenda(generatedAgenda);
      setMindfulness(
        pendingTasks.length > 8 || highPriorityCount >= 4
          ? "Sua lista está extensa. Considere dividir as tarefas e incluir pausas entre elas."
          : null
      );
    } catch (error) {
      toast({ title: "Erro ao gerar agenda", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === "pendente").length;
  const doneCount = tasks.filter((t) => t.status === "concluida").length;

  return (
    <div className="space-y-6 py-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Organizador</h2>
        <p className="text-sm text-muted-foreground">Organize suas tarefas e planeje uma agenda simples com base nas prioridades.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{doneCount}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </div>
      </div>

      {/* Add task */}
      <div className="flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Adicionar nova tarefa..."
          className="flex-1 bg-card border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={addTask} disabled={!newTask.trim()} size="icon" className="rounded-xl h-12 w-12">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma tarefa ainda. Adicione suas pendências acima.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center gap-3 bg-card border rounded-xl p-3 group ${
                  task.status === "concluida" ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => toggleTask(task)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    task.status === "concluida"
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-muted-foreground/30 hover:border-primary"
                  }`}
                >
                  {task.status === "concluida" && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className={`flex-1 text-sm ${task.status === "concluida" ? "line-through" : ""}`}>
                  {task.title}
                </span>
                {task.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || ""}`}>
                    {task.priority}
                  </span>
                )}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Generate agenda */}
      <Button onClick={generateAgenda} disabled={generating} className="w-full h-12" variant="outline">
        {generating ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Gerando agenda...
          </div>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gerar agenda para amanhã
          </span>
        )}
      </Button>

      {/* Mindfulness alert */}
      {mindfulness && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2"
        >
          <h4 className="font-medium text-purple-700 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Sua lista parece extensa — pausa sugerida
          </h4>
          <p className="text-sm text-purple-600 leading-relaxed">{mindfulness}</p>
        </motion.div>
      )}

      {/* Generated agenda */}
      {agenda && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-2xl p-5 space-y-3"
        >
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Agenda para amanhã
          </h3>
          <div className="space-y-2">
            {agenda.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  item.tipo === "pausa"
                    ? "bg-blue-50"
                    : item.tipo === "mindfulness"
                    ? "bg-purple-50"
                    : "bg-muted/50"
                }`}
              >
                <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">{item.horario}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <span className="text-sm">{item.atividade}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}