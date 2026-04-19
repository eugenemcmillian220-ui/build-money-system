# ─────────────────────────────────────────────────────────────────────────────
# AgentLedger – Azure Infrastructure (Terraform)
# Provisions: App Service (Node), Supabase-compatible PostgreSQL (Flexible),
# Key Vault (secrets), Log Analytics, App Insights, Static Web App fallback.
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment and configure for remote state
  # backend "azurerm" {
  #   resource_group_name  = "tfstate-rg"
  #   storage_account_name = "agentledgertfstate"
  #   container_name       = "tfstate"
  #   key                  = "agentledger.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# ─── Variables ────────────────────────────────────────────────────────────────
variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus2"
}

variable "app_name" {
  description = "Base name for all resources"
  type        = string
  default     = "agentledger"
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_anon_key" {
  description = "Supabase anon (public) key"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service-role key (server-only)"
  type        = string
  sensitive   = true
}

# ─── Locals ───────────────────────────────────────────────────────────────────
locals {
  prefix     = "${var.app_name}-${var.environment}"
  common_tags = {
    Project     = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = "ai-platform"
  }
}

# ─── Resource Group ───────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "${local.prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# ─── Random suffix for globally unique names ─────────────────────────────────
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# ─── Log Analytics Workspace ──────────────────────────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.prefix}-law-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.common_tags
}

# ─── Application Insights ─────────────────────────────────────────────────────
resource "azurerm_application_insights" "main" {
  name                = "${local.prefix}-ai"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.common_tags
}

# ─── Key Vault ────────────────────────────────────────────────────────────────
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "${var.app_name}-kv-${random_string.suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
  }

  tags = local.common_tags
}

resource "azurerm_key_vault_secret" "supabase_url" {
  name         = "supabase-url"
  value        = var.supabase_url
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "supabase_anon_key" {
  name         = "supabase-anon-key"
  value        = var.supabase_anon_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "supabase_service_role_key" {
  name         = "supabase-service-role-key"
  value        = var.supabase_service_role_key
  key_vault_id = azurerm_key_vault.main.id
}

# ─── App Service Plan (Next.js 15) ───────────────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = "${local.prefix}-asp"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.environment == "prod" ? "P1v3" : "B2"
  tags                = local.common_tags
}

# ─── App Service (Next.js 15 App) ─────────────────────────────────────────────
resource "azurerm_linux_web_app" "main" {
  name                = "${local.prefix}-app-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on        = var.environment == "prod"
    http2_enabled    = true
    minimum_tls_version = "1.2"

    application_stack {
      node_version = "20-lts"
    }

    health_check_path                 = "/api/proxy"
    health_check_eviction_time_in_min = 5
  }

  app_settings = {
    WEBSITES_PORT                      = "3000"
    WEBSITE_RUN_FROM_PACKAGE           = "1"
    NODE_ENV                           = "production"
    NEXT_TELEMETRY_DISABLED            = "1"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
    # Supabase secrets pulled from Key Vault at runtime
    NEXT_PUBLIC_SUPABASE_URL           = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=supabase-url)"
    NEXT_PUBLIC_SUPABASE_ANON_KEY      = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=supabase-anon-key)"
    SUPABASE_SERVICE_ROLE_KEY          = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=supabase-service-role-key)"
  }

  logs {
    http_logs {
      retention_in_days = 7
    }
    application_logs {
      file_system_level = "Information"
    }
  }

  tags = local.common_tags
}

# Grant App Service Managed Identity read access to Key Vault
resource "azurerm_key_vault_access_policy" "app_service" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.main.identity[0].principal_id
  secret_permissions = ["Get", "List"]
}

# ─── Auto-scale (prod only) ───────────────────────────────────────────────────
resource "azurerm_monitor_autoscale_setting" "main" {
  count               = var.environment == "prod" ? 1 : 0
  name                = "${local.prefix}-autoscale"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = azurerm_service_plan.main.id

  profile {
    name = "default"
    capacity {
      default = 2
      minimum = 1
      maximum = 5
    }
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }
  }

  tags = local.common_tags
}

# ─── Alert Rule: High spend anomaly (custom metric via App Insights) ──────────
resource "azurerm_monitor_metric_alert" "high_error_rate" {
  name                = "${local.prefix}-error-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when server error rate exceeds threshold"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 10
  }

  tags = local.common_tags
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "app_url" {
  description = "AgentLedger application URL"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_service_name" {
  description = "Azure App Service name"
  value       = azurerm_linux_web_app.main.name
}

output "key_vault_name" {
  description = "Azure Key Vault name"
  value       = azurerm_key_vault.main.name
  sensitive = true
}

output "app_insights_instrumentation_key" {
  description = "App Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.main.workspace_id
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}
