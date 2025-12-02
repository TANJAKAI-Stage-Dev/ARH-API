import { Request, Response } from "express";
import prisma from "../config/prismaClient";
import { createNotification } from "./notification.controller";
import { io } from "../sockets/socketManager";


export const getCriteria = async (req: Request, res: Response) => {
  try {
    const criteria = await prisma.criteria.findMany();
    res.status(200).json(criteria);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getTeamCriteria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"});
    }
    const teamCriteria = await prisma.teamCriteria.findMany({
      where: { teamId: id },
    });
    res.status(200).json(teamCriteria);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const toggleTeamCriteria = async (req: Request, res: Response) => {
  try {
    const { teamId, criteriaId, enabled } = req.body;

    // Vérifier si l'entrée existe déjà
    const existing = await prisma.teamCriteria.findFirst({
      where: { teamId, criteriaId },
    });

    if (existing) {
      // Mettre à jour
      const updated = await prisma.teamCriteria.update({
        where: { id: existing.id },
        data: { enabled },
      });
      res.status(200).json({ message: "Critère mis à jour", updated });
    } else {
      // Créer l'entrée
      const created = await prisma.teamCriteria.create({
        data: { teamId, criteriaId, enabled },
      });
      res.status(201).json({ message: "Critère créé pour la team", created });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
export const createEvaluation = async (req: Request, res: Response) => {
  try {
    const { employeeId, month, year, scores } = req.body;
    const managerId = (req as any).user.id;

    // Vérifier qu'il n'y a pas déjà une évaluation pour ce mois
    const existing = await prisma.evaluation.findFirst({
      where: { employeeId, month, year },
    });
    if (existing) return res.status(400).json({ message: "Évaluation déjà existante pour ce mois" });

    // Calculer la moyenne
    const average = scores.reduce((acc: number, s: any) => acc + s.score, 0) / scores.length;

    const evaluation = await prisma.evaluation.create({
      data: {
        employeeId, 
        managerId,
        month,
        year,
        average,
        scores: {
          create: scores.map((s: any) => ({
            criteriaId: s.criteriaId,
            score: s.score,
          })),
        },
      },
      include: { scores: true },
    });

        // Récupérer les infos de l'employé
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ message: "Employé introuvable" });

    const notif = await createNotification(
      employee.id,
      "EVALUATION_COMPLETED" as any,
      `Vous avez reçu une nouvelle évaluation de performance.`,
      evaluation.id
    );

    // Emit socket à la room de l'employé
    io.to(employee.id).emit("notification", notif);

    res.status(201).json({ message: "Évaluation créée", evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getEvaluations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    let evaluations;
    if (userRole === "MANAGER") {
      evaluations = await prisma.evaluation.findMany({
        where: { managerId: userId },
        include: { scores: { include: { criteria: true } }, employee: {select:{avatarUrl:true,team:true}} },
      });
    } else if (userRole === "EMPLOYEE") {
      evaluations = await prisma.evaluation.findMany({
        where: { employeeId: userId },
        include: { scores: { include: { criteria: true } }, manager: true },
      });
    } else if (userRole === "ADMIN") {
      evaluations = await prisma.evaluation.findMany({
        include: { scores: { include: { criteria: true } }, employee: true, manager: true },
      });
    }

    res.json(evaluations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getMyEvaluatedMonths = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const evaluations = await prisma.evaluation.findMany({
      where: { employeeId: userId },
      select: { month: true, year: true, average: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });

    res.json({ months: evaluations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getMyEvaluation = async (req: Request, res: Response) => {
  try {
    const employeeId = (req as any).user.id;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;

    let filter: any = { employeeId };

    if (month && year) {
      filter.month = month;
      filter.year = year;
    }

    const evaluation = await prisma.evaluation.findFirst({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: {
        scores: { include: { criteria: true } },
        employee: true
      }
    });

    if (!evaluation) {
      return res.json({ employee: null, scores: [], average: null });
    }

    const formattedScores = evaluation.scores.map((s) => ({
      id: s.criteria.id,
      name: s.criteria.name,
      description: s.criteria.description,
      score: s.score
    }));

    res.json({
      employee: {
        id: evaluation.employee.id,
        firstName: evaluation.employee.firstName,
        lastName: evaluation.employee.lastName
      },
      scores: formattedScores,
      average: evaluation.average
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getEvaluationByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!employeeId || !month || !year) {
      return res.status(400).json({ message: "Paramètres manquants" });
    }

    // Vérifier si l'évaluation existe
    const evaluation = await prisma.evaluation.findFirst({
      where: { employeeId, month, year },
      include: {
        employee: true,
        scores: { include: { criteria: true } },
      },
    });

    if (!evaluation) {
      return res.status(404).json({ message: "Aucune évaluation trouvée pour cet employé à cette période" });
    }

    // Préparer les scores à renvoyer
    const scores = evaluation.scores.map((s) => ({
      id: s.criteria.id,
      name: s.criteria.name,
      description: s.criteria.description,
      score: s.score,
    }));

    res.status(200).json({
      employee: {
        id: evaluation.employee.id,
        firstName: evaluation.employee.firstName,
        lastName: evaluation.employee.lastName,
      },
      scores,
      average: evaluation.average,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const isEvaluated = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id; 
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    // récupérer tous les employés
    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      include: {
        team: true,
        evaluationsReceived: {
          where: { month, year },
        },
      },
    });

    // transformer les données pour le frontend
    const data = employees.map((emp) => {
      const evaluation = emp.evaluationsReceived[0]; // max 1 par mois/année
      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        avatarUrl:emp.avatarUrl,
        team: emp.team ? { name: emp.team.name } : undefined,
        average: evaluation ? evaluation.average : undefined,
        evaluated: evaluation ? true : false,
      };
    });

    res.status(200).json({ employees: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getActifCriteria = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    if(!employeeId){
      return res.status(400).json({message:"id requis"});
    }
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) return res.status(400).json({ message: "Month and year are required" });

    // récupérer l'employé
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: { team: true },
    });

    if (!employee) return res.status(404).json({ message: "Employé non trouvé" });
    if (!employee.teamId) return res.status(400).json({ message: "L'employé n'a pas de team" });

    // critères actifs pour la team
    const activeCriteria = await prisma.teamCriteria.findMany({
      where: { teamId: employee.teamId, enabled: true },
      include: { criteria: true },
    });

    // récupération de l'évaluation existante pour ce mois/année
    const evaluation = await prisma.evaluation.findFirst({
      where: { employeeId, month, year },
      include: {
        scores: true,
        employee:true
       },
    });

    // préparer la réponse
    const response = {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        avatarUrl:employee.avatarUrl,
        team:employee.team?.name,
      },
      criteria: activeCriteria.map((tc) => {
        const score = evaluation?.scores.find((s) => s.criteriaId === tc.criteriaId);
        return {
          id: tc.criteria.id,
          name: tc.criteria.name,
          description: tc.criteria.description,
          score: score ? score.score : null, // valeur existante ou null
        };
      }),
      evaluationId: evaluation?.id || null,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
export const getTeamsForChart = async (req:Request, res:Response) => {
  try {
    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    });

    return res.json({
      teams: [{ id: "all", name: "toutes les équipes" }, ...teams],
    });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};
export const getLastNotedMonth = async (req:Request, res:Response) => {
  try {
    const lastEval = await prisma.evaluation.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!lastEval) return res.json({ lastMonth: null, lastYear: null });

    const d = lastEval.createdAt;

    return res.json({
      lastMonth: d.getMonth() + 1,
      lastYear: d.getFullYear(),
    });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
};
export const getSixMonthsChart = async (req:Request, res:Response) => {
  try {
    const { teamId } = req.query;

    const lastEval = await prisma.evaluation.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!lastEval) return res.json({ data: [] });

    let lastDate = lastEval.createdAt;

    let periods = [];
    for (let i = 0; i < 6; i++) {
      let m = lastDate.getMonth() + 1 - i;
      let y = lastDate.getFullYear();

      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      periods.push({ month: m, year: y });
    }

    let output = [];

    for (const p of periods) {
      let evals =
        teamId !== "all"
          ? await prisma.evaluation.findMany({
              where: {
                month: p.month,
                year: p.year,
                employee: { teamId: String(teamId) },
              },
              select: { average: true },
            })
          : await prisma.evaluation.findMany({
              where: { month: p.month, year: p.year },
              select: { average: true },
            });
      
      let validAverages = evals
        .map((e) => e.average)      
        .filter((v) => v !== null && v !== undefined);

      let avg =
        evals.length > 0
          ? validAverages.reduce((acc, val) => acc + val, 0) / validAverages.length
          : 0;

      output.push({
        month: p.month,
        year: p.year,
        average: Number(avg.toFixed(2)),
      });
    }

    return res.json({ data: output.reverse() });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
};
export const getTopEmployees = async (req: Request, res: Response) => {
  try {
    const topEmployees = await prisma.evaluation.groupBy({
      by: ["employeeId"],
      _avg: { average: true },
      orderBy: { _avg: { average: "desc" } },
      take: 5,
    });

    const result = await Promise.all(
      topEmployees.map(async (e) => {
        const employee = await prisma.user.findUnique({
          where: { id: e.employeeId },
          select: { id: true, firstName: true, lastName: true,avatarUrl:true, team: { select: { name: true } } },
        });
        return {
          ...employee,
          average: e._avg.average ?? 0,
        };
      })
    );

    res.json({ topEmployees: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
export const getStats = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;

    // 1️⃣ Trouver le dernier mois/année où ce manager a noté
    const lastEvaluation = await prisma.evaluation.findFirst({
      where: { managerId },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ],
    });

    if (!lastEvaluation) {
      return res.status(200).json({
        globalAverage: 0,
        topEmployee: "Aucun",
        evaluationRate: 0,
        topTeam: "Aucune",
      });
    }

    const { month, year } = lastEvaluation;

    // 2️⃣ Moyenne générale du mois
    const avgData = await prisma.evaluation.aggregate({
      _avg: { average: true },
      where: { managerId, month, year },
    });
    const globalAverage = avgData._avg.average ?? 0;

    // 3️⃣ Employé du mois (moyenne la plus élevée)
    const topEmpData = await prisma.evaluation.findFirst({
      where: { managerId, month, year },
      orderBy: [{ average: "desc" }],
      include: { employee: true },
    });
    const topEmployee = topEmpData
      ? `${topEmpData.employee.firstName} ${topEmpData.employee.lastName}`
      : "Aucun";

    // 4️⃣ Taux d'évaluation
    const employeesEvaluated = await prisma.evaluation.findMany({
      where: { managerId, month, year },
      distinct: ["employeeId"],
    });
    const totalEmployees = await prisma.user.count({ where: { role: "EMPLOYEE" } });
    const evaluationRate = totalEmployees > 0
      ? Math.round((employeesEvaluated.length / totalEmployees) * 100)
      : 0;

    // 5️⃣ Team la plus performante (moyenne par team)
    const evaluations = await prisma.evaluation.findMany({
      where: { managerId, month, year },
      include: { employee: { include: { team: true } } },
    });

    const teamMap: Record<string, { sum: number; count: number; name: string }> = {};
    evaluations.forEach((e) => {
      const team = e.employee.team;
      if (team) {
        if (!teamMap[team.id]) teamMap[team.id] = { sum: 0, count: 0, name: team.name };
        teamMap[team.id]!.sum += e.average ?? 0;
        teamMap[team.id]!.count += 1;
      }
    });

    let topTeam = "Aucune";
    let topTeamAverage = 0;
    for (const teamData of Object.values(teamMap)) {
      const avg = teamData.sum / teamData.count;
      if (avg > topTeamAverage) {
        topTeamAverage = avg;
        topTeam = teamData.name;
      }
    }

    res.status(200).json({
      globalAverage: Number(globalAverage.toFixed(2)),
      topEmployee,
      evaluationRate,
      topTeam,
    });
  } catch (error) {
    console.error("Erreur getManagerStats:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques." });
  }
};


