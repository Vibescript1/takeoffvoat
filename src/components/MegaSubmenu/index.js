import React from "react";
import "./index.css";

const SUBTITLES = [
  { key: "creative", label: "Creative & Design" },
  { key: "writing", label: "Writing & Content Creation" },
  { key: "marketingbranding", label: "Digital Marketing & Branding" },
  { key: "technology", label: "Technology & Development" },
  { key: "businessadmin", label: "Business & Administrative Support" },
  { key: "education", label: "Education & Training" },
  { key: "miscellaneous", label: "Miscellaneous & Niche Services" },
  { key: "offline", label: "Offline Freelancing (Local Services)" },
];

// Per-title data: each key maps to its own sections and items
const DEFAULT_MENU = {
  creative: [
    { title: "Graphic Design", items: ["Logos", "Brochures", "Banners", "Business Cards", "Social Media Graphics"] },
    { title: "Web Design", items: ["UI Design", "UX Design", "Wireframing"] },
    { title: "Illustration", items: ["Digital Art", "Character Design", "Storyboarding"] },
    { title: "Photography", items: ["Product", "Portrait", "Event", "Stock Photography"] },
    { title: "Videography", items: ["Shooting", "Editing", "Motion Graphics"] },
    { title: "Animation", items: ["2D Animation", "3D Animation", "Explainer Videos"] },
    { title: "Interior Design", items: ["Room Layouts", "Mood Boards", "Virtual Staging"] },
    { title: "Fashion Design", items: ["Clothing Sketches", "Pattern Making", "Trend Analysis"] },
  ],
  writing: [
    { title: "Content Writing", items: ["Blog Posts", "Articles", "Website Copy"] },
    { title: "Copywriting", items: ["Ad Copy", "Sales Pages", "Email Campaigns"] },
    { title: "Technical Writing", items: ["Manuals", "Guides", "Documentation"] },
    { title: "Medical Writing", items: ["Health Articles", "Research Summaries"] },
    { title: "Creative Writing", items: ["Fiction", "Poetry", "Scripts"] },
    { title: "Editing & Proofreading", items: ["Grammar", "Style", "Content Editing"] },
    { title: "Translation", items: ["Documents", "Websites", "Subtitles"] },
    { title: "Resume & CV Writing", items: ["Professional Resumes"] },
  ],
  marketingbranding: [
    { title: "Digital Marketing", items: ["SEO", "SEM", "Email Marketing", "PPC Ads"] },
    { title: "Social Media Management", items: ["Planning", "Scheduling", "Engagement", "Analytics"] },
    { title: "Brand Development", items: ["Identity", "Positioning", "Voice", "Strategy"] },
    { title: "Influencer Marketing", items: ["Collaboration Mgmt", "Campaign Planning"] },
    { title: "Public Relations (PR)", items: ["Press Releases", "Media Outreach", "Reputation Mgmt"] },
  ],
  technology: [
    { title: "Web Development", items: ["Frontend", "Backend", "Full‑stack"] },
    { title: "Mobile App Development", items: ["iOS", "Android", "Maintenance"] },
    { title: "Software Development", items: ["Custom Software", "Scripts", "Automation"] },
    { title: "Game Development", items: ["2D/3D Games", "Game Design", "Coding"] },
    { title: "IT Support", items: ["Troubleshooting", "Installations", "Remote Support"] },
    { title: "Cybersecurity", items: ["Security Audits", "Pen Testing", "Risk Management"] },
    { title: "Data Analysis & Science", items: ["Cleaning", "Visualization", "Predictive Modeling"] },
    { title: "AI & Machine Learning", items: ["Model Development", "Data Training", "AI Solutions"] },
  ],
  businessadmin: [
    { title: "Virtual Assistant", items: ["Email Mgmt", "Scheduling", "Research", "Data Entry"] },
    { title: "Project Management", items: ["Task Coordination", "Workflows", "Tool Setup"] },
    { title: "Bookkeeping & Accounting", items: ["Invoicing", "Expense Tracking", "Reporting"] },
    { title: "Business Consulting", items: ["Strategy", "Process Improvement", "Market Research"] },
    { title: "Legal Services", items: ["Contract Drafting", "Legal Research"] },
    { title: "Recruitment & HR", items: ["Talent Sourcing", "Interview Coordination"] },
  ],
  education: [
    { title: "Tutoring", items: ["Academic Subjects", "Test Prep", "Language Coaching"] },
    { title: "Online Courses", items: ["Course Creation", "Video Lessons", "Curriculum Design"] },
    { title: "Coaching", items: ["Life Coaching", "Career Coaching", "Fitness Coaching"] },
    { title: "Workshops & Webinars", items: ["Live Sessions", "Recorded Sessions"] },
  ],
  miscellaneous: [
    { title: "Voiceover & Audio Production", items: ["Narration", "Podcast Editing", "Sound Design"] },
    { title: "Music Production", items: ["Songwriting", "Composing", "Mixing", "Mastering"] },
    { title: "Event Planning", items: ["Virtual Events", "In‑person Events"] },
    { title: "Survey & Market Research", items: ["Data Collection", "Survey Design", "Analysis"] },
    { title: "Product Photography", items: ["E‑commerce Images", "Styling"] },
    { title: "3D Modeling & Printing", items: ["3D Design", "Rendering", "Prototyping"] },
    { title: "Translation & Localization", items: ["Regional Adaptation"] },
    { title: "Proofreading & Editing", items: ["Error‑free Content"] },
    { title: "Resume & Cover Letters", items: ["Job Application Materials"] },
    { title: "Podcast Production", items: ["Scripting", "Editing", "Publishing"] },
    { title: "Lead Generation", items: ["Prospect Research", "Outreach"] },
    { title: "E‑commerce Management", items: ["Listings", "Inventory", "Customer Service"] },
  ],
  offline: [
    { title: "Handyman Services", items: ["Repairs", "Installations", "Maintenance"] },
    { title: "Personal Training", items: ["Fitness Coaching", "Nutrition Advice (In‑person)"] },
    { title: "Event Photography/Videography", items: ["Weddings", "Parties", "Corporate Events"] },
    { title: "Catering & Cooking", items: ["Meal Prep", "Event Catering"] },
    { title: "Art & Craft", items: ["Custom Artwork", "Handmade Products"] },
    { title: "Pet Services", items: ["Pet Sitting", "Dog Walking", "Grooming"] },
    { title: "House Cleaning & Organization", items: ["Decluttering", "Cleaning Services"] },
    { title: "Driving & Delivery", items: ["Ride‑sharing", "Food Delivery", "Courier Services"] },
  ],
  // Fallback keys retained to avoid breakage if custom data is passed
  video: [
    { title: "Editing", items: ["Shorts/Reels", "YouTube Editing", "Color Grading", "Subtitles"] },
    { title: "Production", items: ["Product Videos", "Explainers", "Commercials", "Storyboarding"] },
    { title: "Motion", items: ["Logo Animation", "2D Motion", "Infographics"] },
    { title: "UGC", items: ["Scripted UGC", "Product Demos", "Review Videos"] },
  ],
};

