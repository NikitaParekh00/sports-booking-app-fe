import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
    formatDoublesPlayersLineCompact,
    NOTES_JSON_MARK,
    parseDoublesMatchNotes,
} from "@/lib/generateBalancedDoublesSchedule";

/** Text lines before `__JSON__` may include `Umpire: Name` or `UMP: Name` (matches schedule cards). */
function getUmpireFromScheduleNotes(notes: string | null | undefined): string {
    if (!notes) return "";
    const idx = notes.indexOf(NOTES_JSON_MARK);
    const textPart = (idx >= 0 ? notes.slice(0, idx) : notes).trim();
    if (!textPart) return "";
    const line = textPart
        .split("\n")
        .map((s) => s.trim())
        .find((s) => /^ump(ire)?\s*:/i.test(s));
    if (!line) return "";
    return line.replace(/^ump(ire)?\s*:\s*/i, "").trim();
}

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
    umpire: string;
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
        const umpire = getUmpireFromScheduleNotes(m.notes ?? null);
        return {
            matchNumber: m.match_number?.trim() || "—",
            dateStr,
            court: m.court_number?.trim() || "—",
            teamA: formatTeamDisplayName(nameA),
            teamB: formatTeamDisplayName(nameB),
            lineups,
            umpire,
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
        Umpire: r.umpire?.trim() || "—",
        Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const colW = [{ wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 55 }, { wch: 22 }, { wch: 12 }];
    ws["!cols"] = colW;
    const wb = XLSX.utils.book_new();
    const sheetName = (filterLabel ? "Schedule filtered" : "Schedule").replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fname = safeFileBase(tournamentName, filterLabel ? "schedule_filtered" : "schedule") + ".xlsx";
    XLSX.writeFile(wb, fname);
}

/** `combined`: up to 3 court columns per page (default). `by_court`: one full-width court column per section, new page per court. */
export type SchedulePdfLayout = "combined" | "by_court";

export type DownloadSchedulePdfOptions = {
    layout?: SchedulePdfLayout;
};

