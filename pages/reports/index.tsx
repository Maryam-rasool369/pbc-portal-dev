import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { HiDocumentReport, HiDownload } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import Loading from "@/components/ui/Loading";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import {
  ReportFilter,
  ReportGroup,
  ReportMeta,
  ReportPreview,
  exportReportExcel,
  getReportCatalog,
  getReportJob,
  previewReport,
  searchMembers,
  searchEvents,
  MemberOption,
} from "@/services/reports";

const PAGE_SIZE = 25;
const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const inputCls =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white";
const labelCls = "block mb-1 text-sm font-medium text-gray-900 dark:text-white";

const humanize = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

// Optional wording overrides for boolean filters, keyed by reportKey + filterKey.
// Anything not listed falls back to Any / Yes / No.
const BOOLEAN_LABELS: Record<string, [string, string, string]> = {
  "payment.paidUnpaid:paid": ["All", "Paid", "Unpaid"],
};

// Per-report client defaults, keyed by report key. Anything not listed behaves generically.
const REPORT_DEFAULTS: Record<string, { filters?: Record<string, string>; rangeDays?: number }> = {
  "appUsage.activeUsers": { filters: { period: "daily" }, rangeDays: 30 },
  "appUsage.loginHistory": { rangeDays: 30 },
};
// Enum filters that must always carry a value (no "All" option), keyed reportKey:filterKey.
const REQUIRED_FILTERS = new Set(["appUsage.activeUsers:period"]);

// App-usage activity days are UTC days, so build the default range in UTC.
const utcRange = (days: number) => {
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date();
  return { from: ymd(new Date(end.getTime() - days * 86400000)), to: ymd(end) };
};

const colsStorageKey = (reportKey: string) => `reports:columns:${reportKey}`;

const defaultColumns = (r: ReportMeta) => r.columns.filter((c) => c.defaultSelected).map((c) => c.key);

const loadColumns = (r: ReportMeta): string[] => {
  try {
    const raw = localStorage.getItem(colsStorageKey(r.key));
    if (raw) {
      const valid = new Set(r.columns.map((c) => c.key));
      const saved = (JSON.parse(raw) as string[]).filter((k) => valid.has(k));
      if (saved.length) return saved;
    }
  } catch {}
  return defaultColumns(r);
};


// Number filters that hold an entity id get a searchable picker instead of a raw input.
type PickerKind = "member" | "event";
const pickerKind = (reportKey: string, filterKey: string): PickerKind | null => {
  if (reportKey.startsWith("businessActivity.") && filterKey === "userId") return "member";
  if (reportKey.startsWith("events.") && filterKey === "eventId") return "event";
  return null;
};

