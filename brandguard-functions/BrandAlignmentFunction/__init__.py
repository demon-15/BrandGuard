import azure.functions as func
import json
import logging
import os
import requests
from typing import Dict

# Gemini API Configuration
# Using v1 endpoint with gemini-2.5-flash (confirmed available via ListModels API)
GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"


def _parse_response_content(content: str) -> Dict[str, object]:
    """Parse model response content, tolerating non-JSON outputs."""
    try:
        # Strip markdown code fences if present
        content = content.strip()
        if content.startswith("```"):
            # Remove opening fence (```json or ```\n)
            lines = content.split("\n")
            lines = lines[1:]  # Skip first line with ```
            # Remove closing fence
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines).strip()
        
        # Try to extract JSON object from the content
        # Find the first { and the matching last }
        start_idx = content.find('{')
        if start_idx != -1:
            # Find matching closing brace by counting braces
            depth = 0
            end_idx = start_idx
            for i, char in enumerate(content[start_idx:], start_idx):
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth == 0:
                        end_idx = i
                        break
            
            if end_idx > start_idx:
                content = content[start_idx:end_idx + 1]
        
        return json.loads(content)
    except json.JSONDecodeError as e:
        logging.warning(f"Failed to parse JSON: {e}. Content: {content[:200]}")
        # If the model didn't return JSON, provide a safe fallback so the API stays resilient.
        return {"score": 0, "suggestion": content}


def _call_gemini_api(text: str, api_key: str) -> dict:
    """
    Make a single API call to Google Gemini.
    Returns the parsed result or raises an exception.
    """
    # Use query parameter method (standard for Google AI Studio API keys)
    url = f"{GEMINI_API_ENDPOINT}?key={api_key}"
    
    # Define luxury brand voice prompt with improved instructions
    prompt = (
        "You are a Brand Voice Auditor analyzing text for alignment with luxury brand standards.\n\n"
        "Scoring Rubric:\n"
        "- 90-100%: Elegant, minimalist, sophisticated language with zero sales jargon\n"
        "- 60-80%: Clear and professional, but slightly too casual or informal\n"
        "- Below 40%: Aggressive sales language, 'cheap' adjectives, excessive exclamation marks, or overly promotional tone\n\n"
        "Your task:\n"
        "1. Analyze the provided text for brand voice alignment\n"
        "2. Assign a score from 0-100 based on the rubric\n"
        "3. Provide a complete, user-friendly suggestion that explains the score and offers specific, actionable improvements\n\n"
        "The suggestion should:\n"
        "- Be written in a clear, professional tone\n"
        "- Explain why the score was given (2-3 sentences)\n"
        "- Provide specific recommendations for improvement\n"
        "- Be complete and self-contained (do not cut off mid-sentence)\n\n"
        "Return ONLY a raw JSON object with no markdown formatting, no code blocks, just the JSON:\n"
        "{\"score\": <number 0-100>, \"suggestion\": \"<complete suggestion text explaining the score and providing actionable feedback>\"}\n\n"
        f"Text to analyze: {text}\n\n"
        "Remember: The suggestion must be complete and end with a proper sentence. Do not truncate."
    )
    
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1000
        }
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    
    response_data = response.json()
    
    # Check for API error in response
    if "error" in response_data:
        raise RuntimeError(f"Gemini API error: {response_data['error'].get('message', 'Unknown error')}")
    
    # Extract content from Gemini response format
    content = response_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
    result = _parse_response_content(content)
    
    return {
        "success": True,
        "score": result.get("score", 0),
        "suggestion": result.get("suggestion", ""),
        "original_text": text,
    }


def analyze_brand_alignment(text: str) -> dict:
    """
    Analyze text against luxury brand voice using Google Gemini API.
    Returns alignment score and rewrite suggestion.
    Falls back to backup API key if primary fails.
    """
    
    # Retrieve Gemini API keys from environment
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    gemini_api_key_backup = os.environ.get("GEMINI_API_KEY_BACKUP")
    
    if not gemini_api_key and not gemini_api_key_backup:
        raise RuntimeError("No GEMINI_API_KEY configured (neither primary nor backup)")
    
    # Build list of keys to try (primary first, then backup)
    keys_to_try = []
    if gemini_api_key:
        keys_to_try.append(("primary", gemini_api_key))
    if gemini_api_key_backup:
        keys_to_try.append(("backup", gemini_api_key_backup))
    
    last_error = None
    
    for key_name, api_key in keys_to_try:
        try:
            logging.info(f"Attempting Gemini API call with {key_name} key")
            result = _call_gemini_api(text, api_key)
            logging.info(f"Gemini API call succeeded with {key_name} key")
            return result
        except requests.exceptions.RequestException as e:
            logging.warning(f"Gemini API call failed with {key_name} key: {str(e)}")
            last_error = e
            # Continue to try next key
        except Exception as e:
            logging.error(f"Unexpected error with {key_name} key: {str(e)}")
            last_error = e
            # Continue to try next key
    
    # All keys failed
    logging.error(f"All Gemini API keys failed. Last error: {str(last_error)}")
    raise last_error if last_error else RuntimeError("All API keys failed")

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Azure Function entry point for brand alignment analysis.
    
    Expected request body:
    {
        "text": "The text content to analyze"
    }
    """
    logging.info('BrandAlignment function processing a request.')
    
    # Enable CORS for Adobe Express add-on
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Handle preflight OPTIONS request
    if req.method == 'OPTIONS':
        return func.HttpResponse(
            status_code=200,
            headers=headers
        )
    
    try:
        # Parse request body
        req_body = req.get_json()
        text = req_body.get('textToAnalyze')
        
        if not text:
            return func.HttpResponse(
                json.dumps({
                    "success": False,
                    "error": "Missing 'textToAnalyze' field in request body"
                }),
                status_code=400,
                headers=headers
            )
        
        # Validate text length
        if len(text) > 5000:
            return func.HttpResponse(
                json.dumps({
                    "success": False,
                    "error": "Text exceeds maximum length of 5000 characters"
                }),
                status_code=400,
                headers=headers
            )
        
        # Perform brand alignment analysis
        result = analyze_brand_alignment(text)
        
        return func.HttpResponse(
            json.dumps(result),
            status_code=200,
            headers=headers
        )
        
    except ValueError as e:
        logging.error(f"Invalid JSON in request: {str(e)}")
        return func.HttpResponse(
            json.dumps({
                "success": False,
                "error": "Invalid JSON in request body"
            }),
            status_code=400,
            headers=headers
        )
        
    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        return func.HttpResponse(
            json.dumps({
                "success": False,
                "error": "Internal server error",
                "details": str(e) if os.environ.get("ENVIRONMENT") == "development" else None
            }),
            status_code=500,
            headers=headers
        )
