// V2 Types - 對應企業合約作業流程

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  department: string | null;
  role: string;
  title: string | null;
  is_active: boolean;
}

export interface Vendor {
  id: number;
  name: string;
  tax_id: string | null;
  business_reg_no: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  category: string | null;
  tax_registered: boolean;
  business_registered: boolean;
  is_active: boolean;
}

// 合約 10 階段
export const CONTRACT_STAGES: Record<string, { order: number; label: string; color: string }> = {
  draft:             { order: 1, label: '起始作業', color: '#d9d9d9' },
  approval_memo:     { order: 2, label: '簽呈', color: '#fadb14' },
  purchase_request:  { order: 3, label: '請購單', color: '#ffa940' },
  purchase_decision: { order: 4, label: '決購建議表', color: '#fa8c16' },
  contract_review:   { order: 5, label: '非制式合約會辦', color: '#1890ff' },
  stamping:          { order: 6, label: '合約用印', color: '#722ed1' },
  vendor_stamping:   { order: 7, label: '寄送廠商用印', color: '#eb2f96' },
  signing_complete:  { order: 8, label: '收件簽約完成', color: '#13c2c2' },
  archived:          { order: 9, label: '合約入檔', color: '#52c41a' },
  acceptance:        { order: 10, label: '驗收請款', color: '#389e0d' },
  void:              { order: -1, label: '已作廢', color: '#ff4d4f' },
};

export const CONTRACT_TYPES: Record<string, string> = {
  main_hourly: '主約(工時版)',
  supplemental: '補充合約',
  hourly: '工時合約',
  maintenance: '維護合約',
  purchase: '採購合約',
  nda: '保密協議(NDA)',
  service: '勞務合約',
  other: '其他',
};

export interface Contract {
  id: number;
  contract_no: string;
  title: string;
  contract_type: string;
  contract_format: string;
  vendor_id: number | null;
  vendor_name?: string;
  amount: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  current_stage: string;
  creator_id: number;
  creator_name?: string;
  requester_dept: string | null;
  project_name: string | null;
  purchase_request_no: string | null;
  purchase_decision_no: string | null;
  roi_required: boolean;
  roi_value: number | null;
  stamp_copies: number;
  internal_stamp_done: boolean;
  vendor_stamp_done: boolean;
  ip_notification_required: boolean;
  ip_notification_done: boolean;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  documents?: Document[];
  stage_logs?: StageLog[];
  approvals?: ApprovalRecord[];
}

export interface StageLog {
  id: number;
  from_stage: string | null;
  to_stage: string;
  operator_name?: string;
  comment: string | null;
  created_at: string;
}

export interface Document {
  id: number;
  doc_type: string;
  filename: string;
  file_size: number;
  stage: string;
  uploader_name?: string;
  description: string | null;
  version: number;
  created_at: string;
}

export interface ApprovalRecord {
  id: number;
  stage: string;
  step_order: number;
  step_type: string;
  step_name: string | null;
  approver_id: number;
  approver_name?: string;
  action: string | null;
  status: string;
  comment: string | null;
  acted_at: string | null;
  created_at: string;
}

export interface Workflow {
  id: number;
  name: string;
  stage: string;
  contract_type: string | null;
  is_active: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  step_order: number;
  step_type: string;
  approver_id: number | null;
  approver_role: string | null;
  approver_name?: string;
  step_name: string | null;
}

export interface Notification {
  id: number;
  contract_id: number | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface StageSummary {
  stage: string;
  label: string;
  count: number;
}

export interface PendingApproval {
  record_id: number;
  contract_id: number;
  contract_no: string;
  title: string;
  amount: number | null;
  current_stage: string;
  stage_label: string;
  step_order: number;
  step_name: string | null;
  creator_name: string;
  created_at: string;
}
