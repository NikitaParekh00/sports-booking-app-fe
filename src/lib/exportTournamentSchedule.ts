import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { formatDoublesPlayersLineCompact, parseDoublesMatchNotes } from "@/lib/generateBalancedDoublesSchedule";

type LogoAssets = { normal: string };
let logoDataUrlPromise: Promise<LogoAssets | null> | null = null;

async function getSimplifitLogoDataUrl(): Promise<LogoAssets | null> {
    if (typeof window === "undefined") return null;
    if (!logoDataUrlPromise) {
        logoDataUrlPromise = fetch("/logo.jpeg")
            .then(async (res) => {
                if (!res.ok) return null;
                const blob = await res.blob();
                const normal = await new Promise<string | null>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
                if (!normal) return null;

                return { normal };
            })
            .catch(() => null);
    }
    return logoDataUrlPromise;
}

/** Strip trailing (category); map legacy `Club X` → `Team X` for display (matches schedule cards). */
function formatTeamDisplayName(teamName: string): string {
    let s = teamName.replace(/\s+\([^)]+\)\s*$/, "").trim();
    if (/^Club\s+/i.test(s)) {
        s = s.replace(/^Club\s+/i, "Team ");
    }
    return s || teamName;
}

export type MatchForScheduleExport = {
    match_number?: string | null;
    match_date?: string | null;
    court_number?: string | null;
    status?: string | null;
    notes?: string | null;
    team_a?: { name: string } | null;
    team_b?: { name: string } | null;
};

export type ScheduleExportRow = {
    matchNumber: string;
    dateStr: string;
    court: string;
    teamA: string;
    teamB: string;
    lineups: string;
    status: string;
};

function scheduleMatchDateMs(m: MatchForScheduleExport): number {
    return m.match_date ? new Date(m.match_date).getTime() : Number.POSITIVE_INFINITY;
}

function scheduleMatchNumKey(m: MatchForScheduleExport): number {
    const x = (m.match_number || "").match(/\d+/);
    return x ? parseInt(x[0], 10) : Number.MAX_SAFE_INTEGER;
}

export function buildScheduleExportRows(matches: MatchForScheduleExport[]): ScheduleExportRow[] {
    const sorted = [...matches].sort((a, b) => {
        const da = scheduleMatchDateMs(a);
        const db = scheduleMatchDateMs(b);
        if (da !== db) return da - db;
        return scheduleMatchNumKey(a) - scheduleMatchNumKey(b);
    });
    return sorted.map((m) => {
        const d = parseDoublesMatchNotes(m.notes ?? null);
        const lineups = d
            ? formatDoublesPlayersLineCompact(d, { includeCategories: false })
            : (m.notes?.trim() || "—");
        const dateStr = m.match_date
            ? new Date(m.match_date).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
              })
            : "—";
        const nameA = m.team_a?.name ?? "—";
        const nameB = m.team_b?.name ?? "—";
        return {
            matchNumber: m.match_number?.trim() || "—",
            dateStr,
            court: m.court_number?.trim() || "—",
            teamA: formatTeamDisplayName(nameA),
            teamB: formatTeamDisplayName(nameB),
            lineups,
            status: m.status?.trim() || "—",
        };
    });
}

