import fs from "node:fs/promises"
import path from "node:path"

const projectRoot = process.cwd()
const repoRoot = path.resolve(projectRoot, "..")
const stitchRoot = path.join(repoRoot, "stitch")
const appRoot = path.join(projectRoot, "app")
const componentsRoot = path.join(projectRoot, "components", "stitch")
const staticDataRoot = path.join(projectRoot, "static-data")
const libRoot = path.join(projectRoot, "lib")

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])

const BOOLEAN_ATTRIBUTES = new Set([
  "checked",
  "defaultChecked",
  "disabled",
  "hidden",
  "multiple",
  "readOnly",
  "required",
  "selected",
])

const NUMERIC_ATTRIBUTES = new Set(["rows", "cols", "rowSpan", "colSpan", "tabIndex"])

const ATTRIBUTE_NAME_MAP = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  autocomplete: "autoComplete",
  srcset: "srcSet",
  colspan: "colSpan",
  rowspan: "rowSpan",
  cellspacing: "cellSpacing",
  cellpadding: "cellPadding",
  crossorigin: "crossOrigin",
  referrerpolicy: "referrerPolicy",
  fetchpriority: "fetchPriority",
  enterkeyhint: "enterKeyHint",
  inputmode: "inputMode",
}

const PAGE_CONFIG = [
  {
    id: "public-agency-homepage",
    sourceFolder: "public_agency_homepage_seo_optimized",
    title: "EliteEstates | Premium Real Estate Services",
    description:
      "Luxury real estate agency homepage with featured listings, neighborhood spotlights, expert agents, and market insights.",
    route: { type: "root", routePath: "/" },
  },
  {
    id: "public-property-detail",
    sourceFolder: "public_property_detail_view",
    title: "1242 Oakwood Terrace | EstateBlue Luxury Realty",
    description:
      "Luxury property detail page with gallery, amenities, neighborhood insight, and mortgage calculator sections.",
    route: {
      type: "property-detail",
      routePath: "/properties/1242-oakwood-terrace",
      slug: "1242-oakwood-terrace",
    },
  },
  {
    id: "advanced-property-search",
    sourceFolder: "advanced_property_search_full_grid_view",
    title: "Property Search & Listings - EstateAgency",
    description: "Advanced property search page with filters, listing cards, and search-driven browsing.",
    route: { type: "static", routePath: "/property-search" },
  },
  {
    id: "seller-list-your-property",
    sourceFolder: "seller_list_your_property",
    title: "List Your Property | Elite Agency",
    description:
      "Seller submission page for listing a property with pricing details, image uploads, and contact information.",
    route: { type: "static", routePath: "/profile/seller/list-your-property" },
  },
  {
    id: "schedule-a-viewing",
    sourceFolder: "schedule_a_viewing",
    title: "Schedule a Viewing | Elite Agency",
    description:
      "Property viewing booking page with calendar selection, time slots, and contact form.",
    route: { type: "static", routePath: "/schedule-a-viewing" },
  },
  {
    id: "market-insights-blog",
    sourceFolder: "market_insights_blog",
    title: "Market Insights | EstateInsights",
    description:
      "Real estate market insights blog with featured analysis, editorial content, and category highlights.",
    route: { type: "static", routePath: "/market-insights" },
  },
  {
    id: "buyer-wishlist",
    sourceFolder: "buyer_my_wishlist",
    title: "Buyer Wishlist | Private Profile",
    description: "Saved properties dashboard for buyers with wishlist cards, pricing updates, and agent actions.",
    route: { type: "static", routePath: "/profile/buyer/wishlist" },
  },
  {
    id: "admin-dashboard",
    sourceFolder: "admin_dashboard_home",
    title: "Admin Dashboard | Estate Agency",
    description: "Administrative dashboard for agency performance, listings, leads, and internal metrics.",
    route: { type: "static", routePath: "/admin/dashboard" },
  },
  {
    id: "agency-settings",
    sourceFolder: "agency_settings_configuration",
    title: "Agency Settings Configuration | Admin Console",
    description:
      "Agency settings workspace for profile, communications, integrations, and user configuration.",
    route: { type: "static", routePath: "/admin/agency-settings" },
  },
  {
    id: "agent-team-management",
    sourceFolder: "agent_team_management",
    title: "Agent & Team Management | Admin Portal",
    description: "Admin portal for managing real estate agents, teams, roles, and operational performance.",
    route: { type: "static", routePath: "/admin/agent-team-management" },
  },
  {
    id: "deal-pipeline-reports",
    sourceFolder: "deal_pipeline_reports",
    title: "Agency Pro - Deal Pipeline & Analytics",
    description: "Pipeline reporting dashboard for deals, conversion stages, and brokerage analytics.",
    route: { type: "static", routePath: "/admin/deal-pipeline-reports" },
  },
  {
    id: "document-management-templates",
    sourceFolder: "document_management_templates",
    title: "Real Estate Agency Portal - Document Management",
    description: "Document management page for templates, folders, contracts, and administrative files.",
    route: { type: "static", routePath: "/admin/document-management" },
  },
  {
    id: "lead-crm-pipeline",
    sourceFolder: "lead_crm_pipeline",
    title: "CRM Lead Manager",
    description: "Lead CRM pipeline view for sales stages, qualification flow, and team follow-up activity.",
    route: { type: "static", routePath: "/admin/lead-crm-pipeline" },
  },
  {
    id: "marketing-tools-campaigns",
    sourceFolder: "marketing_tools_campaigns",
    title: "Marketing Tools - Real Estate Admin",
    description:
      "Marketing tools dashboard for campaigns, assets, templates, and promotional performance.",
    route: { type: "static", routePath: "/admin/marketing-tools-campaigns" },
  },
  {
    id: "property-management",
    sourceFolder: "property_management_1",
    title: "AgencyPro - Property Management",
    description: "Property management console for portfolio monitoring, status controls, and listing operations.",
    route: { type: "static", routePath: "/admin/property-management" },
  },
  {
    id: "reports-analytics-dashboard",
    sourceFolder: "reports_analytics_dashboard",
    title: "Reports Analytics Dashboard | Admin Console",
    description: "Analytics dashboard with agency KPIs, charts, performance tables, and reporting views.",
    route: { type: "static", routePath: "/admin/reports-analytics" },
  },
]

