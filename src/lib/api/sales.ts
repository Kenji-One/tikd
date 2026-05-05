export type SalesScope = "global" | "event" | "organization" | "team";

export type SaleOrderStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "cancelled"
  | "expired";

export type SaleStatusLabel =
  | "Completed"
  | "Pending"
  | "Refunded"
  | "Cancelled"
  | "Expired";

export type SalesSortBy =
  | "createdAt"
  | "amount"
  | "buyerName"
  | "eventTitle"
  | "status";

export type SalesSortDir = "asc" | "desc";

export type SaleRow = {
  id: string;
  orderId: string;
  orderDisplay: string;
  buyer: {
    id: string | null;
    name: string;
    email: string;
    imageUrl: string | null;
  };
  event: {
    id: string | null;
    title: string;
    imageUrl: string | null;
  };
  organizationId: string | null;
  amount: number;
  currency: string;
  status: SaleOrderStatus;
  statusLabel: SaleStatusLabel;
  quantity: number;
  ticketSummary: string;
  couponCode: string | null;
  trackingCode: string | null;
  trackingCreatorUserId: string | null;
  createdAt: string;
};

export type SalesListResponse = {
  scope: {
    type: SalesScope;
    eventId: string | null;
    orgId: string | null;
    teamId: string | null;
  };
  rows: SaleRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  sort: {
    by: SalesSortBy;
    dir: SalesSortDir;
  };
  filters: {
    search: string;
    status: SaleOrderStatus | null;
    start: string | null;
    end: string | null;
  };
};

export type FetchSalesInput = {
  scope: SalesScope;
  eventId?: string | null;
  orgId?: string | null;
  teamId?: string | null;
  start?: Date | null;
  end?: Date | null;
  search?: string | null;
  status?: SaleOrderStatus | "all" | null;
  sortBy?: SalesSortBy;
  sortDir?: SalesSortDir;
  page?: number;
  pageSize?: number;
};

function buildUrl(params: FetchSalesInput) {
  const url = new URL("/api/sales", window.location.origin);

  url.searchParams.set("scope", params.scope);

  if (params.eventId) url.searchParams.set("eventId", params.eventId);
  if (params.orgId) url.searchParams.set("orgId", params.orgId);
  if (params.teamId) url.searchParams.set("teamId", params.teamId);

  if (params.start) url.searchParams.set("start", params.start.toISOString());
  if (params.end) url.searchParams.set("end", params.end.toISOString());

  const search = String(params.search ?? "").trim();
  if (search) url.searchParams.set("search", search);

  if (params.status && params.status !== "all") {
    url.searchParams.set("status", params.status);
  }

  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDir) url.searchParams.set("sortDir", params.sortDir);

  if (typeof params.page === "number" && Number.isFinite(params.page)) {
    url.searchParams.set("page", String(params.page));
  }

  if (typeof params.pageSize === "number" && Number.isFinite(params.pageSize)) {
    url.searchParams.set("pageSize", String(params.pageSize));
  }

  return url.toString();
}

export async function fetchSales(
  params: FetchSalesInput,
): Promise<SalesListResponse> {
  const res = await fetch(buildUrl(params), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch sales (${res.status})`);
  }

  return (await res.json()) as SalesListResponse;
}
