using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Entities
{
    public enum PropertyCategory
    {
        Residential,
        Commercial
    }

    public enum PropertyListingType
    {
        ForSale,
        ForRent
    }

    public enum PropertyStatus
    {
        Open,
        Closed
    }

    [Table("property")]
    public class Property
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("slug")]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [Column("title")]
        public string Title
        {
            get => _title;
            set
            {
                _title = value;
                Slug = GenerateSlug(value);
            }
        }

        private string _title = string.Empty;

        [Column("property_type")]
        public PropertyCategory PropertyType { get; set; } = PropertyCategory.Residential;

        [Column("listing_type")]
        public PropertyListingType ListingType { get; set; } = PropertyListingType.ForSale;

        [Column("price")]
        public string Price { get; set; } = string.Empty;

        [Column("status")]
        public PropertyStatus Status { get; set; } = PropertyStatus.Open;

        [Column("location")]
        public string Location { get; set; } = string.Empty;

        [Column("exact_location")]
        public string ExactLocation { get; set; } = string.Empty;

        [Column("bed_room")]
        public string BedRoom { get; set; } = string.Empty;

        [Column("bath_room")]
        public string BathRoom { get; set; } = string.Empty;

        [Column("width")]
        public string Width { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [Column("thumbnail_object_name")]
        public string? ThumbnailObjectName { get; set; }

        [Column("image_urls", TypeName = "jsonb")]
        public List<string> ImageUrls { get; set; } = new();

        [Column("image_object_names", TypeName = "jsonb")]
        public List<string> ImageObjectNames { get; set; } = new();

        public List<NeighborhoodInsight> NeighborhoodInsights { get; set; } = new();

        [Column("key_amenities", TypeName = "jsonb")]
        public List<string> KeyAmenities { get; set; } = new();

        [Column("agent_id")]
        public int? AgentId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("AgentId")]
        [JsonIgnore]
        public User? Agent { get; set; }

        private static string GenerateSlug(string title)
        {
            var slug = (title ?? string.Empty).ToLower().Trim();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            slug = Regex.Replace(slug, @"\s+", "-");
            slug = Regex.Replace(slug, @"-+", "-");
            return slug;
        }
    }

    [Table("neighborhood_insight")]
    public class NeighborhoodInsight
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("property_id")]
        public int PropertyId { get; set; }

        [ForeignKey("PropertyId")]
        [JsonIgnore]
        public Property Property { get; set; } = null!;
    }
}