function safeFileBase(name: string, suffix: string): string {
    const base = name
        .replace(/[/\\?%*:|"<>]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 72);
    return `${base || "tournament"}_${suffix}`;
}

export function downloadScheduleXlsx(
    tournamentName: string,
    rows: ScheduleExportRow[],
    filterLabel?: string,
    resolveCourtDisplay?: (rawCourt: string) => string,
): void {
    const sheetRows = rows.map((r) => ({
        "Match #": r.matchNumber,
        "Date & time": r.dateStr,
        Court: r.court === "—" ? "—" : resolveCourtDisplay ? resolveCourtDisplay(r.court) : r.court,
        "Team A": r.teamA,
        "Team B": r.teamB,
        Lineups: r.lineups,
        Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const colW = [{ wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 55 }, { wch: 12 }];
    ws["!cols"] = colW;
    const wb = XLSX.utils.book_new();
    const sheetName = (filterLabel ? "Schedule filtered" : "Schedule").replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fname = safeFileBase(tournamentName, filterLabel ? "schedule_filtered" : "schedule") + ".xlsx";
    XLSX.writeFile(wb, fname);
}

export async function downloadSchedulePdf(
    tournamentName: string,
    rows: ScheduleExportRow[],
    filterLabel?: string,
    resolveCourtHeader?: (rawCourtKey: string) => string,
): Promise<void> {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const maxW = pageW - margin * 2;
    let y = margin;

    const badgeColors = (status: string): { fill: [number, number, number]; text: [number, number, number] } => {
        const s = status.toLowerCase();
        if (s === "completed") return { fill: [236, 253, 245] as const, text: [22, 101, 52] as const };
        if (s === "live") return { fill: [220, 252, 231] as const, text: [21, 128, 61] as const };
        return { fill: [219, 234, 254] as const, text: [30, 64, 175] as const };
    };

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(tournamentName, margin, y);
    y += 7.5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const sub =
        (filterLabel ? `${filterLabel} • ` : "") +
        `${rows.length} match${rows.length === 1 ? "" : "es"} • ${new Date().toLocaleString()}`;
    const subLines = doc.splitTextToSize(sub, maxW);
    doc.text(subLines, margin, y);
    y += subLines.length * 4 + 4;

    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    const cardGap = 3;
    const cardPad = 2.8;
    const courtHeaderH = 7;
    const colGap = 4;
    const maxCardsPerCourtPerPage = 3;

    const courtNum = (court: string) => {
        const n = parseInt(String(court || "").replace(/\D/g, ""), 10);
        return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };

    const groups = new Map<string, ScheduleExportRow[]>();
    for (const r of rows) {
        const ck = (r.court || "").trim() || "—";
        if (!groups.has(ck)) groups.set(ck, []);
        groups.get(ck)!.push(r);
    }
    const orderedCourtKeys = [...groups.keys()].sort((a, b) => {
        const na = courtNum(a);
        const nb = courtNum(b);
        if (na !== nb) return na - nb;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });

    const splitLineupSides = (lineups: string): { sideA: string; sideB: string } => {
        const raw = (lineups || "").trim();
        if (!raw || raw === "—") return { sideA: "", sideB: "" };
        const parts = raw.split(/\s+vs\s+/i);
        if (parts.length >= 2) {
            return { sideA: parts[0].trim(), sideB: parts.slice(1).join(" vs ").trim() };
        }
        return { sideA: raw, sideB: "" };
    };

    const estimateCardHeight = (r: ScheduleExportRow, w: number): number => {
        const lineupSource = r.lineups === "—" ? "" : r.lineups;
        const { sideA, sideB } = splitLineupSides(lineupSource);
        const sideW = w - cardPad * 2 - 2;
        const sideALines = sideA ? doc.splitTextToSize(sideA, sideW).slice(0, 2) : [];
        const sideBLines = sideB ? doc.splitTextToSize(sideB, sideW).slice(0, 2) : [];
        const topPart = 12.5; // meta + divider + team line
        const sideAH = sideALines.length > 0 ? 3.5 + sideALines.length * 3.4 + 3 : 0;
        const sideBH = sideBLines.length > 0 ? 3.5 + sideBLines.length * 3.4 + 3 : 0;
        const vsGap = sideAH > 0 && sideBH > 0 ? 5.5 : 0;
        return topPart + sideAH + vsGap + sideBH + cardPad;
    };

    const drawMatchCard = (r: ScheduleExportRow, x: number, top: number, w: number): number => {
        const meta = `${r.matchNumber} • ${r.dateStr}`;
        const duel = `${r.teamA} vs ${r.teamB}`;
        const statusLabel = (r.status || "upcoming").toLowerCase();
        const badge = badgeColors(statusLabel);
        const lineupSource = r.lineups === "—" ? "" : r.lineups;
        const { sideA, sideB } = splitLineupSides(lineupSource);
        const sideW = w - cardPad * 2 - 2;
        const sideALines = sideA ? doc.splitTextToSize(sideA, sideW).slice(0, 2) : [];
        const sideBLines = sideB ? doc.splitTextToSize(sideB, sideW).slice(0, 2) : [];
        const cardH = estimateCardHeight(r, w);

        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, top, w, cardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(17, 24, 39);
        doc.text(meta, x + cardPad, top + 4.6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        const badgeW = Math.max(16, doc.getTextWidth(statusLabel) + 5);
        const bx = x + w - cardPad - badgeW;
        const by = top + 1.8;
        doc.setFillColor(badge.fill[0], badge.fill[1], badge.fill[2]);
        doc.roundedRect(bx, by, badgeW, 4.4, 1.2, 1.2, "F");
        doc.setTextColor(badge.text[0], badge.text[1], badge.text[2]);
        doc.text(statusLabel, bx + badgeW / 2, by + 3, { align: "center" });

        doc.setDrawColor(243, 244, 246);
        doc.line(x + cardPad, top + 6.8, x + w - cardPad, top + 6.8);

        let lineY = top + 10.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(17, 24, 39);
        doc.text(duel, x + cardPad, lineY);

        if (sideALines.length > 0 || sideBLines.length > 0) {
            lineY += 2.7;

            const hasA = sideALines.length > 0;
            if (hasA) {
                const aH = 3.5 + sideALines.length * 3.4 + 3;
                doc.setFillColor(239, 246, 255);
                doc.setDrawColor(191, 219, 254);
                doc.roundedRect(x + cardPad, lineY, sideW + 2, aH, 1.5, 1.5, "FD");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 58, 138);
                doc.text(sideALines, x + cardPad + 1.2, lineY + 4);
                lineY += aH;
            }

            if (hasA && sideBLines.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.setTextColor(156, 163, 175);
                doc.text("vs", x + w / 2, lineY + 3.8, { align: "center" });
                lineY += 5.5;
            }

            if (sideBLines.length > 0) {
                const bH = 3.5 + sideBLines.length * 3.4 + 3;
                doc.setFillColor(255, 251, 235);
                doc.setDrawColor(253, 230, 138);
                doc.roundedRect(x + cardPad, lineY, sideW + 2, bH, 1.5, 1.5, "FD");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(146, 64, 14);
                doc.text(sideBLines, x + cardPad + 1.2, lineY + 4);
            }
        }
        return cardH;
    };

    const courtsPerRow = Math.min(3, Math.max(1, orderedCourtKeys.length));
    const courtBatches: string[][] = [];
    for (let i = 0; i < orderedCourtKeys.length; i += courtsPerRow) {
        courtBatches.push(orderedCourtKeys.slice(i, i + courtsPerRow));
    }

    for (let b = 0; b < courtBatches.length; b++) {
        const batch = courtBatches[b];
        const colW = (maxW - colGap * (batch.length - 1)) / batch.length;
        const idxByCourt: Record<string, number> = {};
        batch.forEach((k) => {
            idxByCourt[k] = 0;
        });
        let firstPageForBatch = true;

        while (batch.some((k) => idxByCourt[k] < (groups.get(k)?.length || 0))) {
            if (!firstPageForBatch) {
                doc.addPage();
                y = margin;
            }
            const topY = y;
            const colY: number[] = [];
            const cardsPlacedByCourt: Record<string, number> = {};

            // Court headers in one line.
            batch.forEach((courtKey, i) => {
                const x = margin + i * (colW + colGap);
                doc.setFillColor(249, 250, 251);
                doc.setDrawColor(229, 231, 235);
                doc.roundedRect(x, topY, colW, courtHeaderH, 1.8, 1.8, "FD");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(31, 41, 55);
                const headerLabel =
                    courtKey === "—"
                        ? "Unassigned"
                        : resolveCourtHeader
                          ? resolveCourtHeader(courtKey)
                          : `Court ${courtKey}`;
                doc.text(headerLabel, x + 2.6, topY + 4.8);
                colY[i] = topY + courtHeaderH + 2;
            });

            // Fill each court column independently on this page.
            batch.forEach((courtKey, i) => {
                cardsPlacedByCourt[courtKey] = 0;
                const courtRows = groups.get(courtKey) || [];
                const x = margin + i * (colW + colGap);
                let idx = idxByCourt[courtKey];
                while (idx < courtRows.length) {
                    if ((cardsPlacedByCourt[courtKey] || 0) >= maxCardsPerCourtPerPage) break;
                    const row = courtRows[idx];
                    // Pre-calc conservative estimate to avoid split across pages.
                    const estH = estimateCardHeight(row, colW);
                    if (colY[i] + estH > pageH - margin) break;
                    const h = drawMatchCard(row, x, colY[i], colW);
                    colY[i] += h + cardGap;
                    idx += 1;
                    cardsPlacedByCourt[courtKey] = (cardsPlacedByCourt[courtKey] || 0) + 1;
                }
                idxByCourt[courtKey] = idx;
            });

            firstPageForBatch = false;
            y = margin; // reset baseline for next added page in this batch.
        }

        if (b < courtBatches.length - 1) {
            doc.addPage();
            y = margin;
        }
    }

    const logo = await getSimplifitLogoDataUrl();
    if (logo) {
        const pages = doc.getNumberOfPages();
        for (let p = 1; p <= pages; p++) {
            doc.setPage(p);
            // Footer brand (bottom-right)
            const footerLogoW = 57;
            const footerLogoH = 20;
            const footerY = pageH - margin - footerLogoH;
            const footerLogoX = pageW - margin - footerLogoW;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(16);
            doc.setTextColor(107, 114, 128);
            const createdByY = footerY + footerLogoH / 2 + 2;
            doc.text("Created by", footerLogoX - 36, createdByY);
            doc.addImage(logo.normal, "JPEG", footerLogoX, footerY, footerLogoW, footerLogoH);
        }
    }
    const fname = safeFileBase(tournamentName, filterLabel ? "schedule_filtered" : "schedule") + ".pdf";
    doc.save(fname);
}
