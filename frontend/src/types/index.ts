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

export type OLTStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNKNOWN';
export type ONUStatus = 'ONLINE' | 'OFFLINE' | 'LOS' | 'DISCOVERED' | 'UNKNOWN';
export type ONUHealth = 'OPTIMAL' | 'GOOD' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type SNMPVersion = 'v2c' | 'v3';

export interface OLTDevice {
  id: string;
  name: string;
  vendor: 'HUAWEI' | 'ZTE' | 'VSOL' | 'BDCOM' | 'CDATA' | 'FIBERHOME';
  model: string;
  ip_address: string;
  snmp_version: SNMPVersion;
  snmp_port: number;
  snmp_community?: string;
  snmp_username?: string;
  snmp_auth_protocol?: string;
  snmp_priv_protocol?: string;
  oid_profile: string;
  is_simulated: boolean;
  is_active: boolean;
  last_status: OLTStatus;
  last_polled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OLTPingResult {
  status: 'ONLINE' | 'OFFLINE';
  latency_ms: number;
  vendor: string;
  model: string;
  software_version: string;
  uptime: string;
}

export interface ONUDevice {
  id: string;
  olt_id: string;
  pon_port_id: string;
  serial_number: string;
  name: string;
  mac_address?: string;
  rx_power_db?: number | null;
  tx_power_db?: number | null;
  temperature_c?: number | null;
  distance_m?: number | null;
  status: ONUStatus;
  health: ONUHealth;
  registered: boolean;
  last_discovered_at?: string;
  last_polled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PONPortDetail {
  id: string;
  name: string;
  frame: number;
  slot: number;
  port: number;
  onboarded_onts: number;
  max_onts: number;
  onus: ONUDevice[];
}

export interface OLTDetail {
  olt: OLTDevice;
  ports: PONPortDetail[];
  discovered_queue: ONUDevice[];
  total_onus: number;
  unregistered_onus: number;
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

export interface GISOLT {
  id: string;
  name: string;
  vendor: string;
  model: string;
  last_status: OLTStatus;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GISSplitter {
  id: string;
  name: string;
  code: string;
  split_ratio: string;
  ports_used: number;
  max_ports: number;
  address: string;
  needs_service: boolean;
  latitude?: number | null;
  longitude?: number | null;
  available: number;
}

export interface GISTJBox {
  id: string;
  name: string;
  code: string;
  box_number: number;
  ports_used: number;
  max_ports: number;
  address: string;
  needs_service: boolean;
  latitude?: number | null;
  longitude?: number | null;
  available: number;
}

export interface GISFiberCable {
  id: string;
  name: string;
  cable_type: 'FEEDER' | 'DISTRIBUTION' | 'DROP';
  core_count: number;
  jacket_color: string;
  from_node: string;
  to_node: string;
  from: [number, number];
  to: [number, number];
}

export interface GISMapData {
  olts: GISOLT[];
  splitters: GISSplitter[];
  boxes: GISTJBox[];
  cables: GISFiberCable[];
}

export interface NearestBoxResult {
  box: GISTJBox;
  distance_m: number;
}

export interface ONUSignal {
  serial_number: string;
  mac_address: string;
  olt_name: string;
  pon_port: string;
  status: string;
  health: ONUHealth;
  rx_power_db?: number | null;
  tx_power_db?: number | null;
  temperature_c?: number | null;
  distance_m?: number | null;
  last_polled_at?: string;
}

export interface FieldTask {
  type: 'BOX' | 'SPLITTER';
  id: string;
  name: string;
  code: string;
  address: string;
  ports_used: number;
  max_ports: number;
  latitude?: number | null;
  longitude?: number | null;
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
