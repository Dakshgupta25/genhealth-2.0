# GenHealth AI — Modern Nordic Ergonomic Design System
**Style Direction:** Modern Nordic Ergonomic (Maritime Slate & Juniper Palette)  
**Product:** GenHealth AI — Clinical AI & Health Intelligence Platform  
**Audiences:** Patients (Stress-reducing, calming health records) & Physicians (High-throughput diagnostic lookup)  
**Core Aesthetic:** Dignified, calm, human-scale clinical clarity, tonal surfaces, and zero decorative noise.

---

## 1. Design Philosophy

1. **Human-Scale Reassurance for Patients:** Lab results (especially abnormal ones) carry emotional cognitive weight. The patient experience prioritizes unhurried typography, natural mineral tones, and clear summaries.
2. **High-Throughput Diagnostic Density for Doctors:** The Doctor Portal provides a dense, information-forward working mode with compact table rows, instant pathology filters, and multi-biomarker longitudinal curves without breaking the visual language.
3. **Deep Desaturated Juniper Anchor:** Anchored by `#1E4D45` (light) / `#336E63` (dark)—authoritative, grounded, and clinical without being synthetic, cold, or minty.
4. **Tonal Surfaces Over Muddy Shadows:** Uses subtle substrate shifts (warm maritime mist `#F4F6F5` to crisp card surface `#FFFFFF`) and 1px hairline borders (`#CBD6D2` / `#2F433E`) rather than heavy blurred drop shadows.
5. **High-Margin WCAG AAA/AA Contrast:** All text tokens strictly exceed contrast floors (Normal body > 7.5:1 AAA, Muted metadata > 5.7:1 AA safety margin).

---

## 2. Color System & Contrast Ratios

### Light Mode (`:root` / `[data-theme="light"]`)

| Role | Token | Hex Value | Contrast vs Surface / Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` | `#F4F6F5` | Warm maritime mist canvas |
| **Surface / Card** | `--bg-surface` | `#FFFFFF` | Crisp White card surface |
| **Raised Container** | `--bg-surface-raised` | `#EBF0EE` | Table headers, secondary toolbars |
| **Inset Input Well** | `--bg-surface-inset` | `#E2E9E6` | Input fields, code wells |
| **Text Primary** | `--text-primary` | `#13221F` | Deep charcoal juniper (**15.8:1, WCAG AAA**) |
| **Text Secondary** | `--text-secondary` | `#3D524E` | Muted clinical slate (**7.9:1, WCAG AAA**) |
| **Text Muted** | `--text-muted` | `#4E6863` | Timestamps, units, metadata (**5.88:1, Safe AA**) |
| **Primary Action** | `--primary-default` | `#1E4D45` | Deep Nordic Juniper button fill (**9.2:1 contrast**) |
| **Primary Hover** | `--primary-hover` | `#163E37` | Hover deep pine state |
| **Subtle Tint Accent** | `--primary-subtle` | `#E5EFEA` | Selected tab/filter pill fill |
| **Subtle Border** | `--border-subtle` | `#E0E7E4` | Internal card and table dividers |
| **Default Border** | `--border-default` | `#CBD6D2` | Standard card and form borders |

### Dark Mode (`[data-theme="dark"]`, `.dark`)

| Role | Token | Hex Value | Contrast vs Surface / Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` | `#0E1413` | Deep obsidian maritime charcoal canvas |
| **Surface / Card** | `--bg-surface` | `#151E1C` | Elevated Nordic charcoal surface |
| **Raised Container** | `--bg-surface-raised` | `#1C2725` | Table headers, secondary toolbars |
| **Inset Input Well** | `--bg-surface-inset` | `#23322E` | Input fields, code wells |
| **Text Primary** | `--text-primary` | `#EFF5F3` | Luminous soft white (**15.2:1, WCAG AAA**) |
| **Text Secondary** | `--text-secondary` | `#A0B6B0` | Soft sage slate (**8.1:1, WCAG AAA**) |
| **Text Muted** | `--text-muted` | `#7E9993` | Timestamps, units, metadata (**5.70:1, Safe AA**) |
| **Primary Action** | `--primary-default` | `#336E63` | Calibrated Luminous Juniper (**5.7:1 contrast**) |
| **Primary Hover** | `--primary-hover` | `#3F8477` | Hover luminous state |
| **Subtle Tint Accent** | `--primary-subtle` | `#1A2C28` | Selected tab/filter pill fill |
| **Subtle Border** | `--border-subtle` | `#22312E` | Internal card and table dividers |
| **Default Border** | `--border-default` | `#2F433E` | Standard card and form borders |

