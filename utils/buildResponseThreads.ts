import { GeneralResponse } from "@/types/global";

export type ResponseThread = {
  threadUserId: number;
  threadUser?: GeneralResponse["user"];
  responses: GeneralResponse[];
};

export const buildResponseThreads = (
  responses: GeneralResponse[] = [],
  ownerId: number,
): { threads: ResponseThread[]; unassigned: GeneralResponse[] } => {
  const threadMap = new Map<number, ResponseThread>();
  const unassigned: GeneralResponse[] = [];
  let lastThreadUserId: number | null = null;

  const orderedResponses = [...responses].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  orderedResponses.forEach((item) => {
    const isOwnerResponse = item.userId === ownerId;
    const threadUserId = isOwnerResponse
      ? item.threadUserId ?? lastThreadUserId
      : item.userId;

    if (!threadUserId) {
      unassigned.push(item);
      return;
    }

    if (!isOwnerResponse) {
      lastThreadUserId = threadUserId;
    }

    const existing = threadMap.get(threadUserId) || {
      threadUserId,
      responses: [],
    };

    if (!existing.threadUser && !isOwnerResponse) {
      existing.threadUser = item.user;
    }

    existing.responses.push(item);
    threadMap.set(threadUserId, existing);
  });

  const threads = Array.from(threadMap.values()).sort((a, b) => {
    const aLast = a.responses[a.responses.length - 1]?.createdAt ?? "";
    const bLast = b.responses[b.responses.length - 1]?.createdAt ?? "";
    return aLast.localeCompare(bLast);
  });

  return { threads, unassigned };
};
