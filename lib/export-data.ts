import type { Entry } from "@/types";

type SummaryRow = {
  date: string;
  income: number;
  expense: number;
  entries: number;
  balance: number;
};

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function exportEntriesCsv(entries: Entry[], summaryRows: SummaryRow[]) {
  const entryHeader = ["Date", "Category", "Description", "Type", "Amount", "Method", "Time", "Note"];
  const entryRows = entries.map((entry) => [
    entry.date,
    entry.category,
    entry.description,
    entry.type,
    entry.amount,
    entry.method,
    entry.time,
    entry.note ?? "",
  ]);
  const summaryHeader = ["Summary Date", "Income", "Expense", "Entries", "Balance"];
  const summary = summaryRows.map((row) => [row.date, row.income, row.expense, row.entries, row.balance]);
  const csv = [
    entryHeader,
    ...entryRows,
    [],
    summaryHeader,
    ...summary,
  ].map((row) => row.map(csvEscape).join(",")).join("\n");

  downloadFile("daily-hisab-report.csv", csv, "text/csv;charset=utf-8");
}

export function exportDataJson(data: { entries: Entry[]; categories: string[]; summaryRows: SummaryRow[]; [key: string]: unknown }) {
  downloadFile("daily-hisab-data.json", JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

export function exportReportPdf(entries: Entry[], summaryRows: SummaryRow[]) {
  const rows = entries.map((entry) => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.category}</td>
      <td>${entry.description}</td>
      <td>${entry.type}</td>
      <td>${entry.amount}</td>
      <td>${entry.method}</td>
    </tr>
  `).join("");
  const summary = summaryRows.map((row) => `
    <tr>
      <td>${row.date}</td>
      <td>${row.income}</td>
      <td>${row.expense}</td>
      <td>${row.entries}</td>
      <td>${row.balance}</td>
    </tr>
  `).join("");
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    return false;
  }

  win.document.write(`
    <html>
      <head>
        <title>Daily Hisab Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #171424; }
          h1 { color: #6C4CF1; }
          table { width: 100%; border-collapse: collapse; margin: 18px 0 28px; }
          th, td { border: 1px solid #e7e2fb; padding: 9px; text-align: left; font-size: 12px; }
          th { background: #f4f1ff; }
        </style>
      </head>
      <body>
        <h1>Daily Hisab Report</h1>
        <h2>Monthly Summary</h2>
        <table>
          <thead><tr><th>Date</th><th>Income</th><th>Expense</th><th>Entries</th><th>Balance</th></tr></thead>
          <tbody>${summary}</tbody>
        </table>
        <h2>Entries</h2>
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Type</th><th>Amount</th><th>Method</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
  return true;
}
