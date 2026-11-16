const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type ReportColumn = { key: string; header: string; defaultSelected: boolean };

export type ReportFilter =
  | { key: string; type: "enum"; values: string[] }
  | { key: string; type: "boolean" }
  | { key: string; type: "number" }
  | { key: string; type: "string" };

export type ReportMeta = {
  key: string;
  group: string;
  title: string;
  description: string | null;
  dateField: string;
  searchFields: string[];
  filters: ReportFilter[];
  columns: ReportColumn[];
};

export type ReportGroup = { group: string; reports: ReportMeta[] };

export type ReportCell = string | number | boolean;

export type ReportPreview = {
  data: Record<string, ReportCell>[];
  columns: ReportColumn[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type ReportJob = {
  id: number;
  reportKey: string;
  status: "PENDING" | "READY" | "FAILED";
  url: string | null;
  error: string | null;
  requestedAt: string;
};

export type ReportQuery = {
  from?: string;
  to?: string;
  q?: string;
  columns?: string[];
  filters?: Record<string, string>;
  page?: number;
  limit?: number;
};

export type ExportResult =
  | { kind: "file" }
  | { kind: "queued"; jobId: number; message?: string }
  | { kind: "empty" };

/** Single query builder shared by preview and export so they cannot drift. */
export const buildReportQuery = (query: ReportQuery, extra: Record<string, string> = {}) => {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.columns?.length) params.set("columns", query.columns.join(","));
  Object.entries(query.filters ?? {}).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== null) params.set(k, v);
  });
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  return params.toString();
};

const parseError = async (res: Response): Promise<string> => {
  try {
    const json = await res.clone().json();
    return json?.error?.[0]?.msg || json?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
};

export const getReportCatalog = async (token: string): Promise<ReportGroup[]> => {
  const res = await fetch(`${API_URL}/api/reports`, { headers: { token } });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()).data;
};

export const previewReport = async (
  token: string,
  key: string,
  query: ReportQuery
): Promise<ReportPreview> => {
  const res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(key)}?${buildReportQuery(query)}`, {
    headers: { token },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await res.json();
};

export const getReportJob = async (token: string, id: number): Promise<ReportJob> => {
  const res = await fetch(`${API_URL}/api/reports/jobs/${id}`, { headers: { token } });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()).data;
};

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const filenameFromHeader = (header: string | null, fallback: string) => {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
};

export const exportReportExcel = async (
  token: string,
  key: string,
  query: ReportQuery
): Promise<ExportResult> => {
  const res = await fetch(
    `${API_URL}/api/reports/${encodeURIComponent(key)}/export?${buildReportQuery(query, { format: "excel" })}`,
    { headers: { token } }
  );
  if (res.status === 404) return { kind: "empty" };
  if (res.status === 202) {
    const body = await res.json();
    return { kind: "queued", jobId: body.jobId, message: body.message };
  }
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  triggerDownload(blob, filenameFromHeader(res.headers.get("Content-Disposition"), `${key}.xlsx`));
  return { kind: "file" };
};

export type MemberOption = { id: number; name: string; email: string };

/** Member lookup for id-type filters such as userId. */
export const searchMembers = async (token: string, search: string): Promise<MemberOption[]> => {
  const params = new URLSearchParams({ page: "1", limit: "10", selfIncluded: "true" });
  if (search.trim()) params.set("search", search.trim());
  const res = await fetch(`${API_URL}/api/user/all/users?${params.toString()}`, { headers: { token } });
  if (!res.ok) throw new Error(await parseError(res));
  const json = await res.json();
  return (json.data ?? []).map((u: any) => ({ id: Number(u.id), name: u.name || "Unknown", email: u.email || "" }));
};

/** Event lookup for id-type filters such as eventId. Reuses MemberOption (name = title, email = date). */
export const searchEvents = async (token: string, search: string): Promise<MemberOption[]> => {
  const params = new URLSearchParams({ page: "1", limit: "10", sort: "newest" });
  if (search.trim()) params.set("search", search.trim());
  const res = await fetch(`${API_URL}/api/event?${params.toString()}`, { headers: { token } });
  if (!res.ok) throw new Error(await parseError(res));
  const json = await res.json();
  return (json.data ?? []).map((e: any) => ({
    id: Number(e.id),
    name: e.title || `Event #${e.id}`,
    email: e.startDate ? String(e.startDate).slice(0, 10) : "",
  }));
};
