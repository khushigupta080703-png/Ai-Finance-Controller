import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();

  const clients = ["Acme Corp", "Beta LLC", "Gamma Inc", "Delta Co", "Nova Traders"];

  for (let i = 0; i < 55; i++) {
    const invoiceNo = `INV-${1000 + i}`;
    const amount = faker.number.float({ min: 300, max: 5000, fractionDigits: 2 });
    const date = faker.date
      .between({ from: "2026-06-01", to: "2026-06-28" })
      .toISOString()
      .slice(0, 10);
    const client = clients[Math.floor(Math.random() * clients.length)];

    await prisma.invoice.create({
      data: { invoiceNo, clientName: client, amount, date },
    });

    const roll = Math.random();
    if (roll < 0.72) {
      await prisma.payment.create({
        data: { paymentRef: invoiceNo, amount, date, note: `Payment for ${invoiceNo}` },
      });
    } else if (roll < 0.85) {
      await prisma.payment.create({
        data: { paymentRef: "", amount, date, note: `Wire transfer ${client}` },
      });
    } else if (roll < 0.93) {
      const partial = Math.round(amount * 0.6 * 100) / 100;
      await prisma.payment.create({
        data: { paymentRef: "", amount: partial, date, note: `Partial payment ${client}` },
      });
    }
  }

  console.log("Seed complete: 55 invoices generated.");
}

main().finally(() => prisma.$disconnect());