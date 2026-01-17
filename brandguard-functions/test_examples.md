                      # Example test cases for the Brand Alignment Function

## Test Case 1: Poor Brand Alignment
```json
{
  "text": "Buy now! Huge discount! This cheap product won't last long!"
}
```

Expected: Low score (0-30), rewrite with sophisticated language

## Test Case 2: Good Brand Alignment
```json
{
  "text": "Crafted with meticulous attention to detail, this timeless piece embodies the essence of refined elegance."
}
```

Expected: High score (80-100), minimal changes needed

## Test Case 3: Medium Brand Alignment
```json
{
  "text": "This nice handbag is made with good leather and looks pretty."
}
```

Expected: Medium score (40-60), enhanced language and imagery

## Test Case 4: Empty Text
```json
{
  "text": ""
}
```

Expected: 400 error - Missing text

## Test Case 5: Long Text
```json
{
  "text": "<5000+ characters>"
}
```

Expected: 400 error - Text too long
