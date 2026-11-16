export interface GeneralResponse {
  id: string;
  userId: number;
  threadUserId?: number;
  response: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    Role?: {
      id: number;
      name: string;
    };
  };
}