export async function downloadSchedulePdf(
    tournamentName: string,
    rows: ScheduleExportRow[],
    filterLabel?: string,
    resolveCourtHeader?: (rawCourtKey: string) => string,
    options?: DownloadSchedulePdfOptions,
): Promise<void> {
    const layoutByCourt = options?.layout === "by_court";
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    /** Slightly tighter side margin so match columns are wider (less text wrap in player boxes). */
    const margin = 10;
    const maxW = pageW - margin * 2;
    let y = margin;

    /** Reserve bottom strip so match cards never overlap the “Created by” + logo footer. */
    const logoForFooter = await getSimplifitLogoDataUrl();
    const footerLogoH = 20;
    /** First schedule page (title + grid): extra gap above footer. Continuation pages: minimal gap so 3 cards can fit per column. */
    const footerClearanceFirstPageMm = 8;
    const footerClearanceContinuationMm = 3;

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
        (layoutByCourt ? "One section per court • " : "") +
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
    /** Narrower gutter → wider cards per court (helps lineup text fit on fewer lines). */
    const colGap = 2.5;
    /** Vertical space between blue and yellow lineup boxes (baseline for “vs” sits in this band). */
    const vsBandCompactMm = 6.6;
    const vsBandNormalMm = 8.2;
    /** Y from card top to top of first lineup box (= duel baseline + gap under team names). Must match drawMatchCard. */
    const lineupAreaTopFromCardTopMm = (compact: boolean) => 10.5 + (compact ? 2.4 : 2.7);
    /** Space between bottom of last lineup box and umpire text. */
    const umpireGapBelowLineupsMm = (compact: boolean) => (compact ? 2.8 : 3.4);
    /** First schedule page (title + grid): 2 cards per column; later pages: 3 (room for footer / header). */
    const maxCardsPerCourtAfterFirstPage = 3;

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

    const umpireBlockHeight = (r: ScheduleExportRow, sideW: number, compact: boolean): number => {
        const u = (r.umpire || "").trim();
        if (!u) return 0;
        const lines = doc.splitTextToSize(`Umpire: ${u}`, sideW);
        const lineH = compact ? 3.15 : 3.45;
        return (compact ? 1.6 : 2.1) + lines.length * lineH + (compact ? 1.4 : 2.2);
    };

    const estimateCardHeight = (r: ScheduleExportRow, w: number, compact: boolean): number => {
        const pad = compact ? 2.2 : cardPad;
        const lineupSource = r.lineups === "—" ? "" : r.lineups;
        const { sideA, sideB } = splitLineupSides(lineupSource);
        const sideW = w - pad * 2 - 2;
        const sideALines = sideA ? doc.splitTextToSize(sideA, sideW).slice(0, 2) : [];
        const sideBLines = sideB ? doc.splitTextToSize(sideB, sideW).slice(0, 2) : [];
        const lineStep = compact ? 3.15 : 3.4;
        const boxPad = compact ? 2.85 : 3.35;
        const sideAH = sideALines.length > 0 ? 3.2 + sideALines.length * lineStep + boxPad : 0;
        const sideBH = sideBLines.length > 0 ? 3.2 + sideBLines.length * lineStep + boxPad : 0;
        const vsGap =
            sideAH > 0 && sideBH > 0 ? (compact ? vsBandCompactMm : vsBandNormalMm) : 0;
        const umpH = umpireBlockHeight(r, sideW, compact);
        const hasLineups = sideALines.length > 0 || sideBLines.length > 0;
        const lineupTop = lineupAreaTopFromCardTopMm(compact);
        const bodyBelowTop =
            (hasLineups ? lineupTop + sideAH + vsGap + sideBH : 10.5 + 3.6) +
            (umpH > 0 ? umpireGapBelowLineupsMm(compact) + umpH : 0);
        return bodyBelowTop + pad;
    };

    const drawMatchCard = (r: ScheduleExportRow, x: number, top: number, w: number, compact: boolean): number => {
        const pad = compact ? 2.2 : cardPad;
        const meta = `${r.matchNumber} • ${r.dateStr}`;
        const duel = `${r.teamA} vs ${r.teamB}`;
        const statusLabel = (r.status || "upcoming").toLowerCase();
        const badge = badgeColors(statusLabel);
        const lineupSource = r.lineups === "—" ? "" : r.lineups;
        const { sideA, sideB } = splitLineupSides(lineupSource);
        const sideW = w - pad * 2 - 2;
        const sideALines = sideA ? doc.splitTextToSize(sideA, sideW).slice(0, 2) : [];
        const sideBLines = sideB ? doc.splitTextToSize(sideB, sideW).slice(0, 2) : [];
        const cardH = estimateCardHeight(r, w, compact);
        const lineStep = compact ? 3.15 : 3.4;
        const boxPad = compact ? 2.85 : 3.35;

        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, top, w, cardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(17, 24, 39);
        doc.text(meta, x + pad, top + 4.6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        const badgeW = Math.max(16, doc.getTextWidth(statusLabel) + 5);
        const bx = x + w - pad - badgeW;
        const by = top + 1.8;
        doc.setFillColor(badge.fill[0], badge.fill[1], badge.fill[2]);
        doc.roundedRect(bx, by, badgeW, 4.4, 1.2, 1.2, "F");
        doc.setTextColor(badge.text[0], badge.text[1], badge.text[2]);
        doc.text(statusLabel, bx + badgeW / 2, by + 3, { align: "center" });

        doc.setDrawColor(243, 244, 246);
        doc.line(x + pad, top + 6.8, x + w - pad, top + 6.8);

        let lineY = top + 10.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(compact ? 8.2 : 8.5);
        doc.setTextColor(17, 24, 39);
        doc.text(duel, x + pad, lineY);

        if (sideALines.length > 0 || sideBLines.length > 0) {
            lineY += compact ? 2.4 : 2.7;

            const hasA = sideALines.length > 0;
            if (hasA) {
                const aH = 3.2 + sideALines.length * lineStep + boxPad;
                doc.setFillColor(239, 246, 255);
                doc.setDrawColor(191, 219, 254);
                doc.roundedRect(x + pad, lineY, sideW + 2, aH, 1.5, 1.5, "FD");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 58, 138);
                doc.text(sideALines, x + pad + 1.2, lineY + 4);
                lineY += aH;
            }

            if (hasA && sideBLines.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.setTextColor(156, 163, 175);
                doc.text("vs", x + w / 2, lineY + (compact ? 3.1 : 3.6), { align: "center" });
                lineY += compact ? vsBandCompactMm : vsBandNormalMm;
            }

            if (sideBLines.length > 0) {
                const bH = 3.2 + sideBLines.length * lineStep + boxPad;
                doc.setFillColor(255, 251, 235);
                doc.setDrawColor(253, 230, 138);
                doc.roundedRect(x + pad, lineY, sideW + 2, bH, 1.5, 1.5, "FD");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(146, 64, 14);
                doc.text(sideBLines, x + pad + 1.2, lineY + 4);
            }
        }

        const ump = (r.umpire || "").trim();
        if (ump) {
            const umpLines = doc.splitTextToSize(`Umpire: ${ump}`, sideW);
            const lineH = compact ? 3.15 : 3.45;
            const blockH = (compact ? 1.6 : 2.1) + umpLines.length * lineH;
            const hasLineups = sideALines.length > 0 || sideBLines.length > 0;
            let uy0: number;
            if (hasLineups) {
                const l0 = lineupAreaTopFromCardTopMm(compact);
                const aH =
                    sideALines.length > 0 ? 3.2 + sideALines.length * lineStep + boxPad : 0;
                const vsH =
                    sideALines.length > 0 && sideBLines.length > 0
                        ? compact
                            ? vsBandCompactMm
                            : vsBandNormalMm
                        : 0;
                const bH =
                    sideBLines.length > 0 ? 3.2 + sideBLines.length * lineStep + boxPad : 0;
                uy0 = top + l0 + aH + vsH + bH + umpireGapBelowLineupsMm(compact);
            } else {
                uy0 = top + cardH - pad - blockH + (compact ? 2.2 : 2.8);
            }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(compact ? 6.8 : 7);
            doc.setTextColor(75, 85, 99);
            doc.text(umpLines, x + pad, uy0);
        }
        return cardH;
    };

    const courtsPerRow = layoutByCourt ? 1 : Math.min(3, Math.max(1, orderedCourtKeys.length));
    const courtBatches: string[][] = [];
    for (let i = 0; i < orderedCourtKeys.length; i += courtsPerRow) {
        courtBatches.push(orderedCourtKeys.slice(i, i + courtsPerRow));
    }

    let isFirstSchedulePdfPage = true;
    for (let b = 0; b < courtBatches.length; b++) {
        if (layoutByCourt) {
            isFirstSchedulePdfPage = true;
        }
        if (layoutByCourt && b > 0) {
            y = margin;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(tournamentName, margin, y);
            y += 6;
            const ckOnly = courtBatches[b][0] ?? "—";
            const courtTitle =
                ckOnly === "—"
                    ? "Unassigned"
                    : resolveCourtHeader
                      ? resolveCourtHeader(ckOnly)
                      : `Court ${ckOnly}`;
            doc.setFontSize(11);
            doc.text(courtTitle, margin, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            const subCourt =
                (filterLabel ? `${filterLabel} • ` : "") +
                `${(groups.get(ckOnly) || []).length} match${(groups.get(ckOnly) || []).length === 1 ? "" : "es"} on this court`;
            const subCourtLines = doc.splitTextToSize(subCourt, maxW);
            doc.text(subCourtLines, margin, y);
            y += subCourtLines.length * 4 + 3;
            doc.setDrawColor(200);
            doc.line(margin, y, pageW - margin, y);
            y += 6;
        }
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
            const maxCardsThisPage = isFirstSchedulePdfPage ? 2 : maxCardsPerCourtAfterFirstPage;
            /** Tighter card + footer band on continuation pages so 3 cards fit per column (A4 landscape height). */
            const compactLayout = !isFirstSchedulePdfPage;
            const footerClearMm = logoForFooter
                ? footerLogoH +
                  (compactLayout ? footerClearanceContinuationMm : footerClearanceFirstPageMm)
                : 0;
            const contentBottomThisPage = pageH - margin - footerClearMm;
            const verticalGap = compactLayout ? 2 : cardGap;
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
                    if ((cardsPlacedByCourt[courtKey] || 0) >= maxCardsThisPage) break;
                    const row = courtRows[idx];
                    // Pre-calc conservative estimate to avoid split across pages.
                    const estH = estimateCardHeight(row, colW, compactLayout);
                    if (colY[i] + estH > contentBottomThisPage) break;
                    const h = drawMatchCard(row, x, colY[i], colW, compactLayout);
                    colY[i] += h + verticalGap;
                    idx += 1;
                    cardsPlacedByCourt[courtKey] = (cardsPlacedByCourt[courtKey] || 0) + 1;
                }
                idxByCourt[courtKey] = idx;
            });

            isFirstSchedulePdfPage = false;
            firstPageForBatch = false;
            y = margin; // reset baseline for next added page in this batch.
        }

        if (b < courtBatches.length - 1) {
            doc.addPage();
            y = margin;
        }
    }

    if (logoForFooter) {
        const pages = doc.getNumberOfPages();
        const footerLogoW = 57;
        for (let p = 1; p <= pages; p++) {
            doc.setPage(p);
            const footerY = pageH - margin - footerLogoH;
            const footerLogoX = pageW - margin - footerLogoW;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(16);
            doc.setTextColor(107, 114, 128);
            const createdByY = footerY + footerLogoH / 2 + 2;
            doc.text("Created by", footerLogoX - 36, createdByY);
            doc.addImage(logoForFooter.normal, "JPEG", footerLogoX, footerY, footerLogoW, footerLogoH);
        }
    }
    const stem = filterLabel
        ? layoutByCourt
            ? "schedule_filtered_by_court"
            : "schedule_filtered"
        : layoutByCourt
          ? "schedule_by_court"
          : "schedule";
    const fname = safeFileBase(tournamentName, stem) + ".pdf";
    doc.save(fname);
}
