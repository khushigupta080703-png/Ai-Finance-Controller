"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function runReconciliation() {
    setLoading(true);
    const res = await fetch("/api/reconcile", { method: "POST" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  const exceptions = data?.results.filter((r: any) => r.status === "exception") || [];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-6">
        <p className="text-xs font-mono tracking-widest text-muted-foreground mb-1">TRACK 04 · AI FINANCE CONTROLLER</p>
        <h1 className="text-3xl font-bold">Multi-Source Reconciliation</h1>
        <p className="text-muted-foreground mt-1">Matching invoices against bank payments — reporting match rate and honest exceptions.</p>
      </div>

      <Button onClick={runReconciliation} disabled={loading} size="lg">
        {loading ? "Reconciling..." : "Run Reconciliation Agent"}
      </Button>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4 my-6">
            <Card className="p-5">
              <div className="text-xs font-mono tracking-widest text-muted-foreground mb-2">TOTAL INVOICES</div>
              <div className="text-3xl font-bold">{data.total}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs font-mono tracking-widest text-muted-foreground mb-2">MATCH RATE</div>
              <div className="text-3xl font-bold text-green-600">{data.matchRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">{data.matched} of {data.total} matched</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs font-mono tracking-widest text-muted-foreground mb-2">EXCEPTIONS</div>
              <div className="text-3xl font-bold text-red-500">{exceptions.length}</div>
              <div className="text-xs text-muted-foreground mt-1">need human review</div>
            </Card>
          </div>

          <Card className="p-6 mb-6 border-red-200">
            <div className="text-xs font-mono tracking-widest text-red-500 mb-4">
              EXCEPTION REPORT — {exceptions.length} UNRESOLVED
            </div>
            <div className="space-y-3">
              {exceptions.map((r: any) => (
                <div key={r.invoiceId} className="flex items-start justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{r.invoiceNo}</span>
                    <div className="text-xs text-red-500 mt-0.5">{r.reason}</div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{r.confidence}% confidence</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b">
              <span className="text-xs font-mono tracking-widest text-muted-foreground">
                FULL RECONCILIATION — {data.total} INVOICES
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((r: any) => (
                    <TableRow key={r.invoiceId}>
                      <TableCell className="font-mono text-xs">{r.invoiceNo}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "matched" ? "default" : "destructive"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.confidence}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}