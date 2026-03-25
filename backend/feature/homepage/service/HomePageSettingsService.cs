using System.Text.Json;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public class HomePageImageAsset
    {
        public string Url { get; set; } = string.Empty;
        public string? ObjectName { get; set; }
    }

    public class HomePageHeroSearchMode
    {
        public string TabLabel { get; set; } = string.Empty;
        public string InputPlaceholder { get; set; } = string.Empty;
        public string SelectLabel { get; set; } = string.Empty;
        public string CtaLabel { get; set; } = string.Empty;
    }

    public class HomePageHeroSection
    {
        public string Headline { get; set; } = string.Empty;
        public string HighlightedHeadline { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public HomePageImageAsset BackgroundImage { get; set; } = new();
        public HomePageHeroSearchMode BuyMode { get; set; } = new();
        public HomePageHeroSearchMode RentMode { get; set; } = new();
        public HomePageHeroSearchMode SellMode { get; set; } = new();
    }

    public class HomePageSectionIntro
    {
        public string Eyebrow { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
    }

    public class HomePageFeatureItem
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class HomePageStatItem
    {
        public string Value { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
    }

    public class HomePageWhyChooseUsSection : HomePageSectionIntro
    {
        public string Description { get; set; } = string.Empty;
        public List<HomePageFeatureItem> Features { get; set; } = [];
        public List<HomePageStatItem> Stats { get; set; } = [];
        public HomePageImageAsset PrimaryImage { get; set; } = new();
        public HomePageImageAsset SecondaryImage { get; set; } = new();
    }

    public class HomePageNeighborhoodCard
    {
        public string Name { get; set; } = string.Empty;
        public string PropertyCountLabel { get; set; } = string.Empty;
        public HomePageImageAsset Image { get; set; } = new();
    }

    public class HomePageNeighborhoodSection : HomePageSectionIntro
    {
        public List<HomePageNeighborhoodCard> Cards { get; set; } = [];
    }

    public class HomePageServiceCard
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LinkLabel { get; set; } = string.Empty;
    }

    public class HomePageTeamSection : HomePageSectionIntro
    {
        public string ButtonLabel { get; set; } = string.Empty;
    }

    public class HomePageTestimonialSection
    {
        public string Quote { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public HomePageImageAsset AvatarImage { get; set; } = new();
    }

    public class HomePageBlogSection : HomePageSectionIntro
    {
        public string ButtonLabel { get; set; } = string.Empty;
    }

    public class HomePageSettingsPayload
    {
        public HomePageHeroSection Hero { get; set; } = new();
        public HomePageSectionIntro FeaturedListings { get; set; } = new();
        public HomePageWhyChooseUsSection WhyChooseUs { get; set; } = new();
        public HomePageNeighborhoodSection Neighborhoods { get; set; } = new();
        public List<HomePageServiceCard> Services { get; set; } = [];
        public HomePageTeamSection Team { get; set; } = new();
        public HomePageTestimonialSection Testimonial { get; set; } = new();
        public HomePageBlogSection Blog { get; set; } = new();
    }

    public class UpdateHomePageSettingsRequest : HomePageSettingsPayload
    {
    }

    public class HomePageSettingsResponse : HomePageSettingsPayload
    {
        public DateTime UpdatedAt { get; set; }
    }

    public class HomePageSettingsService
    {
        private const int SettingsRecordId = 1;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        private readonly AppDbContext _db;

        public HomePageSettingsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<HomePageSettingsResponse> GetAdminSettingsAsync()
        {
            var record = await _db.HomePageSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId);

            var content = record is null ? CreateDefaultPayload() : ReadPayload(record.ContentJson);
            var updatedAt = record?.UpdatedAt ?? DateTime.UtcNow;

            return MapResponse(content, updatedAt);
        }

        public Task<HomePageSettingsResponse> GetPublicSettingsAsync()
        {
            return GetAdminSettingsAsync();
        }

        public async Task<HomePageSettingsResponse> UpdateSettingsAsync(UpdateHomePageSettingsRequest request)
        {
            var payload = NormalizePayload(request);
            var now = DateTime.UtcNow;

            var record = await _db.HomePageSettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId);
            if (record is null)
            {
                record = new HomePageSettingsRecord
                {
                    Id = SettingsRecordId,
                    CreatedAt = now,
                };
                await _db.HomePageSettings.AddAsync(record);
            }

            record.ContentJson = JsonSerializer.Serialize(payload, JsonOptions);
            record.UpdatedAt = now;

            await _db.SaveChangesAsync();

            return MapResponse(payload, record.UpdatedAt);
        }

        private static HomePageSettingsResponse MapResponse(HomePageSettingsPayload payload, DateTime updatedAt)
        {
            return new HomePageSettingsResponse
            {
                Hero = payload.Hero,
                FeaturedListings = payload.FeaturedListings,
                WhyChooseUs = payload.WhyChooseUs,
                Neighborhoods = payload.Neighborhoods,
                Services = payload.Services,
                Team = payload.Team,
                Testimonial = payload.Testimonial,
                Blog = payload.Blog,
                UpdatedAt = updatedAt,
            };
        }

        private static HomePageSettingsPayload ReadPayload(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return CreateDefaultPayload();
            }

            try
            {
                return NormalizePayload(JsonSerializer.Deserialize<HomePageSettingsPayload>(json, JsonOptions));
            }
            catch
            {
                return CreateDefaultPayload();
            }
        }

        private static HomePageSettingsPayload NormalizePayload(HomePageSettingsPayload? input)
        {
            var defaults = CreateDefaultPayload();

            return new HomePageSettingsPayload
            {
                Hero = NormalizeHero(input?.Hero, defaults.Hero),
                FeaturedListings = NormalizeIntro(input?.FeaturedListings, defaults.FeaturedListings),
                WhyChooseUs = NormalizeWhyChooseUs(input?.WhyChooseUs, defaults.WhyChooseUs),
                Neighborhoods = NormalizeNeighborhoods(input?.Neighborhoods, defaults.Neighborhoods),
                Services = Enumerable.Range(0, defaults.Services.Count)
                    .Select(index => NormalizeServiceCard(GetListValue(input?.Services, index), defaults.Services[index]))
                    .ToList(),
                Team = NormalizeTeam(input?.Team, defaults.Team),
                Testimonial = NormalizeTestimonial(input?.Testimonial, defaults.Testimonial),
                Blog = NormalizeBlog(input?.Blog, defaults.Blog),
            };
        }

        private static HomePageHeroSection NormalizeHero(HomePageHeroSection? input, HomePageHeroSection fallback)
        {
            return new HomePageHeroSection
            {
                Headline = NormalizeText(input?.Headline, fallback.Headline),
                HighlightedHeadline = NormalizeText(input?.HighlightedHeadline, fallback.HighlightedHeadline),
                Description = NormalizeText(input?.Description, fallback.Description),
                BackgroundImage = NormalizeImage(input?.BackgroundImage, fallback.BackgroundImage),
                BuyMode = NormalizeSearchMode(input?.BuyMode, fallback.BuyMode),
                RentMode = NormalizeSearchMode(input?.RentMode, fallback.RentMode),
                SellMode = NormalizeSearchMode(input?.SellMode, fallback.SellMode),
            };
        }

        private static HomePageHeroSearchMode NormalizeSearchMode(HomePageHeroSearchMode? input, HomePageHeroSearchMode fallback)
        {
            return new HomePageHeroSearchMode
            {
                TabLabel = NormalizeText(input?.TabLabel, fallback.TabLabel),
                InputPlaceholder = NormalizeText(input?.InputPlaceholder, fallback.InputPlaceholder),
                SelectLabel = NormalizeText(input?.SelectLabel, fallback.SelectLabel),
                CtaLabel = NormalizeText(input?.CtaLabel, fallback.CtaLabel),
            };
        }

        private static HomePageSectionIntro NormalizeIntro(HomePageSectionIntro? input, HomePageSectionIntro fallback)
        {
            return new HomePageSectionIntro
            {
                Eyebrow = NormalizeText(input?.Eyebrow, fallback.Eyebrow),
                Title = NormalizeText(input?.Title, fallback.Title),
            };
        }

        private static HomePageWhyChooseUsSection NormalizeWhyChooseUs(HomePageWhyChooseUsSection? input, HomePageWhyChooseUsSection fallback)
        {
            return new HomePageWhyChooseUsSection
            {
                Eyebrow = NormalizeText(input?.Eyebrow, fallback.Eyebrow),
                Title = NormalizeText(input?.Title, fallback.Title),
                Description = NormalizeText(input?.Description, fallback.Description),
                Features = Enumerable.Range(0, fallback.Features.Count)
                    .Select(index => NormalizeFeature(GetListValue(input?.Features, index), fallback.Features[index]))
                    .ToList(),
                Stats = Enumerable.Range(0, fallback.Stats.Count)
                    .Select(index => NormalizeStat(GetListValue(input?.Stats, index), fallback.Stats[index]))
                    .ToList(),
                PrimaryImage = NormalizeImage(input?.PrimaryImage, fallback.PrimaryImage),
                SecondaryImage = NormalizeImage(input?.SecondaryImage, fallback.SecondaryImage),
            };
        }

        private static HomePageFeatureItem NormalizeFeature(HomePageFeatureItem? input, HomePageFeatureItem fallback)
        {
            return new HomePageFeatureItem
            {
                Title = NormalizeText(input?.Title, fallback.Title),
                Description = NormalizeText(input?.Description, fallback.Description),
            };
        }

        private static HomePageStatItem NormalizeStat(HomePageStatItem? input, HomePageStatItem fallback)
        {
            return new HomePageStatItem
            {
                Value = NormalizeText(input?.Value, fallback.Value),
                Label = NormalizeText(input?.Label, fallback.Label),
            };
        }

        private static HomePageNeighborhoodSection NormalizeNeighborhoods(HomePageNeighborhoodSection? input, HomePageNeighborhoodSection fallback)
        {
            return new HomePageNeighborhoodSection
            {
                Eyebrow = NormalizeText(input?.Eyebrow, fallback.Eyebrow),
                Title = NormalizeText(input?.Title, fallback.Title),
                Cards = Enumerable.Range(0, fallback.Cards.Count)
                    .Select(index => NormalizeNeighborhood(GetListValue(input?.Cards, index), fallback.Cards[index]))
                    .ToList(),
            };
        }

        private static HomePageNeighborhoodCard NormalizeNeighborhood(HomePageNeighborhoodCard? input, HomePageNeighborhoodCard fallback)
        {
            return new HomePageNeighborhoodCard
            {
                Name = NormalizeText(input?.Name, fallback.Name),
                PropertyCountLabel = NormalizeText(input?.PropertyCountLabel, fallback.PropertyCountLabel),
                Image = NormalizeImage(input?.Image, fallback.Image),
            };
        }

        private static HomePageServiceCard NormalizeServiceCard(HomePageServiceCard? input, HomePageServiceCard fallback)
        {
            return new HomePageServiceCard
            {
                Title = NormalizeText(input?.Title, fallback.Title),
                Description = NormalizeText(input?.Description, fallback.Description),
                LinkLabel = NormalizeText(input?.LinkLabel, fallback.LinkLabel),
            };
        }

        private static HomePageTeamSection NormalizeTeam(HomePageTeamSection? input, HomePageTeamSection fallback)
        {
            return new HomePageTeamSection
            {
                Eyebrow = NormalizeText(input?.Eyebrow, fallback.Eyebrow),
                Title = NormalizeText(input?.Title, fallback.Title),
                ButtonLabel = NormalizeText(input?.ButtonLabel, fallback.ButtonLabel),
            };
        }

        private static HomePageTestimonialSection NormalizeTestimonial(HomePageTestimonialSection? input, HomePageTestimonialSection fallback)
        {
            return new HomePageTestimonialSection
            {
                Quote = NormalizeText(input?.Quote, fallback.Quote),
                Name = NormalizeText(input?.Name, fallback.Name),
                Role = NormalizeText(input?.Role, fallback.Role),
                AvatarImage = NormalizeImage(input?.AvatarImage, fallback.AvatarImage),
            };
        }

        private static HomePageBlogSection NormalizeBlog(HomePageBlogSection? input, HomePageBlogSection fallback)
        {
            return new HomePageBlogSection
            {
                Eyebrow = NormalizeText(input?.Eyebrow, fallback.Eyebrow),
                Title = NormalizeText(input?.Title, fallback.Title),
                ButtonLabel = NormalizeText(input?.ButtonLabel, fallback.ButtonLabel),
            };
        }

        private static HomePageImageAsset NormalizeImage(HomePageImageAsset? input, HomePageImageAsset fallback)
        {
            return new HomePageImageAsset
            {
                Url = NormalizeText(input?.Url, fallback.Url),
                ObjectName = NormalizeNullableText(input?.ObjectName) ?? NormalizeNullableText(fallback.ObjectName),
            };
        }

        private static T? GetListValue<T>(IReadOnlyList<T>? items, int index)
        {
            if (items is null || index < 0 || index >= items.Count)
            {
                return default;
            }

            return items[index];
        }

        private static string NormalizeText(string? value, string fallback)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static string? NormalizeNullableText(string? value)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? null : normalized;
        }

        private static HomePageSettingsPayload CreateDefaultPayload()
        {
            return new HomePageSettingsPayload
            {
                Hero = new HomePageHeroSection
                {
                    Headline = "Your Vision. Our Expertise.",
                    HighlightedHeadline = "Exceptional Results.",
                    Description = "Discover a new level of real estate excellence with personalized service and market-leading insights.",
                    BackgroundImage = new HomePageImageAsset
                    {
                        Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuCNzyh5mt5knkbR3OCn2xCpbUmNOq2pGyTdwYKMzAj70mI62TdwalfugFIumWCtRPu1VcMVKavr6TsX3BP9lgHwHBq-xhF-VnEFTDtMtQJ-wrvaOG6gXu0BlNF1EQnKMK69jCZMXYqKgMz4OlmOlrfDLbMLaDMKJS1Ee_Ucwy8be2XaIbNp3LF1N0_oHsqPEm9bvzeAlhVo7ySGdd4IhWNhurSiZxafHVQEkQhoby-KWNBJ72WRT5PUMOQRTj8IONpCs8zbHzfXMds"
                    },
                    BuyMode = new HomePageHeroSearchMode
                    {
                        TabLabel = "Buy",
                        InputPlaceholder = "Neighborhood, City, or Zip...",
                        SelectLabel = "Property Type",
                        CtaLabel = "Search Now"
                    },
                    RentMode = new HomePageHeroSearchMode
                    {
                        TabLabel = "Rent",
                        InputPlaceholder = "City, building, or Zip...",
                        SelectLabel = "Rental Type",
                        CtaLabel = "Browse Rentals"
                    },
                    SellMode = new HomePageHeroSearchMode
                    {
                        TabLabel = "Sell",
                        InputPlaceholder = "Enter your property address...",
                        SelectLabel = "Property Category",
                        CtaLabel = "List Your Property"
                    }
                },
                FeaturedListings = new HomePageSectionIntro
                {
                    Eyebrow = "Exclusives",
                    Title = "Featured Listings"
                },
                WhyChooseUs = new HomePageWhyChooseUsSection
                {
                    Eyebrow = "Why EliteEstates",
                    Title = "Elevating the Real Estate Experience Since 1998",
                    Description = "We don't just sell properties; we facilitate transitions into your future. Our commitment to transparency, local expertise, and innovative marketing sets us apart in a crowded market.",
                    Features =
                    [
                        new HomePageFeatureItem
                        {
                            Title = "Certified Agents",
                            Description = "Expert guidance you can rely on."
                        },
                        new HomePageFeatureItem
                        {
                            Title = "Market Insights",
                            Description = "Data-driven valuation models."
                        }
                    ],
                    Stats =
                    [
                        new HomePageStatItem
                        {
                            Value = "25+",
                            Label = "Years Experience"
                        },
                        new HomePageStatItem
                        {
                            Value = "12k",
                            Label = "Properties Sold"
                        }
                    ],
                    PrimaryImage = new HomePageImageAsset
                    {
                        Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuAzfTEUH3HlsLSxWKT-Tpv7iDN8YMHRtogYjQi3GEn_U210Dk0qVGRG55NDvfR3GDGnFVfKlb4tLLBsMhJ08A8Sm7EMo8ukgFd3gUH7CYyut3fmRTl2S6t3gDTzm4u5oRfxg0mmVY27gAvBkbzkqKTqc74kVnVbwvy44mUuvPPTxMqin5-5hxoid8k4GRgIxn_VYmobQTqHObf-Os7SUJ3DxOrqil5ptmYRBVKwLl-8heJd-ZrHQZtIbWQAVB7SEMG8jWQv7HNQmUc"
                    },
                    SecondaryImage = new HomePageImageAsset
                    {
                        Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuBnbKru90O2oNx5V3wCiUt1M6BHkl-dZyTe-7-enNpiiv7VrJa46KmvT7ip5YJKVur4LPJhec18E_YiJAPjByspR7IXiYwmwdzBTv9b11BQG3pGU4q_Ioid_aNr5-W4b3yZaonNPHp8ZNTNrErNWy3kQWHgdQewJQLFpwBX791QR92xJX8U81x3p5ixVbWLV5rhOc9zWAEJYvvH_Aze7PedIvA1AeHbfwpQROPcozE9RXlIcY6FQavC5-vYF0dDZgkndSq4_vAxwYU"
                    }
                },
                Neighborhoods = new HomePageNeighborhoodSection
                {
                    Eyebrow = "Explore Locations",
                    Title = "Neighborhoods",
                    Cards =
                    [
                        new HomePageNeighborhoodCard
                        {
                            Name = "Manhattan",
                            PropertyCountLabel = "128 Properties",
                            Image = new HomePageImageAsset
                            {
                                Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuBEonAYkkDmRGEJuiPKtzykkUkI5O5uvZuqdE1cTJjHcwcUrI0EARPz214n_GELr2rso7Np2WlLkMKpC533zIZyDM8y1736ysixmv4-Eq0Fkcfkp5_I9UVgCaakla_g6CUibDpVWuDclDSB7AbCZCyzPWf97ci3ZRMI7INq91dY36DIv9HPE9Mlst5BWdDrTxZPabpoas66Wlx4muA1fddITGV2xtadWeDIxZLaqhE7CwX8Zff4ZdjOI9aDqZ19S1UscYyVmUnZxv4"
                            }
                        },
                        new HomePageNeighborhoodCard
                        {
                            Name = "Miami",
                            PropertyCountLabel = "84 Properties",
                            Image = new HomePageImageAsset
                            {
                                Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuBedpJALeAHp8oJ_BmZArlxqQUMAjFk3GX8N_7ymJy8IhMJe3Wbe7WSaZ6zhjdEBvMtZ7fsFBvr2o2u1VRYOhnyFyLV782DTgisAHbEr6tHb78UEgvBI7f_5xwhR4Dhaja6LFo8I3KmTAXYQ2UbH6dITigsdYhuGe-exF57ta1xt2NydAn9x5FqUEvjExdXVCfIuRcMLGCyuJVWotMxesz9e760QHH7ss_idZTaiN04iY8ubzKRwaygxu9ALLqGr6S9hEfB0pUjAog"
                            }
                        },
                        new HomePageNeighborhoodCard
                        {
                            Name = "Paris",
                            PropertyCountLabel = "56 Properties",
                            Image = new HomePageImageAsset
                            {
                                Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuC2kUSdCI5KOcLisevu3RD4r75c9DfCJPIyYqdroMbPA0msF9aXA5ubZdAY3LHRsx-RhoAK2Acz6tp1fDEgi_-xoxoyap_-hyHpARL07BuE1kQpD1cqfMLzPCQOCwxmUF8Z9ocU8orGX35fMEzBfhNpkecOCc_l90WuzimYnaH-BhfDSKPEcogYwBaCovPahqvikGj7ocIcZ0D1_DKUBH2UbUgvau7dkbhSOSsLO3xKfEmERwRgab4lS8jAziUDc8_0XVlPYZX9xPE"
                            }
                        },
                        new HomePageNeighborhoodCard
                        {
                            Name = "San Francisco",
                            PropertyCountLabel = "92 Properties",
                            Image = new HomePageImageAsset
                            {
                                Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuAKiV0_rXseU-gnE0vvyx4ty_nrOHUQu_XlT5DgY4tSDhKHbCK4UzjHkGFjtSzz2gQ66MwtX2pE4Z7l7PbhaJTKI17nx40a64l4pTUDCEDna6ds6uMtTG8wkmrEqv_6eUIINzBkm-BqueSbhwx87bINsuly-6NnfcvVnvUFDEKWpH-3aCM-1IHmMDQTq2tpGEqmWxb_Oelx1T3kDHA3PKMNK4WRcwjaXBZo8SWiQXfotnkhTDhPJCCLgBPXmqEhZUq2hmjX6OXyi0w"
                            }
                        }
                    ]
                },
                Services =
                [
                    new HomePageServiceCard
                    {
                        Title = "Property Valuation",
                        Description = "Receive a comprehensive market analysis and pinpoint accuracy for your property's value.",
                        LinkLabel = "Learn More"
                    },
                    new HomePageServiceCard
                    {
                        Title = "Consulting",
                        Description = "Expert advisory for investment portfolios, residential acquisitions, and commercial projects.",
                        LinkLabel = "Learn More"
                    },
                    new HomePageServiceCard
                    {
                        Title = "Asset Management",
                        Description = "Full-cycle property management focused on maximizing yield and tenant satisfaction.",
                        LinkLabel = "Learn More"
                    }
                ],
                Team = new HomePageTeamSection
                {
                    Eyebrow = "Our Professionals",
                    Title = "Meet Our Expert Team",
                    ButtonLabel = "View All Agents"
                },
                Testimonial = new HomePageTestimonialSection
                {
                    Quote = "\"Working with EliteEstates was a seamless experience. Their attention to detail and knowledge of the market enabled us to find our dream home in less than three weeks. Truly professional.\"",
                    Name = "Jonathan Richards",
                    Role = "New Home Owner, Malibu",
                    AvatarImage = new HomePageImageAsset
                    {
                        Url = "https://lh3.googleusercontent.com/aida-public/AB6AXuD_aOT2jVaXNwSoeNzfL0WBIyo6No5zDE3lkpCeWtiy0YJlHYRlee9Y9PCWuTFQmw9-gz2MfchLZT89plYs-OMenN2QETPOwfF61fw0NH-SjW3KPZFHmBJJNi1vD9nkFoBfSY2JigvpV1ADtP62Ly4-ceJGyR_7jqFESGMTHvKdk0-E_YL47jfVDpLCgT-NaTany1ZONypLr_Bq0Ayi67S4wm8knrTZKdqjirNLlSuo1Gy9Jr-GqmL9cLBqfO66r175cIa4Axq3zB4"
                    }
                },
                Blog = new HomePageBlogSection
                {
                    Eyebrow = "Knowledge Base",
                    Title = "Market Insights & News",
                    ButtonLabel = "View All Articles"
                }
            };
        }
    }
}
