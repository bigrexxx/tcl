export type Question =
  | { id: string; type: "text" | "textarea" | "email" | "tel" | "url"; label: string; placeholder?: string; required?: boolean }
  | { id: string; type: "select"; label: string; options: string[]; required?: boolean }
  | { id: string; type: "radio"; label: string; options: string[]; required?: boolean }
  | { id: string; type: "checkbox"; label: string; options: string[]; required?: boolean }
  | { id: string; type: "scale"; label: string; min: number; max: number; minLabel: string; maxLabel: string; required?: boolean };

export type Committee = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  tagline: string;
  director: { name: string; role: string; bio: string };
  highlights: string[];
  questions: Question[];
};

export const COMMITTEES: Committee[] = [
  {
    id: "sports", icon: "⚽", name: "Sports Committee", tagline: "Build camaraderie through sport",
    desc: "Organises sports events, inter-department competitions and fitness activations across Babcock campus.",
    director: { name: "Director of Sports", role: "Committee Director", bio: "Leads inter-faculty tournaments, fitness drives and TCL's annual sports week." },
    highlights: ["Inter-faculty leagues", "Fitness & wellness drives", "Esports tournaments", "TCL Sports Week"],
    questions: [
      { id: "sports_interest", type: "checkbox", label: "Which sports are you passionate about?", required: true, options: ["Football", "Basketball", "Athletics", "Volleyball", "Table Tennis", "Esports", "Other"] },
      { id: "sports_role", type: "radio", label: "What role suits you best?", required: true, options: ["Player / Competitor", "Coach / Trainer", "Event Organiser", "Referee / Official", "Content & Hype Team"] },
      { id: "sports_experience", type: "textarea", label: "Tell us about your sports background", required: true, placeholder: "Teams, competitions, achievements..." },
    ],
  },
  {
    id: "academic", icon: "📚", name: "Academic Committee", tagline: "Excellence in and beyond the classroom",
    desc: "Drives study groups, academic support and learning partnerships at Babcock University.",
    director: { name: "Director of Academics", role: "Committee Director", bio: "Coordinates peer tutoring, exam prep clinics and faculty partnerships." },
    highlights: ["Peer tutoring network", "Exam prep workshops", "Department study circles", "Scholarship guidance"],
    questions: [
      { id: "ac_dept", type: "text", label: "Your department / course of study", required: true, placeholder: "e.g. Software Engineering" },
      { id: "ac_strength", type: "checkbox", label: "Subject areas you can support", required: true, options: ["STEM", "Business", "Languages", "Law", "Health Sciences", "Arts & Humanities", "Tech / Coding"] },
      { id: "ac_cgpa", type: "select", label: "Current CGPA range", required: true, options: ["4.50 – 5.00", "4.00 – 4.49", "3.50 – 3.99", "3.00 – 3.49", "Below 3.00", "Prefer not to say"] },
      { id: "ac_motivation", type: "textarea", label: "How would you help fellow students learn?", required: true },
    ],
  },
  {
    id: "marketing", icon: "📣", name: "Marketing Committee", tagline: "Tell TCL's story everywhere",
    desc: "Manages brand campaigns, outreach and promotional strategies across digital and on-campus channels.",
    director: { name: "Director of Marketing", role: "Committee Director", bio: "Owns brand voice, growth campaigns and partner activations." },
    highlights: ["Campus-wide campaigns", "Sponsorship outreach", "Brand storytelling", "Growth experiments"],
    questions: [
      { id: "mk_skills", type: "checkbox", label: "Marketing skills you bring", required: true, options: ["Copywriting", "Brand Strategy", "Campaign Planning", "Email Marketing", "SEO", "Paid Ads", "Partnerships"] },
      { id: "mk_campaign", type: "textarea", label: "Describe a campaign idea for TCL", required: true, placeholder: "Concept, channel, target audience, success metric..." },
      { id: "mk_portfolio", type: "url", label: "Portfolio / past work link (optional)", placeholder: "https://" },
    ],
  },
  {
    id: "finance", icon: "💰", name: "Finance Committee", tagline: "Sustainable, well-resourced impact",
    desc: "Manages budgeting, sponsorship revenue and financial planning across TCL initiatives.",
    director: { name: "Director of Finance", role: "Committee Director", bio: "Oversees budgeting, sponsorship pipelines and treasury operations." },
    highlights: ["Transparent budgeting", "Sponsorship management", "Event treasury", "Member finance literacy"],
    questions: [
      { id: "fn_background", type: "radio", label: "Your finance background", required: true, options: ["Accounting / Finance Major", "Business / Economics Major", "Self-taught Enthusiast", "Learning From Scratch"] },
      { id: "fn_tools", type: "checkbox", label: "Tools you've used", required: true, options: ["Excel / Sheets", "QuickBooks", "Sage", "Wave", "None Yet"] },
      { id: "fn_integrity", type: "scale", label: "Rate your comfort handling confidential financial data", min: 1, max: 5, minLabel: "Not yet", maxLabel: "Fully confident", required: true },
      { id: "fn_why", type: "textarea", label: "Why finance for TCL?", required: true },
    ],
  },
  {
    id: "social", icon: "📱", name: "Social Media Committee", tagline: "Build TCL's online voice",
    desc: "Creates and manages content across Instagram, TikTok, Twitter/X and beyond.",
    director: { name: "Director of Social Media", role: "Committee Director", bio: "Owns the calendar across IG, TikTok, X and emerging platforms." },
    highlights: ["Always-on content calendar", "Trend response team", "Community management", "Creator collaborations"],
    questions: [
      { id: "sm_platforms", type: "checkbox", label: "Platforms you can manage", required: true, options: ["Instagram", "TikTok", "Twitter / X", "YouTube", "LinkedIn", "Threads", "Snapchat"] },
      { id: "sm_handle", type: "text", label: "Your main social handle", placeholder: "@yourhandle" },
      { id: "sm_followers", type: "select", label: "Largest community you've grown", required: true, options: ["Under 500", "500 – 2K", "2K – 10K", "10K – 50K", "50K+"] },
      { id: "sm_style", type: "textarea", label: "Describe your content style in 2-3 sentences", required: true },
    ],
  },
  {
    id: "content", icon: "🎙️", name: "Content Council", tagline: "TCL's creative engine",
    desc: "Produces original video, podcast, written and multimedia content representing the Babcock campus.",
    director: { name: "Director of the Content Council", role: "Committee Director", bio: "TCL's creative chair — runs editorial, video and podcast pipelines." },
    highlights: ["Original video series", "Flagship podcast", "Editorial newsletter", "Documentary projects"],
    questions: [
      { id: "cc_formats", type: "checkbox", label: "Formats you create", required: true, options: ["Video / Short-form", "Podcast / Audio", "Long-form Writing", "Newsletters", "Documentary", "Live Shows"] },
      { id: "cc_idea", type: "textarea", label: "Pitch one content series for TCL", required: true, placeholder: "Format, hook, episode 1 idea..." },
      { id: "cc_link", type: "url", label: "Sample of your work (link)", placeholder: "https://" },
      { id: "cc_commit", type: "radio", label: "Hours per week you can commit", required: true, options: ["1-3 hrs", "4-7 hrs", "8-12 hrs", "12+ hrs"] },
    ],
  },
  {
    id: "multimedia", icon: "🎥", name: "Multi-Media Committee", tagline: "Behind the lens of every TCL moment",
    desc: "Handles photography, videography, graphic design and technical production for TCL events.",
    director: { name: "Director of Multi-Media", role: "Committee Director", bio: "Leads photo, video and design across every TCL touchpoint." },
    highlights: ["Event photo & video coverage", "Studios 25 production", "Design system & assets", "Live broadcast crew"],
    questions: [
      { id: "mm_skills", type: "checkbox", label: "Your multimedia skills", required: true, options: ["Photography", "Videography", "Video Editing", "Graphic Design", "Motion / Animation", "Audio Engineering", "Live Streaming"] },
      { id: "mm_software", type: "checkbox", label: "Software you're comfortable with", required: true, options: ["Adobe Premiere", "Final Cut", "DaVinci", "Photoshop", "Lightroom", "Illustrator", "Figma", "Canva", "After Effects"] },
      { id: "mm_gear", type: "textarea", label: "Equipment you own (if any)", placeholder: "Cameras, lenses, mics, laptops..." },
      { id: "mm_portfolio", type: "url", label: "Portfolio / reel link", required: true, placeholder: "https://" },
    ],
  },
  {
    id: "it", icon: "💻", name: "Information Technologies", tagline: "Keep TCL running, behind the scenes",
    desc: "Manages TCL's digital infrastructure — website, data systems and tech tools.",
    director: { name: "Director of IT", role: "Committee Director", bio: "Maintains the TCL platform, data and internal tools stack." },
    highlights: ["TCL website & app", "Member data systems", "Automation & internal tools", "Tech support desk"],
    questions: [
      { id: "it_stack", type: "checkbox", label: "Tech stack you've worked with", required: true, options: ["Frontend (React/Vue)", "Backend (Node/Python)", "Databases (SQL/NoSQL)", "DevOps / Cloud", "Mobile (iOS/Android)", "WordPress / No-code", "AI / ML"] },
      { id: "it_role", type: "radio", label: "Where you'd add most value", required: true, options: ["Web Development", "Data & Analytics", "IT Support / Helpdesk", "Cybersecurity", "Automation / Scripting"] },
      { id: "it_github", type: "url", label: "GitHub / portfolio (optional)", placeholder: "https://github.com/" },
      { id: "it_project", type: "textarea", label: "Describe a recent project you built", required: true },
    ],
  },
  {
    id: "welfare", icon: "🤗", name: "Welfare Committee", tagline: "Champion every TCL member",
    desc: "Drives mental health awareness, member support and a genuinely caring community.",
    director: { name: "Director of Welfare", role: "Committee Director", bio: "Owns mental health programming, peer support and crisis response." },
    highlights: ["Mental health programming", "Peer support circles", "Wellness events", "Member care line"],
    questions: [
      { id: "wf_focus", type: "checkbox", label: "Welfare areas you care about", required: true, options: ["Mental Health", "Peer Support", "Crisis Response", "Wellness Events", "Mentorship", "Conflict Resolution"] },
      { id: "wf_training", type: "radio", label: "Any relevant training?", required: true, options: ["Certified counsellor / psychologist", "Peer support trained", "First aid trained", "No formal training (willing to learn)"] },
      { id: "wf_empathy", type: "scale", label: "How comfortable are you holding space for difficult conversations?", min: 1, max: 5, minLabel: "Learning", maxLabel: "Very comfortable", required: true },
      { id: "wf_why", type: "textarea", label: "Why welfare matters to you", required: true },
    ],
  },
  {
    id: "lifestyle", icon: "👗", name: "Lifestyle & Fashion Committee", tagline: "Showcase Babcock style & culture",
    desc: "Celebrates style, culture and creative expression through fashion showcases and lifestyle content.",
    director: { name: "Director of Lifestyle & Fashion", role: "Committee Director", bio: "Curates fashion showcases, lifestyle features and culture coverage." },
    highlights: ["Seasonal fashion showcases", "Style features & lookbooks", "Culture & trend coverage", "Creator collabs"],
    questions: [
      { id: "lf_interests", type: "checkbox", label: "Lifestyle areas you cover", required: true, options: ["Fashion", "Beauty", "Food & Dining", "Travel", "Wellness", "Music & Nightlife", "Culture & Trends"] },
      { id: "lf_aesthetic", type: "textarea", label: "Describe your personal aesthetic", required: true, placeholder: "Mood, references, signature looks..." },
      { id: "lf_showcase", type: "textarea", label: "Pitch one lifestyle showcase for TCL", required: true },
      { id: "lf_handle", type: "text", label: "Lifestyle / fashion handle (optional)", placeholder: "@yourhandle" },
    ],
  },
];

export const GENERAL_QUESTIONS: Question[] = [
  { id: "year", type: "select", label: "Current year at Babcock", required: true, options: ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Faculty / Staff"] },
  { id: "department", type: "text", label: "Department / programme", required: true, placeholder: "e.g. Mass Communication" },
  { id: "hours", type: "radio", label: "Hours per week you can commit to TCL", required: true, options: ["1-3 hrs", "4-7 hrs", "8-12 hrs", "12+ hrs"] },
  { id: "why_tcl", type: "textarea", label: "Why do you want to join TCL Babcock?", required: true, placeholder: "What pulls you in? What do you hope to give and gain?" },
  { id: "also_general", type: "radio", label: "Also join the General Community channel?", required: true, options: ["Yes, add me to General", "No, just my committee"] },
];