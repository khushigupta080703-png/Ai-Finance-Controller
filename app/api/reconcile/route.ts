import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { reconcile } from "@/lib/reconcile";

const prisma = new PrismaClient();

export async function POST() {
  const invoices = await prisma.invoice.findMany();
  const payments = await prisma.payment.findMany();

  const { results, matchRate, matched, total } = await reconcile(invoices, payments);

  const run = await prisma.reconciliationRun.create({
    data: {
      matchRate,
      totalRecords: total,
      matchedCount: matched,
      exceptions: JSON.stringify(results.filter((r) => r.status === "exception")),
      results: JSON.stringify(results),
    },
  });

  return NextResponse.json({ runId: run.id, matchRate, matched, total, results });
}