using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

[Table("users")]
[Index(nameof(Email), IsUnique = true)]
[Index(nameof(Phone), IsUnique = true)]
public class User
{
    // ─── Primary Key ─────────────────────────────────────
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    // ─── Basic Info ───────────────────────────────────────
    [Required]
    [MaxLength(60)]
    public string FirstName { get; set; } = "";

    [Required]
    [MaxLength(60)]
    public string LastName { get; set; } = "";

    [NotMapped]
    public string FullName => $"{FirstName} {LastName}";

    [Required]
    [MaxLength(150)]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    public string PasswordHash { get; set; } = "";

    [MaxLength(20)]
    public string? Phone { get; set; }

    public string? AvatarUrl { get; set; }

    // ─── Role ─────────────────────────────────────────────
    [Required]
    public UserRole Role { get; set; } = UserRole.Client;

    // ─── Status ───────────────────────────────────────────
    public bool IsActive { get; set; } = true;
    public bool IsEmailVerified { get; set; } = false;
    public bool IsPhoneVerified { get; set; } = false;

    // ─── Auth Tokens ──────────────────────────────────────
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }
    public string? EmailVerificationToken { get; set; }

    // ─── Agent-Specific ───────────────────────────────────
    public string? LicenseNumber { get; set; }       // Agent license
    public string? AgencyName { get; set; }
    public string? Bio { get; set; }
    public decimal? CommissionRate { get; set; }      // e.g. 2.5 = 2.5%
    public bool IsVerifiedAgent { get; set; } = false;

    // ─── Client-Specific ──────────────────────────────────
    public string? NationalId { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    // ─── Timestamps ───────────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? DeletedAt { get; set; }          // Soft delete

    // ─── Navigation (Relations) ───────────────────────────
    // public List<Property> Properties { get; set; } = [];   // Agent's listings
    // public List<Booking> Bookings { get; set; } = [];       // Client's bookings
    // public List<Review> Reviews { get; set; } = [];
}
