# BrandGuard AI - Azure Functions Backend

> **For comprehensive documentation, see the [main README](../README.md) in the project root.**

This Azure Function provides AI-powered brand alignment analysis for the BrandGuard AI Adobe Express add-on.

## Features

- **Brand Alignment Analysis**: Evaluates text against luxury brand voice standards
- **AI-Powered Suggestions**: Suggests improved text that better aligns with brand voice
- **Scoring System**: Returns a 0-100 alignment score
- **CORS Enabled**: Ready for Adobe Express add-on integration
- **Secure**: API keys stored server-side, never exposed to client
- **Fallback Support**: Primary and backup API key support for reliability

## Setup Instructions

### Prerequisites

- Python 3.9 or later
- Azure Functions Core Tools v4
- Google Gemini API key ([Get one free](https://aistudio.google.com/app/apikey))
- Azure subscription (for deployment)

### Installation

1. **Install Azure Functions Core Tools**:
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # On Windows
   source .venv/bin/activate  # On Mac/Linux
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Gemini API settings**:
   
   Create `local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "python",
       "AzureWebJobsStorage": "",
       "GEMINI_API_KEY": "your-gemini-api-key",
       "GEMINI_API_KEY_BACKUP": "optional-backup-key"
     }
   }
   ```

### Local Development

Run the function locally:
```bash
func start
```

The function will be available at:
```
http://localhost:7071/api/brand-alignment
```

### Testing the Function

**Example Request**:
```bash
curl -X POST http://localhost:7071/api/brand-alignment \
  -H "Content-Type: application/json" \
  -d '{"textToAnalyze": "This product is really cheap and great value!"}'
```

**Example Response**:
```json
{
  "success": true,
  "alignment_score": 35,
  "analysis": "The text uses 'cheap' which conflicts with luxury positioning...",
  "suggested_rewrite": "This piece represents exceptional craftsmanship and enduring value.",
  "original_text": "This product is really cheap and great value!"
}
```

### Deployment to Azure

1. **Create Function App**:
   ```bash
   az functionapp create \
     --resource-group <resource-group> \
     --consumption-plan-location <region> \
     --runtime python \
     --runtime-version 3.9 \
     --functions-version 4 \
     --name <function-app-name> \
     --storage-account <storage-account>
   ```

2. **Configure Application Settings**:
   ```bash
   az functionapp config appsettings set \
     --name <function-app-name> \
     --resource-group <resource-group> \
     --settings \
       GEMINI_API_KEY="your-gemini-api-key" \
       GEMINI_API_KEY_BACKUP="optional-backup-key"
   ```

3. **Deploy**:
   ```bash
   func azure functionapp publish <function-app-name>
   ```

## API Reference

### Endpoint

`POST /api/brand-alignment`

### Request Body

```json
{
  "textToAnalyze": "string (required, max 5000 characters)"
}
```

### Response

**Success (200)**:
```json
{
  "success": true,
  "alignment_score": 0-100,
  "analysis": "string",
  "suggested_rewrite": "string",
  "original_text": "string"
}
```

**Error (400/500)**:
```json
{
  "success": false,
  "error": "string",
  "details": "string (only in development)"
}
```

## Luxury Brand Voice Criteria

The function evaluates text based on:
- Sophisticated and refined language
- Elegant and timeless tone
- Subtle confidence without arrogance
- Quality and craftsmanship emphasis
- Exclusivity without elitism
- Understated elegance
- Attention to detail
- Heritage and authenticity

## Adobe Express Integration

To integrate with your Adobe Express add-on:

```javascript
async function analyzeBrandAlignment(text) {
  const response = await fetch('https://<your-function-app>.azurewebsites.net/api/brand-alignment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ textToAnalyze: text })
  });
  
  return await response.json();
}
```

> **Note**: The add-on already includes this integration in `src/ui/utils/brandAlignment.ts`

## Security Considerations

- API keys stored in environment variables / Azure App Settings (never in code)
- CORS enabled for Adobe Express add-on integration
- Input validation limits text to 5000 characters
- Error messages don't expose sensitive information in production
- Fallback API key support for high availability

## License

MIT
