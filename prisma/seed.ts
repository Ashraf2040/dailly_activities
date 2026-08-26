import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("→ Cleaning tables (safe delete)...");

  // Children first (FK order)
  // Only models actually used/seeded below are cleaned.
  // (UUID string ids via @id @default(uuid()) — no manual id fields needed.)
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();

  console.log("→ Database cleaned safely");
}

async function main() {
  console.log("Seeding: Subjects → Classes → Admin → Teachers (2025–2026)");

  // ================= CLEAN =================
  console.log("Cleaning database...");
  await cleanDatabase();
  console.log("Database cleaned successfully.");

  // ================= SUBJECTS =================
  const subjects = [
    "AP Biology", "Arabic", "Biology", "Chemistry", "Economics", "English",
    "French", "ICT", "Internet of Things", "Islamic", "Life Skills", "Math",
    "Physics", "Principles of Business", "Science", "Social Arabic",
    "Social Studies", "World History",
  ];

  for (const name of subjects) {
    // id is auto-generated (uuid()) — do not pass id here
    await prisma.subject.create({ data: { name } });
  }

  // ================= CLASSES =================
  const classNames = [
    "1A", "2A", "3A", "4A", "4B", "4C", "5A", "5B", "5C",
    "6A", "6B", "6C", "6G",
    "7A", "7B", "7C", "7G",
    "8A", "8G",
    "9A", "9B", "9C",
    "10A", "10B",
    "11A", "11B", "11C",
    "12A", "12B",
  ];

  for (const name of classNames) {
    await prisma.class.create({ data: { name } });
  }

  // Lookup maps (name -> uuid) for connecting implicit many-to-many relations
  const subjectMap = new Map(
    (await prisma.subject.findMany()).map((s) => [s.name, s.id])
  );
  const classMap = new Map(
    (await prisma.class.findMany()).map((c) => [c.name, c.id])
  );

  // ================= ADMIN =================
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      name: "Admin User",
      password: "admin123", // plain text (matches app auth check)
      role: Role.ADMIN,
    },
  });

  // === TEACHERS (all use same plain text password) ===
  const teacherPlainPassword = "P@55word";

  const teachersData = [
    { username: "ae3114399", name: "Ahmed Ismail", classes: ["2A", "3A"], subjects: ["English"] },
    { username: "ibra.salama2", name: "Ibrahim Salama", classes: ["4A", "4B", "4C"], subjects: ["English"] },
    { username: "abdelaziz.me3", name: "Abdulaziz Metwally", classes: ["6B", "6C", "6G"], subjects: ["English"] },
    { username: "ofadlallah75", name: "Omar Fadlalah", classes: ["6A", "8A", "8G"], subjects: ["English"] },
    { username: "mohhmd122", name: "Mohamed Abdulfattah", classes: ["9A", "9B", "9C"], subjects: ["English"] },
    { username: "amr.ahmed.hamouda", name: "Amr Hamouda", classes: ["7G", "10A", "10B"], subjects: ["English"] },
    { username: "momostafa1710", name: "Mohamed Moustafa", classes: ["7A", "7B", "7C"], subjects: ["English"] },
    { username: "abdallahelsemary7", name: "Abdullah Mostafa", classes: ["11A", "11B", "11C"], subjects: ["English"] },
    { username: "ssegram1", name: "Saeed Segram", classes: ["11A", "11B", "11C", "12A", "12B"], subjects: ["English", "Principles of Business", "Economics"] },
    { username: "mahmoudomar87", name: "Mahmoud Omar", classes: ["2A", "3A", "4A", "4B", "4C", "5C"], subjects: ["English", "Social Studies", "Life Skills"] },
    { username: "mohammed.zaky810", name: "Mohammad Zaky", classes: ["9C", "10A", "10B"], subjects: ["Math"] },
    { username: "muhammadshaaban95", name: "Mohamed Shaaban", classes: ["7G", "8A", "8G", "9A", "9B", "9C", "10A", "10B"], subjects: ["Social Studies", "Life Skills", "World History"] },
    { username: "ibrahimelhadad704", name: "Ibrahim Elhadad", classes: ["2A", "3A", "4B", "4C"], subjects: ["Math"] },
    { username: "moaliarab3", name: "Mohamad Ali", classes: ["4A", "5A", "5B", "5C"], subjects: ["Math"] },
    { username: "moelbry", name: "Mohamed Albry", classes: ["6A", "6B", "6C", "6G"], subjects: ["Math"] },
    { username: "momo.mo2men", name: "Mohamed Hemdan", classes: ["7A", "7B", "7C", "7G"], subjects: ["Math"] },
    { username: "alielkest", name: "Ali Alsaeed", classes: ["8A", "8G", "9A", "9B"], subjects: ["Math"] },
    { username: "mohammedsayed.ms1111", name: "Mohamed Thabet", classes: ["11A", "11B", "11C", "12A", "12B"], subjects: ["Math"] },
    { username: "mgwad852", name: "Mohamed Yousef", classes: ["2A", "3A", "4A", "4B", "4C"], subjects: ["Science"] },
    { username: "ashrafflefl2030", name: "Ashraf Alsayed", classes: ["5A", "5B", "5C", "6A", "6B"], subjects: ["Science"] },
    { username: "ebrahim.1631994", name: "Ibrahim Mohamed", classes: ["6C", "6G", "7G", "8G"], subjects: ["Science"] },
    { username: "mohamedresha10", name: "Mohammed Ashraf", classes: ["11A", "11B", "11C"], subjects: ["Chemistry"] },
    { username: "sherifbedair227", name: "Sherif Alsayed", classes: ["9A", "9B", "9C", "12A", "12B"], subjects: ["Science", "Physics"] },
    { username: "z.f.b2012", name: "Zyad Banawas", classes: ["6A", "6B", "6C", "6G"], subjects: ["Islamic"] },
    { username: "mm4822556", name: "Mohamed Mohsen", classes: ["10A", "10B", "12A", "12B"], subjects: ["Biology", "AP Biology"] },
    { username: "ahmedabady347", name: "Ahmed Darwish", classes: ["1A", "2A", "3A", "4A", "4B", "4C", "5A", "5B", "5C"], subjects: ["ICT"] },
    { username: "ahmed.ashraf.saad9", name: "Ahmed Ashraf", classes: ["6A", "6B", "6C", "6G", "7A", "7B", "7C", "7G", "8A", "8G"], subjects: ["ICT"] },
    { username: "mryossri", name: "Yousry Ahmed", classes: ["9A", "9B", "9C", "10A", "10B", "11A", "11B", "11C", "12A", "12B"], subjects: ["ICT", "Internet of Things"] },
    { username: "khalilataky", name: "Khalil Ataky", classes: ["4A", "4B", "4C", "5A", "5B", "5C", "6A", "6B", "6C", "6G", "7A", "7B", "7C", "7G", "8A", "8G", "9A", "9B", "9C"], subjects: ["French"] },
    { username: "moh1133ele", name: "Mohamed Alwany", classes: ["1A", "2A", "4A", "4B", "4C"], subjects: ["Islamic", "Arabic"] },
    { username: "mahmoudhmoawwad", name: "Mahmoud Moawwad", classes: ["2A", "3A"], subjects: ["Islamic", "Arabic"] },
    { username: "mmjdy4157", name: "Mahmoud Magdy", classes: ["6C", "6G", "7A", "7B", "7C"], subjects: ["Arabic"] },
    { username: "tareqalsolami39", name: "Tariq Alsalami", classes: ["5A", "5B", "5C", "6A", "6B"], subjects: ["Arabic"] },
    { username: "mddsir5", name: "Mohammed Almatrafi", classes: ["7G", "8A", "8G", "9A", "9B", "9C"], subjects: ["Arabic"] },
    { username: "malekelazb8", name: "Mohamed Shehata", classes: ["10A", "10B", "11A", "11B", "11C", "12A", "12B"], subjects: ["Arabic"] },
    { username: "aymanelgamal9", name: "Ayman Algamal", classes: ["5B", "5C", "7A", "7B"], subjects: ["Islamic"] },
    { username: "ahmadalolyany", name: "Ahmed Alsulami", classes: ["4A", "4B", "4C", "5A"], subjects: ["Islamic"] },
    { username: "alazwari.93", name: "Mohamed Alazwari", classes: ["7C", "7G", "8A", "8G"], subjects: ["Islamic"] },
    { username: "shaddad.atiyah", name: "Shaddad Atiyah", classes: ["9A", "9B", "9C", "10B"], subjects: ["Islamic"] },
    { username: "m-e-m159", name: "Yousef Alsalami", classes: ["10A", "11A", "11B", "11C", "12A", "12B"], subjects: ["Islamic"] },
    { username: "m7md.456.ksa", name: "Mohammad Almahmadi", classes: ["4A", "4B", "4C", "5A", "5B", "5C", "6A", "6B", "6C", "6G", "7B", "7C"], subjects: ["Social Arabic"] },
    { username: "sultanalhazmi11", name: "Sultan Alhazmi", classes: ["7A", "7G", "8A", "8G", "9A", "9B", "9C", "10A", "10B", "11A", "11B", "11C", "12A", "12B"], subjects: ["Social Arabic"] },
    { username: "hanyhashem1881", name: "Hany Hashem", classes: ["1A"], subjects: ["Science", "English", "Math", "Social Studies", "Life Skills"] },
    { username: "osamakamara", name: "Osama Kamara", classes: ["7A", "7B", "7C", "8A", "9A"], subjects: ["Science"] },
    { username: "abdelrahman221317", name: "Abdelrahman Mostafa", classes: ["3A", "4A", "4B", "4C", "6A", "6B", "6C", "6G", "7A", "7B", "7C"], subjects: ["Social Studies", "Life Skills"] },
    { username: "m.budran", name: "Mohamed Salah", classes: ["5A", "5B", "5C"], subjects: ["English", "Social Studies", "Life Skills"] },
  ];

  console.log(`Creating ${teachersData.length} teachers...`);

  let counter = 0;

  for (const t of teachersData) {
    // Resolve uuids, skipping names that don't exist
    const classConnects = t.classes
      .map((n) => classMap.get(n))
      .filter((id): id is string => Boolean(id));
    const subjectConnects = t.subjects
      .map((n) => subjectMap.get(n))
      .filter((id): id is string => Boolean(id));

    const missingClasses = t.classes.filter((n) => !classMap.has(n));
    const missingSubjects = t.subjects.filter((n) => !subjectMap.has(n));
    if (missingClasses.length || missingSubjects.length) {
      console.warn(
        `⚠ ${t.username}: skipping unknown refs — classes: [${missingClasses.join(", ")}], subjects: [${missingSubjects.join(", ")}]`
      );
    }

    await prisma.user.create({
      data: {
        username: t.username,
        name: t.name,
        password: teacherPlainPassword,
        role: Role.TEACHER,
        classes: { connect: classConnects.map((id) => ({ id })) },
        subjects: { connect: subjectConnects.map((id) => ({ id })) },
      },
    });

    counter++;
    if (counter % 5 === 0) {
      console.log(`✔ ${counter} teachers created`);
    }
  }

  console.log(`✅ Seed completed successfully! (${counter} teachers, admin: ${admin.username})`);
  console.log("Admin → admin / admin123");
  console.log("Teachers → username / P@55word");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });