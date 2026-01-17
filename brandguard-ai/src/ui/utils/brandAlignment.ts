/**
 * Brand Alignment Analysis Utility
 * 
 * This utility calls the backend Azure Function for brand alignment analysis.
 * The backend handles the Gemini API calls, keeping API keys secure on the server.
 */

import { getBrandAlignmentEndpoint } from '../../config';

interface BrandAlignmentResponse {
  success: boolean;
  score: number;
  suggestion: string;
  original_text: string;
}

interface BackendErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Analyze text against luxury brand voice using the backend Azure Function.
 * The backend uses Google Gemini API for AI analysis.
 * 
 * @param text - The text content to analyze (max 5000 characters)
 * @returns Promise with analysis results including score and suggestion
 */
export async function analyzeBrandAlignment(text: string): Promise<BrandAlignmentResponse> {
  // Validate input
  if (!text || typeof text !== 'string') {
    throw new Error("Text is required and must be a string");
  }

  if (text.length > 5000) {
    throw new Error("Text exceeds maximum length of 5000 characters");
  }

  const endpoint = getBrandAlignmentEndpoint();
  console.log(`Calling backend API at: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        textToAnalyze: text
      })
    });

    // Parse response body
    const responseData = await response.json();

    // Check for HTTP errors
    if (!response.ok) {
      const errorResponse = responseData as BackendErrorResponse;
      throw new Error(
        errorResponse.error || 
        `Backend API error: ${response.status} ${response.statusText}`
      );
    }

    // Validate response structure
    const result = responseData as BrandAlignmentResponse;
    
    if (!result.success) {
      throw new Error((responseData as BackendErrorResponse).error || 'Unknown backend error');
    }

    console.log('Backend API call succeeded');
    return {
      success: true,
      score: typeof result.score === 'number' ? result.score : 0,
      suggestion: result.suggestion || '',
      original_text: result.original_text || text
    };

  } catch (error) {
    // Handle network errors or fetch failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to backend at ${endpoint}.\n\n` +
        "Make sure the Azure Functions backend is running:\n" +
        "  cd brandguard-functions\n" +
        "  func start\n\n" +
        "Or update BACKEND_API_URL if deployed elsewhere."
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}
