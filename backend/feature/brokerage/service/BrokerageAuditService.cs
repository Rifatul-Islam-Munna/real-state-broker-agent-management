using Data;
using Entities;

namespace Services
{
    public class BrokerageAuditService(AppDbContext db)
    {
        public void AddLog(
            string entityType,
            int? entityId,
            string action,
            string? fieldName,
            string? oldValue,
            string? newValue,
            string? actor,
            string? note = null)
        {
            db.BrokerageAuditLogs.Add(new BrokerageAuditLog
            {
                Action = (action ?? string.Empty).Trim(),
                Actor = string.IsNullOrWhiteSpace(actor) ? "System" : actor.Trim(),
                CreatedAt = DateTime.UtcNow,
                EntityId = entityId,
                EntityType = (entityType ?? string.Empty).Trim(),
                FieldName = (fieldName ?? string.Empty).Trim(),
                NewValue = (newValue ?? string.Empty).Trim(),
                Note = (note ?? string.Empty).Trim(),
                OldValue = (oldValue ?? string.Empty).Trim(),
            });
        }
    }
}
