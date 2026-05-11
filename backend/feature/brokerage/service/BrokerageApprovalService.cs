using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record BrokerageApprovalResponse(
        int Id,
        BrokerageApprovalType Type,
        BrokerageApprovalStatus Status,
        int PropertyId,
        string PropertyTitle,
        string OldPrice,
        string RequestedPrice,
        PropertyStatus? OldStatus,
        PropertyStatus? RequestedStatus,
        string RequestedBy,
        string ReviewedBy,
        string RequestNote,
        string ReviewNote,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ReviewBrokerageApprovalRequest(
        int ApprovalId,
        BrokerageApprovalStatus Status,
        string ReviewNote
    );

    public class BrokerageApprovalService(
        AppDbContext db,
        BrokerageAuditService auditService)
    {
        public async Task<BrokerageApprovalRequest> CreateAsync(
            BrokerageApprovalType type,
            Property property,
            string oldPrice,
            string requestedPrice,
            PropertyStatus? oldStatus,
            PropertyStatus? requestedStatus,
            string actor,
            string note,
            CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var approval = new BrokerageApprovalRequest
            {
                CreatedAt = now,
                OldPrice = oldPrice ?? string.Empty,
                OldStatus = oldStatus,
                PropertyId = property.Id,
                RequestedBy = string.IsNullOrWhiteSpace(actor) ? "Agent" : actor.Trim(),
                RequestedPrice = requestedPrice ?? string.Empty,
                RequestedStatus = requestedStatus,
                RequestNote = note ?? string.Empty,
                Status = BrokerageApprovalStatus.Pending,
                Type = type,
                UpdatedAt = now,
            };

            await db.BrokerageApprovalRequests.AddAsync(approval, ct);
            auditService.AddLog(
                "Property",
                property.Id,
                "ApprovalRequested",
                type.ToString(),
                oldPrice,
                requestedPrice,
                actor,
                note);

            return approval;
        }

        public async Task<PaginatedResult<BrokerageApprovalResponse>> GetApprovalsAsync(
            int page = 1,
            int pageSize = 20,
            BrokerageApprovalStatus? status = null,
            CancellationToken ct = default)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Max(1, pageSize);
            var query = db.BrokerageApprovalRequests
                .AsNoTracking()
                .Include(item => item.Property)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(item => item.Status == status.Value);
            }

            var totalCount = await query.CountAsync(ct);
            var items = await query
                .OrderBy(item => item.Status == BrokerageApprovalStatus.Pending ? 0 : 1)
                .ThenByDescending(item => item.CreatedAt)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(item => new BrokerageApprovalResponse(
                    item.Id,
                    item.Type,
                    item.Status,
                    item.PropertyId,
                    item.Property != null ? item.Property.Title : "Property #" + item.PropertyId,
                    item.OldPrice,
                    item.RequestedPrice,
                    item.OldStatus,
                    item.RequestedStatus,
                    item.RequestedBy,
                    item.ReviewedBy,
                    item.RequestNote,
                    item.ReviewNote,
                    item.CreatedAt,
                    item.UpdatedAt))
                .ToListAsync(ct);

            return new PaginatedResult<BrokerageApprovalResponse>
            {
                Items = items,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)normalizedPageSize)
            };
        }

        public async Task<BrokerageApprovalResponse?> ReviewAsync(
            ReviewBrokerageApprovalRequest request,
            string actor,
            CancellationToken ct = default)
        {
            var approval = await db.BrokerageApprovalRequests
                .Include(item => item.Property)
                .FirstOrDefaultAsync(item => item.Id == request.ApprovalId, ct);

            if (approval is null)
            {
                return null;
            }

            if (approval.Status != BrokerageApprovalStatus.Pending)
            {
                throw new InvalidOperationException("Approval request is already reviewed.");
            }

            if (request.Status is not BrokerageApprovalStatus.Approved and not BrokerageApprovalStatus.Rejected)
            {
                throw new ArgumentException("Review status must be Approved or Rejected.");
            }

            var now = DateTime.UtcNow;
            approval.Status = request.Status;
            approval.ReviewedBy = string.IsNullOrWhiteSpace(actor) ? "Admin" : actor.Trim();
            approval.ReviewNote = (request.ReviewNote ?? string.Empty).Trim();
            approval.UpdatedAt = now;

            if (request.Status == BrokerageApprovalStatus.Approved && approval.Property is not null)
            {
                if (approval.Type == BrokerageApprovalType.PriceChange && !string.IsNullOrWhiteSpace(approval.RequestedPrice))
                {
                    var oldPrice = approval.Property.Price;
                    approval.Property.Price = approval.RequestedPrice;
                    approval.Property.UpdatedAt = now;
                    auditService.AddLog("Property", approval.PropertyId, "PriceApproved", "price", oldPrice, approval.RequestedPrice, actor, approval.ReviewNote);
                }

                if (approval.Type == BrokerageApprovalType.ListingPublish && approval.RequestedStatus.HasValue)
                {
                    var oldStatus = approval.Property.Status;
                    approval.Property.Status = approval.RequestedStatus.Value;
                    approval.Property.UpdatedAt = now;
                    auditService.AddLog("Property", approval.PropertyId, "PublishApproved", "status", oldStatus.ToString(), approval.Property.Status.ToString(), actor, approval.ReviewNote);
                }
            }

            await db.SaveChangesAsync(ct);
            return await db.BrokerageApprovalRequests
                .AsNoTracking()
                .Include(item => item.Property)
                .Where(item => item.Id == approval.Id)
                .Select(item => new BrokerageApprovalResponse(
                    item.Id,
                    item.Type,
                    item.Status,
                    item.PropertyId,
                    item.Property != null ? item.Property.Title : "Property #" + item.PropertyId,
                    item.OldPrice,
                    item.RequestedPrice,
                    item.OldStatus,
                    item.RequestedStatus,
                    item.RequestedBy,
                    item.ReviewedBy,
                    item.RequestNote,
                    item.ReviewNote,
                    item.CreatedAt,
                    item.UpdatedAt))
                .FirstOrDefaultAsync(ct);
        }
    }
}
