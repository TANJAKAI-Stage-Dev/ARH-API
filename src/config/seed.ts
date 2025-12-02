import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  // --- Définition des critères ---
  const technicalSkills = {
    name: "COMPETENCES_TECHNIQUES",
    description: "Maîtrise des technologies, outils et méthodes liées au poste."
  };

  const productivity = {
    name: "PRODUCTIVITE",
    description: "Efficacité, rapidité et quantité de travail produit."
  };

  const behavior = {
    name: "COMPORTEMENT_ATTITUDE",
    description: "Attitude professionnelle, collaboration, communication."
  };

  const objectives = {
    name: "ATTEINTE_OBJECTIFS",
    description: "Capacité à atteindre les objectifs fixés dans les délais."
  };

  const innovation = {
    name: "INNOVATION_INITIATIVE",
    description: "Créativité, propositions d'amélioration et prises d'initiative."
  };

  const personalGrowth = {
    name: "DEVELOPPEMENT_PERSONNEL",
    description: "Progrès personnel, montée en compétence, implication."
  };


  //--- Insertions dans la BD ---
  console.log("🔄 Insertion des critères d'évaluation...");

  const criteriaList = [
    technicalSkills,
    productivity,
    behavior,
    objectives,
    innovation,
    personalGrowth,
  ];

  for (const c of criteriaList) {
    const exist = await prisma.criteria.findFirst({
      where: { name: c.name }
    });

    if (!exist) {
      await prisma.criteria.create({ data: c });
      console.log(`✅ Critère ajouté : ${c.name}`);
    } else {
      console.log(`⏭️ Critère déjà existant : ${c.name}`);
    }
  }

  console.log("✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
