// ── Nexora CRM — Realistic Demo Data ───────────────────────

export const DEMO_DATA = {
  // ── KPI Stats ──────────────────────────────────────────────
  stats: [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: '$847,320',
      trend: 18.4,
      icon: 'dollarSign',
      color: 'purple',
      sparkline: [34, 42, 38, 55, 47, 62, 58, 71, 65, 80, 74, 92],
    },
    {
      id: 'contacts',
      label: 'Total Contacts',
      value: '12,847',
      trend: 12.1,
      icon: 'users',
      color: 'blue',
      sparkline: [800, 950, 870, 1100, 980, 1250, 1180, 1320, 1280, 1440, 1390, 1520],
    },
    {
      id: 'deals',
      label: 'Active Deals',
      value: '284',
      trend: -3.2,
      icon: 'target',
      color: 'teal',
      sparkline: [30, 28, 32, 25, 28, 24, 27, 22, 25, 21, 24, 20],
    },
    {
      id: 'winRate',
      label: 'Win Rate',
      value: '68.4%',
      trend: 5.7,
      icon: 'trending',
      color: 'amber',
      sparkline: [52, 55, 58, 54, 60, 62, 59, 64, 61, 66, 64, 68],
    },
  ],

  // ── Revenue Chart ────────────────────────────────────────────
  revenue: {
    monthly: [
      { label: 'May', value: 54200 },
      { label: 'Jun', value: 71800 },
      { label: 'Jul', value: 63500 },
      { label: 'Aug', value: 88200 },
      { label: 'Sep', value: 76400 },
      { label: 'Oct', value: 112300 },
    ],
    yearly: [
      { label: 'Jan', value: 48000 },
      { label: 'Feb', value: 52000 },
      { label: 'Mar', value: 61000 },
      { label: 'Apr', value: 55000 },
      { label: 'May', value: 54200 },
      { label: 'Jun', value: 71800 },
      { label: 'Jul', value: 63500 },
      { label: 'Aug', value: 88200 },
      { label: 'Sep', value: 76400 },
      { label: 'Oct', value: 112300 },
      { label: 'Nov', value: 0 },
      { label: 'Dec', value: 0 },
    ],
  },

  // ── Recent Activity ──────────────────────────────────────────
  activity: [
    {
      type: 'deal',
      text: '<strong>Enterprise SaaS deal</strong> with Acme Corp moved to <strong>Negotiation</strong> stage',
      time: '2 minutes ago',
    },
    {
      type: 'contact',
      text: '<strong>Sarah Mitchell</strong> from TechVentures Inc. was added as a new contact',
      time: '18 minutes ago',
    },
    {
      type: 'call',
      text: '<strong>Discovery call</strong> with Horizon Digital completed — 42 min duration',
      time: '1 hour ago',
    },
    {
      type: 'deal',
      text: '<strong>CloudSync Pro</strong> deal worth <strong>$42,000</strong> was marked as Won 🎉',
      time: '2 hours ago',
    },
    {
      type: 'note',
      text: '<strong>Marcus Chen</strong> added a follow-up note to the Stellar Media account',
      time: '3 hours ago',
    },
    {
      type: 'task',
      text: '<strong>Quarterly review proposal</strong> for DataBridge LLC marked as complete',
      time: '5 hours ago',
    },
    {
      type: 'contact',
      text: '<strong>James Ortega</strong> from FuturePath Group requested a product demo',
      time: '6 hours ago',
    },
    {
      type: 'deal',
      text: '<strong>Annual contract renewal</strong> for NovaTech worth $125,000 created',
      time: 'Yesterday, 4:30 PM',
    },
  ],

  // ── Sales Pipeline ───────────────────────────────────────────
  pipeline: [
    { name: 'Lead',        count: 84,  value: 1248000 },
    { name: 'Qualified',   count: 52,  value: 987000  },
    { name: 'Proposal',    count: 38,  value: 742000  },
    { name: 'Negotiation', count: 24,  value: 516000  },
    { name: 'Closed Won',  count: 86,  value: 2184000 },
  ],

  // ── Upcoming Tasks ───────────────────────────────────────────
  tasks: [
    {
      id: 't1',
      title: 'Follow up with Acme Corp on proposal',
      due: 'Today, 3:00 PM',
      priority: 'high',
      assignee: 'Alexandra Reid',
    },
    {
      id: 't2',
      title: 'Prepare Q4 forecast report for board',
      due: 'Tomorrow, 9:00 AM',
      priority: 'high',
      assignee: 'Alexandra Reid',
    },
    {
      id: 't3',
      title: 'Schedule onboarding call — CloudSync Pro',
      due: 'Nov 1, 2:00 PM',
      priority: 'medium',
      assignee: 'Marcus Chen',
    },
    {
      id: 't4',
      title: 'Update contact records for TechVentures',
      due: 'Nov 2, 11:00 AM',
      priority: 'low',
      assignee: 'Alexandra Reid',
    },
    {
      id: 't5',
      title: 'Send contract to DataBridge LLC legal team',
      due: 'Nov 3, 5:00 PM',
      priority: 'medium',
      assignee: 'Marcus Chen',
    },
  ],

  // ── Team Leaderboard ─────────────────────────────────────────
  team: [
    { id: 'u1', name: 'Alexandra Reid',  deals: 32, revenue: 284000, avatar: 'AR' },
    { id: 'u2', name: 'Marcus Chen',     deals: 28, revenue: 231000, avatar: 'MC' },
    { id: 'u3', name: 'Priya Sharma',    deals: 24, revenue: 198000, avatar: 'PS' },
    { id: 'u4', name: 'Jordan Williams', deals: 19, revenue: 152000, avatar: 'JW' },
    { id: 'u5', name: 'Sophie Laurent',  deals: 17, revenue: 134000, avatar: 'SL' },
  ],
};
