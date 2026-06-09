/**
 * Audit Logging Helper
 * Simplifies logging throughout the application
 */

export async function logAction(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  oldValue?: any,
  newValue?: any,
  details?: string
) {
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        status: 'success',
        details,
      }),
    });

    if (!response.ok) {
      console.error('Failed to log action:', await response.text());
    }
  } catch (error) {
    console.error('Logging error:', error);
  }
}

export async function logError(
  userId: string,
  action: string,
  resourceType: string,
  error: any,
  details?: string
) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        resourceType,
        status: 'failed',
        details: details || (error instanceof Error ? error.message : String(error)),
      }),
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

/**
 * Action types for consistent logging
 */
export const LOG_ACTIONS = {
  // Authentication
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_CHANGED: 'email_changed',

  // Posts
  POST_CREATED: 'post_created',
  POST_UPDATED: 'post_updated',
  POST_DELETED: 'post_deleted',
  POST_LIKED: 'post_liked',
  POST_UNLIKED: 'post_unliked',

  // Comments
  COMMENT_CREATED: 'comment_created',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',

  // Business Verification
  VERIFICATION_REQUESTED: 'verification_requested',
  VERIFICATION_APPROVED: 'verification_approved',
  VERIFICATION_REJECTED: 'verification_rejected',

  // Admin Actions
  USER_BANNED: 'user_banned',
  USER_UNBANNED: 'user_unbanned',
  CONTENT_REPORTED: 'content_reported',
  CONTENT_MODERATED: 'content_moderated',

  // Settings
  SETTINGS_UPDATED: 'settings_updated',
  PREFERENCES_UPDATED: 'preferences_updated',
};

/**
 * Resource types for consistent logging
 */
export const LOG_RESOURCES = {
  POST: 'post',
  COMMENT: 'comment',
  USER: 'user',
  BUSINESS: 'business',
  VERIFICATION: 'verification',
  SETTINGS: 'settings',
  NOTIFICATION: 'notification',
};
