import { prisma } from "./prisma";
import { AppError } from "../middleware/error";

export async function assertLocation(id: number) {
  const found = await prisma.location.findUnique({ where: { id } });
  if (!found) throw new AppError(422, "Please choose a valid location.");
}