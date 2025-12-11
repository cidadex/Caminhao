# TruckFlow - Design Guidelines

## Design Approach
**System-Based Approach**: This is a data-heavy, utility-focused fleet management dashboard. Drawing inspiration from enterprise design systems like Carbon Design and modern SaaS dashboards (Linear, Notion), prioritizing clarity, efficiency, and data visualization.

## Core Design Principles
1. **Data-First**: Information hierarchy favors numbers, metrics, and actionable insights
2. **Professional Clarity**: Clean, minimal aesthetic that reduces cognitive load
3. **Efficiency**: Fast scanning, clear CTAs, minimal clicks to core functions
4. **Scalability**: Design accommodates growth from 4 to 40+ trucks

## Color System
- **Primary**: #0D6EFD (vibrant blue for CTAs, active states, primary actions)
- **Secondary**: #0B3A78 (deep blue for headers, accents, trust elements)
- **Background**: Light neutral (off-white/light gray for reduced eye strain)
- **Success/Warning/Error**: Standard semantic colors for maintenance status and financial indicators

## Typography
- **Font**: Inter or IBM Plex Sans via Google Fonts
- **Hierarchy**:
  - Dashboard titles: text-2xl font-semibold
  - Card headers: text-lg font-medium
  - Metrics/numbers: text-3xl font-bold (emphasize data)
  - Body text: text-sm
  - Labels: text-xs text-gray-600

## Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, 12, 16 (e.g., p-4, gap-6, mb-8)

**Grid Structure**:
- Fixed sidebar: w-64 (left side, always visible on desktop)
- Main content area: flex-1 with max-w-7xl container
- Dashboard cards: 3-4 column grid (lg:grid-cols-4 md:grid-cols-2)
- Data tables: full-width with horizontal scroll on mobile

## Component Library

### Navigation
- **Sidebar**: Fixed left navigation (h-screen, bg-white, shadow)
  - Logo/brand at top (p-6)
  - Navigation links with icons (py-3 px-4, hover states)
  - Active state: bg-blue-50 with border-l-4 accent
  - User profile at bottom

### Dashboard Cards
- **Metric Cards**: Large, scannable with clear hierarchy
  - White background, rounded-lg, shadow-sm, p-6
  - Icon in colored circle (top left)
  - Large metric number (text-3xl font-bold)
  - Label below (text-sm text-gray-600)
  - Trend indicator (arrow + percentage)

### Data Tables
- **Table Design**: Clean, alternating row colors
  - Header: bg-gray-50, font-medium, sticky on scroll
  - Rows: hover:bg-gray-50 for interactivity
  - Action buttons: icon-only, right-aligned
  - Status badges: rounded-full px-3 py-1

### Forms
- **Input Fields**: Clear labels, proper spacing
  - Label above input (text-sm font-medium mb-2)
  - Input: border-gray-300, focus:ring-2 focus:ring-blue-500, rounded-md, p-3
  - Helper text below (text-xs text-gray-500)
  - File upload: Drag-and-drop zone with visual feedback

### Charts
- **Visualization**: Use Chart.js or Recharts
  - Line charts: Monthly trends (revenue vs. maintenance)
  - Bar charts: Truck comparison (horizontal bars for easy label reading)
  - Donut charts: Status distribution
  - Color palette: Blues and grays with accent colors for emphasis

### Buttons
- **Primary**: bg-blue-600 hover:bg-blue-700, text-white, rounded-md, px-6 py-3, font-medium
- **Secondary**: border-2 border-gray-300, hover:bg-gray-50
- **Icon buttons**: Circular (w-10 h-10), centered icon

### Modals/Dialogs
- Overlay: bg-black/50 backdrop-blur-sm
- Modal: bg-white, rounded-xl, shadow-2xl, max-w-2xl, p-6
- Header with close button, content area, footer with actions

## Page-Specific Guidelines

### Login Page
- Centered card (max-w-md)
- Logo/brand above form
- Clean input fields with proper spacing (gap-4)
- "Remember me" checkbox
- Forgot password link (subtle)

### Dashboard Home
- 4-column metric cards at top (Faturamento Bruto, Líquido, KM Total, Gastos)
- 2-column chart section below (monthly line + truck comparison bars)
- Recent activity list/table at bottom

### Truck List
- Table view with quick actions
- Status indicators (colored badges: green=ativo, orange=manutenção)
- Quick add button (fixed bottom-right FAB on mobile)

### Reports Page
- Filter panel at top (date pickers, dropdowns)
- Export buttons (PDF/Excel/CSV) with icons
- Results table with sortable columns
- Empty state: helpful illustration + "Nenhum resultado encontrado"

## Responsive Behavior
- **Desktop (lg:)**: Full sidebar + multi-column grids
- **Tablet (md:)**: Collapsible sidebar (hamburger menu), 2-column grids
- **Mobile (base)**: Hidden sidebar (drawer), single column, stacked cards

## Icons
- **Library**: HeroIcons (outline for navigation, solid for emphasis)
- **Usage**: Truck, wrench (maintenance), chart-bar, document (reports), user

## Images
No hero images required. This is a utility dashboard focused on data and functionality.

**Illustrations**: Use simple, professional illustrations for:
- Empty states (no data yet)
- Error states (404, connection issues)
- Success confirmations

## Accessibility
- Proper ARIA labels on all interactive elements
- Keyboard navigation for all actions
- Focus indicators (ring-2 ring-blue-500)
- Color contrast ratios meet WCAG AA standards
- Form validation with clear error messages