import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
    formatDoublesPlayersLineCompact,
    getDoublesMatchKnockoutRoundLabel,
    NOTES_JSON_MARK,
    parseDoublesMatchNotes,
} from "@/lib/generateBalancedDoublesSchedule";

/** Text lines before `__JSON__` may include `Umpire:`, `Resting:`, etc. */
function getTextLineFromScheduleNotes(notes: string | null | undefined, prefix: RegExp): string {
    if (!notes) return "";
    const idx = notes.indexOf(NOTES_JSON_MARK);
    const textPart = (idx >= 0 ? notes.slice(0, idx) : notes).trim();
    if (!textPart) return "";
    const line = textPart
        .split("\n")
        .map((s) => s.trim())
        .find((s) => prefix.test(s));
    if (!line) return "";
    return line.replace(prefix, "").trim();
}

function getUmpireFromScheduleNotes(notes: string | null | undefined): string {
    return getTextLineFromScheduleNotes(notes, /^ump(ire)?\s*:\s*/i);
}

function getRestingFromScheduleNotes(notes: string | null | undefined): string {
    return getTextLineFromScheduleNotes(notes, /^resting\s*:\s*/i);
}

type LogoAssets = { normal: string };
let logoDataUrlPromise: Promise<LogoAssets | null> | null = null;

