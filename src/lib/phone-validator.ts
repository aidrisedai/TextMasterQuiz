/**
 * Frontend phone validation matching backend rules
 * Validates USA phone numbers according to NANP rules
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
    if (digits.length < 10) {
      return {
        isValid: false,
        error: `Need ${10 - digits.length} more digit${10 - digits.length > 1 ? 's' : ''}`,
        original
      };
    }
    return {
      isValid: false,
      error: `Too many digits (${digits.length} instead of 10)`,
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
 * Format phone number for display as user types
 * @param value - The input value
 * @returns Formatted phone number string
 */
export function formatPhoneDisplay(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format based on length
  if (limited.length === 0) return '';
  if (limited.length <= 3) return limited;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
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