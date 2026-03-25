using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;

namespace Services;

public sealed record ApiExceptionResponse(
    int StatusCode,
    string Message,
    string TraceId
);

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        if (httpContext.Response.HasStarted)
        {
            return false;
        }

        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        var (statusCode, message) = MapException(exception);

        logger.LogError(
            exception,
            "Unhandled exception for {Method} {Path}. TraceId: {TraceId}",
            httpContext.Request.Method,
            httpContext.Request.Path,
            traceId
        );

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";

        await httpContext.Response.WriteAsJsonAsync(
            new ApiExceptionResponse(statusCode, message, traceId),
            cancellationToken: ct
        );

        return true;
    }

    private static (int StatusCode, string Message) MapException(Exception exception)
    {
        return exception switch
        {
            ArgumentException ex => (StatusCodes.Status400BadRequest, ex.Message),
            UnauthorizedAccessException ex => (
                StatusCodes.Status403Forbidden,
                string.IsNullOrWhiteSpace(ex.Message) ? "Access denied." : ex.Message
            ),
            KeyNotFoundException ex => (
                StatusCodes.Status404NotFound,
                string.IsNullOrWhiteSpace(ex.Message) ? "Resource not found." : ex.Message
            ),
            BadHttpRequestException ex => (StatusCodes.Status400BadRequest, ex.Message),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };
    }
}
