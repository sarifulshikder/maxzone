// frontend/src/types/index.ts

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'RESELLER' 
  | 'SUB_RESELLER' 
  | 'CUSTOMER' 
  | 'FIELD_TECH' 
  | 'SUPPORT';

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
}

export interface Package {
  id: string;
  name: string;
  service_type: 'PPPOE' | 'HOTSPOT' | 'STATIC';
  download_speed_kbps: number;
  upload_speed_kbps: number;
  rate_limit_string: string;
  validity_days: number;
  price: number;
  wholesale_price: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  user_id: string;
  customer_code: string;
  billing_type: 'PREPAID' | 'POSTPAID';
  billing_cycle: 'CALENDAR_MONTH' | 'ANNIVERSARY';
  phone?: string;
  address_line1: string;
  address_line2?: string;
  zone_area?: string;
  user?: User;
  service_account?: ServiceAccount;
}

export interface ServiceAccount {
  id: string;
  customer_id?: string;
  nas_id?: string;
  package_id?: string;
  username: string;
  password?: string;
  service_type: 'PPPOE' | 'HOTSPOT' | 'STATIC';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'GRACE';
  static_ip?: string;
  mac_address?: string;
  expires_at: string;
  grace_expires_at?: string;
  last_online_at?: string;
  last_calling_station_id?: string;
  package?: Package;
  router?: NASRouter;
}

export interface RadCheck {
  id: number;
  username: string;
  attribute: string;
  op: string;
  value: string;
}

export interface RadReply {
  id: number;
  username: string;
  attribute: string;
  op: string;
  value: string;
}

export interface CustomerListItem {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email: string;
  zone_area: string;
  username: string;
  package_name: string;
  package_speed: string;
  price: number;
  router_name: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'GRACE';
  expires_at: string;
  created_at: string;
}

export interface Customer360Detail {
  customer: Customer;
  service_account: ServiceAccount;
  package: Package;
  router: NASRouter;
  radius_check: RadCheck[];
  radius_reply: RadReply[];
}

export interface NASRouter {
  id: string;
  name: string;
  ip_address: string;
  api_port: number;
  api_ssl_port: number;
  api_username: string;
  radius_secret: string;
  coa_port: number;
  router_os_version: 'v6' | 'v7';
  is_simulated: boolean;
  is_active: boolean;
  last_status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNKNOWN';
  last_ping_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RouterPingResult {
  status: 'ONLINE' | 'OFFLINE';
  latency_ms: number;
  cpu_load_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  active_ppp_sessions: number;
  uptime: string;
  board_name: string;
}

export interface ActiveSession {
  id: string;
  username: string;
  ip_address: string;
  mac_address: string;
  caller_id: string;
  uptime: string;
  bytes_in: number;
  bytes_out: number;
  rate_limit: string;
  service: string;
  connected_at: string;
}

export interface RouterStats {
  resource: {
    uptime: string;
    version: string;
    platform: string;
    board_name: string;
    cpu_load: number;
    cpu_count: number;
    free_memory_bytes: number;
    total_memory_bytes: number;
    free_hdd_bytes: number;
    total_hdd_bytes: number;
    architecture_name: string;
  };
  sessions: ActiveSession[];
}

export interface OLTDevice {
  id: string;
  name: string;
  vendor: 'HUAWEI' | 'ZTE' | 'VSOL' | 'BDCOM' | 'CDATA' | 'FIBERHOME';
  ip_address: string;
  is_simulated: boolean;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  service_account_id?: string;
  reseller_id?: string;
  package_id: string;
  amount: number;
  discount: number;
  total_payable: number;
  status: 'UNPAID' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  service_account?: ServiceAccount;
  package?: Package;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'BKASH' | 'NAGAD' | 'ROCKET' | 'SSLCOMMERZ' | 'CASH';
  gateway_transaction_id?: string;
  gateway_response?: string;
  status: 'COMPLETED' | 'FAILED' | 'REFUNDED';
  received_by?: string;
  created_at: string;
  invoice?: Invoice;
}

export interface PromiseToPay {
  id: string;
  customer_id: string;
  service_account_id: string;
  extension_hours: number;
  granted_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'SETTLED' | 'EXPIRED';
  created_by?: string;
  created_at: string;
}

export interface CustomerPortalOverview {
  customer: Customer;
  service_account: ServiceAccount;
  package: Package;
  router: NASRouter;
  latest_invoice?: Invoice;
  active_promise?: PromiseToPay;
  recent_payments: Payment[];
  unpaid_invoices: Invoice[];
  days_remaining: number;
}

export interface ResellerWallet {
  id: string;
  reseller_id: string;
  balance: number;
  currency: string;
  credit_limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  meta?: {
    page: number;
    per_page: number;
    total_records: number;
  };
}

export interface AuthData {
  token: string;
  refresh_token: string;
  user: User;
}