const MOJIBAKE_REPLACEMENTS = new Map([
  ["Â©", "©"],
  ["â€¢", "•"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€˜", "‘"],
  ["â€¦", "…"],
  ["Â", ""],
])

function toPascalCase(value) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
}

function toKebabCase(value) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toCamelCase(value) {
  const normalized = value.replace(/[:_-]+([a-zA-Z0-9])/g, (_, character) => character.toUpperCase())
  return normalized.charAt(0).toLowerCase() + normalized.slice(1)
}

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    copy: "©",
    bull: "•",
    mdash: "—",
    ndash: "–",
    hellip: "…",
  }

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    }

    return namedEntities[entity] ?? `&${entity};`
  })
}

function fixText(value) {
  let output = decodeHtmlEntities(value)

  for (const [from, to] of MOJIBAKE_REPLACEMENTS) {
    output = output.split(from).join(to)
  }

  return output
}

function normalizeTextNode(value) {
  const fixed = fixText(value)

  if (!/\S/.test(fixed)) {
    return null
  }

  const hasLeadingSpace = /^\s/.test(fixed)
  const hasTrailingSpace = /\s$/.test(fixed)
  const collapsed = fixed.replace(/\s+/g, " ").trim()

  if (!collapsed) {
    return null
  }

  return `${hasLeadingSpace ? " " : ""}${collapsed}${hasTrailingSpace ? " " : ""}`
}

function parseAttributes(rawAttributes) {
  const attributes = []
  let cursor = 0

  while (cursor < rawAttributes.length) {
    while (cursor < rawAttributes.length && /\s/.test(rawAttributes[cursor])) {
      cursor += 1
    }

    if (cursor >= rawAttributes.length) {
      break
    }

    let name = ""

    while (cursor < rawAttributes.length && !/[\s=>]/.test(rawAttributes[cursor])) {
      name += rawAttributes[cursor]
      cursor += 1
    }

    while (cursor < rawAttributes.length && /\s/.test(rawAttributes[cursor])) {
      cursor += 1
    }

    let value = null

    if (rawAttributes[cursor] === "=") {
      cursor += 1

      while (cursor < rawAttributes.length && /\s/.test(rawAttributes[cursor])) {
        cursor += 1
      }

      const quote = rawAttributes[cursor]

      if (quote === '"' || quote === "'") {
        cursor += 1
        let collectedValue = ""

        while (cursor < rawAttributes.length && rawAttributes[cursor] !== quote) {
          collectedValue += rawAttributes[cursor]
          cursor += 1
        }

        value = collectedValue
        cursor += 1
      } else {
        let collectedValue = ""

        while (cursor < rawAttributes.length && !/[\s>]/.test(rawAttributes[cursor])) {
          collectedValue += rawAttributes[cursor]
          cursor += 1
        }

        value = collectedValue
      }
    }

    if (name) {
      attributes.push({ name, value })
    }
  }

  return attributes
}

