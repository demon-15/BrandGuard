import { uploadBrandKit, ValidationResult } from '../../hooks/useBrandKit';

/**
 * Handles file upload and validates brand kit
 * @param file - The uploaded file
 * @returns Promise resolving to validation result
 */
export async function handleBrandKitUpload(file: File): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    // Check file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      resolve({
        valid: false,
        errors: [{ field: 'file', message: 'File must be a JSON file (.json)' }]
      });
      return;
    }

    // Read file
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          resolve({
            valid: false,
            errors: [{ field: 'file', message: 'File is empty' }]
          });
          return;
        }

        const kit = JSON.parse(text);
        const result = uploadBrandKit(kit);
        resolve(result);
      } catch (error) {
        resolve({
          valid: false,
          errors: [{ 
            field: 'file', 
            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }]
        });
      }
    };

    reader.onerror = () => {
      resolve({
        valid: false,
        errors: [{ field: 'file', message: 'Failed to read file' }]
      });
    };

    reader.readAsText(file);
  });
}
