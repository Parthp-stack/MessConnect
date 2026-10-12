// Clean Seed Baseline for MessConnect Production
// Zero dummy data. Only pre-provisioned SuperAdmin.
// All students, mess owners, and mess listings are onboarded strictly via real user registration.

const seedData = {
  users: [
    {
      id: "user_admin_1",
      name: "Parth",
      email: "admin@messconnect.in",
      phone: "+91 94234 90513",
      password: "password123",
      role: "ADMIN",
      avatar: "",
      department: "Platform Administration & Lead Support",
      verified: true,
      createdAt: "2026-09-21T00:00:00.000Z"
    }
  ],
  messes: [],
  subscriptions: [],
  trials: [],
  payments: [],
  reviews: [],
  notifications: [],
  complaints: [],
  offers: [],
  checkins: [],
  flexipassTiers: [],
  flexipasses: [],
  groups: [],
  favorites: [],
  searchHistory: []
};

module.exports = seedData;
