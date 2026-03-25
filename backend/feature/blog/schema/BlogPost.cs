using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Entities
{
    [Table("blog_post")]
    [Index(nameof(Slug), IsUnique = true)]
    public class BlogPost
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [Column("slug")]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [Column("excerpt")]
        public string Excerpt { get; set; } = string.Empty;

        [Required]
        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Required]
        [Column("cover_image_url")]
        public string CoverImageUrl { get; set; } = string.Empty;

        [Column("cover_image_object_name")]
        public string? CoverImageObjectName { get; set; }

        [Required]
        [Column("author_name")]
        public string AuthorName { get; set; } = string.Empty;

        [Column("read_time_minutes")]
        public int ReadTimeMinutes { get; set; } = 5;

        [Column("is_featured")]
        public bool IsFeatured { get; set; }

        [Column("is_published")]
        public bool IsPublished { get; set; } = true;

        [Column("published_at")]
        public DateTime? PublishedAt { get; set; }

        [Column("tags", TypeName = "jsonb")]
        public List<string> Tags { get; set; } = [];

        [Column("highlights", TypeName = "jsonb")]
        public List<string> Highlights { get; set; } = [];

        [Column("paragraphs", TypeName = "jsonb")]
        public List<string> Paragraphs { get; set; } = [];

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