function MegaSubmenu({ menu = DEFAULT_MENU, subtitles = SUBTITLES }) {
  const [activeKey, setActiveKey] = React.useState(null);
  const openTimerRef = React.useRef(null);
  const closeTimerRef = React.useRef(null);

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleEnter = (key) => {
    if (activeKey === key) return;
    clearTimeout(closeTimerRef.current);
    openTimerRef.current = setTimeout(() => {
      setActiveKey(key);
    }, 120);
  };

  const handleLeave = () => {
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActiveKey(null);
    }, 180);
  };

  React.useEffect(() => () => clearTimers(), []);

  return (
    <div className="mega-submenu" onMouseLeave={handleLeave}>
      <div className="mega-submenu-row">
        {subtitles.map((s) => (
          <button
            key={s.key}
            className={`mega-submenu-item ${activeKey === s.key ? "active" : ""}`}
            onMouseEnter={() => handleEnter(s.key)}
            onFocus={() => handleEnter(s.key)}
            onBlur={handleLeave}
            type="button"
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeKey && (
        <div
          className="mega-submenu-panel"
          role="menu"
          onMouseEnter={() => {
            // keep open while hovering the panel
            clearTimeout(closeTimerRef.current);
          }}
          onMouseLeave={handleLeave}
        >
          <div className="mega-submenu-grid">
            {(menu[activeKey] || []).map((section, idx) => (
              <div className="mega-submenu-col" key={`${section.title}-${idx}`}>
                <div className="mega-submenu-col-title">{section.title}</div>
                <ul className="mega-submenu-list">
                  {section.items.map((item) => (
                    <li key={item} className="mega-submenu-list-item">
                      <a href="/" onClick={(e) => e.preventDefault()}>
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MegaSubmenu;


