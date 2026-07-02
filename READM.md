# Student Opportunity Engine

A simple, beginner-friendly React + TypeScript MVP to help students discover, save, and track campus and external opportunities.

## Problem
Students struggle to find and manage opportunities (internships, scholarships, research roles, campus jobs, events) across multiple places. It’s hard to see which opportunities are a good fit and track application progress.

## Solution overview
Student Opportunity Engine provides a single personalized feed that matches opportunities to a student profile. It lets students search, filter, save opportunities, track application status, and view upcoming deadlines — all in a lightweight demo app.

## Main features
- Student profile: editable profile with interests, skills, preferred opportunity types, and goals
- Personalized opportunity matching: simple scoring algorithm based on profile and opportunity fields
- Match score and match reasons: percentage score and short reasons explaining the match
- Search and filters: search by title/source/skills/tags/type/location and filter by type/location/deadline urgency
- Saved opportunities: bookmark items, persisted to localStorage
- Application status tracker: `Saved`, `Applying`, `Applied`, `Interview`, `Done` (persisted)
- Deadlines tab: sorted deadlines with urgency badges (due soon, upcoming, past)
- Opportunity details modal: full details, save toggle, status dropdown
- AI-style application guidance: local, demo-friendly guidance generated from the opportunity and profile (no external AI calls)

## How to run locally
1. Install dependencies

   npm install

2. Run the dev server

   npm run dev

3. Build for production

   npm run build

(Requires Node.js and npm.)

## Demo flow
1. Open the app (http://localhost:5173 by default).
2. Go to the Profile tab and edit your profile (interests, skills, preferred types, location).
3. Switch to Opportunities to see matched items sorted by match score.
4. Use the search bar and filters to narrow results.
5. Click "Learn More" on a card to open the details modal.
6. Read the AI Application Guidance section for quick tips.
7. Click "Save" to bookmark an opportunity.
8. Go to Saved, change the application status using the dropdown.
9. Check Deadlines to see upcoming deadlines and urgency badges.

## Notes
- All data in this demo is sample data bundled in `src/data/opportunities.ts`.
- Persistence uses browser localStorage for saved IDs, profile, and statuses. No backend required.
- No external AI or APIs are called — guidance is generated locally.

## Future improvements
- Integrate real opportunity feeds (school APIs, external listings)
- Use real AI models or services for richer application recommendations
- Add calendar reminders / export for deadlines
- Add school and partner dashboards and multi-user support

---
Built as a lightweight demo to explore profile-driven opportunity discovery. Feedback and contributions welcome.