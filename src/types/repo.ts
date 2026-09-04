export interface Repo {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  url: string;
  description: string | null;
  updatedAt: string;
}
