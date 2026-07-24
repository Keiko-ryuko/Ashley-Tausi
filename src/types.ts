export interface User {
  user_id: number;
  fullname: string;
  email: string;
  phone: string;
  role: "Chairperson" | "Treasurer" | "Member";
}

export interface Group {
  group_id: number;
  group_name: string;
  description: string;
  created_by: number;
  created_at: string;
  balance: number;
  target_cycle_amount: number;
  meeting_frequency: string;
}

export interface Contribution {
  contribution_id: number;
  group_id: number;
  member_id: number;
  member_name: string;
  amount: number;
  date: string;
  payment_method: "Cash" | "EcoCash" | "Bank Transfer";
  status: "Pending" | "Approved";
  recorded_by: string;
}

export interface Transaction {
  transaction_id: number;
  group_id: number;
  user_id: number;
  member_name: string;
  type: "Contribution" | "Withdrawal" | "Transfer";
  amount: number;
  date: string;
  balance_after: number;
  status: string;
}

export interface Payout {
  payout_id: number;
  group_id: number;
  member_id: number;
  member_name: string;
  amount: number;
  reason: string;
  status: string;
  approvals: number[]; // user_ids who approved
  date: string;
}

export interface Notification {
  id: number;
  recipient: string;
  contact: string;
  type: string;
  message: string;
  timestamp: string;
}
