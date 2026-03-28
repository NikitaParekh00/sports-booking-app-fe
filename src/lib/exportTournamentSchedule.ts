import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { formatDoublesPlayersLineCompact, parseDoublesMatchNotes } from "@/lib/generateBalancedDoublesSchedule";

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
        const lineups = d ? formatDoublesPlayersLineCompact(d) : (m.notes?.trim() || "—");
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

export function downloadScheduleXlsx(tournamentName: string, rows: ScheduleExportRow[], filterLabel?: string): void {
    const sheetRows = rows.map((r) => ({
        "Match #": r.matchNumber,
        "Date & time": r.dateStr,
        Court: r.court,
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

export function downloadSchedulePdf(tournamentName: string, rows: ScheduleExportRow[], filterLabel?: string): void {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const maxW = pageW - margin * 2;
    let y = margin;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(tournamentName, margin, y);
    y += 7;
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

    doc.setFontSize(8.5);

    for (const r of rows) {
        const block = [
            `${r.matchNumber}  •  ${r.dateStr}  •  Court ${r.court}`,
            `${r.teamA}  vs  ${r.teamB}`,
            r.lineups,
            `Status: ${r.status}`,
        ].join("\n");
        const lines = doc.splitTextToSize(block, maxW);
        const blockH = lines.length * 4 + 5;
        if (y + blockH > pageH - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(lines, margin, y);
        y += blockH;
    }

    const fname = safeFileBase(tournamentName, filterLabel ? "schedule_filtered" : "schedule") + ".pdf";
    doc.save(fname);
}
