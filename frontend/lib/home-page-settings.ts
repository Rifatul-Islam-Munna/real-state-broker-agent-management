import type { HomePageSettings } from "@/@types/real-estate-api"

export const defaultHomePageSettings: HomePageSettings = {
  hero: {
    headline: "Your Vision. Our Expertise.",
    highlightedHeadline: "Exceptional Results.",
    description:
      "Discover a new level of real estate excellence with personalized service and market-leading insights.",
    backgroundImage: {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCNzyh5mt5knkbR3OCn2xCpbUmNOq2pGyTdwYKMzAj70mI62TdwalfugFIumWCtRPu1VcMVKavr6TsX3BP9lgHwHBq-xhF-VnEFTDtMtQJ-wrvaOG6gXu0BlNF1EQnKMK69jCZMXYqKgMz4OlmOlrfDLbMLaDMKJS1Ee_Ucwy8be2XaIbNp3LF1N0_oHsqPEm9bvzeAlhVo7ySGdd4IhWNhurSiZxafHVQEkQhoby-KWNBJ72WRT5PUMOQRTj8IONpCs8zbHzfXMds",
      objectName: null,
    },
    buyMode: {
      tabLabel: "Buy",
      inputPlaceholder: "Neighborhood, City, or Zip...",
      selectLabel: "Property Type",
      ctaLabel: "Search Now",
    },
    rentMode: {
      tabLabel: "Rent",
      inputPlaceholder: "City, building, or Zip...",
      selectLabel: "Rental Type",
      ctaLabel: "Browse Rentals",
    },
    sellMode: {
      tabLabel: "Sell",
      inputPlaceholder: "Enter your property address...",
      selectLabel: "Property Category",
      ctaLabel: "List Your Property",
    },
  },
  featuredListings: {
    eyebrow: "Exclusives",
    title: "Featured Listings",
  },
  whyChooseUs: {
    eyebrow: "Why EliteEstates",
    title: "Elevating the Real Estate Experience Since 1998",
    description:
      "We don't just sell properties; we facilitate transitions into your future. Our commitment to transparency, local expertise, and innovative marketing sets us apart in a crowded market.",
    features: [
      {
        title: "Certified Agents",
        description: "Expert guidance you can rely on.",
      },
      {
        title: "Market Insights",
        description: "Data-driven valuation models.",
      },
    ],
    stats: [
      {
        value: "25+",
        label: "Years Experience",
      },
      {
        value: "12k",
        label: "Properties Sold",
      },
    ],
    primaryImage: {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAzfTEUH3HlsLSxWKT-Tpv7iDN8YMHRtogYjQi3GEn_U210Dk0qVGRG55NDvfR3GDGnFVfKlb4tLLBsMhJ08A8Sm7EMo8ukgFd3gUH7CYyut3fmRTl2S6t3gDTzm4u5oRfxg0mmVY27gAvBkbzkqKTqc74kVnVbwvy44mUuvPPTxMqin5-5hxoid8k4GRgIxn_VYmobQTqHObf-Os7SUJ3DxOrqil5ptmYRBVKwLl-8heJd-ZrHQZtIbWQAVB7SEMG8jWQv7HNQmUc",
      objectName: null,
    },
    secondaryImage: {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBnbKru90O2oNx5V3wCiUt1M6BHkl-dZyTe-7-enNpiiv7VrJa46KmvT7ip5YJKVur4LPJhec18E_YiJAPjByspR7IXiYwmwdzBTv9b11BQG3pGU4q_Ioid_aNr5-W4b3yZaonNPHp8ZNTNrErNWy3kQWHgdQewJQLFpwBX791QR92xJX8U81x3p5ixVbWLV5rhOc9zWAEJYvvH_Aze7PedIvA1AeHbfwpQROPcozE9RXlIcY6FQavC5-vYF0dDZgkndSq4_vAxwYU",
      objectName: null,
    },
  },
  neighborhoods: {
    eyebrow: "Explore Locations",
    title: "Neighborhoods",
    cards: [
      {
        name: "Manhattan",
        propertyCountLabel: "128 Properties",
        image: {
          url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBEonAYkkDmRGEJuiPKtzykkUkI5O5uvZuqdE1cTJjHcwcUrI0EARPz214n_GELr2rso7Np2WlLkMKpC533zIZyDM8y1736ysixmv4-Eq0Fkcfkp5_I9UVgCaakla_g6CUibDpVWuDclDSB7AbCZCyzPWf97ci3ZRMI7INq91dY36DIv9HPE9Mlst5BWdDrTxZPabpoas66Wlx4muA1fddITGV2xtadWeDIxZLaqhE7CwX8Zff4ZdjOI9aDqZ19S1UscYyVmUnZxv4",
          objectName: null,
        },
      },
      {
        name: "Miami",
        propertyCountLabel: "84 Properties",
        image: {
          url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBedpJALeAHp8oJ_BmZArlxqQUMAjFk3GX8N_7ymJy8IhMJe3Wbe7WSaZ6zhjdEBvMtZ7fsFBvr2o2u1VRYOhnyFyLV782DTgisAHbEr6tHb78UEgvBI7f_5xwhR4Dhaja6LFo8I3KmTAXYQ2UbH6dITigsdYhuGe-exF57ta1xt2NydAn9x5FqUEvjExdXVCfIuRcMLGCyuJVWotMxesz9e760QHH7ss_idZTaiN04iY8ubzKRwaygxu9ALLqGr6S9hEfB0pUjAog",
          objectName: null,
        },
      },
      {
        name: "Paris",
        propertyCountLabel: "56 Properties",
        image: {
          url: "https://lh3.googleusercontent.com/aida-public/AB6AXuC2kUSdCI5KOcLisevu3RD4r75c9DfCJPIyYqdroMbPA0msF9aXA5ubZdAY3LHRsx-RhoAK2Acz6tp1fDEgi_-xoxoyap_-hyHpARL07BuE1kQpD1cqfMLzPCQOCwxmUF8Z9ocU8orGX35fMEzBfhNpkecOCc_l90WuzimYnaH-BhfDSKPEcogYwBaCovPahqvikGj7ocIcZ0D1_DKUBH2UbUgvau7dkbhSOSsLO3xKfEmERwRgab4lS8jAziUDc8_0XVlPYZX9xPE",
          objectName: null,
        },
      },
      {
        name: "San Francisco",
        propertyCountLabel: "92 Properties",
        image: {
          url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKiV0_rXseU-gnE0vvyx4ty_nrOHUQu_XlT5DgY4tSDhKHbCK4UzjHkGFjtSzz2gQ66MwtX2pE4Z7l7PbhaJTKI17nx40a64l4pTUDCEDna6ds6uMtTG8wkmrEqv_6eUIINzBkm-BqueSbhwx87bINsuly-6NnfcvVnvUFDEKWpH-3aCM-1IHmMDQTq2tpGEqmWxb_Oelx1T3kDHA3PKMNK4WRcwjaXBZo8SWiQXfotnkhTDhPJCCLgBPXmqEhZUq2hmjX6OXyi0w",
          objectName: null,
        },
      },
    ],
  },
  services: [
    {
      title: "Property Valuation",
      description:
        "Receive a comprehensive market analysis and pinpoint accuracy for your property's value.",
      linkLabel: "Learn More",
    },
    {
      title: "Consulting",
      description:
        "Expert advisory for investment portfolios, residential acquisitions, and commercial projects.",
      linkLabel: "Learn More",
    },
    {
      title: "Asset Management",
      description:
        "Full-cycle property management focused on maximizing yield and tenant satisfaction.",
      linkLabel: "Learn More",
    },
  ],
  team: {
    eyebrow: "Our Professionals",
    title: "Meet Our Expert Team",
    buttonLabel: "View All Agents",
  },
  testimonial: {
    quote:
      "\"Working with EliteEstates was a seamless experience. Their attention to detail and knowledge of the market enabled us to find our dream home in less than three weeks. Truly professional.\"",
    name: "Jonathan Richards",
    role: "New Home Owner, Malibu",
    avatarImage: {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_aOT2jVaXNwSoeNzfL0WBIyo6No5zDE3lkpCeWtiy0YJlHYRlee9Y9PCWuTFQmw9-gz2MfchLZT89plYs-OMenN2QETPOwfF61fw0NH-SjW3KPZFHmBJJNi1vD9nkFoBfSY2JigvpV1ADtP62Ly4-ceJGyR_7jqFESGMTHvKdk0-E_YL47jfVDpLCgT-NaTany1ZONypLr_Bq0Ayi67S4wm8knrTZKdqjirNLlSuo1Gy9Jr-GqmL9cLBqfO66r175cIa4Axq3zB4",
      objectName: null,
    },
  },
  blog: {
    eyebrow: "Knowledge Base",
    title: "Market Insights & News",
    buttonLabel: "View All Articles",
  },
  updatedAt: "",
}

