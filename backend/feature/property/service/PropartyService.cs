using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;  // ✅ for List<>
using Data;
using Entities;
using Models;



namespace Models
{
    public class PaginatedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public bool HasNextPage => Page < TotalPages;
        public bool HasPreviousPage => Page > 1;
    }
}
namespace Services
{
    public class PropertyService
    {
        private readonly AppDbContext _db;

        public PropertyService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Property> CreatePropertyAsync(Property property)
        {
            await _db.Properties.AddAsync(property);
            await _db.SaveChangesAsync();
            return property;
        }

        public async Task<Property> UpdatePropertyAsync(Property property)
        {
            _db.Properties.Update(property);
            await _db.SaveChangesAsync();
            return property;
        }

        public async Task DeletePropertyAsync(int id)
        {
            var property = await _db.Properties.FindAsync(id);
            if (property is null) return;

            _db.Properties.Remove(property);
            await _db.SaveChangesAsync();
        }

        public async Task<Property?> GetPropertyAsync(int id)
        {
            return await _db.Properties
                .Include(p => p.NeighborhoodInsights)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Property?> GetPropertyBySlugAsync(string slug)
        {
            return await _db.Properties
                .Include(p => p.NeighborhoodInsights)
                .FirstOrDefaultAsync(p => p.Slug == slug); // ✅ fixed — was p.Id == id
        }

        public async Task<PaginatedResult<Property>> GetAllPropertiesAsync(int page = 1, int pageSize = 10)
        {
            var totalCount = await _db.Properties.CountAsync();

            var items = await _db.Properties
                .Include(p => p.NeighborhoodInsights)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PaginatedResult<Property>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

    }
}

