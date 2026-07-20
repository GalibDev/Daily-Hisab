import type { Entry } from "@/types";

type SummaryRow = {
  date: string;
  income: number;
  expense: number;
  entries: number;
  balance: number;
};

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function downloadFromServer(filename: string, blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  const frameName = "daily-hisab-download-frame";
  let frame = document.querySelector<HTMLIFrameElement>(`iframe[name="${frameName}"]`);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.name = frameName;
    frame.hidden = true;
    document.body.appendChild(frame);
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/download";
  form.target = frameName;
  form.hidden = true;
  for (const [name, value] of [["filename", filename], ["type", blob.type], ["content", window.btoa(binary)]]) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function downloadFile(filename: string, content: string, type: string) {
  downloadBlob(filename, new Blob([content], { type }));
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

export async function exportExpenseSheetCsv(entries: Entry[], title: string) {
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const totalExpense = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const header = ["Date", "Expense Amount", "Category", "Description", "Note"];
  const rows = expenseEntries.map((entry) => [
    entry.date,
    entry.amount,
    entry.category,
    entry.description || "",
    entry.note || "",
  ]);
  const csv = [
    [title],
    ["Total Expense", totalExpense],
    [],
    header,
    ...rows,
  ].map((row) => row.map(csvEscape).join(",")).join("\n");

  const filename = `daily-hisab-${title.toLowerCase().replaceAll(" ", "-")}.csv`;
  await downloadFromServer(filename, new Blob([`\uFEFF${csv}`], { type: "application/vnd.ms-excel" }));
  return true;
}

function dataUrlBytes(dataUrl: string) {
  const binary = window.atob(dataUrl.split(",")[1]);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createImagePdf(images: Array<{ bytes: Uint8Array; width: number; height: number }>) {
  const encoder = new TextEncoder();
  const objectCount = 2 + images.length * 3;
  const objects: Uint8Array[][] = Array.from({ length: objectCount + 1 }, () => []);
  const pageNumbers = images.map((_, index) => 3 + index * 3);

  objects[1] = [encoder.encode("<< /Type /Catalog /Pages 2 0 R >>")];
  objects[2] = [encoder.encode(`<< /Type /Pages /Kids [${pageNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${images.length} >>`)];

  images.forEach((image, index) => {
    const pageNumber = 3 + index * 3;
    const imageNumber = pageNumber + 1;
    const contentNumber = pageNumber + 2;
    const imageName = `Im${index}`;
    const content = `q 595.28 0 0 841.89 0 0 cm /${imageName} Do Q`;

    objects[pageNumber] = [encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /${imageName} ${imageNumber} 0 R >> >> /Contents ${contentNumber} 0 R >>`)];
    objects[imageNumber] = [
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),
      image.bytes,
      encoder.encode("\nendstream"),
    ];
    objects[contentNumber] = [encoder.encode(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)];
  });

  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let length = chunks[0].length;

  for (let number = 1; number <= objectCount; number += 1) {
    offsets[number] = length;
    const start = encoder.encode(`${number} 0 obj\n`);
    const end = encoder.encode("\nendobj\n");
    chunks.push(start, ...objects[number], end);
    length += start.length + objects[number].reduce((sum, chunk) => sum + chunk.length, 0) + end.length;
  }

  const xrefOffset = length;
  const xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && context.measureText(`${text}...`).width > maxWidth) text = text.slice(0, -1);
  return `${text}...`;
}

function createExpensePdf(entries: Entry[], title: string) {
  const expenses = entries.filter((entry) => entry.type === "expense");
  const total = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const pageWidth = 1240;
  const pageHeight = 1754;
  const margin = 70;
  const rowHeight = 72;
  const columns = [190, 180, 240, 320, 170];
  const rowsPerPage = 17;
  const pages = Math.max(1, Math.ceil(expenses.length / rowsPerPage));
  const images: Array<{ bytes: Uint8Array; width: number; height: number }> = [];

  for (let page = 0; page < pages; page += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PDF canvas is unavailable");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageWidth, pageHeight);
    context.fillStyle = "#11298f";
    context.font = "700 44px 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
    context.fillText(title, margin, 100);
    context.fillStyle = "#59627a";
    context.font = "600 24px 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
    context.fillText(`Total Expense: ${total.toFixed(2)} | Page ${page + 1} of ${pages}`, margin, 148);

    const startY = 205;
    const headers = ["Date", "Amount", "Category", "Description", "Note"];
    let x = margin;
    context.fillStyle = "#f3f6ff";
    context.fillRect(margin, startY, columns.reduce((sum, width) => sum + width, 0), rowHeight);
    context.font = "700 22px 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
    context.fillStyle = "#111936";
    headers.forEach((header, index) => {
      context.fillText(header, x + 12, startY + 44);
      x += columns[index];
    });

    const pageEntries = expenses.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    pageEntries.forEach((entry, rowIndex) => {
      const y = startY + rowHeight * (rowIndex + 1);
      context.fillStyle = rowIndex % 2 === 0 ? "#ffffff" : "#fbfcff";
      context.fillRect(margin, y, columns.reduce((sum, width) => sum + width, 0), rowHeight);
      context.strokeStyle = "#d8ddea";
      context.strokeRect(margin, y, columns.reduce((sum, width) => sum + width, 0), rowHeight);
      const values = [entry.date, entry.amount.toFixed(2), entry.category, entry.description || "-", entry.note || "-"];
      x = margin;
      context.fillStyle = "#252139";
      context.font = "500 21px 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
      values.forEach((value, index) => {
        context.fillText(fitText(context, value, columns[index] - 24), x + 12, y + 44);
        x += columns[index];
      });
    });

    if (pageEntries.length === 0) {
      context.fillStyle = "#59627a";
      context.font = "500 24px 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
      context.fillText("No expense data found.", margin + 12, startY + rowHeight + 44);
    }

    images.push({ bytes: dataUrlBytes(canvas.toDataURL("image/jpeg", 0.9)), width: pageWidth, height: pageHeight });
  }

  return createImagePdf(images);
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

export async function exportExpenseSheetPdf(entries: Entry[], title: string) {
  try {
    const filename = `daily-hisab-${title.toLowerCase().replaceAll(" ", "-")}.pdf`;
    await downloadFromServer(filename, createExpensePdf(entries, title));
    return true;
  } catch {
    return false;
  }
}