export function cloneHomePageSettings(settings: HomePageSettings) {
  return {
    hero: {
      backgroundImage: {
        objectName: settings.hero.backgroundImage.objectName ?? null,
        url: settings.hero.backgroundImage.url,
      },
      buyMode: { ...settings.hero.buyMode },
      description: settings.hero.description,
      headline: settings.hero.headline,
      highlightedHeadline: settings.hero.highlightedHeadline,
      rentMode: { ...settings.hero.rentMode },
      sellMode: { ...settings.hero.sellMode },
    },
    featuredListings: { ...settings.featuredListings },
    neighborhoods: {
      cards: settings.neighborhoods.cards.map((card) => ({
        image: {
          objectName: card.image.objectName ?? null,
          url: card.image.url,
        },
        name: card.name,
        propertyCountLabel: card.propertyCountLabel,
      })),
      eyebrow: settings.neighborhoods.eyebrow,
      title: settings.neighborhoods.title,
    },
    services: settings.services.map((item) => ({ ...item })),
    team: { ...settings.team },
    testimonial: {
      avatarImage: {
        objectName: settings.testimonial.avatarImage.objectName ?? null,
        url: settings.testimonial.avatarImage.url,
      },
      name: settings.testimonial.name,
      quote: settings.testimonial.quote,
      role: settings.testimonial.role,
    },
    blog: { ...settings.blog },
    updatedAt: settings.updatedAt,
    whyChooseUs: {
      description: settings.whyChooseUs.description,
      eyebrow: settings.whyChooseUs.eyebrow,
      features: settings.whyChooseUs.features.map((item) => ({ ...item })),
      primaryImage: {
        objectName: settings.whyChooseUs.primaryImage.objectName ?? null,
        url: settings.whyChooseUs.primaryImage.url,
      },
      secondaryImage: {
        objectName: settings.whyChooseUs.secondaryImage.objectName ?? null,
        url: settings.whyChooseUs.secondaryImage.url,
      },
      stats: settings.whyChooseUs.stats.map((item) => ({ ...item })),
      title: settings.whyChooseUs.title,
    },
  }
}
