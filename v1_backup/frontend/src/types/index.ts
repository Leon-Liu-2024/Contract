export interface UserProfile {
  id: number;
  name: string;
  email: string;
  department: string | null;
  role: string;
  is_active: boolean;
}

export interface Contract {
  id: number;
  contract_no: string;
  title: string;
  counterparty: string | null;
  amount: number | null;
  contract_type: string | null;
  status: string;
  creator_id: number;
  creator_name: string | null;
  current_step: number;
  workflow_id: number | null;
  start_date: string | null;
  end_date: string | null;
  void_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  attachments?: Attachment[];
  approval_records?: ApprovalRecord[];
}

export interface Attachment {
  id: number;
  filename: string;
  file_size: number;
  uploaded_at: string | null;
}

export interface ApprovalRecord {
  id: number;
  step_order: number;
  step_type: string;
  approver_id: number;
  approver_name: string | null;
  action: string | null;
  comment: string | null;
  status: string;
  acted_at: string | null;
}

export interface Workflow {
  id: number;
  name: string;
  contract_type: string | null;
  amount_min: number | null;
  amount_max: number | null;
  is_active: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  step_order: number;
  step_type: string;
  approver_id: number | null;
  approver_role: string | null;
  approver_name: string | null;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  contract_id: number | null;
  is_read: boolean;
  created_at: string | null;
}

export interface PendingItem {
  record_id: number;
  contract_id: number;
  contract_no: string;
  title: string;
  counterparty: string | null;
  amount: number | null;
  contract_type: string | null;
  step_order: number;
  step_type: string;
  total_steps: number;
  creator_name: string | null;
  created_at: string | null;
}
