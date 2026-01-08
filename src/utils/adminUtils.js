// Admin utilities
const ADMIN_EMAILS = ['calebc9298@gmail.com', 'calebc9298@outlook.com'];

export const isAdmin = user => {
  return ADMIN_EMAILS.includes(user?.email);
};

export const requireAdmin = user => {
  if (!isAdmin(user)) {
    throw new Error('Unauthorized: Admin access required');
  }
};
