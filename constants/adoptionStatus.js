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
  };
  
  module.exports = ADOPTION_STATUS;
