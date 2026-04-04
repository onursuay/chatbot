-- ============================================
-- WaAPI Platform — Supabase SQL Schema
-- Tum tablolar tek dosyada (Kommo-level CRM)
-- ============================================

-- UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. Organizations (Tenants)
-- ============================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  plan text not null default 'trial',
  meta_business_id text,
  settings jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 2. Users
-- ============================================
create table users (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  password_hash text not null,
  full_name text,
  role text not null default 'agent',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, email)
);

-- ============================================
-- 3. WABA Accounts
-- ============================================
create table waba_accounts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  waba_id text unique not null,
  name text,
  access_token text not null,
  business_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 4. Phone Numbers
-- ============================================
create table phone_numbers (
  id uuid primary key default uuid_generate_v4(),
  waba_id uuid not null references waba_accounts(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  phone_number_id text unique not null,
  display_number text not null,
  verified_name text,
  quality_rating text not null default 'GREEN',
  status text not null default 'CONNECTED',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 4b. Channel Accounts (webhook + mesaj gonderi icin)
-- ============================================
create table if not exists channel_accounts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  channel text not null,
  account_id text not null,
  page_id text,
  page_name text,
  access_token text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, channel, account_id)
);

create index idx_channel_accounts_org on channel_accounts(org_id);

-- ============================================
-- 5. Companies (Sirket profilleri — Kommo)
-- ============================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  size text,                -- startup/small/medium/large/enterprise
  phone text,
  email text,
  address text,
  city text,
  country text,
  website text,
  tax_id text,
  attributes jsonb not null default '{}',
  tags text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_companies_org_id on companies(org_id);

-- ============================================
-- 6. Contacts (company_id eklendi)
-- ============================================
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  wa_id text not null,
  phone text not null,
  name text,
  profile_name text,
  email text,
  title text,               -- Unvan (CEO, CTO, vb.)
  tags text[] default '{}',
  attributes jsonb not null default '{}',
  is_blocked boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, wa_id)
);

create index idx_contacts_org_id on contacts(org_id);

-- ============================================
-- 6. Conversations
-- ============================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  phone_number_id uuid references phone_numbers(id),
  channel_account_id uuid references channel_accounts(id) on delete set null,
  status text not null default 'open',
  assigned_to uuid references users(id),
  labels text[] default '{}',
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer not null default 0,
  is_bot_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_org_id on conversations(org_id);

-- ============================================
-- 7. Messages
-- ============================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  contact_id uuid not null references contacts(id),
  wa_message_id text unique,
  direction text not null,
  type text not null default 'text',
  content jsonb not null default '{}',
  status text not null default 'sent',
  sender_type text,
  sender_id uuid,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_messages_conversation_id on messages(conversation_id);

