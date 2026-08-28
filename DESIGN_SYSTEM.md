# GenHealth AI — Design System Documentation
**Style Direction:** Clean Medical Precision / Modern Clinical Minimal  
**Product:** GenHealth AI — Clinical AI & Health Intelligence Platform  
**Target Users:** Patients, Doctors, Clinical Providers & Hospitals  
**Core Aesthetic:** Trustworthy, calm, medically credible, uncluttered, technologically advanced.

---

## 1. Design Principles

1. **Signal-to-Noise Priority:** Clinical data is life-critical. Minimize decorative noise (no arbitrary corner blobs, excessive glassmorphism, or cartoonish illustrations).
2. **Disciplined Geometry:** Precise, modern radii (8px–16px) instead of bloated pill shapes and inflated 28px corners.
3. **High-Legibility Medical Contrast:** Slate 900 text on pure white surfaces (Light) and Slate 50 text on Deep Slate surfaces (Dark) meeting WCAG AAA standard (14:1+ contrast ratio).
4. **Purpose-Driven Status Encoding:** Color is used exclusively for actionable clinical flags (Emerald for Normal, Amber for Low/Warning, Red for High/Critical, Blue for Informational).
5. **Tabular Precision:** JetBrains Mono font for biomarker readings, reference intervals, LOINC codes, and UUID anchors.

---

## 2. Color System

### Light Mode (`:root`)

| Role | Token | Hex / Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` / `--bg-primary` | `#F8FAFC` (Slate 50) | High-comfort neutral page background |
| **Secondary Surface** | `--bg-secondary` / `--bg-subtle` | `#F1F5F9` (Slate 100) | Inset panels, table headers, filter bars |
| **Surface / Card** | `--bg-surface` / `--bg-card` | `#FFFFFF` (Pure White) | Card surfaces, modal sheets, tables |
| **Hover Surface** | `--bg-card-hover` | `#F8FAFC` | Interactive card hover state |
| **Input Background** | `--bg-input` | `#FFFFFF` | Form inputs, search fields |
| **Text Primary** | `--text-primary` | `#0F172A` (Slate 900) | High-contrast headings and body text |
| **Text Secondary** | `--text-secondary` | `#475569` (Slate 600) | Metadata, descriptions, subtitle copy |
| **Text Muted** | `--text-muted` | `#64748B` (Slate 500) | Table headers, timestamps, subtle labels |
| **Brand Primary Action** | `--brand-primary` | `#0F172A` (Slate 900) | High-authority primary button fill |
| **Brand Teal / Primary Accent** | `--brand-teal` / `--text-accent` | `#0891B2` (Teal 600) | Clinical active links, brand highlights |
| **Brand Teal Hover** | `--brand-teal-hover` | `#0E7490` (Teal 700) | Hover state for teal interactions |
| **Subtle Tint Accent** | `--brand-soft-blue` | `#E0F2FE` (Sky 100) | Badge backgrounds, accent highlight chips |
| **Subtle Border** | `--border-subtle` / `--border-card` | `#E2E8F0` (Slate 200) | 1px clean container and cell dividers |
| **Focus Ring** | `--border-focus` | `#0891B2` (Teal 600) | Accessible focus outline |

### Dark Mode (`[data-theme="dark"]`, `.dark`)

| Role | Token | Hex / Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` / `--bg-primary` | `#0B0F17` (Deep Charcoal) | Eye-strain reducing deep background |
| **Secondary Surface** | `--bg-secondary` / `--bg-subtle` | `#111827` (Gray 900) | Inset panels, table headers |
| **Surface / Card** | `--bg-surface` / `--bg-card` | `#111827` (Gray 900) | Card surfaces, modal sheets |
| **Hover Surface** | `--bg-card-hover` | `#161F30` | Interactive card hover state |
| **Input Background** | `--bg-input` | `#0F172A` (Slate 900) | Form inputs |
| **Text Primary** | `--text-primary` | `#F8FAFC` (Slate 50) | High-contrast readable text |
| **Text Secondary** | `--text-secondary` | `#CBD5E1` (Slate 300) | Subtitles, labels |
| **Text Muted** | `--text-muted` | `#94A3B8` (Slate 400) | Table headers, timestamps |
| **Brand Primary Action** | `--brand-primary` | `#1E293B` (Slate 800) | Dark mode button fill |
| **Brand Teal / Primary Accent** | `--brand-teal` / `--text-accent` | `#22D3EE` (Cyan 400) | Luminous clinical accent |
| **Subtle Tint Accent** | `--brand-soft-blue` | `rgba(6, 182, 212, 0.12)` | Subtle badge fill |
| **Subtle Border** | `--border-subtle` / `--border-card` | `#1E293B` (Slate 800) | 1px dark border divider |

