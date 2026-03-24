using Entities;
using FastEndpoints;
using Services;

namespace Endpoints
{
    public class CreateContactRequestEndpoint : Endpoint<ContactRequest, ContactRequestResponse>
    {
        public required ContactRequestService ContactRequestService { get; set; }

        public override void Configure()
        {
            Post("/contact-requests");
            AllowAnonymous();
            Summary(s => s.Summary = "Create a contact request from the public contact form");
        }

        public override async Task HandleAsync(ContactRequest req, CancellationToken ct)
        {
            var result = await ContactRequestService.CreateContactRequestAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateContactRequestEndpoint : Endpoint<ContactRequest, ContactRequestResponse>
    {
        public required ContactRequestService ContactRequestService { get; set; }

        public override void Configure()
        {
            Patch("/contact-requests");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Update a contact request");
        }

        public override async Task HandleAsync(ContactRequest req, CancellationToken ct)
        {
            var result = await ContactRequestService.UpdateContactRequestAsync(req);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }

    public class DeleteContactRequestEndpoint : Endpoint<DeleteContactRequestEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required ContactRequestService ContactRequestService { get; set; }

        public override void Configure()
        {
            Delete("/contact-requests");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Delete a contact request");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await ContactRequestService.DeleteContactRequestAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetContactRequestEndpoint : Endpoint<GetContactRequestEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int? Id { get; set; }

            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public ContactRequestStatus? Status { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public required ContactRequestService ContactRequestService { get; set; }

        public override void Configure()
        {
            Get("/contact-requests");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get a contact request by id or a paginated contact request list");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            if (req.Id.HasValue)
            {
                var result = await ContactRequestService.GetContactRequestAsync(req.Id.Value);

                if (result is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(result, ct);
                return;
            }

            var resultList = await ContactRequestService.GetAllContactRequestsAsync(req.Page, req.PageSize, req.Search, req.Status);
            await Send.OkAsync(resultList, ct);
        }
    }

    public class ConvertContactRequestToLeadEndpoint : Endpoint<ConvertContactRequestInput, LeadResponse>
    {
        public required ContactRequestService ContactRequestService { get; set; }

        public override void Configure()
        {
            Post("/contact-requests/convert-to-lead");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Convert a contact request into a lead");
        }

        public override async Task HandleAsync(ConvertContactRequestInput req, CancellationToken ct)
        {
            var result = await ContactRequestService.ConvertToLeadAsync(req.ContactRequestId);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }
}