function parseOpeningTag(token) {
  const selfClosing = token.endsWith("/>")
  const innerToken = token.slice(1, token.length - (selfClosing ? 2 : 1)).trim()
  const firstSpaceIndex = innerToken.search(/\s/)
  const tagName = firstSpaceIndex === -1 ? innerToken : innerToken.slice(0, firstSpaceIndex)
  const rawAttributes = firstSpaceIndex === -1 ? "" : innerToken.slice(firstSpaceIndex + 1)

  return {
    tagName,
    attrs: parseAttributes(rawAttributes),
    selfClosing,
  }
}

function parseFragment(html) {
  const tokenPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+/g
  const tokens = [...html.matchAll(tokenPattern)].map((match) => match[0])
  const root = { type: "root", children: [] }
  const stack = [root]

  for (const token of tokens) {
    if (token.startsWith("<!--")) {
      continue
    }

    if (token.startsWith("</")) {
      stack.pop()
      continue
    }

    if (token.startsWith("<")) {
      const element = parseOpeningTag(token)
      const node = {
        type: "element",
        tagName: element.tagName,
        attrs: element.attrs,
        children: [],
      }

      stack.at(-1).children.push(node)

      if (!element.selfClosing && !VOID_TAGS.has(element.tagName.toLowerCase())) {
        stack.push(node)
      }

      continue
    }

    const normalizedText = normalizeTextNode(token)

    if (normalizedText) {
      stack.at(-1).children.push({ type: "text", value: normalizedText })
    }
  }

  return root.children
}

function getCommentLabel(commentToken) {
  return commentToken
    .replace(/^<!--/, "")
    .replace(/-->$/, "")
    .trim()
}

function splitTopLevelNodes(html) {
  const tokenPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+/g
  const tokens = [...html.matchAll(tokenPattern)].map((match) => match[0])
  const nodes = []
  let depth = 0
  let current = ""
  let pendingLabel = null
  let activeLabel = null

  for (const token of tokens) {
    if (depth === 0 && !current.trim() && token.startsWith("<!--")) {
      pendingLabel = getCommentLabel(token)
      continue
    }

    if (depth === 0 && !current.trim() && /\S/.test(token)) {
      activeLabel = pendingLabel
      pendingLabel = null
    }

    current += token

    if (token.startsWith("<!--")) {
      continue
    }

    if (token.startsWith("</")) {
      depth -= 1
    } else if (token.startsWith("<")) {
      const { tagName, selfClosing } = parseOpeningTag(token)
      if (!selfClosing && !VOID_TAGS.has(tagName.toLowerCase())) {
        depth += 1
      }
    }

    if (depth === 0 && current.trim()) {
      nodes.push({ label: activeLabel, html: current.trim() })
      current = ""
      activeLabel = null
    }
  }

  if (current.trim()) {
    nodes.push({ label: activeLabel, html: current.trim() })
  }

  return nodes
}

function parseSingleElement(html) {
  const openingTagMatch = html.match(/^<([A-Za-z][A-Za-z0-9-]*)([^>]*)>/)

  if (!openingTagMatch) {
    return null
  }

  const [openingTag, tagName, rawAttributes] = openingTagMatch
  const closingTag = `</${tagName}>`
  const closingIndex = html.lastIndexOf(closingTag)

  if (closingIndex === -1) {
    return null
  }

  return {
    tagName,
    attrs: parseAttributes(rawAttributes),
    innerHtml: html.slice(openingTag.length, closingIndex),
  }
}

function escapeJsxString(value) {
  return JSON.stringify(fixText(value))
}

function serializeStyle(styleValue) {
  const declarations = styleValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)

  if (!declarations.length) {
    return "{{}}"
  }

  const styleEntries = declarations.map((declaration) => {
    const separatorIndex = declaration.indexOf(":")
    const property = declaration.slice(0, separatorIndex).trim()
    const value = declaration.slice(separatorIndex + 1).trim()
    const propertyName = property.startsWith("--") ? JSON.stringify(property) : toCamelCase(property)
    return `${propertyName}: ${JSON.stringify(fixText(value))}`
  })

  return `{{ ${styleEntries.join(", ")} }}`
}