### Clinical Status Diagnostic Colors

| Diagnostic Flag | Foreground (Text) | Background (Light) | Background (Dark) |
| :--- | :--- | :--- | :--- |
| **Normal / Optimal** | `#059669` (Emerald 600) / `#34D399` (Dark) | `#ECFDF5` (Emerald 50) | `rgba(16, 185, 129, 0.14)` |
| **Warning / Low / Review** | `#D97706` (Amber 600) / `#FBBF24` (Dark) | `#FFFBEB` (Amber 50) | `rgba(245, 158, 11, 0.14)` |
| **Critical / High** | `#DC2626` (Red 600) / `#F87171` (Dark) | `#FEF2F2` (Red 50) | `rgba(239, 68, 68, 0.14)` |
| **Clinical Note / Info** | `#2563EB` (Blue 600) / `#60A5FA` (Dark) | `#EFF6FF` (Blue 50) | `rgba(59, 130, 246, 0.14)` |

---

## 3. Typography Scale

* **Headings & Body:** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
* **Tabular & Numerals:** `'JetBrains Mono', ui-monospace, monospace`

| Level | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 28px (`text-2xl` / `text-3xl`) | 700 (Bold) | 1.2 | `-0.02em` | Main page hero titles |
| **Card / Section Header** | 18px (`text-lg`) | 600 (Semibold) | 1.3 | `-0.01em` | Panel titles, modal headers |
| **Subsection Header** | 15px (`text-base`) | 600 (Semibold) | 1.4 | `0` | Form section titles |
| **Body (Default)** | 14px (`text-sm`) | 400 (Regular) | 1.5 | `0` | Standard descriptions, paragraphs |
| **Caption / Metadata** | 12px (`text-xs`) | 500 (Medium) | 1.4 | `0` | Subtitles, footnotes, button labels |
| **Micro / Status Tag** | 11px (`text-[11px]`) | 600 (Semibold) | 1.3 | `0.02em` | Badges, status chips, table headers |
| **Tabular Numbers** | 12px–14px | 500 / 600 (Mono) | 1.0 | `0` | Biomarker values, dates, UUIDs |

---

## 4. Spacing Scale

* **4px Base Rhythm:**
  * `space-1` (4px): Micro-gaps between icons and text
  * `space-2` (8px): Button internal icon gaps, tight list spacing
  * `space-3` (12px): Form input padding, small card internal spacing
  * `space-4` (16px): Card internal padding, grid gutters
  * `space-6` (24px): Section separation, hero container padding
  * `space-8` (32px): Major page module gap

---

## 5. Border Radius System

* **`--radius-xs` (4px):** Code snippets, micro-tags, tooltips.
* **`--radius-sm` (6px):** Table row status chips, inline badges.
* **`--radius-md` (8px):** Buttons, form inputs, select dropdowns, menu items.
* **`--radius-lg` (12px):** Standard data cards, metric widgets, table containers.
* **`--radius-xl` (16px):** Page hero banners, modal dialogs, large summary cards.
* **`--radius-full` (9999px):** Avatar badges, pill toggle controls.

---

## 6. Elevation & Shadows

* **`--shadow-card`:** `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)` (Crisp surface boundary).
* **`--shadow-hover`:** `0 4px 12px -2px rgba(15, 23, 42, 0.08)` (Interactive card hover).
* **`--shadow-modal`:** `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` (Modals & popovers).

---

## 7. Component Guidelines

* **Buttons:**
  * Primary: High-contrast Slate Navy (`--brand-primary`), white text, 8px radius, height 40px, subtle transform `scale(1.01)` on hover.
  * Secondary / Outline: 1px `--border-subtle` border, subtle background, 8px radius.
* **Tables:**
  * Clean 1px horizontal borders, sticky headers with `--bg-secondary`, tabular monospace numbers for all metrics.
* **Badges & Status Tags:**
  * Less pill-shaped (`radius-sm` / 4px–6px), clear semantic diagnostic colors with WCAG compliant text contrast.
* **Navigation:**
  * Unified top brand & navigation bar with integrated User Profile dropdown and Hospital Scope selector, maximizing full canvas width for medical tables and charts.
