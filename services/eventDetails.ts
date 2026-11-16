const API_URL = process.env.NEXT_PUBLIC_API_URL;

type EventId = string | number | string[];

interface RequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
}

const jsonHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token ? { token } : {}),
});

const authJsonHeaders = (token?: string) => ({
  ...jsonHeaders(token),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const parseResponse = async (res: Response) => {
  const responseText = await res.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!res.ok || data?.error) {
    throw new Error(
      data?.error?.[0]?.msg ||
        data?.message ||
        `Request failed with status ${res.status}`
    );
  }

  return data;
};

const request = async (path: string, options: RequestOptions = {}) => {
  const res = await fetch(`${API_URL}${path}`, options);
  return parseResponse(res);
};

export const updateEventActionPoint = (
  token: string,
  actionPointId: number,
  payload: Record<string, unknown>
) =>
  request(`/api/event/action-point/${actionPointId}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });

export const deleteEventActionPoint = (token: string, actionPointId: number) =>
  request(`/api/event/action-point/${actionPointId}`, {
    method: "DELETE",
    headers: token ? { token } : {},
  });

export const uploadEventMedia = (
  token: string,
  eventId: EventId,
  formData: FormData
) =>
  request(`/api/event/media/${eventId}`, {
    method: "POST",
    headers: token ? { token } : {},
    body: formData,
  });

export const saveEventSocialLink = (
  token: string,
  eventId: EventId,
  payload: Record<string, unknown>,
  socialLinkId?: number
) =>
  request(
    socialLinkId
      ? `/api/event/${eventId}/social-links/${socialLinkId}`
      : `/api/event/${eventId}/social-links`,
    {
      method: socialLinkId ? "PATCH" : "POST",
      headers: authJsonHeaders(token),
      body: JSON.stringify(payload),
    }
  );

export const deleteEventSocialLink = (
  token: string,
  eventId: EventId,
  socialLinkId: number
) =>
  request(`/api/event/${eventId}/social-links/${socialLinkId}`, {
    method: "DELETE",
    headers: {
      ...(token ? { token, Authorization: `Bearer ${token}` } : {}),
    },
  });

export const deleteEventMedia = (
  token: string,
  eventId: EventId,
  mediaId: number
) =>
  request(`/api/event/${eventId}/media/${mediaId}`, {
    method: "DELETE",
    headers: token ? { token } : {},
  });

export const deleteEventMOMMedia = (
  token: string,
  eventId: EventId,
  mediaId: number
) =>
  request(`/api/event/${eventId}/mom-media/${mediaId}`, {
    method: "DELETE",
    headers: token ? { token } : {},
  });

export const submitEventMOMApproval = (
  token: string,
  eventId: EventId,
  payload: Record<string, unknown>
) =>
  request(`/api/event/mom-approval/${eventId}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });

export const fetchEventDetails = (
  token: string,
  eventId: EventId,
  canReadEvent: boolean
) =>
  request(
    canReadEvent
      ? `/api/event/${eventId}`
      : `/api/event/user-assigned/${eventId}`,
    {
      headers: jsonHeaders(token),
    }
  );

export const fetchActiveSponsorshipPackages = (token: string) =>
  request("/api/sponsorship-packages/?status=active", {
    method: "GET",
    headers: jsonHeaders(token),
  });

export const fetchEventGuests = (token: string, eventId: number) =>
  request(`/api/event/${eventId}/guests?page=1&limit=100`, {
    headers: jsonHeaders(token),
  });

export const fetchCompletedEventSponsors = (token: string, eventId: number) =>
  request(
    `/api/event-sponsors/event/${eventId}?page=1&limit=100&status=COMPLETED&approvalStatus=APPROVED`,
    {
      headers: jsonHeaders(token),
    }
  );

export const fetchEventSponsorsForEvent = (token: string, eventId: number) =>
  request(`/api/event-sponsors/event/${eventId}?page=1&limit=100`, {
    headers: jsonHeaders(token),
  });

export const updateEventRSVP = (
  token: string,
  eventId: EventId,
  rsvpStatus: string
) =>
  request(`/api/event/${eventId}/rsvp`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ rsvpStatus }),
  });

export const createEventSponsorPayment = (token: string, sponsorId: number) =>
  request(`/api/event-sponsors/payment/${sponsorId}`, {
    method: "POST",
    headers: jsonHeaders(token),
  });

export const cancelEventSponsorRequest = (token: string, sponsorId: number) =>
  request(`/api/event-sponsors/${sponsorId}`, {
    method: "DELETE",
    headers: jsonHeaders(token),
  });

export const retryEventGuestPayment = (
  token: string,
  eventId: EventId,
  guestId: number
) =>
  request(`/api/event/${eventId}/guests/${guestId}/payment`, {
    method: "POST",
    headers: jsonHeaders(token),
  });

export const cancelEvent = (
  token: string,
  eventId: EventId,
  cancellationReason: string
) =>
  request(`/api/event/${eventId}/cancel`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ cancellationReason }),
  });

export const updateEventMOM = (
  token: string | null | undefined,
  eventId: EventId,
  eventMOM: string
) =>
  request(`/api/event/mom/${eventId}`, {
    method: "PATCH",
    headers: jsonHeaders(token || undefined),
    body: JSON.stringify({ eventMOM }),
  });

export const uploadEventMOMMedia = (
  token: string | null | undefined,
  eventId: EventId,
  formData: FormData
) =>
  request(`/api/event/mom-media/${eventId}`, {
    method: "POST",
    headers: token ? { token } : {},
    body: formData,
  });

export const fetchEventAttendanceUsers = (
  token: string,
  eventId: EventId,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    membership?: string;
    attendanceStatus?: string;
  } = {}
) => {
  const query = new URLSearchParams({ page: "1", limit: "100", ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])) });
  return request(`/api/event-attendance/${eventId}/users?${query}`, {
    headers: jsonHeaders(token),
  });
};

export const fetchEventAssigneeUsers = (
  token: string,
  eventId: EventId,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    membership?: string;
    rsvpStatus?: string;
  } = {}
) => {
  const query = new URLSearchParams({ page: "1", limit: "100", ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])) });
  return request(`/api/event/${eventId}/assignee-users?${query}`, {
    headers: jsonHeaders(token),
  });
};
