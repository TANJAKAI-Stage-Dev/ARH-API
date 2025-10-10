import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Admin",
      email: "Admin@example.com",
      password: "1234",
      role: "ADMIN",
    },
  });

  console.log(user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
