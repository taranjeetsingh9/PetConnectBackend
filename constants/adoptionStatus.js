const ADOPTION_STATUS = {
    PENDING: 'pending',         // New request submitted
    ON_HOLD: 'on-hold',         // Temporarily paused or another adopter approved
    APPROVED: 'approved',       // Staff approved → chat ready
    MEETING: 'meeting',         // Meeting scheduled
    REJECTED: 'rejected',       // Staff rejected request
    IGNORED: 'ignored',         // Staff ignored request
    FINALIZED: 'finalized',     // Adoption completed
    CANCELLED: 'cancelled',     // Optional: adopter withdraws
    CHAT: 'chat',
    AGREEMENT_SENT: 'agreement_sent',
    AGREEMENT_SIGNED: 'agreement_signed',
    PAYMENT_PENDING: 'payment_pending',
    PAYMENT_COMPLETED: 'payment_completed',
    PAYMENT_FAILED: 'payment_failed'
  };
  
  module.exports = ADOPTION_STATUS;
