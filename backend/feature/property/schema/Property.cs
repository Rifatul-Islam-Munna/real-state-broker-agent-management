using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Text.Json.Serialization;


namespace Entities
{
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

        public List<NeighborhoodInsight> NeighborhoodInsights { get; set; } = new();

        [Column("key_amenities", TypeName = "jsonb")]
        public List<string> KeyAmenities { get; set; } = new();

        private static string GenerateSlug(string title)
        {
            var slug = title.ToLower().Trim();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            slug = Regex.Replace(slug, @"\s+", "-");
            slug = Regex.Replace(slug, @"-+", "-");
            return slug;
        }

        [Column("agent_id")]
        public int? AgentId { get; set; }           // ✅ nullable — empty on creation

        [ForeignKey("AgentId")]
        [JsonIgnore]
        public User? Agent { get; set; }

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