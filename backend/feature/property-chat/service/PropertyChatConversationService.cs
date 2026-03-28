using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record PropertyChatAnswerInput(
        int? QuestionId,
        string QuestionPrompt,
        string AnswerText,
        string? AttachmentUrl,
        string? AttachmentObjectName
    );

    public record CreatePropertyChatConversationInput(
        int PropertyId,
        string ContactName,
        string ContactEmail,
        string ContactPhone,
        string Budget,
        string Timeline,
        string Interest,
        string AdditionalMessage,
        List<PropertyChatAnswerInput> Answers
    );

    public record PropertyChatMessageResponse(
        int Id,
        PropertyChatSenderRole SenderRole,
        string Message,
        string? AttachmentUrl,
        string? AttachmentObjectName,
        DateTime CreatedAt
    );

    public record PropertyChatConversationResponse(
        int Id,
        int PropertyId,
        string PropertyTitle,
        string AssignedAgent,
        string ContactName,
        string ContactEmail,
        string ContactPhone,
        string Budget,
        string Timeline,
        string Interest,
        string Summary,
        float QualificationScore,
        bool AutoQualified,
        PropertyChatConversationStatus Status,
        int? LeadId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        List<PropertyChatMessageResponse> Messages
    );

    public class PropertyChatConversationService
    {
        private readonly AppDbContext _db;
        private readonly LeadQualificationPredictionService _leadQualificationPredictionService;

        public PropertyChatConversationService(
            AppDbContext db,
            LeadQualificationPredictionService leadQualificationPredictionService)
        {
            _db = db;
            _leadQualificationPredictionService = leadQualificationPredictionService;
        }

        public async Task<PropertyChatConversationResponse> CreateConversationAsync(CreatePropertyChatConversationInput input)
        {
            var property = await _db.Properties
                .Include(item => item.Agent)
                .Include(item => item.PreQuestions)
                .FirstOrDefaultAsync(item => item.Id == input.PropertyId);

            if (property is null)
            {
                throw new InvalidOperationException("Property was not found.");
            }

            var summary = BuildSummary(property, input);
            var qualification = await _leadQualificationPredictionService.PredictAsync(
                summary,
                input.Budget,
                input.Interest,
                input.Timeline,
                property.Title,
                property.Location,
                input.ContactEmail,
                input.ContactPhone);

            Lead? lead = null;
            if (HasMinimumLeadData(input) && qualification.ShouldCreateLead)
            {
                lead = await CreateOrUpdateLeadAsync(property, input, qualification, summary);
            }

            var now = DateTime.UtcNow;
            var conversation = new PropertyChatConversation
            {
                AssignedAgent = property.Agent?.FullName ?? string.Empty,
                AutoQualified = qualification.ShouldCreateLead && lead is not null,
                Budget = (input.Budget ?? string.Empty).Trim(),
                ContactEmail = (input.ContactEmail ?? string.Empty).Trim().ToLowerInvariant(),
                ContactName = (input.ContactName ?? string.Empty).Trim(),
                ContactPhone = (input.ContactPhone ?? string.Empty).Trim(),
                CreatedAt = now,
                Interest = (input.Interest ?? string.Empty).Trim(),
                LeadId = lead?.Id,
                Messages = BuildMessages(property, input, now),
                PropertyId = property.Id,
                PropertyTitle = property.Title,
                QualificationScore = qualification.Score,
                Status = lead is not null
                    ? PropertyChatConversationStatus.LeadCreated
                    : HasMinimumLeadData(input)
                        ? PropertyChatConversationStatus.NeedsReview
                        : PropertyChatConversationStatus.New,
                Summary = summary,
                Timeline = (input.Timeline ?? string.Empty).Trim(),
                UpdatedAt = now,
            };

            await _db.PropertyChatConversations.AddAsync(conversation);
            await _db.SaveChangesAsync();

            return await GetRequiredConversationAsync(conversation.Id);
        }

        public async Task<PropertyChatConversationResponse?> GetConversationAsync(int id)
        {
            var conversation = await _db.PropertyChatConversations
                .AsNoTracking()
                .Include(item => item.Messages)
                .FirstOrDefaultAsync(item => item.Id == id);

            return conversation is null ? null : MapConversation(conversation);
        }

        public async Task<PaginatedResult<PropertyChatConversationResponse>> GetConversationsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            int? propertyId = null,
            int? leadId = null)
        {
            var query = _db.PropertyChatConversations
                .AsNoTracking()
                .Include(item => item.Messages)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLowerInvariant();
                query = query.Where(item =>
                    item.ContactName.ToLower().Contains(normalizedSearch) ||
                    item.ContactEmail.ToLower().Contains(normalizedSearch) ||
                    item.PropertyTitle.ToLower().Contains(normalizedSearch) ||
                    item.Summary.ToLower().Contains(normalizedSearch));
            }

            if (propertyId.HasValue)
            {
                query = query.Where(item => item.PropertyId == propertyId.Value);
            }

            if (leadId.HasValue)
            {
                query = query.Where(item => item.LeadId == leadId.Value);
            }

            var totalCount = await query.CountAsync();
            var entities = await query
                .OrderByDescending(item => item.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = entities
                .Select(MapConversation)
                .ToList();

            return new PaginatedResult<PropertyChatConversationResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        private async Task<PropertyChatConversationResponse> GetRequiredConversationAsync(int id)
        {
            return await GetConversationAsync(id)
                ?? throw new InvalidOperationException("Conversation was not found after save.");
        }

        private async Task<Lead> CreateOrUpdateLeadAsync(
            Property property,
            CreatePropertyChatConversationInput input,
            LeadQualificationPrediction qualification,
            string summary)
        {
            var normalizedEmail = (input.ContactEmail ?? string.Empty).Trim().ToLowerInvariant();
            var existingLead = !string.IsNullOrWhiteSpace(normalizedEmail)
                ? await _db.Leads.FirstOrDefaultAsync(item => item.Email == normalizedEmail)
                : null;

            var note = summary.Length > 600 ? summary[..600] : summary;
            var now = DateTime.UtcNow;

            if (existingLead is null)
            {
                var lead = new Lead
                {
                    Agent = property.Agent?.FullName ?? string.Empty,
                    Budget = (input.Budget ?? string.Empty).Trim(),
                    CreatedAt = now,
                    Email = normalizedEmail,
                    InBoard = qualification.InBoard,
                    Interest = (input.Interest ?? string.Empty).Trim(),
                    LastActivityAt = now,
                    Name = (input.ContactName ?? string.Empty).Trim(),
                    Notes = string.IsNullOrWhiteSpace(note) ? [] : [note],
                    Phone = (input.ContactPhone ?? string.Empty).Trim(),
                    Priority = qualification.Priority,
                    Property = property.Title,
                    Source = "Property Chat",
                    Stage = qualification.Stage,
                    Summary = summary,
                    Timeline = (input.Timeline ?? string.Empty).Trim(),
                    UpdatedAt = now,
                };

                await _db.Leads.AddAsync(lead);
                await _db.SaveChangesAsync();
                return lead;
            }

            existingLead.Agent = property.Agent?.FullName ?? existingLead.Agent;
            existingLead.Budget = !string.IsNullOrWhiteSpace(input.Budget) ? input.Budget.Trim() : existingLead.Budget;
            existingLead.InBoard = qualification.InBoard || existingLead.InBoard;
            existingLead.Interest = !string.IsNullOrWhiteSpace(input.Interest) ? input.Interest.Trim() : existingLead.Interest;
            existingLead.LastActivityAt = now;
            existingLead.Name = !string.IsNullOrWhiteSpace(input.ContactName) ? input.ContactName.Trim() : existingLead.Name;
            existingLead.Phone = !string.IsNullOrWhiteSpace(input.ContactPhone) ? input.ContactPhone.Trim() : existingLead.Phone;
            existingLead.Priority = qualification.Priority;
            existingLead.Property = property.Title;
            existingLead.Source = "Property Chat";
            existingLead.Stage = qualification.Stage == LeadStage.Qualified && existingLead.Stage == LeadStage.New
                ? LeadStage.Qualified
                : qualification.Stage == LeadStage.New
                    ? existingLead.Stage
                    : qualification.Stage;
            existingLead.Summary = summary;
            existingLead.Timeline = !string.IsNullOrWhiteSpace(input.Timeline) ? input.Timeline.Trim() : existingLead.Timeline;
            existingLead.UpdatedAt = now;

            if (!string.IsNullOrWhiteSpace(note))
            {
                existingLead.Notes.Add(note);
            }

            await _db.SaveChangesAsync();
            return existingLead;
        }

        private static string BuildSummary(Property property, CreatePropertyChatConversationInput input)
        {
            var lines = new List<string>();

            if (!string.IsNullOrWhiteSpace(input.ContactName)) lines.Add($"Name: {input.ContactName.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.ContactEmail)) lines.Add($"Email: {input.ContactEmail.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.ContactPhone)) lines.Add($"Phone: {input.ContactPhone.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.Budget)) lines.Add($"Budget: {input.Budget.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.Timeline)) lines.Add($"Timeline: {input.Timeline.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.Interest)) lines.Add($"Interest: {input.Interest.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.AdditionalMessage)) lines.Add($"Message: {input.AdditionalMessage.Trim()}");

            foreach (var answer in input.Answers ?? [])
            {
                if (string.IsNullOrWhiteSpace(answer.AnswerText))
                {
                    continue;
                }

                var prompt = string.IsNullOrWhiteSpace(answer.QuestionPrompt)
                    ? "Pre-question"
                    : answer.QuestionPrompt.Trim();

                lines.Add($"{prompt}: {answer.AnswerText.Trim()}");
            }

            if (lines.Count == 0)
            {
                lines.Add($"Inquiry about {property.Title}");
            }

            return string.Join("\n", lines);
        }

        private static List<PropertyChatMessage> BuildMessages(
            Property property,
            CreatePropertyChatConversationInput input,
            DateTime now)
        {
            var messages = new List<PropertyChatMessage>
            {
                new()
                {
                    CreatedAt = now,
                    Message = $"Visitor opened a chat for {property.Title}.",
                    SenderRole = PropertyChatSenderRole.System,
                }
            };

            foreach (var answer in input.Answers ?? [])
            {
                var prompt = string.IsNullOrWhiteSpace(answer.QuestionPrompt)
                    ? "Pre-question"
                    : answer.QuestionPrompt.Trim();

                messages.Add(new PropertyChatMessage
                {
                    CreatedAt = now,
                    Message = prompt,
                    SenderRole = PropertyChatSenderRole.System,
                });

                if (!string.IsNullOrWhiteSpace(answer.AnswerText) || !string.IsNullOrWhiteSpace(answer.AttachmentUrl))
                {
                    messages.Add(new PropertyChatMessage
                    {
                        AttachmentObjectName = NormalizeOptional(answer.AttachmentObjectName),
                        AttachmentUrl = NormalizeOptional(answer.AttachmentUrl),
                        CreatedAt = now,
                        Message = string.IsNullOrWhiteSpace(answer.AnswerText)
                            ? "Shared a file."
                            : answer.AnswerText.Trim(),
                        SenderRole = PropertyChatSenderRole.Visitor,
                    });
                }
            }

            var formattedDetails = BuildStructuredDetailsMessage(input);
            if (!string.IsNullOrWhiteSpace(formattedDetails))
            {
                messages.Add(new PropertyChatMessage
                {
                    CreatedAt = now,
                    Message = "Collected lead details",
                    SenderRole = PropertyChatSenderRole.System,
                });
                messages.Add(new PropertyChatMessage
                {
                    CreatedAt = now,
                    Message = formattedDetails,
                    SenderRole = PropertyChatSenderRole.Visitor,
                });
            }

            return messages;
        }

        private static string BuildStructuredDetailsMessage(CreatePropertyChatConversationInput input)
        {
            var lines = new List<string>();

            if (!string.IsNullOrWhiteSpace(input.ContactName)) lines.Add($"Name: {input.ContactName.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.ContactEmail)) lines.Add($"Email: {input.ContactEmail.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.ContactPhone)) lines.Add($"Phone: {input.ContactPhone.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.Budget)) lines.Add($"Budget: {input.Budget.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.Timeline)) lines.Add($"Timeline: {input.Timeline.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.Interest)) lines.Add($"Interest: {input.Interest.Trim()}");
            if (!string.IsNullOrWhiteSpace(input.AdditionalMessage)) lines.Add($"Message: {input.AdditionalMessage.Trim()}");

            return string.Join("\n", lines);
        }

        private static bool HasMinimumLeadData(CreatePropertyChatConversationInput input)
        {
            return !string.IsNullOrWhiteSpace(input.ContactName) &&
                   (!string.IsNullOrWhiteSpace(input.ContactEmail) || !string.IsNullOrWhiteSpace(input.ContactPhone));
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static PropertyChatConversationResponse MapConversation(PropertyChatConversation item)
        {
            return new PropertyChatConversationResponse(
                item.Id,
                item.PropertyId,
                item.PropertyTitle,
                item.AssignedAgent,
                item.ContactName,
                item.ContactEmail,
                item.ContactPhone,
                item.Budget,
                item.Timeline,
                item.Interest,
                item.Summary,
                item.QualificationScore,
                item.AutoQualified,
                item.Status,
                item.LeadId,
                item.CreatedAt,
                item.UpdatedAt,
                item.Messages
                    .OrderBy(message => message.CreatedAt)
                    .ThenBy(message => message.Id)
                    .Select(message => new PropertyChatMessageResponse(
                        message.Id,
                        message.SenderRole,
                        message.Message,
                        message.AttachmentUrl,
                        message.AttachmentObjectName,
                        message.CreatedAt))
                    .ToList()
            );
        }
    }
}