-- ============================================
-- 8. Conversation Notes
-- ============================================
create table conversation_notes (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 9. Chatbot Config
-- ============================================
create table chatbot_configs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null default 'Default Bot',
  is_active boolean not null default true,
  ai_provider text not null default 'gemini',
  ai_model text not null default 'gemini-2.5-flash',
  system_prompt text not null default 'Sen yardimci bir WhatsApp asistanisin.',
  temperature real not null default 0.7,
  max_tokens integer not null default 1024,
  transfer_keywords text[] default '{}',
  close_keywords text[] default '{}',
  welcome_message text,
  business_hours jsonb,
  out_of_hours_message text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 10. Templates
-- ============================================
create table templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  waba_id uuid not null references waba_accounts(id) on delete cascade,
  meta_template_id text,
  name text not null,
  language text not null default 'tr',
  category text,
  status text not null default 'DRAFT',
  components jsonb not null default '[]',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 11. Broadcasts
-- ============================================
create table broadcasts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  template_id uuid references templates(id),
  phone_number_id uuid references phone_numbers(id),
  name text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  read_count integer not null default 0,
  failed_count integer not null default 0,
  recipient_filter jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table broadcast_recipients (
  id uuid primary key default uuid_generate_v4(),
  broadcast_id uuid not null references broadcasts(id) on delete cascade,
  contact_id uuid not null references contacts(id),
  status text not null default 'pending',
  wa_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz
);

-- ============================================
-- 12. Automations
-- ============================================
create table automations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text,
  trigger_type text not null,
  trigger_config jsonb not null default '{}',
  action_type text not null,
  action_config jsonb not null default '{}',
  is_active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 13. API Keys
-- ============================================
create table api_keys (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,
  name text,
  permissions jsonb not null default '["messages:send"]',
  expires_at timestamptz,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 14. Pipelines (Satis Hunisi — Kommo)
-- ============================================
create table pipelines (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pipelines_org_id on pipelines(org_id);

-- ============================================
-- 15. Pipeline Stages (Huni Asamalari)
-- ============================================
create table pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  color text not null default '#3B82F6',
  sort_order integer not null default 0,
  is_win boolean not null default false,   -- Kazanildi asamasi mi?
  is_loss boolean not null default false,  -- Kaybedildi asamasi mi?
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pipeline_stages_pipeline_id on pipeline_stages(pipeline_id);

-- ============================================
-- 16. Lead Sources (Kaynak Takibi)
-- ============================================
create table lead_sources (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,        -- WhatsApp, Instagram, Web Form, Manual, API, vb.
  icon text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 17. Leads (Pipeline Kartlari — Kommo)
-- ============================================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  stage_id uuid not null references pipeline_stages(id),
  contact_id uuid references contacts(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  source_id uuid references lead_sources(id) on delete set null,
  assigned_to uuid references users(id) on delete set null,
  title text not null,
  value numeric(12,2) default 0,           -- Tahmini deger (TL/USD)
  currency text not null default 'TRY',
  status text not null default 'active',   -- active/won/lost
  loss_reason text,
  closed_at timestamptz,
  tags text[] default '{}',
  attributes jsonb not null default '{}',
  score integer default 0,                 -- Lead puani (0-100)
  next_action_at timestamptz,              -- Sonraki aksiyon tarihi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_org_id on leads(org_id);
create index idx_leads_pipeline_id on leads(pipeline_id);
create index idx_leads_stage_id on leads(stage_id);
create index idx_leads_assigned_to on leads(assigned_to);
create index idx_leads_status on leads(status);

-- ============================================
-- 18. Tasks (Gorev Yonetimi — Kommo)
-- ============================================
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  assigned_to uuid references users(id) on delete set null,
  created_by uuid not null references users(id),
  lead_id uuid references leads(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  title text not null,
  description text,
  type text not null default 'task',       -- task/call/meeting/email/follow_up
  priority text not null default 'normal', -- low/normal/high/urgent
  status text not null default 'pending',  -- pending/in_progress/completed/cancelled
  due_at timestamptz,
  completed_at timestamptz,
  reminder_at timestamptz,
  is_automated boolean not null default false,  -- Salesbot tarafindan olusturuldu mu?
  result_text text,                        -- Gorev sonucu notu
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_org_id on tasks(org_id);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_tasks_lead_id on tasks(lead_id);
create index idx_tasks_due_at on tasks(due_at);
create index idx_tasks_status on tasks(status);

-- ============================================
-- 19. Tags (Etiket Yonetimi — Kommo)
-- ============================================
create table tags (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text not null default '#6B7280',
  entity_type text not null default 'contact',  -- contact/lead/company/conversation
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, name, entity_type)
);

create index idx_tags_org_id on tags(org_id);

-- ============================================
-- 20. Custom Field Definitions (Dinamik Ozel Alanlar — Kommo)
-- ============================================
create table custom_field_definitions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,        -- contact/lead/company
  field_name text not null,
  field_label text not null,
  field_type text not null,         -- text/number/date/select/multiselect/checkbox/url/email/phone/textarea
  options jsonb default '[]',       -- select/multiselect secenekleri
  is_required boolean not null default false,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  default_value text,
  placeholder text,
  validation_regex text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, entity_type, field_name)
);

-- ============================================
-- 21. Custom Field Values
-- ============================================
create table custom_field_values (
  id uuid primary key default uuid_generate_v4(),
  field_id uuid not null references custom_field_definitions(id) on delete cascade,
  entity_id uuid not null,          -- contact_id, lead_id veya company_id
  entity_type text not null,        -- contact/lead/company
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_id, entity_id)
);

create index idx_custom_field_values_entity on custom_field_values(entity_type, entity_id);

-- ============================================
-- 22. Activity Log (Aktivite Takibi — Kommo)
-- ============================================
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  entity_type text not null,        -- lead/contact/company/conversation/task/pipeline/broadcast
  entity_id uuid not null,
  action text not null,             -- created/updated/deleted/stage_changed/assigned/note_added/
                                    -- status_changed/merged/tagged/untagged/called/emailed/message_sent
  old_value jsonb,                  -- Onceki deger
  new_value jsonb,                  -- Yeni deger
  metadata jsonb default '{}',     -- Ekstra bilgi
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_org_id on activity_logs(org_id);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);
create index idx_activity_logs_created_at on activity_logs(created_at);

-- ============================================
-- 23. Webhook Configs (Giden Webhook'lar — Kommo)
-- ============================================
create table webhook_configs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text,
  url text not null,
  secret text,                       -- HMAC imzalama anahtari
  events text[] not null default '{}',  -- lead.created, contact.updated, message.received, vb.
  is_active boolean not null default true,
  retry_count integer not null default 3,
  last_triggered_at timestamptz,
  last_status_code integer,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 24. Webhook Delivery Log
-- ============================================
create table webhook_deliveries (
  id uuid primary key default uuid_generate_v4(),
  webhook_id uuid not null references webhook_configs(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  response_status integer,
  response_body text,
  success boolean not null default false,
  attempt integer not null default 1,
  delivered_at timestamptz not null default now()
);

create index idx_webhook_deliveries_webhook_id on webhook_deliveries(webhook_id);

-- ============================================
-- 25. Web Forms (Lead Yakalama Formlari — Kommo)
-- ============================================
create table web_forms (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  pipeline_id uuid references pipelines(id) on delete set null,
  stage_id uuid references pipeline_stages(id) on delete set null,
  assigned_to uuid references users(id) on delete set null,
  fields jsonb not null default '[]',        -- [{name, label, type, required, placeholder}]
  settings jsonb not null default '{}',      -- redirect_url, success_message, theme, vb.
  style jsonb not null default '{}',         -- CSS ozellikleri
  is_active boolean not null default true,
  submission_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, slug)
);

-- ============================================
-- 26. Form Submissions
-- ============================================
create table form_submissions (
  id uuid primary key default uuid_generate_v4(),
  form_id uuid not null references web_forms(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  data jsonb not null default '{}',
  ip_address text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index idx_form_submissions_form_id on form_submissions(form_id);

-- ============================================
-- 27. Salesbot Flows (Gorsel Bot Akislari — Kommo)
-- ============================================
create table salesbot_flows (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,        -- keyword/new_conversation/stage_change/form_submit/schedule
  trigger_config jsonb not null default '{}',
  is_active boolean not null default false,
  version integer not null default 1,
  published_at timestamptz,
  stats jsonb not null default '{"triggered":0,"completed":0,"dropped":0}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 28. Salesbot Flow Steps (Akis Adimlari)
-- ============================================
create table salesbot_flow_steps (
  id uuid primary key default uuid_generate_v4(),
  flow_id uuid not null references salesbot_flows(id) on delete cascade,
  step_type text not null,           -- send_message/send_template/wait/condition/collect_input/
                                     -- assign_user/change_stage/add_tag/create_task/http_request/
                                     -- ai_response/transfer_human/close_conversation
  config jsonb not null default '{}',
  position_x integer not null default 0,   -- Canvas X koordinati
  position_y integer not null default 0,   -- Canvas Y koordinati
  next_step_id uuid references salesbot_flow_steps(id) on delete set null,
  true_step_id uuid references salesbot_flow_steps(id) on delete set null,   -- Kosul dogru ise
  false_step_id uuid references salesbot_flow_steps(id) on delete set null,  -- Kosul yanlis ise
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_salesbot_flow_steps_flow_id on salesbot_flow_steps(flow_id);

-- ============================================
-- 29. Salesbot Flow Sessions (Aktif Calisma Kayitlari)
-- ============================================
create table salesbot_flow_sessions (
  id uuid primary key default uuid_generate_v4(),
  flow_id uuid not null references salesbot_flows(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  current_step_id uuid references salesbot_flow_steps(id) on delete set null,
  status text not null default 'active',   -- active/completed/paused/failed
  variables jsonb not null default '{}',    -- Toplanan veriler
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now()
);

create index idx_salesbot_sessions_contact on salesbot_flow_sessions(contact_id);

-- ============================================
-- 30. Dashboard Widgets (Ozellestirilebilir Widget'lar — Kommo)
-- ============================================
create table dashboard_widgets (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  widget_type text not null,         -- kpi_card/bar_chart/line_chart/pie_chart/funnel/
                                     -- leaderboard/task_list/recent_leads/pipeline_summary/
                                     -- message_stats/conversion_rate/revenue_forecast
  title text not null,
  config jsonb not null default '{}',       -- date_range, filters, metric, vb.
  position_x integer not null default 0,
  position_y integer not null default 0,
  width integer not null default 4,         -- Grid genisligi (1-12)
  height integer not null default 2,        -- Grid yuksekligi
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dashboard_widgets_user on dashboard_widgets(user_id);

-- ============================================
-- 31. Team Invitations (Ekip Davetleri — Kommo)
-- ============================================
create table team_invitations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  invited_by uuid not null references users(id),
  email text not null,
  role text not null default 'agent',  -- owner/admin/agent
  token text unique not null,
  status text not null default 'pending',  -- pending/accepted/expired/cancelled
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 32. Call Logs (Arama Kayitlari — Kommo)
-- ============================================
create table call_logs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  direction text not null,           -- inbound/outbound
  status text not null default 'completed',  -- initiated/ringing/in_progress/completed/missed/failed
  phone_from text,
  phone_to text,
  duration_seconds integer default 0,
  recording_url text,
  notes text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_call_logs_org_id on call_logs(org_id);
create index idx_call_logs_contact_id on call_logs(contact_id);

-- ============================================
-- 33. Email Logs (Email Takibi — Kommo)
-- ============================================
create table email_logs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  direction text not null,           -- inbound/outbound
  from_email text not null,
  to_email text not null,
  subject text,
  body_html text,
  body_text text,
  status text not null default 'sent',  -- draft/sent/delivered/opened/clicked/bounced/failed
  opened_at timestamptz,
  clicked_at timestamptz,
  message_id text,                   -- Email message-id header
  thread_id text,
  attachments jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_email_logs_org_id on email_logs(org_id);
create index idx_email_logs_contact_id on email_logs(contact_id);

-- ============================================
-- 34. Lead Scoring Rules (Lead Puanlama — Kommo)
-- ============================================
create table lead_scoring_rules (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  condition_type text not null,      -- field_value/tag_present/source/activity/stage_time
  condition_config jsonb not null default '{}',
  score_delta integer not null default 0,    -- +10, -5, vb.
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 35. Saved Filters (Kayitli Filtreler — Kommo)
-- ============================================
create table saved_filters (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  entity_type text not null,         -- lead/contact/company/conversation/task
  filters jsonb not null default '{}',
  is_default boolean not null default false,
  is_shared boolean not null default false,  -- Tum ekiple paylasim
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Row Level Security (RLS) — Multi-tenant izolasyonu
-- ============================================

alter table organizations enable row level security;
alter table users enable row level security;
alter table waba_accounts enable row level security;
alter table phone_numbers enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table conversation_notes enable row level security;
alter table chatbot_configs enable row level security;
alter table templates enable row level security;
alter table broadcasts enable row level security;
alter table broadcast_recipients enable row level security;
alter table automations enable row level security;
alter table api_keys enable row level security;
alter table pipelines enable row level security;
alter table pipeline_stages enable row level security;
alter table lead_sources enable row level security;
alter table leads enable row level security;
alter table tasks enable row level security;
alter table tags enable row level security;
alter table custom_field_definitions enable row level security;
alter table custom_field_values enable row level security;
alter table activity_logs enable row level security;
alter table webhook_configs enable row level security;
alter table webhook_deliveries enable row level security;
alter table web_forms enable row level security;
alter table form_submissions enable row level security;
alter table salesbot_flows enable row level security;
alter table salesbot_flow_steps enable row level security;
alter table salesbot_flow_sessions enable row level security;
alter table dashboard_widgets enable row level security;
alter table team_invitations enable row level security;
alter table call_logs enable row level security;
alter table email_logs enable row level security;
alter table lead_scoring_rules enable row level security;
alter table saved_filters enable row level security;
alter table channel_accounts enable row level security;
alter table meta_connections enable row level security;
alter table channel_selections enable row level security;

-- Service role icin full access (API routes service_role key kullanacak)

-- Realtime icin gerekli RLS policy'leri
-- messages ve conversations tablolarinda SELECT izni (Realtime subscription icin)
create policy "Allow realtime select on messages"
  on messages for select
  using (true);

create policy "Allow realtime select on conversations"
  on conversations for select
  using (true);

-- updated_at otomatik guncelleme trigger'i
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Her tabloya updated_at trigger'i ekle
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'organizations','users','waba_accounts','phone_numbers','companies',
      'contacts','conversations','messages','conversation_notes',
      'chatbot_configs','templates','broadcasts','automations','api_keys',
      'pipelines','pipeline_stages','lead_sources','leads','tasks','tags',
      'custom_field_definitions','custom_field_values','activity_logs',
      'webhook_configs','web_forms','salesbot_flows','salesbot_flow_steps',
      'salesbot_flow_sessions','dashboard_widgets','team_invitations',
      'call_logs','email_logs','lead_scoring_rules','saved_filters',
      'channel_accounts','meta_connections','channel_selections'
    ])
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %s for each row execute function update_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ============================================
-- Knowledge Base Items — AI Bilgi Bankasi
-- ============================================
create table knowledge_base_items (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  type text not null default 'text', -- text, url, faq
  title text not null,
  content text not null,
  url text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kbi_org on knowledge_base_items(org_id);

-- ============================================
-- Meta OAuth Connections (tek OAuth, uc kanal)
-- ============================================
create table meta_connections (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  access_token text,
  access_expires_at timestamptz,
  token_type text default 'long_lived',
  scopes text,
  status text default 'active',  -- active | revoked | expired
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id)
);

create index idx_meta_connections_org on meta_connections(org_id);

-- ============================================
-- Channel Selections (kanal bazli hesap secimi)
-- ============================================
create table channel_selections (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  channel text not null,          -- whatsapp | instagram | messenger
  platform_id text not null,      -- waba_phone_id / ig_user_id / page_id
  platform_name text,             -- "My Tostcu" / "Yaratan Kadinlar"
  platform_detail text,           -- telefon no / ig username / sayfa url
  enabled boolean default true,
  metadata jsonb,                 -- kanal bazli ek bilgi (waba_id, page_access_token vs)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, channel, platform_id)
);

create index idx_channel_selections_org on channel_selections(org_id);

-- ============================================
-- Realtime — Supabase Realtime icin tablolari etkinlestir
-- ============================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table meta_connections;
alter publication supabase_realtime add table channel_selections;

-- Migration: Allow multiple accounts per channel
-- ALTER TABLE channel_selections DROP CONSTRAINT channel_selections_org_id_channel_key;
-- ALTER TABLE channel_selections ADD CONSTRAINT channel_selections_org_id_channel_platform_key UNIQUE(org_id, channel, platform_id);