function MemberPicker({
  id,
  kind,
  token,
  value,
  onChange,
}: {
  id: string;
  kind: PickerKind;
  token: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [selected, setSelected] = useState<MemberOption | null>(null);
  const [open, setOpen] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const my = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = kind === "event" ? await searchEvents(token, text) : await searchMembers(token, text);
        if (my === reqId.current) setResults(r);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [text, open, token, kind]);

  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  return (
    <div className="relative">
      <label htmlFor={id} className={labelCls}>
        {kind === "event" ? "Event" : "Member"}
      </label>
      {selected ? (
        <div className={`${inputCls} flex items-center justify-between`}>
          <span className="truncate">{selected.name}</span>
          <button type="button" className="ml-2 text-gold-600" onClick={() => { setSelected(null); onChange(""); }}>
            Clear
          </button>
        </div>
      ) : (
        <input
          id={id}
          className={inputCls}
          placeholder={kind === "event" ? "Search event by title" : "Search member by name"}
          value={text}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setText(e.target.value)}
        />
      )}
      {open && !selected && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-700 dark:border-gray-600">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelected(m);
                  onChange(String(m.id));
                  setOpen(false);
                }}
              >
                {m.name} <span className="text-xs text-gray-500">{m.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterControl({
  reportKey,
  filter,
  value,
  onChange,
  token,
}: {
  token: string;
  reportKey: string;
  filter: ReportFilter;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `${reportKey}-${filter.key}`;
  const kind = filter.type === "number" ? pickerKind(reportKey, filter.key) : null;
  if (kind) {
    return <MemberPicker id={id} kind={kind} token={token} value={value} onChange={onChange} />;
  }
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {humanize(filter.key)}
      </label>
      {filter.type === "enum" ? (
        <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
          {!REQUIRED_FILTERS.has(`${reportKey}:${filter.key}`) && <option value="">All</option>}
          {filter.values.map((v) => (
            <option key={v} value={v}>
              {humanize(v)}
            </option>
          ))}
        </select>
      ) : filter.type === "boolean" ? (
        <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
          {(() => {
            const [a, y, n] = BOOLEAN_LABELS[`${reportKey}:${filter.key}`] ?? ["Any", "Yes", "No"];
            return (
              <>
                <option value="">{a}</option>
                <option value="true">{y}</option>
                <option value="false">{n}</option>
              </>
            );
          })()}
        </select>
      ) : (
        <input
          id={id}
          className={inputCls}
          type={filter.type === "number" ? "number" : "text"}
          min={filter.type === "number" ? 1 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [catalog, setCatalog] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportKey, setReportKey] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const report = useMemo(
    () => catalog.flatMap((g) => g.reports).find((r) => r.key === reportKey) ?? null,
    [catalog, reportKey]
  );

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPolling, []);

  useEffect(() => {
    if (!token || token === "undefined") {
      router.push("/");
      return;
    }
    (async () => {
      try {
        const data = await getReportCatalog(token);
        setCatalog(data);
        const first = data[0]?.reports[0];
        if (first) selectReport(first);
      } catch (e: any) {
        toast.error(e.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectReport = (r: ReportMeta) => {
    stopPolling();
    setReportKey(r.key);
    const d = REPORT_DEFAULTS[r.key];
    const range = d?.rangeDays ? utcRange(d.rangeDays) : { from: "", to: "" };
    setFrom(range.from);
    setTo(range.to);
    setQ("");
    setFilters({ ...(d?.filters ?? {}) });
    setColumns(loadColumns(r));
    setPage(1);
    setPreview(null);
  };

  const updateColumns = (next: string[]) => {
    setColumns(next);
    try {
      localStorage.setItem(colsStorageKey(reportKey), JSON.stringify(next));
    } catch {}
  };

  const query = useCallback(
    () => ({ from, to, q, filters, columns }),
    [from, to, q, filters, columns]
  );

  const runPreview = async (p = 1) => {
    if (!token || !report) return;
    setPreviewLoading(true);
    try {
      const res = await previewReport(token, report.key, { ...query(), page: p, limit: PAGE_SIZE });
      setPreview(res);
      setPage(p);
    } catch (e: any) {
      toast.error(e.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const pollJob = (jobId: number) => {
    const started = Date.now();
    toast.info("Large export queued. We'll download it when it's ready.");
    pollRef.current = setInterval(async () => {
      try {
        const job = await getReportJob(token as string, jobId);
        if (job.status === "READY" && job.url) {
          stopPolling();
          setExporting(false);
          window.open(job.url, "_blank", "noopener,noreferrer");
          toast.success("Export ready");
        } else if (job.status === "FAILED") {
          stopPolling();
          setExporting(false);
          toast.error(job.error || "Export failed");
        } else if (Date.now() - started > POLL_TIMEOUT_MS) {
          stopPolling();
          setExporting(false);
          toast.error("Export is taking too long. Please try again later.");
        }
      } catch (e: any) {
        stopPolling();
        setExporting(false);
        toast.error(e.message || "Failed to check export status");
      }
    }, POLL_MS);
  };

  const handleExport = async () => {
    if (!token || !report) return;
    setExporting(true);
    let queued = false;
    try {
      const res = await exportReportExcel(token, report.key, query());
      if (res.kind === "empty") toast.info("Nothing to download for these filters");
      else if (res.kind === "queued") {
        queued = true;
        pollJob(res.jobId);
      } else toast.success("Download started");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      if (!queued) setExporting(false);
    }
  };

  if (loading) return <Loading />;

  const sensitiveSelected = columns.some((k) => /passport|emirates|licen[cs]e|eid/i.test(k));

  return (
    <>
      <Head>
        <title>Reports & Analytics | PBC Portal</title>
      </Head>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {/* @ts-ignore */}
            <HiDocumentReport className="w-6 h-6" />
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Preview reports and download them as Excel.
          </p>
        </div>

        {catalog.length === 0 ? (
          <EmptyStateMessage
            // @ts-ignore
            icon={<HiDocumentReport className="w-12 h-12 text-gray-400" />}
            title="No Reports Available"
            message="There are no reports available for your role."
          />
        ) : (
          <div className="space-y-6">
            {/* 1. Report picker */}
            <div>
              <label htmlFor="report" className={labelCls}>
                Report
              </label>
              <select
                id="report"
                className={inputCls}
                value={reportKey}
                onChange={(e) => {
                  const r = catalog.flatMap((g) => g.reports).find((x) => x.key === e.target.value);
                  if (r) selectReport(r);
                }}
              >
                {catalog.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.reports.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {report?.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
              )}
            </div>

            {report && (
              <>
                {/* 2. Filters */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label htmlFor="from" className={labelCls}>
                      From <span className="text-xs text-gray-500">({report.dateField})</span>
                    </label>
                    <input id="from" type="date" className={inputCls} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="to" className={labelCls}>
                      To <span className="text-xs text-gray-500">({report.dateField})</span>
                    </label>
                    <input id="to" type="date" className={inputCls} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                  </div>
                  {report.searchFields.length > 0 && (
                  <div className="sm:col-span-2">
                    <label htmlFor="q" className={labelCls}>
                      Search
                    </label>
                    <input
                      id="q"
                      type="text"
                      className={inputCls}
                      value={q}
                      placeholder={report.searchFields.length ? `Search ${report.searchFields.join(", ")}` : "Search"}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                  )}
                  {report.filters.map((f) => (
                    <FilterControl
                      key={`${report.key}-${f.key}`}
                      token={token as string}
                      reportKey={report.key}
                      filter={f}
                      value={filters[f.key] ?? ""}
                      onChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v }))}
                    />
                  ))}
                </div>

                {/* 3. Columns */}
                <details className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <summary className="cursor-pointer p-3 text-sm font-medium text-gray-900 dark:text-white">
                    Columns ({columns.length} of {report.columns.length} selected)
                  </summary>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-4 mb-3 text-sm">
                      <button type="button" className="text-gold-600 hover:underline" onClick={() => updateColumns(report.columns.map((c) => c.key))}>
                        Select all
                      </button>
                      <button type="button" className="text-gold-600 hover:underline" onClick={() => updateColumns(defaultColumns(report))}>
                        Reset
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
                      {report.columns.map((c) => (
                        <label key={c.key} className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={columns.includes(c.key)}
                            onChange={(e) =>
                              updateColumns(
                                e.target.checked
                                  ? report.columns.map((x) => x.key).filter((k) => k === c.key || columns.includes(k))
                                  : columns.filter((k) => k !== c.key)
                              )
                            }
                          />
                          {c.header}
                        </label>
                      ))}
                    </div>
                    {sensitiveSelected && (
                      <p className="mt-3 text-sm text-amber-600">
                        Warning: you have selected columns that may contain identity-document links. Handle the file carefully.
                      </p>
                    )}
                  </div>
                </details>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => runPreview(1)}
                    disabled={previewLoading}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gold-700 hover:bg-gold-800 disabled:opacity-50"
                  >
                    {previewLoading ? "Loading..." : "Preview"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    {/* @ts-ignore */}
                    <HiDownload className="w-4 h-4" />
                    {exporting ? "Exporting..." : "Download Excel"}
                  </button>
                </div>

                {/* 4. Preview */}
                {preview && (
                  <div>
                    {preview.data.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No rows match these filters.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                {preview.columns.map((c) => (
                                  <th key={c.key} className="p-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap dark:text-white">
                                    {c.header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                              {preview.data.map((row, i) => (
                                <tr key={i}>
                                  {preview.columns.map((c) => (
                                    <td key={c.key} title={String(row[c.key] ?? "")} className="p-3 text-sm text-gray-900 whitespace-nowrap max-w-xs truncate dark:text-white">
                                      {String(row[c.key] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            Page {preview.pagination.page} of {preview.pagination.totalPages} · {preview.pagination.total} rows
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={page <= 1 || previewLoading}
                              onClick={() => runPreview(page - 1)}
                              className="px-3 py-1 border rounded-lg disabled:opacity-50 dark:border-gray-600"
                            >
                              Previous
                            </button>
                            <button
                              type="button"
                              disabled={page >= preview.pagination.totalPages || previewLoading}
                              onClick={() => runPreview(page + 1)}
                              className="px-3 py-1 border rounded-lg disabled:opacity-50 dark:border-gray-600"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