---

## 3. Grounded Mineral Status System

| Diagnostic Status | Light Mode (Text / Bg / Border) | Dark Mode (Text / Bg / Border) | Usage |
| :--- | :--- | :--- | :--- |
| **Normal / Optimal** | `#18573D` / `#F0F8F4` / `#C8E6D6` (7.4:1 AAA) | `#57BA8E` / `#11251B` / `#224D37` (7.2:1 AAA) | In-range biomarkers, completed extractions |
| **Warning / Low / Review** | `#8F5708` / `#FEF7EB` / `#F6DCB1` (5.9:1 AA) | `#E6A84F` / `#2B1F0E` / `#573E1B` (7.7:1 AAA) | Borderline measurements, unreviewed items |
| **Critical / High** | `#942728` / `#FDF0F0` / `#F6C4C5` (7.9:1 AAA) | `#E57373` / `#2D1616` / `#5B292A` (5.4:1 AA) | Out-of-range clinical flags, delete actions |
| **Clinical Info / Note** | `#1E4E6B` / `#F0F6FA` / `#C3DCEB` (7.5:1 AAA) | `#5FA9D6` / `#13232E` / `#25455B` (7.2:1 AAA) | AI extraction notes, category labels |

---

## 4. Typography Scale

* **Headings & Body:** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
* **Tabular Numbers & Units:** `'JetBrains Mono', ui-monospace, monospace`

| Token | Size | Weight | Line Height | Application |
| :--- | :--- | :--- | :--- | :--- |
| `--text-2xs` | 11px | 600 | 1.3 | Micro-badges, table headers |
| `--text-xs` | 12px | 400 / 500 | 1.4 | Timestamps, form helper text |
| `--text-sm` | 14px | 400 / 500 | 1.45 | Form labels, table cells |
| `--text-base` | 15px | 400 / 500 | 1.5 | Default body copy, descriptions |
| `--text-lg` | 18px | 600 / 700 | 1.4 | Card titles, section headers |
| `--text-xl` | 22px | 700 | 1.35 | Major module titles |
| `--text-2xl` | 28px | 700 | 1.25 | Main page hero titles |

---

## 5. Geometry, Radius & Density Modes

* **Corner Radii:**
  * `--radius-xs` (4px): Micro tags, indicator dots
  * `--radius-sm` (6px): Segment controls, table inputs
  * `--radius-md` (9px): Standard action buttons, form inputs
  * `--radius-lg` (14px): Standard cards, panels, modals
  * `--radius-xl` (18px): Hero containers, upload dropzone
  * `--radius-full` (9999px): Status pills, avatar circles

* **Density Calibration:**
  * **Patient Mode (`density="spacious"`):** Generous 20px–24px padding, 44px table rows, conversational helper labels.
  * **Doctor Mode (`density="compact"`):** Compact 14px padding, 32px table rows, high-throughput search and filtering.

---

## 6. Shared UI Primitives (`src/components/ui/`)

1. `<Button variant="primary | secondary | outline | ghost | danger | dangerSubtle" size="sm | md | lg" />`
2. `<Badge status="normal | warning | critical | info | neutral | purple | juniper" size="sm | md" dot={boolean} />`
3. `<Card radius="sm | md | lg | xl" interactive={boolean}> <CardHeader density="..."> <CardTitle> <CardDescription> <CardContent> <CardFooter> </Card>`
4. `<FormField label="..." required error="..." helperText="..."> <Input density="..." /> | <Select density="..." /> </FormField>`
5. `<Modal isOpen={boolean} onClose={fn} title="..." subtitle="..." icon={...} footer={...}>`
6. `<EmptyState icon={...} title="..." description="..." action={<Button />} />`