function normalizeAttributeName(tagName, attributeName) {
  const lowerAttributeName = attributeName.toLowerCase()

  if (lowerAttributeName === "value" && ["input", "select", "textarea"].includes(tagName)) {
    return "defaultValue"
  }

  if (lowerAttributeName === "checked" && tagName === "input") {
    return "defaultChecked"
  }

  if (lowerAttributeName === "class") {
    return "className"
  }

  if (ATTRIBUTE_NAME_MAP[lowerAttributeName]) {
    return ATTRIBUTE_NAME_MAP[lowerAttributeName]
  }

  if (attributeName.startsWith("data-") || attributeName.startsWith("aria-")) {
    return attributeName
  }

  if (attributeName.includes("-")) {
    return toCamelCase(attributeName)
  }

  return attributeName
}

function serializeAttribute(tagName, attribute) {
  const propName = normalizeAttributeName(tagName.toLowerCase(), attribute.name)

  if (attribute.value === null || (attribute.value === "" && BOOLEAN_ATTRIBUTES.has(propName))) {
    return BOOLEAN_ATTRIBUTES.has(propName) ? propName : `${propName}={true}`
  }

  if (attribute.name.toLowerCase() === "style") {
    return `style=${serializeStyle(attribute.value)}`
  }

  if (NUMERIC_ATTRIBUTES.has(propName) && /^-?\d+$/.test(attribute.value)) {
    return `${propName}={${Number.parseInt(attribute.value, 10)}}`
  }

  return `${propName}=${escapeJsxString(attribute.value)}`
}

function renderNode(node, indentLevel) {
  const indent = " ".repeat(indentLevel)

  if (node.type === "text") {
    return `${indent}{${JSON.stringify(node.value)}}`
  }

  const elementAttributes = [...node.attrs]

  if (node.tagName.toLowerCase() === "img" && !elementAttributes.some((attribute) => attribute.name.toLowerCase() === "alt")) {
    const dataAltAttribute = elementAttributes.find((attribute) => attribute.name.toLowerCase() === "data-alt")
    elementAttributes.unshift({ name: "alt", value: dataAltAttribute?.value ?? "" })
  }

  const serializedAttributes = elementAttributes.map((attribute) => serializeAttribute(node.tagName, attribute))
  const inlineAttributes = serializedAttributes.length === 0 ? "" : ` ${serializedAttributes.join(" ")}`
  const multilineAttributes =
    serializedAttributes.length <= 1
      ? null
      : serializedAttributes.map((attribute) => `${indent}  ${attribute}`).join("\n")

  if (!node.children.length && VOID_TAGS.has(node.tagName.toLowerCase())) {
    if (multilineAttributes) {
      return `${indent}<${node.tagName}\n${multilineAttributes}\n${indent}/>`
    }

    return `${indent}<${node.tagName}${inlineAttributes} />`
  }

  const renderedChildren = node.children.map((child) => renderNode(child, indentLevel + 2)).join("\n")

  if (multilineAttributes) {
    return `${indent}<${node.tagName}\n${multilineAttributes}\n${indent}>\n${renderedChildren}\n${indent}</${node.tagName}>`
  }

  return `${indent}<${node.tagName}${inlineAttributes}>\n${renderedChildren}\n${indent}</${node.tagName}>`
}

function buildJsxFromHtml(html) {
  const nodes = parseFragment(html)
  const renderedNodes = nodes.map((node) => renderNode(node, 4)).join("\n")

  if (nodes.length === 1) {
    return renderedNodes
  }

  return `    <>\n${renderedNodes}\n    </>`
}

function buildComponentSource(componentName, html) {
  const eslintDirective = html.includes("<img") ? "/* eslint-disable @next/next/no-img-element */\n\n" : ""
  return `${eslintDirective}export function ${componentName}() {\n  return (\n${buildJsxFromHtml(html)}\n  )\n}\n`
}

