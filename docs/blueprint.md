# **App Name**: VerifiedBizLink

## Core Features:

- Business Profile & Verification Status: Users can create and manage their detailed business profiles, which prominently display their real-time verification status (Pending/Verified) with a gold checkmark, along with key company information and a user avatar.
- Dynamic Activity Feed: A scrollable main feed presents a stream of updates from verified connections, each post clearly displaying the author's avatar, company name, a gold 'Verified' checkmark icon, timestamp, text content, and interaction buttons (Like, Comment, Connect).
- Post Creation Tool: Users can easily compose and publish new text-based updates and announcements to their network via an input area asking 'Share an update or milestone...', including support for attachment icons. Posts integrate seamlessly into the main activity feed.
- B2B Network Discovery: The platform suggests trusted connections via a widget, allowing users to discover and send connection requests to other vetted businesses within the network, featuring small avatars and a 'Connect' button.
- AI Business Content Assistant: A generative AI tool assists users in drafting professional, compliant, and impactful posts or connection messages, activated by a distinct 'Draft with AI' button with a Sparkles icon, offering suggestions for tone, keywords, and overall structure.
- Navigation & Identity Management: Manages the fixed left column, including the app logo, a dynamic profile card with user avatar, company name, and verification status, and a main navigation menu (Home, My Network, Vetting Hub, Analytics, Settings).
- Compliance & News Widget: Displays a small promotional widget for premium business subscription tiers or local market news within the right column, providing utility and discovery.

## Style Guidelines:

- Primary accent color: Golden Yellow (bg-yellow-400 / text-yellow-500), symbolizing trust and professionalism, used for key interactive elements and branding accents.
- Backgrounds: Off-White/Light Gray (bg-gray-50) for the main app background and Clean White (bg-white) for content cards, maintaining a crisp, clean aesthetic.
- Text & dark elements: Charcoal Black (text-gray-900 for headings, text-gray-600 for body), ensuring high contrast and excellent readability across the platform.
- Font: 'Inter' (sans-serif) is used exclusively for all textual content, from headlines to body text, aligning with a professional and clean B2B platform.
- Icons: Utilizes the 'lucide-react' library, favoring simple, clean, and outlined icon designs that convey professionalism and avoid visual clutter.
- Dashboard Structure: A robust 3-column layout (col-span-3 for left, col-span-6 for center, col-span-3 for right, with 'md:grid-cols-12, gap-6, max-w-7xl, mx-auto, pt-6') that collapses gracefully to a single column on mobile screens, inspired by LinkedIn's professionalism and Discord's organized interface.
- Subtle UI animations: Include subtle CSS transitions on hover states for interactive elements (buttons, links) and smooth rendering for feed items to enhance user experience.