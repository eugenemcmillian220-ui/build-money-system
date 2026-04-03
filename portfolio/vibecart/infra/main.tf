# ─────────────────────────────────────────────────────────────────────────────
# VibeCart — GCP Infrastructure (Terraform)
# Provisions: Cloud Run (Next.js), Artifact Registry, Secret Manager,
#             Cloud Storage (image uploads), VPC Connector, IAM, Load Balancer
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # Replace with your GCS bucket for remote state
  backend "gcs" {
    bucket = "vibecart-tfstate"
    prefix = "prod"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "GCP region for Cloud Run and other resources"
}

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Container image tag to deploy"
}

variable "supabase_url" {
  type        = string
  sensitive   = true
  description = "Supabase project URL"
}

variable "supabase_anon_key" {
  type        = string
  sensitive   = true
  description = "Supabase anon/public key"
}

variable "supabase_service_role_key" {
  type        = string
  sensitive   = true
  description = "Supabase service role key (admin)"
}

variable "stripe_secret_key" {
  type        = string
  sensitive   = true
  description = "Stripe secret API key"
}

variable "stripe_webhook_secret" {
  type        = string
  sensitive   = true
  description = "Stripe webhook endpoint secret"
}

variable "app_url" {
  type        = string
  description = "Public URL of the deployed app (used in Stripe redirects)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Provider
# ─────────────────────────────────────────────────────────────────────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ─────────────────────────────────────────────────────────────────────────────
# Enable APIs
# ─────────────────────────────────────────────────────────────────────────────

locals {
  required_apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "vpcaccess.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "vision.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.required_apis)
  service            = each.value
  disable_on_destroy = false
}

# ─────────────────────────────────────────────────────────────────────────────
# Artifact Registry — Docker repository
# ─────────────────────────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "vibecart" {
  repository_id = "vibecart"
  location      = var.region
  format        = "DOCKER"
  description   = "VibeCart Next.js container images"

  depends_on = [google_project_service.apis]
}

locals {
  image_uri = "${var.region}-docker.pkg.dev/${var.project_id}/vibecart/vibecart:${var.image_tag}"
}

# ─────────────────────────────────────────────────────────────────────────────
# Service Account for Cloud Run
# ─────────────────────────────────────────────────────────────────────────────

resource "google_service_account" "cloudrun_sa" {
  account_id   = "vibecart-cloudrun"
  display_name = "VibeCart Cloud Run Service Account"
}

resource "google_project_iam_member" "sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

resource "google_project_iam_member" "sa_storage_object_user" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

resource "google_project_iam_member" "sa_vision_user" {
  project = var.project_id
  role    = "roles/ml.admin"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# ─────────────────────────────────────────────────────────────────────────────
# Secret Manager — store sensitive env vars
# ─────────────────────────────────────────────────────────────────────────────

resource "google_secret_manager_secret" "supabase_url" {
  secret_id = "vibecart-supabase-url"
  replication { auto {} }
}
resource "google_secret_manager_secret_version" "supabase_url" {
  secret      = google_secret_manager_secret.supabase_url.id
  secret_data = var.supabase_url
}

resource "google_secret_manager_secret" "supabase_anon_key" {
  secret_id = "vibecart-supabase-anon-key"
  replication { auto {} }
}
resource "google_secret_manager_secret_version" "supabase_anon_key" {
  secret      = google_secret_manager_secret.supabase_anon_key.id
  secret_data = var.supabase_anon_key
}

resource "google_secret_manager_secret" "supabase_service_role_key" {
  secret_id = "vibecart-supabase-service-role-key"
  replication { auto {} }
}
resource "google_secret_manager_secret_version" "supabase_service_role_key" {
  secret      = google_secret_manager_secret.supabase_service_role_key.id
  secret_data = var.supabase_service_role_key
}

resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "vibecart-stripe-secret-key"
  replication { auto {} }
}
resource "google_secret_manager_secret_version" "stripe_secret_key" {
  secret      = google_secret_manager_secret.stripe_secret_key.id
  secret_data = var.stripe_secret_key
}

resource "google_secret_manager_secret" "stripe_webhook_secret" {
  secret_id = "vibecart-stripe-webhook-secret"
  replication { auto {} }
}
resource "google_secret_manager_secret_version" "stripe_webhook_secret" {
  secret      = google_secret_manager_secret.stripe_webhook_secret.id
  secret_data = var.stripe_webhook_secret
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Storage — room image uploads
# ─────────────────────────────────────────────────────────────────────────────

resource "google_storage_bucket" "image_uploads" {
  name                        = "${var.project_id}-vibecart-uploads"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    action { type = "Delete" }
    condition { age = 90 } # delete uploads older than 90 days
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Next.js 15 App
# ─────────────────────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "vibecart" {
  name     = "vibecart"
  location = var.region

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = local.image_uri
      name  = "vibecart"

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      ports {
        container_port = 3000
        name           = "http1"
      }

      # Environment variables (non-secret)
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = var.app_url
      }

      # Secrets injected as environment variables
      env {
        name = "NEXT_PUBLIC_SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_anon_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_SERVICE_ROLE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_service_role_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_secret_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_webhook_secret.secret_id
            version = "latest"
          }
        }
      }

      liveness_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 30
      }

      startup_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 12
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.vibecart,
  ]
}

# Allow unauthenticated (public) access
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.vibecart.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "cloud_run_url" {
  description = "Live URL of the deployed VibeCart app"
  value       = google_cloud_run_v2_service.vibecart.uri
}

output "artifact_registry_repo" {
  description = "Docker image push target"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/vibecart/vibecart"
}

output "image_bucket" {
  description = "GCS bucket for room image uploads"
  value       = google_storage_bucket.image_uploads.name
}
