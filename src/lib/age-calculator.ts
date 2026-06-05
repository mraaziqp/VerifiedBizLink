/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if user is old enough for age-restricted content
 */
export function isOldEnough(dateOfBirth: string | Date, minAge: number): boolean {
  return calculateAge(dateOfBirth) >= minAge;
}

/**
 * Format date of birth for display
 */
export function formatDOB(dateOfBirth: string | Date): string {
  const date = new Date(dateOfBirth);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get age category for marketing purposes
 */
export function getAgeCategory(dateOfBirth: string | Date): string {
  const age = calculateAge(dateOfBirth);

  if (age < 18) return 'minor';
  if (age < 25) return 'young_adult';
  if (age < 35) return 'millennial';
  if (age < 55) return 'gen_x';
  if (age < 75) return 'boomer';
  return 'senior';
}

/**
 * Validate date of birth format and reasonableness
 */
export function isValidDOB(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;

  const date = new Date(dateOfBirth);
  const today = new Date();

  // Check if date is valid
  if (isNaN(date.getTime())) return false;

  // Check if date is not in the future
  if (date > today) return false;

  // Check if user is not older than 150 years (sanity check)
  const age = calculateAge(date);
  if (age > 150) return false;

  return true;
}
