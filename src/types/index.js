// User Profile Type
export const UserProfile = {
  uid: '',
  name: '',
  email: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
  },
  acresFarmed: 0,
  region: '', // Will be derived from address
  createdAt: null,
  updatedAt: null,
};

// Chat Room Types
export const ChatRoomType = {
  REGIONAL: 'regional',
  STATEWIDE: 'statewide',
  NATIONAL: 'national',
};

// Post Types
export const PostType = {
  SIMPLE: 'simple', // Regular text post like X/Twitter
  FENCEPOST: 'fencepost', // Structured farm activity post
};

// FencePost Activity Types
export const FencePostActivity = {
  PLANTING: 'planting',
  SPRAYING: 'spraying',
  FERTILIZING: 'fertilizing',
  HARVESTING: 'harvesting',
  TILLAGE: 'tillage',
  MAINTENANCE: 'maintenance',
};

// Season Types
export const Season = {
  SPRING: 'spring',
  SUMMER: 'summer',
  FALL: 'fall',
  WINTER: 'winter',
};