async function getSimplifitLogoDataUrl(): Promise<LogoAssets | null> {
    if (typeof window === "undefined") return null;
    if (!logoDataUrlPromise) {
        const toDataUrl = async (path: string): Promise<string | null> => {
            const res = await fetch(path);
            if (!res.ok) return null;
            const blob = await res.blob();
            return new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        };
        logoDataUrlPromise = toDataUrl("/logo.jpeg")
            .then((normal) => (normal ? { normal } : null))
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
    final_score?: string | null;
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
    resting: string;
    finalScore: string;
    status: string;
    knockoutRound: string;
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
        const resting = getRestingFromScheduleNotes(m.notes ?? null);
        const finalScore = (m.final_score && String(m.final_score).trim()) || "";
        const koRound = getDoublesMatchKnockoutRoundLabel(m.notes ?? null);
        return {
            matchNumber: m.match_number?.trim() || "—",
            dateStr,
            court: m.court_number?.trim() || "—",
            teamA: formatTeamDisplayName(nameA),
            teamB: formatTeamDisplayName(nameB),
            lineups,
            umpire,
            resting,
            finalScore,
            status: m.status?.trim() || "—",
            knockoutRound: koRound || "",
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
        "Date & time": r.dateStr,
        Court: r.court === "—" ? "—" : resolveCourtDisplay ? resolveCourtDisplay(r.court) : r.court,
        Round: r.knockoutRound?.trim() || "—",
        Lineups: r.lineups,
        Umpire: r.umpire?.trim() || "—",
        Resting: r.resting?.trim() || "—",
        Score: r.finalScore?.trim() || "—",
        Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const colW = [{ wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 55 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 12 }];
    ws["!cols"] = colW;
    const wb = XLSX.utils.book_new();
    const sheetName = (filterLabel ? "Schedule filtered" : "Schedule").replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fname = safeFileBase(tournamentName, filterLabel ? "schedule_filtered" : "schedule") + ".xlsx";
    XLSX.writeFile(wb, fname);
}

/** `combined` and `by_court` both render up to 3 court columns side by side per page. */
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
    const footerLogoH = 12;
    const footerLogoW = 34;
    /** First schedule page (title + grid): extra gap above footer. Continuation pages: minimal gap so 3 cards can fit per column. */
    const footerClearanceFirstPageMm = 5;
    const footerClearanceContinuationMm = 2;

    /** Match card typography (pt) — keep estimateCardHeight in sync with drawMatchCard. */
    const fontDate = 9.5;
    const fontLineup = 8.5;
    const fontVs = 8;
    const fontCardFooter = (compact: boolean) => (compact ? 7.5 : 8.5);
    const fontCourtHeader = 10;
    const lineStepMm = (compact: boolean) => (compact ? 3.5 : 3.9);

    const badgeColors = (status: string): { fill: [number, number, number]; text: [number, number, number] } => {
        const s = status.toLowerCase();
        if (s === "completed") return { fill: [236, 253, 245] as const, text: [22, 101, 52] as const };
        if (s === "live") return { fill: [220, 252, 231] as const, text: [21, 128, 61] as const };
        return { fill: [219, 234, 254] as const, text: [30, 64, 175] as const };
    };

    const topLogosBottomY = margin;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const titleMaxW = maxW;
    const titleLines = doc.splitTextToSize(tournamentName, titleMaxW);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5 + 2;

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

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const multiCourt = orderedCourtKeys.length > 1;
    const sub =
        (filterLabel ? `${filterLabel} • ` : "") +
        (layoutByCourt && !multiCourt ? "One section per court • " : multiCourt ? "Courts side by side • " : "") +
        `${rows.length} match${rows.length === 1 ? "" : "es"} • ${new Date().toLocaleString()}`;
    const subLines = doc.splitTextToSize(sub, titleMaxW);
    doc.text(subLines, margin, y);
    y += subLines.length * 4 + 4;
    y = Math.max(y, topLogosBottomY + 3);

    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    const cardGap = 3;
    const cardPad = 2.8;
    const courtHeaderH = 8;
    /** Narrower gutter → wider cards per court (helps lineup text fit on fewer lines). */
    const colGap = 2.5;
    /** Vertical space between blue and yellow lineup boxes (baseline for “vs” sits in this band). */
    const vsBandCompactMm = 6.6;
    const vsBandNormalMm = 8.2;
    /** Y from card top to top of first lineup box (= duel baseline + gap under team names). Must match drawMatchCard. */
    const lineupAreaTopFromCardTopMm = (compact: boolean) => 11.2 + (compact ? 2.5 : 2.8);
    /** Space between bottom of last lineup box and umpire text. */
    const umpireGapBelowLineupsMm = (compact: boolean) => (compact ? 2.8 : 3.4);
    /** First schedule page (title + grid): 2 cards per column; later pages: 3 (room for footer / header). */
    const maxCardsPerCourtAfterFirstPage = 3;

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
        const lineH = compact ? 3.35 : 3.65;
        return (compact ? 1.6 : 2.1) + lines.length * lineH + (compact ? 1.4 : 2.2);
    };

    const restingBlockHeight = (r: ScheduleExportRow, sideW: number, compact: boolean): number => {
        const rest = (r.resting || "").trim();
        if (!rest) return 0;
        const lines = doc.splitTextToSize(`Resting: ${rest}`, sideW);
        const lineH = compact ? 3.3 : 3.55;
        return (compact ? 1.4 : 1.8) + lines.length * lineH + (compact ? 1.2 : 1.6);
    };

    const scoreBlockHeight = (r: ScheduleExportRow, sideW: number, compact: boolean): number => {
        const sc = (r.finalScore || "").trim();
        if (!sc) return 0;
        const lines = doc.splitTextToSize(`Score: ${sc}`, sideW);
        const lineH = compact ? 3.3 : 3.55;
        return (compact ? 1.4 : 1.8) + lines.length * lineH + (compact ? 1.2 : 1.6);
    };

    const extraFooterBlockHeight = (r: ScheduleExportRow, sideW: number, compact: boolean): number => {
        const umpH = umpireBlockHeight(r, sideW, compact);
        const restH = restingBlockHeight(r, sideW, compact);
        const scoreH = scoreBlockHeight(r, sideW, compact);
        const parts = [umpH, restH, scoreH].filter((h) => h > 0);
        if (parts.length === 0) return 0;
        const gap = compact ? 1.2 : 1.6;
        return parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
    };

    const estimateCardHeight = (r: ScheduleExportRow, w: number, compact: boolean): number => {
        const pad = compact ? 2.2 : cardPad;
        const lineupSource = r.lineups === "—" ? "" : r.lineups;
        const { sideA, sideB } = splitLineupSides(lineupSource);
        const sideW = w - pad * 2 - 2;
        const sideALines = sideA ? doc.splitTextToSize(sideA, sideW).slice(0, 2) : [];
        const sideBLines = sideB ? doc.splitTextToSize(sideB, sideW).slice(0, 2) : [];
        const lineStep = lineStepMm(compact);
        const boxPad = compact ? 3.0 : 3.5;
        const sideAH = sideALines.length > 0 ? 3.4 + sideALines.length * lineStep + boxPad : 0;
        const sideBH = sideBLines.length > 0 ? 3.4 + sideBLines.length * lineStep + boxPad : 0;
        const vsGap =
            sideAH > 0 && sideBH > 0 ? (compact ? vsBandCompactMm : vsBandNormalMm) : 0;
        const extraH = extraFooterBlockHeight(r, sideW, compact);
        const hasLineups = sideALines.length > 0 || sideBLines.length > 0;
        const lineupTop = lineupAreaTopFromCardTopMm(compact);
        const bodyBelowTop =
            (hasLineups ? lineupTop + sideAH + vsGap + sideBH : 10.5 + 3.6) +
            (extraH > 0 ? umpireGapBelowLineupsMm(compact) + extraH : 0);
        return bodyBelowTop + pad;
    };

    const drawMatchCard = (r: ScheduleExportRow, x: number, top: number, w: number, compact: boolean): number => {
        const pad = compact ? 2.2 : cardPad;
        const metaParts = [r.knockoutRound?.trim(), r.dateStr !== "—" ? r.dateStr : ""].filter(Boolean);
        const meta = metaParts.length > 0 ? metaParts.join(" · ") : "—";
        const statusLabel = (r.status || "upcoming").toLowerCase();
        const badge = badgeColors(statusLabel);
        const lineupSource = r.lineups === "—" ? "" : r.lineups;
        const { sideA, sideB } = splitLineupSides(lineupSource);
        const sideW = w - pad * 2 - 2;
        const sideALines = sideA ? doc.splitTextToSize(sideA, sideW).slice(0, 2) : [];
        const sideBLines = sideB ? doc.splitTextToSize(sideB, sideW).slice(0, 2) : [];
        const cardH = estimateCardHeight(r, w, compact);
        const lineStep = lineStepMm(compact);
        const boxPad = compact ? 3.0 : 3.5;

        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, top, w, cardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontDate);
        doc.setTextColor(17, 24, 39);
        doc.text(meta, x + pad, top + 5);

        const headerBottom = top + 7.4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontLineup);
        const badgeW = Math.max(18, doc.getTextWidth(statusLabel) + 5);
        const bx = x + w - pad - badgeW;
        const by = top + 1.8;
        doc.setFillColor(badge.fill[0], badge.fill[1], badge.fill[2]);
        doc.roundedRect(bx, by, badgeW, 4.8, 1.2, 1.2, "F");
        doc.setTextColor(badge.text[0], badge.text[1], badge.text[2]);
        doc.text(statusLabel, bx + badgeW / 2, by + 3.2, { align: "center" });

        doc.setDrawColor(243, 244, 246);
        doc.line(x + pad, headerBottom, x + w - pad, headerBottom);

        let lineY = top + 11.2;
        if (sideALines.length > 0 || sideBLines.length > 0) {
            lineY += compact ? 2.5 : 2.8;

            const hasA = sideALines.length > 0;
            if (hasA) {
                const aH = 3.4 + sideALines.length * lineStep + boxPad;
                doc.setFillColor(239, 246, 255);
                doc.setDrawColor(191, 219, 254);
                doc.roundedRect(x + pad, lineY, sideW + 2, aH, 1.5, 1.5, "FD");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(fontLineup);
                doc.setTextColor(30, 58, 138);
                doc.text(sideALines, x + pad + 1.2, lineY + 4.4);
                lineY += aH;
            }

            if (hasA && sideBLines.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(fontVs);
                doc.setTextColor(156, 163, 175);
                doc.text("vs", x + w / 2, lineY + (compact ? 3.3 : 3.8), { align: "center" });
                lineY += compact ? vsBandCompactMm : vsBandNormalMm;
            }

            if (sideBLines.length > 0) {
                const bH = 3.4 + sideBLines.length * lineStep + boxPad;
                doc.setFillColor(255, 251, 235);
                doc.setDrawColor(253, 230, 138);
                doc.roundedRect(x + pad, lineY, sideW + 2, bH, 1.5, 1.5, "FD");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(fontLineup);
                doc.setTextColor(146, 64, 14);
                doc.text(sideBLines, x + pad + 1.2, lineY + 4.4);
            }
        }

        const ump = (r.umpire || "").trim();
        const resting = (r.resting || "").trim();
        const finalScore = (r.finalScore || "").trim();
        const hasLineups = sideALines.length > 0 || sideBLines.length > 0;
        let footerY: number;
        if (hasLineups) {
            const l0 = lineupAreaTopFromCardTopMm(compact);
            const aH =
                sideALines.length > 0 ? 3.4 + sideALines.length * lineStep + boxPad : 0;
            const vsH =
                sideALines.length > 0 && sideBLines.length > 0
                    ? compact
                        ? vsBandCompactMm
                        : vsBandNormalMm
                    : 0;
            const bH =
                sideBLines.length > 0 ? 3.4 + sideBLines.length * lineStep + boxPad : 0;
            footerY = top + l0 + aH + vsH + bH + umpireGapBelowLineupsMm(compact);
        } else {
            footerY = top + cardH - pad - 8;
        }

        const drawFooterLine = (text: string, color: [number, number, number]) => {
            const lines = doc.splitTextToSize(text, sideW);
            const lineH = compact ? 3.3 : 3.55;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(fontCardFooter(compact));
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(lines, x + pad, footerY);
            footerY += lines.length * lineH + (compact ? 1.2 : 1.6);
        };

        if (finalScore) {
            drawFooterLine(`Score: ${finalScore}`, [22, 101, 52]);
        }
        if (resting) {
            drawFooterLine(`Resting: ${resting}`, [107, 114, 128]);
        }
        if (ump) {
            drawFooterLine(`Umpire: ${ump}`, [75, 85, 99]);
        }
        return cardH;
    };

    const courtsPerRow = Math.min(3, Math.max(1, orderedCourtKeys.length));
    const courtBatches: string[][] = [];
    for (let i = 0; i < orderedCourtKeys.length; i += courtsPerRow) {
        courtBatches.push(orderedCourtKeys.slice(i, i + courtsPerRow));
    }

    let isFirstSchedulePdfPage = true;
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
                doc.setFontSize(fontCourtHeader);
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
        for (let p = 1; p <= pages; p++) {
            doc.setPage(p);
            const footerY = pageH - margin - footerLogoH;
            const footerLogoX = pageW - margin - footerLogoW;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            const createdByY = footerY + footerLogoH / 2 + 1.5;
            doc.text("Created by", footerLogoX - 22, createdByY);
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
