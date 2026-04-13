/**
 * Gerador de relatórios PDF profissionais
 * Utiliza jsPDF + autoTable para gerar PDFs com cabeçalho institucional
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  hospitalNome?: string;
  userName?: string;
  /** Orientation: portrait or landscape */
  orientation?: "portrait" | "landscape";
  /** Filters applied (shown in header) */
  filters?: Record<string, string>;
}

interface TableSection {
  type: "table";
  headers: string[];
  rows: (string | number)[][];
  /** Column widths as percentage (should sum ~100) */
  columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>;
}

interface TextSection {
  type: "text";
  content: string;
  bold?: boolean;
  fontSize?: number;
}

interface KpiSection {
  type: "kpi";
  items: { label: string; value: string | number }[];
}

interface SeparatorSection {
  type: "separator";
}

export type ReportSection = TableSection | TextSection | KpiSection | SeparatorSection;

const COLORS = {
  primary: [30, 58, 95] as [number, number, number],       // #1e3a5f
  secondary: [100, 116, 139] as [number, number, number],  // #64748b
  headerBg: [235, 240, 248] as [number, number, number],   // #ebf0f8
  border: [200, 210, 225] as [number, number, number],     // #c8d2e1
  success: [22, 163, 74] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
};

function addHeader(doc: jsPDF, options: PdfReportOptions) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Top accent line
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 3, "F");

  let y = 12;

  // Hospital name
  if (options.hospitalNome) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.primary);
    doc.text(options.hospitalNome, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Sistema PsiRumoCerto — Farmácia Hospitalar", margin, y);
    y += 6;
  }

  // Divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.text);
  doc.text(options.title, margin, y);

  // Timestamp on right
  const timestamp = new Date().toLocaleString("pt-BR");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(timestamp, pageW - margin, y, { align: "right" });
  y += 5;

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.secondary);
    doc.text(options.subtitle, margin, y);
    y += 5;
  }

  // Filters
  if (options.filters && Object.keys(options.filters).length > 0) {
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    const filterStr = Object.entries(options.filters)
      .map(([k, v]) => `${k}: ${v}`)
      .join("  |  ");
    doc.text(filterStr, margin, y);
    y += 4;
  }

  return y + 4;
}

function addFooter(doc: jsPDF, options: PdfReportOptions) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);

    // Left: user
    doc.text(`Gerado por: ${options.userName || "—"}`, margin, pageH - 8);

    // Center: hospital
    if (options.hospitalNome) {
      doc.text(options.hospitalNome, pageW / 2, pageH - 8, { align: "center" });
    }

    // Right: page number
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
  }
}

export function generatePdfReport(
  options: PdfReportOptions,
  sections: ReportSection[]
): void {
  const doc = new jsPDF({
    orientation: options.orientation || "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, options);

  for (const section of sections) {
    // Check if we need a new page (leave room for footer)
    if (y > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = addHeader(doc, options);
    }

    switch (section.type) {
      case "kpi": {
        const kpiW = (pageW - margin * 2 - (section.items.length - 1) * 3) / section.items.length;
        section.items.forEach((item, idx) => {
          const x = margin + idx * (kpiW + 3);
          doc.setFillColor(...COLORS.headerBg);
          doc.roundedRect(x, y, kpiW, 14, 2, 2, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...COLORS.muted);
          doc.text(item.label.toUpperCase(), x + 4, y + 5);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(...COLORS.text);
          doc.text(String(item.value), x + 4, y + 11);
        });
        y += 18;
        break;
      }

      case "text": {
        doc.setFont("helvetica", section.bold ? "bold" : "normal");
        doc.setFontSize(section.fontSize || 10);
        doc.setTextColor(...COLORS.text);
        const lines = doc.splitTextToSize(section.content, pageW - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * (section.fontSize || 10) * 0.4 + 4;
        break;
      }

      case "table": {
        autoTable(doc, {
          startY: y,
          head: [section.headers],
          body: section.rows.map(r => r.map(String)),
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            textColor: COLORS.text,
            lineColor: COLORS.border,
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: COLORS.primary,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.5,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: section.columnStyles || {},
          didDrawPage: (data) => {
            // Re-add header on new pages
            if (data.pageNumber > 1) {
              addHeader(doc, options);
            }
          },
        });
        y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
        break;
      }

      case "separator": {
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
        break;
      }
    }
  }

  addFooter(doc, options);

  // Download
  const filename = `${options.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/** Status color badge text for printable reports */
export function statusText(status: string): string {
  switch (status) {
    case "normal": return "✅ Normal";
    case "baixo": return "⚠️ Baixo";
    case "critico": return "🔴 Crítico";
    case "esgotado": return "⛔ Esgotado";
    default: return status;
  }
}
