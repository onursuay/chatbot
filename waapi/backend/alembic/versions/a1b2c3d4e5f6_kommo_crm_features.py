"""kommo CRM features - pipelines, leads, companies, tasks, tags, custom fields, etc.

Revision ID: a1b2c3d4e5f6
Revises: 62c6e255ed6f
Create Date: 2026-03-27 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '62c6e255ed6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Companies
    op.create_table('companies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('domain', sa.String(255), nullable=True),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('size', sa.String(50), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('tax_id', sa.String(50), nullable=True),
        sa.Column('attributes', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('tags', postgresql.ARRAY(sa.String()), server_default='{}'),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_companies_org_id', 'companies', ['org_id'])

    # Add company_id and title to contacts
    op.add_column('contacts', sa.Column('company_id', sa.UUID(), nullable=True))
    op.add_column('contacts', sa.Column('title', sa.String(100), nullable=True))
    op.create_foreign_key('fk_contacts_company', 'contacts', 'companies', ['company_id'], ['id'], ondelete='SET NULL')

    # Pipelines
    op.create_table('pipelines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_pipelines_org_id', 'pipelines', ['org_id'])

    # Pipeline Stages
    op.create_table('pipeline_stages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pipeline_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('color', sa.String(7), server_default='#3B82F6', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_win', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_loss', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_pipeline_stages_pipeline_id', 'pipeline_stages', ['pipeline_id'])

    # Lead Sources
    op.create_table('lead_sources',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Leads
    op.create_table('leads',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('pipeline_id', sa.UUID(), nullable=False),
        sa.Column('stage_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('company_id', sa.UUID(), nullable=True),
        sa.Column('source_id', sa.UUID(), nullable=True),
        sa.Column('assigned_to', sa.UUID(), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('value', sa.Numeric(12, 2), server_default='0'),
        sa.Column('currency', sa.String(3), server_default='TRY', nullable=False),
        sa.Column('status', sa.String(20), server_default='active', nullable=False),
        sa.Column('loss_reason', sa.Text(), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String()), server_default='{}'),
        sa.Column('attributes', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('score', sa.Integer(), server_default='0'),
        sa.Column('next_action_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'], ['pipeline_stages.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_id'], ['lead_sources.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_leads_org_id', 'leads', ['org_id'])
    op.create_index('idx_leads_pipeline_id', 'leads', ['pipeline_id'])
    op.create_index('idx_leads_stage_id', 'leads', ['stage_id'])
    op.create_index('idx_leads_assigned_to', 'leads', ['assigned_to'])
    op.create_index('idx_leads_status', 'leads', ['status'])

    # Tasks
    op.create_table('tasks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('assigned_to', sa.UUID(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('conversation_id', sa.UUID(), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(20), server_default='task', nullable=False),
        sa.Column('priority', sa.String(20), server_default='normal', nullable=False),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reminder_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_automated', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('result_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_tasks_org_id', 'tasks', ['org_id'])
    op.create_index('idx_tasks_assigned_to', 'tasks', ['assigned_to'])
    op.create_index('idx_tasks_lead_id', 'tasks', ['lead_id'])
    op.create_index('idx_tasks_due_at', 'tasks', ['due_at'])
    op.create_index('idx_tasks_status', 'tasks', ['status'])

    # Tags
    op.create_table('tags',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('color', sa.String(7), server_default='#6B7280', nullable=False),
        sa.Column('entity_type', sa.String(20), server_default='contact', nullable=False),
        sa.Column('usage_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'name', 'entity_type'),
    )
    op.create_index('idx_tags_org_id', 'tags', ['org_id'])

    # Custom Field Definitions
    op.create_table('custom_field_definitions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('field_label', sa.String(200), nullable=False),
        sa.Column('field_type', sa.String(20), nullable=False),
        sa.Column('options', postgresql.JSONB(), server_default='[]'),
        sa.Column('is_required', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_visible', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('default_value', sa.Text(), nullable=True),
        sa.Column('placeholder', sa.String(200), nullable=True),
        sa.Column('validation_regex', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'entity_type', 'field_name'),
    )

    # Custom Field Values
    op.create_table('custom_field_values',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('field_id', sa.UUID(), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['field_id'], ['custom_field_definitions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('field_id', 'entity_id'),
    )
    op.create_index('idx_custom_field_values_entity', 'custom_field_values', ['entity_type', 'entity_id'])

    # Activity Logs
    op.create_table('activity_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('old_value', postgresql.JSONB(), nullable=True),
        sa.Column('new_value', postgresql.JSONB(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), server_default='{}'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_activity_logs_org_id', 'activity_logs', ['org_id'])
    op.create_index('idx_activity_logs_entity', 'activity_logs', ['entity_type', 'entity_id'])
    op.create_index('idx_activity_logs_created_at', 'activity_logs', ['created_at'])

    # Webhook Configs
    op.create_table('webhook_configs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('secret', sa.String(255), nullable=True),
        sa.Column('events', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('retry_count', sa.Integer(), server_default='3', nullable=False),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_status_code', sa.Integer(), nullable=True),
        sa.Column('failure_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Webhook Deliveries
    op.create_table('webhook_deliveries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('webhook_id', sa.UUID(), nullable=False),
        sa.Column('event', sa.String(100), nullable=False),
        sa.Column('payload', postgresql.JSONB(), nullable=False),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('attempt', sa.Integer(), server_default='1', nullable=False),
        sa.Column('delivered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['webhook_id'], ['webhook_configs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_webhook_deliveries_webhook_id', 'webhook_deliveries', ['webhook_id'])

    # Web Forms
    op.create_table('web_forms',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('pipeline_id', sa.UUID(), nullable=True),
        sa.Column('stage_id', sa.UUID(), nullable=True),
        sa.Column('assigned_to', sa.UUID(), nullable=True),
        sa.Column('fields', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('settings', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('style', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('submission_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['stage_id'], ['pipeline_stages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'slug'),
    )

    # Form Submissions
    op.create_table('form_submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('form_id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('data', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('utm_source', sa.String(200), nullable=True),
        sa.Column('utm_medium', sa.String(200), nullable=True),
        sa.Column('utm_campaign', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['form_id'], ['web_forms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_form_submissions_form_id', 'form_submissions', ['form_id'])

    # Salesbot Flows
    op.create_table('salesbot_flows',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger_type', sa.String(50), nullable=False),
        sa.Column('trigger_config', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stats', postgresql.JSONB(), server_default='{"triggered":0,"completed":0,"dropped":0}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Salesbot Flow Steps
    op.create_table('salesbot_flow_steps',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('flow_id', sa.UUID(), nullable=False),
        sa.Column('step_type', sa.String(50), nullable=False),
        sa.Column('config', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('position_x', sa.Integer(), server_default='0', nullable=False),
        sa.Column('position_y', sa.Integer(), server_default='0', nullable=False),
        sa.Column('next_step_id', sa.UUID(), nullable=True),
        sa.Column('true_step_id', sa.UUID(), nullable=True),
        sa.Column('false_step_id', sa.UUID(), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['flow_id'], ['salesbot_flows.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['next_step_id'], ['salesbot_flow_steps.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['true_step_id'], ['salesbot_flow_steps.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['false_step_id'], ['salesbot_flow_steps.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_salesbot_flow_steps_flow_id', 'salesbot_flow_steps', ['flow_id'])

    # Salesbot Flow Sessions
    op.create_table('salesbot_flow_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('flow_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=True),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('current_step_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(20), server_default='active', nullable=False),
        sa.Column('variables', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['flow_id'], ['salesbot_flows.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['current_step_id'], ['salesbot_flow_steps.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_salesbot_sessions_contact', 'salesbot_flow_sessions', ['contact_id'])

    # Dashboard Widgets
    op.create_table('dashboard_widgets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('widget_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('config', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('position_x', sa.Integer(), server_default='0', nullable=False),
        sa.Column('position_y', sa.Integer(), server_default='0', nullable=False),
        sa.Column('width', sa.Integer(), server_default='4', nullable=False),
        sa.Column('height', sa.Integer(), server_default='2', nullable=False),
        sa.Column('is_visible', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_dashboard_widgets_user', 'dashboard_widgets', ['user_id'])

    # Team Invitations
    op.create_table('team_invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('invited_by', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), server_default='agent', nullable=False),
        sa.Column('token', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )

    # Call Logs
    op.create_table('call_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('conversation_id', sa.UUID(), nullable=True),
        sa.Column('direction', sa.String(10), nullable=False),
        sa.Column('status', sa.String(20), server_default='completed', nullable=False),
        sa.Column('phone_from', sa.String(20), nullable=True),
        sa.Column('phone_to', sa.String(20), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), server_default='0'),
        sa.Column('recording_url', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_call_logs_org_id', 'call_logs', ['org_id'])
    op.create_index('idx_call_logs_contact_id', 'call_logs', ['contact_id'])

    # Email Logs
    op.create_table('email_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('direction', sa.String(10), nullable=False),
        sa.Column('from_email', sa.String(255), nullable=False),
        sa.Column('to_email', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), server_default='sent', nullable=False),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('message_id', sa.String(500), nullable=True),
        sa.Column('thread_id', sa.String(500), nullable=True),
        sa.Column('attachments', postgresql.JSONB(), server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_email_logs_org_id', 'email_logs', ['org_id'])
    op.create_index('idx_email_logs_contact_id', 'email_logs', ['contact_id'])

    # Lead Scoring Rules
    op.create_table('lead_scoring_rules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('condition_type', sa.String(50), nullable=False),
        sa.Column('condition_config', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('score_delta', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Saved Filters
    op.create_table('saved_filters',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('filters', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_shared', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # RLS for new tables
    for table in [
        'companies', 'pipelines', 'pipeline_stages', 'lead_sources', 'leads',
        'tasks', 'tags', 'custom_field_definitions', 'custom_field_values',
        'activity_logs', 'webhook_configs', 'webhook_deliveries', 'web_forms',
        'form_submissions', 'salesbot_flows', 'salesbot_flow_steps',
        'salesbot_flow_sessions', 'dashboard_widgets', 'team_invitations',
        'call_logs', 'email_logs', 'lead_scoring_rules', 'saved_filters',
    ]:
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')

    # Realtime for leads and tasks
    op.execute('ALTER PUBLICATION supabase_realtime ADD TABLE leads')
    op.execute('ALTER PUBLICATION supabase_realtime ADD TABLE tasks')


def downgrade() -> None:
    tables = [
        'saved_filters', 'lead_scoring_rules', 'email_logs', 'call_logs',
        'team_invitations', 'dashboard_widgets', 'salesbot_flow_sessions',
        'salesbot_flow_steps', 'salesbot_flows', 'form_submissions',
        'web_forms', 'webhook_deliveries', 'webhook_configs', 'activity_logs',
        'custom_field_values', 'custom_field_definitions', 'tags', 'tasks',
        'leads', 'lead_sources', 'pipeline_stages', 'pipelines', 'companies',
    ]
    for table in tables:
        op.drop_table(table)

    op.drop_constraint('fk_contacts_company', 'contacts', type_='foreignkey')
    op.drop_column('contacts', 'title')
    op.drop_column('contacts', 'company_id')