function buildPageSource(componentName, bodyAttributes, wrapper, sectionComponents) {
  const importLines = sectionComponents
    .map((section) => `import { ${section.componentName} } from "./sections/${section.fileSlug}"`)
    .join("\n")
  const bodyAttributeSource = bodyAttributes.length
    ? ` ${bodyAttributes.map((attribute) => serializeAttribute("div", attribute)).join(" ")}`
    : ""
  const wrapperAttributeSource = wrapper
    ? ` ${wrapper.attrs.map((attribute) => serializeAttribute(wrapper.tagName, attribute)).join(" ")}`
    : ""
  const sectionElements = sectionComponents.map((section) => `      <${section.componentName} />`).join("\n")

  if (wrapper) {
    return `${importLines}\n\nexport function ${componentName}() {\n  return (\n    <div${bodyAttributeSource}>\n      <${wrapper.tagName}${wrapperAttributeSource}>\n${sectionElements}\n      </${wrapper.tagName}>\n    </div>\n  )\n}\n`
  }

  return `${importLines}\n\nexport function ${componentName}() {\n  return (\n    <div${bodyAttributeSource}>\n${sectionElements}\n    </div>\n  )\n}\n`
}

function buildMetaSource(metaExportName, config) {
  const baseMeta = {
    id: config.id,
    title: config.title,
    description: config.description,
    routePath: config.route.routePath,
  }

  if (config.route.type === "property-detail") {
    baseMeta.slug = config.route.slug
  }

  return `export const ${metaExportName} = ${JSON.stringify(baseMeta, null, 2)} as const\n`
}

function buildStaticRouteSource(componentName, metaExportName, componentImportPath, metaImportPath) {
  return `import { ${componentName} } from "${componentImportPath}"\nimport { ${metaExportName} } from "${metaImportPath}"\nimport { buildPageMetadata } from "@/lib/build-page-metadata"\n\nexport const metadata = buildPageMetadata(${metaExportName})\n\nexport default function Page() {\n  return <${componentName} />\n}\n`
}

function buildPropertyRouteSource(componentName, metaExportName, componentImportPath, metaImportPath) {
  return `import { notFound } from "next/navigation"\n\nimport { ${componentName} } from "${componentImportPath}"\nimport { ${metaExportName} } from "${metaImportPath}"\nimport { buildPageMetadata } from "@/lib/build-page-metadata"\n\ntype PageProps = {\n  params: Promise<{ slug: string }>\n}\n\nexport function generateStaticParams() {\n  return [{ slug: ${metaExportName}.slug }]\n}\n\nexport async function generateMetadata({ params }: PageProps) {\n  const { slug } = await params\n\n  if (slug !== ${metaExportName}.slug) {\n    return {}\n  }\n\n  return buildPageMetadata(${metaExportName})\n}\n\nexport default async function Page({ params }: PageProps) {\n  const { slug } = await params\n\n  if (slug !== ${metaExportName}.slug) {\n    notFound()\n  }\n\n  return <${componentName} />\n}\n`
}

function buildMetadataHelperSource() {
  return `import type { Metadata } from "next"\n\ntype PageMeta = {\n  title: string\n  description: string\n  routePath: string\n}\n\nexport function buildPageMetadata(meta: PageMeta): Metadata {\n  return {\n    title: meta.title,\n    description: meta.description,\n    alternates: {\n      canonical: meta.routePath,\n    },\n    openGraph: {\n      title: meta.title,\n      description: meta.description,\n      url: meta.routePath,\n      type: "website",\n    },\n    twitter: {\n      card: "summary_large_image",\n      title: meta.title,\n      description: meta.description,\n    },\n  }\n}\n`
}

function buildRegistrySource(registryEntries) {
  return `export const pageRegistry = ${JSON.stringify(registryEntries, null, 2)} as const\n`
}

function uniqueSectionDefinitions(chunks) {
  const usedSlugs = new Set()

  return chunks.map((chunk, index) => {
    const rawLabel = chunk.label || `section-${index + 1}`
    let fileSlug = toKebabCase(rawLabel) || `section-${String(index + 1).padStart(2, "0")}`

    if (usedSlugs.has(fileSlug)) {
      fileSlug = `${fileSlug}-${String(index + 1).padStart(2, "0")}`
    }

    usedSlugs.add(fileSlug)

    const baseComponentName = (toPascalCase(rawLabel || `section ${index + 1}`) || `Section${String(index + 1).padStart(2, "0")}`).replace(/Section$/, "")

    return {
      ...chunk,
      fileSlug,
      componentName: `${baseComponentName}Section`,
    }
  })
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true })
}

async function writeFile(filePath, content) {
  await ensureDirectory(path.dirname(filePath))
  await fs.writeFile(filePath, content)
}

async function removePath(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true })
}

