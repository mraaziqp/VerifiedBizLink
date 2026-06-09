/**
 * Complete display name helper - enforces business name display rule
 * RULE: Business accounts show ONLY business name
 * RULE: Customer accounts show ONLY customer name
 */

export interface DisplayContext {
  userRole: string;
  userFullName: string;
  businessName?: string;
  userAccountType?: 'business' | 'customer';
}

/**
 * Get display name based on account type
 * @param context - User/business context
 * @returns Display name (ONLY business name for businesses, ONLY full name for customers)
 */
export function getDisplayName(context: DisplayContext): string {
  // Business accounts: show ONLY business name
  if (context.userRole === 'business' && context.businessName) {
    return context.businessName;
  }
  if (context.userAccountType === 'business' && context.businessName) {
    return context.businessName;
  }

  // Customer accounts: show ONLY customer name
  return context.userFullName;
}

/**
 * Get safe display context for feed items, profiles, etc.
 * Prevents showing both business and personal names
 */
export function getSafeDisplayContext(user: any, business: any): DisplayContext {
  return {
    userRole: user.role,
    userFullName: user.full_name || user.fullName || 'User',
    businessName: business?.company_name || business?.companyName,
    userAccountType: user.role === 'business' ? 'business' : 'customer',
  };
}

/**
 * Format post author display - enforces naming rule
 */
export function getPostAuthorDisplay(post: any): {
  name: string;
  type: 'business' | 'customer';
  businessId?: string;
} {
  const isBusiness = post.user_role === 'business' || post.userRole === 'business';

  if (isBusiness && (post.business_name || post.businessName)) {
    return {
      name: post.business_name || post.businessName,
      type: 'business',
      businessId: post.business_id || post.businessId,
    };
  }

  return {
    name: post.author_name || post.authorName || post.full_name || post.fullName || 'Author',
    type: 'customer',
  };
}

/**
 * Format recommendation display
 */
export function getRecommendationDisplay(rec: any): {
  name: string;
  description: string;
  type: 'business' | 'customer';
} {
  const isBusiness = rec.user_role === 'business' || rec.userRole === 'business';

  if (isBusiness && (rec.business_name || rec.businessName)) {
    return {
      name: rec.business_name || rec.businessName,
      description: rec.company_description || rec.description || rec.industry || '',
      type: 'business',
    };
  }

  return {
    name: rec.full_name || rec.fullName || rec.userName || 'User',
    description: rec.headline || rec.title || '',
    type: 'customer',
  };
}

/**
 * Format connection display
 */
export function getConnectionDisplay(connection: any): {
  name: string;
  subtitle: string;
  type: 'business' | 'customer';
} {
  const isBusiness = connection.user_role === 'business' || connection.userRole === 'business';

  if (isBusiness && (connection.business_name || connection.businessName)) {
    return {
      name: connection.business_name || connection.businessName,
      subtitle: connection.industry || 'Verified Business',
      type: 'business',
    };
  }

  return {
    name: connection.full_name || connection.fullName || 'User',
    subtitle: connection.headline || 'Professional',
    type: 'customer',
  };
}

/**
 * Format profile display
 */
export function getProfileDisplay(user: any, business: any): {
  displayName: string;
  subtitle: string;
  type: 'business' | 'customer';
} {
  const isBusiness = user.role === 'business' && business;

  if (isBusiness) {
    return {
      displayName: business.company_name || business.companyName || 'Business',
      subtitle: business.industry || 'Verified Business',
      type: 'business',
    };
  }

  return {
    displayName: user.full_name || user.fullName || 'User',
    subtitle: user.headline || 'Professional',
    type: 'customer',
  };
}
