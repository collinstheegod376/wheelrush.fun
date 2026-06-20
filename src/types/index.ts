export type UserStats = {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  balance: number;
  spins: number;
  losses: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  avatar_url: string | null;
  balance: number;
};

export type Outcome = {
  label: string;
  value: number;
  color: string;
  textColor: string;
  icon: string;
};

export type PopupState = {
  show: boolean;
  type: 'win' | 'loss';
  amount: number;
  label: string;
};
