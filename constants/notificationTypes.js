// Centralized notification types for consistency
module.exports = {
    // Adoption notifications
    ADOPTION_REQUEST_NEW: 'adoption_request_new',
    ADOPTION_APPROVED: 'adoption_approved', 
    ADOPTION_REJECTED: 'adoption_rejected',
    ADOPTION_FINALIZED: 'adoption_finalized',
    ADOPTION_CANCELLED: 'adoption_cancelled',
    
    // Meeting notifications
    MEETING_SCHEDULED: 'meeting_scheduled',
    MEETING_CONFIRMED: 'meeting_confirmed',
    MEETING_REMINDER: 'meeting_reminder',
    MEETING_FEEDBACK: 'meeting_feedback',
    MEETING_COMPLETED: 'meeting_completed', 
    MEETING_RESCHEDULED: 'meeting_rescheduled',
    
    // Foster notifications
    FOSTER_REQUEST_NEW: 'foster_request_new',
    FOSTER_APPROVED: 'foster_approved',
    FOSTER_CHAT_STARTED: 'foster_chat_started',
    
    // Chat notifications
    NEW_MESSAGE: 'new_message',
    
    // System notifications
    SYSTEM_ANNOUNCEMENT: 'system_announcement',

    // Agreement and payment notifications
    AGREEMENT_SENT: 'agreement_sent',
    AGREEMENT_SIGNED: 'agreement_signed', 
    AGREEMENT_EXPIRED: 'agreement_expired',
    PAYMENT_PENDING: 'payment_pending',
    PAYMENT_COMPLETED: 'payment_completed',
    PAYMENT_FAILED: 'payment_failed',
    ADOPTION_FINALIZED: 'adoption_finalized',
  };
  