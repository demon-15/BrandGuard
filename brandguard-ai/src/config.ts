/**
 * Configuration for BrandGuard Add-on
 * 
 * This file provides a centralized place to configure API endpoints.
 * The add-on now uses a backend Azure Function for AI analysis.
 */

// Declare globals injected by webpack DefinePlugin
declare const BACKEND_API_URL: string | undefined;

/**
 * Backend API Configuration
 * 
 * The backend Azure Function handles Gemini API calls for brand alignment analysis.
 * This keeps API keys secure on the server side.
 * 
 * You can set these in three ways (in order of priority):
 * 1. Runtime: Set window.BACKEND_API_URL in browser console
 * 2. Build-time: Set BACKEND_API_URL environment variable before building (via .env file)
 * 3. Default: Uses localhost:7071 for local development
 */

// Default backend URL (Azure Functions local development)
// Uses HTTP for local development (Azure Functions runs on HTTP by default)
const DEFAULT_BACKEND_URL = 'http://localhost:7071';

/**
 * Get the backend API URL from various sources
 */
export function getBackendApiUrl(): string {
  const win = window as any;
  
  // Priority 1: Runtime configuration (window object)
  if (win.BACKEND_API_URL) {
    return win.BACKEND_API_URL;
  }
  
  // Priority 2: Build-time environment variable (via webpack DefinePlugin)
  const envUrl = typeof BACKEND_API_URL !== 'undefined' ? BACKEND_API_URL : null;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  
  // Priority 3: Default local development URL
  return DEFAULT_BACKEND_URL;
}

/**
 * Get the brand alignment analysis endpoint
 */
export function getBrandAlignmentEndpoint(): string {
  const baseUrl = getBackendApiUrl();
  return `${baseUrl}/api/brand-alignment`;
}
