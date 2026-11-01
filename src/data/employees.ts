import { seeded } from "../lib/seeded";
import type { Branch, Employee, EmployeeStatus } from "../types";

/** Fictional names assembled for the demo. None refer to real staff. */
const GIVEN = [
  "Ayesha", "Bilal", "Sana", "Usman", "Hira", "Fahad", "Maham", "Omar", "Zainab", "Hamza",
  "Iqra", "Saad", "Mehwish", "Asad", "Rabia", "Danish", "Nida", "Kamran", "Sadia", "Taimur",
  "Amna", "Junaid", "Laiba", "Waqas", "Maryam", "Shahzaib", "Komal", "Imran", "Fatima", "Haider",
];
const FAMILY = [
  "Ahmed", "Malik", "Qureshi", "Siddiqui", "Khan", "Sheikh", "Baloch", "Memon", "Raza", "Abbasi",
  "Javed", "Hashmi", "Chaudhry", "Mirza", "Shah", "Afridi", "Butt", "Khattak", "Soomro", "Rizvi",
  "Awan", "Niazi", "Bhatti", "Durrani",
];

const LEADERSHIP: [string, string][] = [
  ["Branch Manager", "Management"],
  ["Operations Manager", "Operations"],
  ["Compliance Officer", "Compliance"],
];
const ROLES: [string, string][] = [
  ["Customer Service Officer", "Customer Service"],
  ["Teller", "Operations"],
  ["Relationship Manager", "Retail Banking"],
  ["Credit Officer", "Lending"],
  ["Teller", "Operations"],
  ["Customer Service Officer", "Customer Service"],
  ["IT Support Officer", "Technology"],
  ["Cash Officer", "Operations"],
  ["Personal Banker", "Retail Banking"],
  ["Trade Services Officer", "Corporate Services"],
  ["Priority Banking Manager", "Retail Banking"],
];

const ISLAMIC_ROLE: [string, string] = ["Islamic Banking Officer", "Islamic Banking"];

export function getEmployees(branch: Branch): Employee[] {
  const rand = seeded(`${branch.id}-people`);
  const prefix = branch.id.slice(3);

  return Array.from({ length: branch.staff }, (_, i) => {
    const role = ROLES[(i - LEADERSHIP.length) % ROLES.length];
    const [designation, department] =
      LEADERSHIP[i] ?? (branch.type === "Islamic" && role[1] === "Retail Banking" ? ISLAMIC_ROLE : role);
    const roll = rand();
    const status: EmployeeStatus = i === 0 || roll < 0.84 ? "On Duty" : roll < 0.93 ? "On Leave" : "Training";
    return {
      id: `EMP-${prefix}${String(i + 1).padStart(2, "0")}`,
      name: `${GIVEN[Math.floor(rand() * GIVEN.length)]} ${FAMILY[Math.floor(rand() * FAMILY.length)]}`,
      designation,
      department,
      status,
    };
  });
}
