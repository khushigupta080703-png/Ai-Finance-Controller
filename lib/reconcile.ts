type Invoice = { id: string; invoiceNo: string; clientName: string; amount: number; date: string };
type Payment = { id: string; paymentRef: string; amount: number; date: string; note: string };

async function askGrok(prompt: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return text.replace(/```json|```/g, "").trim();
}

export async function reconcile(invoices: Invoice[], payments: Payment[]) {
  const usedPayments = new Set<string>();
  const results: any[] = [];

  // PASS 1: Exact match — same reference, ya same amount+date
  for (const inv of invoices) {
    const exact = payments.find(
      (p) =>
        !usedPayments.has(p.id) &&
        (p.paymentRef === inv.invoiceNo || (p.amount === inv.amount && p.date === inv.date))
    );
    if (exact) {
      usedPayments.add(exact.id);
      results.push({
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        status: "matched",
        paymentId: exact.id,
        confidence: 100,
        reason: "Exact match on reference/amount/date",
      });
    }
  }

  const unmatchedInvoices = invoices.filter((inv) => !results.find((r) => r.invoiceId === inv.id));

  // PASS 2: Ambiguous cases ke liye Grok se reasoning karwao
  for (const inv of unmatchedInvoices) {
    const candidates = payments
      .filter((p) => !usedPayments.has(p.id))
      .filter((p) => Math.abs(p.amount - inv.amount) < inv.amount * 0.6)
      .slice(0, 5);

    if (candidates.length === 0) {
      results.push({
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        status: "exception",
        paymentId: null,
        confidence: 0,
        reason: "No candidate payment found in bank records",
      });
      continue;
    }

    const prompt = `You are a reconciliation agent for a small business.

Invoice:
${JSON.stringify(inv)}

Candidate payments (pick the best match, or none):
${JSON.stringify(candidates)}

Rules:
- Amount can differ by up to 2% (rounding) and still be a match.
- If payment amount is significantly less, it is a PARTIAL payment — not a full match. Mark as not matched, explain it's partial.
- Date can differ by up to 5 days and still count as a match (bank clearing delay).
- If nothing fits, matched must be false.

Respond with ONLY this JSON, no other text:
{"matched": true or false, "paymentId": "id or null", "confidence": 0-100, "reason": "short explanation"}`;

    const text = await askGrok(prompt);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { matched: false, paymentId: null, confidence: 0, reason: "Could not parse AI response" };
    }

    if (parsed.matched && parsed.paymentId) {
      usedPayments.add(parsed.paymentId);
    }

    results.push({
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      status: parsed.matched ? "matched" : "exception",
      paymentId: parsed.matched ? parsed.paymentId : null,
      confidence: parsed.confidence,
      reason: parsed.reason,
    });
  }

  const matched = results.filter((r) => r.status === "matched").length;
  const matchRate = Math.round((matched / invoices.length) * 1000) / 10;

  return { results, matchRate, matched, total: invoices.length };
}