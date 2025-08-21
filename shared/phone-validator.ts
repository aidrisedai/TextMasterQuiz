/**
 * USA Phone Number Validation and Formatting
 * Handles validation and auto-correction of USA phone numbers
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  error?: string;
  original: string;
}

/**
 * Validates and formats USA phone numbers
 * Accepts various formats and attempts to correct them
 */
export function validateAndFormatUSAPhone(phone: string): PhoneValidationResult {
  const original = phone;
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle common international prefixes
  if (digits.startsWith('001')) {
    digits = digits.substring(3); // Remove 001
  } else if (digits.startsWith('1') && digits.length === 11) {
    digits = digits.substring(1); // Remove leading 1
  }
  
  // Check if we have exactly 10 digits
  if (digits.length !== 10) {
    return {
      isValid: false,
      error: `Phone number must have exactly 10 digits (found ${digits.length})`,
      original
    };
  }
  
  // Extract parts
  const areaCode = digits.substring(0, 3);
  const exchange = digits.substring(3, 6);
  const lineNumber = digits.substring(6, 10);
  
  // Validate area code (can't start with 0 or 1)
  if (areaCode[0] === '0' || areaCode[0] === '1') {
    return {
      isValid: false,
      error: `Invalid area code ${areaCode} (cannot start with 0 or 1)`,
      original
    };
  }
  
  // Check for reserved area codes
  const invalidAreaCodes = ['555', '911', '999', '000'];
  if (invalidAreaCodes.includes(areaCode)) {
    return {
      isValid: false,
      error: `Area code ${areaCode} is reserved/invalid`,
      original
    };
  }
  
  // Validate exchange (can't start with 0 or 1)
  if (exchange[0] === '0' || exchange[0] === '1') {
    return {
      isValid: false,
      error: `Invalid exchange ${exchange} (cannot start with 0 or 1)`,
      original
    };
  }
  
  // Special case: 555-01XX numbers are reserved for fictional use
  if (exchange === '555' && lineNumber.startsWith('01')) {
    return {
      isValid: false,
      error: 'This appears to be a fictional/test number (555-01XX)',
      original
    };
  }
  
  // Format as +1XXXXXXXXXX
  const formatted = `+1${digits}`;
  
  return {
    isValid: true,
    formatted,
    original
  };
}

/**
 * Common test cases for validation
 */
export const phoneValidationExamples = {
  valid: [
    '(310) 384-4794',    // Standard format
    '310-384-4794',      // Dashes
    '3103844794',        // Just digits
    '+13103844794',      // International format
    '1-310-384-4794',    // With country code
  ],
  invalid: [
    '+15551234567',      // 555 area code
    '+11234567890',      // Area code starts with 1
    '(213) 697-14',      // Missing digits
    '01754966788',       // Wrong format
    '+11806709317',      // Area code starts with 1
  ]
};

/**
 * Batch validate phone numbers (useful for admin)
 */
export function validatePhoneList(phones: string[]): Map<string, PhoneValidationResult> {
  const results = new Map<string, PhoneValidationResult>();
  
  for (const phone of phones) {
    results.set(phone, validateAndFormatUSAPhone(phone));
  }
  
  return results;
}

/**
 * Check if a phone number looks like a test number
 */
export function isTestPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // Check for patterns that indicate test numbers
  return (
    digits.includes('555') ||                    // 555 numbers
    digits === '1234567890' ||                   // Sequential
    digits === '1111111111' ||                   // All same digit
    digits === '0000000000' ||
    /^(\d)\1{9}$/.test(digits)                  // Any repeated digit
  );
}