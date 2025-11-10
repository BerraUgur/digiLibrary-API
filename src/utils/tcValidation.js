/**
 * Validates Turkish TC Identity Number using the official algorithm
 * @param {string} tc - The TC Identity Number to validate (11 digits)
 * @returns {boolean} - True if valid, false otherwise
 */
const validateTCIdentity = (tc) => {
  // Check if TC is a string and has exactly 11 digits
  if (!tc || typeof tc !== 'string' || tc.length !== 11) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d{11}$/.test(tc)) {
    return false;
  }

  // TC Identity numbers cannot start with 0
  if (tc[0] === '0') {
    return false;
  }

  // Convert string to array of numbers
  const digits = tc.split('').map(Number);

  // Validate 10th digit
  // Sum of odd-positioned digits (1st, 3rd, 5th, 7th, 9th) * 7
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  // Sum of even-positioned digits (2nd, 4th, 6th, 8th)
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  // (oddSum * 7 - evenSum) % 10 should equal 10th digit
  const tenthDigit = (oddSum * 7 - evenSum) % 10;
  
  if (tenthDigit !== digits[9]) {
    return false;
  }

  // Validate 11th digit
  // Sum of first 10 digits % 10 should equal 11th digit
  const sumOfFirst10 = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
  const eleventhDigit = sumOfFirst10 % 10;
  
  if (eleventhDigit !== digits[10]) {
    return false;
  }

  return true;
};

module.exports = { validateTCIdentity };
