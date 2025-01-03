export enum CarvingType {
  Carve = 0,
  Quote = 1,
  Recarve = 2,
  Etch = 3,
}

export type Carving = {
  id: number;
  originalCarvingId: number;
  sentAt: number;
  likeCount: number;
  recarveCount: number;
  etchCount: number;
  carver: string;
  carvingType: CarvingType;
  hidden: boolean;
  likedByUser: boolean;
  message: string;
};
