# GenHealth AI — Design System Documentation
**Style Direction:** Clean Medical Precision / Modern Clinical Minimal (Clinical Evergreen Palette)  
**Product:** GenHealth AI — Clinical AI & Health Intelligence Platform  
**Target Users:** Patients, Doctors, Clinical Providers & Hospitals  
**Core Aesthetic:** Trustworthy, calm, medically credible, uncluttered, technologically advanced.

---

## 1. Design Principles

1. **Signal-to-Noise Priority:** Clinical data is life-critical. Minimize decorative noise (no arbitrary corner blobs, excessive glassmorphism, or cartoonish illustrations).
2. **Disciplined Geometry:** Precise, modern radii (8px–16px) instead of bloated pill shapes and inflated 28px corners.
3. **High-Legibility Medical Contrast:** Deep evergreen charcoal (`#11231E`) on warm stone white surfaces (Light: 15.4:1 contrast ratio) and luminous white (`#ECF2EE`) on deep spruce surfaces (Dark: 14.2:1 contrast ratio) meeting WCAG AAA standard.
4. **Purpose-Driven Status Encoding:** Color is used exclusively for actionable clinical flags (Deep Green/Sage for Normal, Amber for Low/Warning, Crimson for High/Critical, Blue for Informational).
5. **Tabular Precision:** JetBrains Mono font for biomarker readings, reference intervals, LOINC codes, and UUID anchors.

---

## 2. Color System

### Light Mode (`:root`)

| Role | Token | Hex / Value | Semantic Purpose / Contrast Ratio |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` / `--bg-primary` | `#F5F7F5` (Warm Neutral) | High-comfort neutral page background |
| **Secondary Surface** | `--bg-secondary` / `--bg-subtle` | `#EDF1ED` (Muted Sage) | Inset panels, table headers, filter bars |
| **Surface / Card** | `--bg-surface` / `--bg-card` | `#FFFFFF` (Pure White) | Card surfaces, modal sheets, tables |
| **Hover Surface** | `--bg-card-hover` | `#F8FAF8` | Interactive card hover state |
| **Input Background** | `--bg-input` | `#FFFFFF` | Form inputs, search fields |
| **Text Primary** | `--text-primary` | `#11231E` (Evergreen Charcoal) | High-contrast headings and body text (**15.4:1, WCAG AAA**) |
| **Text Secondary** | `--text-secondary` | `#334740` (Forest Muted) | Metadata, descriptions, subtitle copy (**8.2:1, WCAG AAA**) |
| **Text Muted** | `--text-muted` | `#586D66` (Sage Muted) | Table headers, timestamps, subtle labels (**4.8:1, WCAG AA**) |
| **Brand Primary Action** | `--brand-primary` | `#0D5446` (Deep Evergreen) | High-authority primary button fill (**8.6:1 contrast**) |
| **Brand Primary Hover** | `--brand-primary-hover` | `#0A4337` (Deep Pine) | Active and hover button state |
| **Brand Accent** | `--brand-teal` / `--text-accent` | `#1D7A68` (Forest Teal) | Clinical active links, brand highlights |
| **Subtle Tint Accent** | `--brand-soft-blue` | `#E3EFE9` (Clinical Sage) | Badge backgrounds, accent highlight chips |
| **Subtle Border** | `--border-subtle` / `--border-card` | `#D6DDD6` / `#D0D9D0` | 1px clean container and cell dividers |
| **Focus Ring** | `--border-focus` | `#1D7A68` | Accessible focus outline |

### Dark Mode (`[data-theme="dark"]`, `.dark`)

| Role | Token | Hex / Value | Semantic Purpose / Contrast Ratio |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` / `--bg-primary` | `#0E1412` (Deep Spruce Black) | Eye-strain reducing deep background |
| **Secondary Surface** | `--bg-secondary` / `--bg-subtle` | `#1A2421` (Deep Spruce) | Inset panels, table headers |
| **Surface / Card** | `--bg-surface` / `--bg-card` | `#141C19` (Elevated Spruce) | Card surfaces, modal sheets |
| **Hover Surface** | `--bg-card-hover` | `#192420` | Interactive card hover state |
| **Input Background** | `--bg-input` | `#0F1714` (Deep Charcoal) | Form inputs |
| **Text Primary** | `--text-primary` | `#ECF2EE` (Luminous White) | High-contrast readable text (**14.2:1, WCAG AAA**) |
| **Text Secondary** | `--text-secondary` | `#B2C2B8` (Soft Sage) | Subtitles, labels (**7.6:1, WCAG AAA**) |
| **Text Muted** | `--text-muted` | `#7C9184` (Spruce Muted) | Table headers, timestamps (**4.6:1, WCAG AA**) |
| **Brand Primary Action** | `--brand-primary` | `#227D6B` (Luminous Evergreen) | Dark mode button fill |
| **Brand Primary Hover** | `--brand-primary-hover` | `#2A947F` (Hover Jade) | Hover state for dark mode buttons |
| **Brand Accent** | `--brand-teal` / `--text-accent` | `#3BB298` (Luminous Jade) | Luminous clinical accent and indicators |
| **Subtle Tint Accent** | `--brand-soft-blue` | `#1A332B` (Dark Spruce Tint) | Subtle badge fill |
| **Subtle Border** | `--border-subtle` / `--border-card` | `#23312B` / `#2A3B34` | 1px dark spruce border dividers |

### Clinical Status Diagnostic Colors

| Diagnostic Flag | Foreground (Text) | Background (Light) | Background (Dark) |
| :--- | :--- | :--- | :--- |
| **Normal / Optimal** | `#0D5446` (Light) / `#4ADE80` (Dark) | `#E3EFE9` (Sage 50) | `rgba(74, 222, 128, 0.12)` |
| **Warning / Low / Review** | `#92400E` (Light) / `#FBBF24` (Dark) | `#FEF3C7` (Amber 50) | `rgba(251, 191, 36, 0.12)` |
| **Critical / High** | `#991B1B` (Light) / `#F87171` (Dark) | `#FEE2E2` (Red 50) | `rgba(248, 113, 113, 0.12)` |
| **Clinical Note / Info** | `#1E40AF` (Light) / `#60A5FA` (Dark) | `#EFF6FF` (Blue 50) | `rgba(96, 165, 250, 0.12)` |

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
* **`--radius-md` (8px):** Form inputs, standard buttons, dropdown menus.
* **`--radius-lg` (12px):** Metric preview boxes, list containers, sub-panels.
* **`--radius-xl` (16px):** Main cards, upload drop zones, modal dialogs.
* **`--radius-full` (9999px):** Status dots, avatar circles.

---

## 6. Global Reusable UI Primitives (`src/components/ui/`)

1. `<Button variant="primary | secondary | outline | ghost | danger | teal" size="sm | md | lg" />`
2. `<Badge status="normal | warning | critical | info | neutral | purple | teal" size="sm | md" dot={boolean} />`
3. `<Card radius="md | lg | xl" interactive={boolean}> <CardHeader> <CardTitle> <CardDescription> <CardContent> <CardFooter> </Card>`
4. `<FormField label="..." required error="..." helperText="..."> <Input /> | <Select /> </FormField>`
5. `<Modal isOpen={boolean} onClose={fn} title="..." subtitle="..." icon={...} footer={...}>`
6. `<EmptyState icon={...} title="..." description="..." action={<Button />} />`
