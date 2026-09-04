# 04 — Billing, Payments & Lifecycle Engines

## 1. Billing Models & Subscription Lifecycle

Maxzone supports two primary billing cycle architectures suited for ISPs and telcos:

### 1.1 Calendar-Month Billing (1st-of-the-Month Cycle)
- Invoices are generated automatically on the **1st day of each month**.
- **Mid-Month Pro-Rata Engine**: When a customer activates on the 15th of a 30-day month, their initial charge is calculated automatically:
  $$\text{Pro-Rata Charge} = \left( \frac{\text{Package Price}}{\text{Days in Month}} \right) \times (\text{Days in Month} - \text{Activation Day} + 1)$$
- **Billing Due Date**: Typically 7th or 10th of the month.
- **Grace Period**: Configurable (e.g. 3 days). If unpaid on the 11th, account enters `GRACE` status. If unpaid on the 14th, account is moved to `SUSPENDED`.

### 1.2 Anniversary / Dynamic Validity Billing
- Account expires exactly $N$ days (e.g., 30 days) from the moment of payment or renewal.
- Ideal for prepaid fiber subscribers and hotspot customers.

### 1.3 Subscriber State Machine

```
   ┌──────────────┐          Due Date Passed
   │    ACTIVE    │ ───────────────────────────────┐
   └──────┬───────┘                                │
          │                                        ▼
          │ Payment Expired                ┌──────────────┐
          │ (No Grace)                     │  GRACE MODE  │
          │                                │ (Warning/Low)│
          │                                └───────┬──────┘
          │                                        │ Grace Period
          ▼                                        │ Expired
   ┌──────────────┐                                │
   │  SUSPENDED   │ ◀──────────────────────────────┘
   │ (Walled-Web) │
   └──────┬───────┘
          │
          │ Customer Pays (bKash / Nagad / Portal)
          ▼
   [ Trigger CoA Disconnect ] ──▶ Returns to [ ACTIVE ] in < 2 seconds
```

---

## 2. Grace Period & "Promise to Pay" Engine

### 2.1 Grace Period Functionality
- Instead of immediately terminating the subscriber's internet connection at midnight, Maxzone moves them into `GRACE` status.
- RADIUS or MikroTik API updates their firewall address-list from `active_users` to `grace_users`.
- Transparent HTTP proxy / DNS injection displays a reminder banner: *"Your internet bill was due yesterday. Please pay via bKash/Nagad to avoid interruption."*

### 2.2 Self-Service "Promise to Pay" (Emergency Unblock)
- When a customer is disconnected on a holiday, late night, or weekend, they can click **"Promise to Pay"** from the Customer Portal or Mobile PWA.
- Requirements:
  - Account has no overdue "Promise to Pay" defaults from the prior month.
  - Automatically grants a **24-hour or 48-hour temporary unblock**.
  - Sends a CoA disconnect packet to the NAS, placing them back in `ACTIVE` status.
  - If payment is not completed within 48 hours, the account is hard-suspended and the feature is locked for 60 days.

---

## 3. Reseller Wallet & Double-Entry Accounting

Resellers operate on a **Prepaid Wallet** or **Authorized Credit Limit** system.

```
                  ┌────────────────────────┐
                  │    Reseller Wallet     │
                  │   Balance: ৳ 15,000    │
                  └───────────┬────────────┘
                              │
               Reseller Renews 50 Customers
               Package Cost: ৳ 400 (Retail: ৳ 600)
                              │
                              ▼
            Atomic DB Transaction (SELECT FOR UPDATE)
  - Deduct 50 * ৳ 400 = ৳ 20,000 from Reseller Wallet
  - If Balance + Credit Limit >= ৳ 20,000:
      -> Deduct Balance to -৳ 5,000 (Within Credit Limit)
      -> Write 50 Ledger Entries to `reseller_transactions`
      -> Activate 50 Customers & Dispatch RADIUS CoA
  - Else:
      -> Rollback Transaction with "INSUFFICIENT_CREDIT_ERROR"
```

### 3.1 Sub-Reseller Commission Splitting
When a Sub-Reseller provisions a customer under a Master Reseller:
1. Sub-Reseller wallet is charged the Sub-Reseller package price.
2. Master Reseller receives the commission differential automatically credited into their ledger.

---

## 4. South Asian & Bangladesh Payment Gateways

### 4.1 Supported Gateways
- **bKash Tokenized Checkout API**:
  - `createPayment`: Generates secure payment URL / pop-up.
  - `executePayment`: Captures payment upon customer OTP & PIN entry.
  - `queryPayment`: Reconciles payment if webhook drops.
- **Nagad Merchant API**:
  - Encrypted payload using Public/Private key pairs.
  - Real-time callback verification.
- **Rocket & Upay**:
  - Direct API or Aggregator gateway support.
- **SSLCommerz & Shurjopay**:
  - Multi-channel aggregation supporting all Bangladesh debit/credit cards, internet banking, and mobile financial services.
- **Manual MFS TrxID Verification Engine**:
  - For walk-in or manual send-money transactions: Customer inputs their TrxID (e.g. `BLA78129XZ`).
  - Maxzone reconciles against incoming SMS webhook or flags for NOC one-click approval.

### 4.2 Webhook Signature Security
All gateway webhooks verify SHA256 HMAC signatures or IP whitelisting before touching the database to prevent spoofing:

```go
func VerifyBkashSignature(payload []byte, signature string, secretKey string) bool {
    mac := hmac.New(sha256.New, []byte(secretKey))
    mac.Write(payload)
    expectedMAC := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expectedMAC))
}
```

---

## 5. Automated Notification Engine (SMS & Email)

Maxzone includes a multi-provider SMS delivery adapter:
- **Supported Adapters**: Greenweb, BulkSMS BD, AlphaSMS, Infobip, Twilio, and Generic HTTP GET/POST Webhook.
- **Standard ISP Automated Triggers**:
  1. `BILL_GENERATED`: "Dear [Name], your Internet bill for [Month] is ৳[Amount]. Due by [Date]. Pay now: [Link]"
  2. `PAYMENT_RECEIVED`: "Thank you! Received ৳[Amount] for [Username]. Your account is active until [Expiry]."
  3. `EXPIRY_WARNING_3D`: "Notice: Your internet expires in 3 days. Please pay to continue uninterrupted service."
  4. `EXPIRY_ALERT_TODAY`: "Your account has expired today. Pay online at [Link] for instant reactivation."
  5. `PROMISE_TO_PAY_GRANTED`: "Emergency 48-hour unblock activated. Please pay by [Date] to avoid disconnection."