async function extractPageStructure(sourceFolder) {
  const sourceFile = path.join(stitchRoot, sourceFolder, "code.html")
  const html = await fs.readFile(sourceFile, "utf8")
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i)

  if (!bodyMatch) {
    throw new Error(`Missing body in ${sourceFolder}`)
  }

  const bodyAttributes = parseAttributes(bodyMatch[1])
  const bodyNodes = splitTopLevelNodes(bodyMatch[2].trim())

  let wrapper = null
  let chunks = bodyNodes

  if (bodyNodes.length === 1) {
    const parsedWrapper = parseSingleElement(bodyNodes[0].html)

    if (parsedWrapper) {
      const wrapperChildren = splitTopLevelNodes(parsedWrapper.innerHtml)

      if (wrapperChildren.length > 1) {
        wrapper = {
          tagName: parsedWrapper.tagName,
          attrs: parsedWrapper.attrs,
        }
        chunks = wrapperChildren
      }
    }
  }

  return {
    bodyAttributes,
    wrapper,
    chunks,
  }
}

async function generatePage(config) {
  const componentName = `${toPascalCase(config.id)}Page`
  const metaExportName = `${toCamelCase(config.id)}PageMeta`
  const componentDirectory = path.join(componentsRoot, "pages", config.id)
  const sectionsDirectory = path.join(componentDirectory, "sections")
  const staticPageDirectory = path.join(staticDataRoot, "pages", config.id)
  const pageStructure = await extractPageStructure(config.sourceFolder)
  const sections = uniqueSectionDefinitions(pageStructure.chunks)

  for (const section of sections) {
    await writeFile(
      path.join(sectionsDirectory, `${section.fileSlug}.tsx`),
      buildComponentSource(section.componentName, section.html),
    )
  }

  const sectionsIndexSource = sections
    .map((section) => `export { ${section.componentName} } from "./${section.fileSlug}"`)
    .join("\n")
  await writeFile(path.join(sectionsDirectory, "index.ts"), `${sectionsIndexSource}\n`)

  await writeFile(
    path.join(componentDirectory, "page.tsx"),
    buildPageSource(componentName, pageStructure.bodyAttributes, pageStructure.wrapper, sections),
  )

  await writeFile(path.join(staticPageDirectory, "meta.ts"), buildMetaSource(metaExportName, config))

  const componentImportPath = `@/components/stitch/pages/${config.id}/page`
  const metaImportPath = `@/static-data/pages/${config.id}/meta`

  if (config.route.type === "root") {
    await writeFile(
      path.join(appRoot, "page.tsx"),
      buildStaticRouteSource(componentName, metaExportName, componentImportPath, metaImportPath),
    )
  } else if (config.route.type === "property-detail") {
    await writeFile(
      path.join(appRoot, "properties", "[slug]", "page.tsx"),
      buildPropertyRouteSource(componentName, metaExportName, componentImportPath, metaImportPath),
    )
  } else {
    const routeSegments = config.route.routePath.split("/").filter(Boolean)
    await writeFile(
      path.join(appRoot, ...routeSegments, "page.tsx"),
      buildStaticRouteSource(componentName, metaExportName, componentImportPath, metaImportPath),
    )
  }

  return {
    id: config.id,
    routePath: config.route.routePath,
    componentName,
    metaExportName,
  }
}

async function main() {
  await Promise.all([
    removePath(componentsRoot),
    removePath(path.join(staticDataRoot, "pages")),
    removePath(path.join(appRoot, "admin")),
    removePath(path.join(appRoot, "profile")),
    removePath(path.join(appRoot, "market-insights")),
    removePath(path.join(appRoot, "property-search")),
    removePath(path.join(appRoot, "buyer-wishlist")),
    removePath(path.join(appRoot, "sell-your-property")),
    removePath(path.join(appRoot, "schedule-a-viewing")),
    removePath(path.join(appRoot, "properties")),
    removePath(path.join(libRoot, "stitch")),
    removePath(path.join(staticDataRoot, "stitch-pages-manifest.json")),
    removePath(path.join(projectRoot, ".next")),
  ])

  await writeFile(path.join(libRoot, "build-page-metadata.ts"), buildMetadataHelperSource())

  const registryEntries = []

  for (const config of PAGE_CONFIG) {
    registryEntries.push(await generatePage(config))
  }

  await writeFile(path.join(staticDataRoot, "pages", "registry.ts"), buildRegistrySource(registryEntries))
}

await main()


