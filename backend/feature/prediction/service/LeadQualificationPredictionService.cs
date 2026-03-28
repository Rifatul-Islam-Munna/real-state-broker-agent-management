using System.Globalization;
using System.Text.RegularExpressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Microsoft.ML.Data;

namespace Services
{
    public record LeadQualificationPrediction(
        bool ShouldCreateLead,
        float Score,
        LeadPriority Priority,
        LeadStage Stage,
        bool InBoard,
        string Basis
    );

    public class LeadQualificationPredictionService
    {
        private readonly AppDbContext _db;
        private readonly MLContext _mlContext = new(seed: 7);
        private Task<ModelState>? _modelTask;

        public LeadQualificationPredictionService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<LeadQualificationPrediction> PredictAsync(
            string summary,
            string budget,
            string interest,
            string timeline,
            string propertyTitle,
            string propertyLocation,
            string email,
            string phone,
            CancellationToken ct = default)
        {
            var completenessScore = BuildCompletenessScore(summary, budget, interest, timeline, email, phone);
            var model = await EnsureModelAsync(ct);

            if (!model.IsModelTrained || model.PredictionEngine is null)
            {
                return BuildFallbackPrediction(completenessScore, summary, interest, timeline);
            }

            var predictionScore = model.PredictionEngine.Predict(new LeadPredictionInput
            {
                Budget = ParseBudget(budget),
                HasEmail = string.IsNullOrWhiteSpace(email) ? 0 : 1,
                HasPhone = string.IsNullOrWhiteSpace(phone) ? 0 : 1,
                Interest = interest ?? string.Empty,
                PropertyLocation = propertyLocation ?? string.Empty,
                PropertyTitle = propertyTitle ?? string.Empty,
                Summary = summary ?? string.Empty,
                Timeline = timeline ?? string.Empty,
            }).Probability;

            var intentBoost = BuildIntentBoost(summary, interest, timeline);
            var finalScore = Math.Clamp((predictionScore * 0.65f) + (completenessScore * 0.25f) + intentBoost, 0, 1);
            return BuildPrediction(
                finalScore,
                "ML.NET lead qualification blended with intake completeness and urgency intent",
                HasStrongIntent(summary, interest, timeline));
        }

        private Task<ModelState> EnsureModelAsync(CancellationToken ct)
        {
            _modelTask ??= TrainModelAsync(ct);
            return _modelTask;
        }

        private async Task<ModelState> TrainModelAsync(CancellationToken ct)
        {
            var rows = await _db.Leads
                .AsNoTracking()
                .Select(item => new LeadTrainingRow
                {
                    Budget = ParseBudget(item.Budget),
                    HasEmail = string.IsNullOrWhiteSpace(item.Email) ? 0 : 1,
                    HasPhone = string.IsNullOrWhiteSpace(item.Phone) ? 0 : 1,
                    Interest = item.Interest ?? string.Empty,
                    Label = item.Stage == LeadStage.Qualified ||
                            item.Stage == LeadStage.Visit ||
                            item.Stage == LeadStage.Negotiation ||
                            item.Stage == LeadStage.Deal,
                    PropertyLocation = item.Property ?? string.Empty,
                    PropertyTitle = item.Property ?? string.Empty,
                    Summary = item.Summary ?? string.Empty,
                    Timeline = item.Timeline ?? string.Empty,
                })
                .ToListAsync(ct);

            var positiveCount = rows.Count(item => item.Label);
            var negativeCount = rows.Count - positiveCount;

            if (rows.Count < 8 || positiveCount == 0 || negativeCount == 0)
            {
                return new ModelState(false, null);
            }

            var dataView = _mlContext.Data.LoadFromEnumerable(rows);
            var split = _mlContext.Data.TrainTestSplit(dataView, testFraction: 0.2);

            var pipeline = _mlContext.Transforms.Categorical.OneHotEncoding("InterestEncoded", nameof(LeadTrainingRow.Interest))
                .Append(_mlContext.Transforms.Categorical.OneHotEncoding("TimelineEncoded", nameof(LeadTrainingRow.Timeline)))
                .Append(_mlContext.Transforms.Text.FeaturizeText("SummaryFeatures", nameof(LeadTrainingRow.Summary)))
                .Append(_mlContext.Transforms.Text.FeaturizeText("PropertyTitleFeatures", nameof(LeadTrainingRow.PropertyTitle)))
                .Append(_mlContext.Transforms.Text.FeaturizeText("PropertyLocationFeatures", nameof(LeadTrainingRow.PropertyLocation)))
                .Append(_mlContext.Transforms.Concatenate(
                    "NumericFeatures",
                    nameof(LeadTrainingRow.Budget),
                    nameof(LeadTrainingRow.HasEmail),
                    nameof(LeadTrainingRow.HasPhone)))
                .Append(_mlContext.Transforms.NormalizeMinMax("NumericFeatures"))
                .Append(_mlContext.Transforms.Concatenate(
                    "Features",
                    "InterestEncoded",
                    "TimelineEncoded",
                    "SummaryFeatures",
                    "PropertyTitleFeatures",
                    "PropertyLocationFeatures",
                    "NumericFeatures"))
                .Append(_mlContext.BinaryClassification.Trainers.SdcaLogisticRegression(
                    labelColumnName: nameof(LeadTrainingRow.Label),
                    featureColumnName: "Features"));

            var fittedModel = pipeline.Fit(split.TrainSet);
            var engine = _mlContext.Model.CreatePredictionEngine<LeadPredictionInput, LeadPredictionOutput>(fittedModel);
            return new ModelState(true, engine);
        }

        private static LeadQualificationPrediction BuildFallbackPrediction(float completenessScore, string summary, string interest, string timeline)
        {
            return BuildPrediction(
                completenessScore + BuildIntentBoost(summary, interest, timeline),
                "Rule-based qualification until enough lead history exists",
                HasStrongIntent(summary, interest, timeline));
        }

        private static LeadQualificationPrediction BuildPrediction(float score, string basis, bool forceBoard = false)
        {
            var effectiveScore = Math.Clamp(forceBoard ? Math.Max(score, 0.72f) : score, 0, 1);
            var shouldCreateLead = forceBoard || effectiveScore >= 0.45f;
            var priority = effectiveScore >= 0.8f
                ? LeadPriority.HighPriority
                : effectiveScore >= 0.6f
                    ? LeadPriority.Warm
                    : LeadPriority.FollowUp;
            var stage = forceBoard || effectiveScore >= 0.65f ? LeadStage.Qualified : LeadStage.New;

            return new LeadQualificationPrediction(
                shouldCreateLead,
                effectiveScore,
                priority,
                stage,
                forceBoard || effectiveScore >= 0.65f,
                basis
            );
        }

        private static float BuildCompletenessScore(
            string summary,
            string budget,
            string interest,
            string timeline,
            string email,
            string phone)
        {
            float score = 0;

            if (!string.IsNullOrWhiteSpace(summary) && summary.Trim().Length >= 16) score += 0.28f;
            if (!string.IsNullOrWhiteSpace(budget)) score += 0.18f;
            if (!string.IsNullOrWhiteSpace(interest)) score += 0.14f;
            if (!string.IsNullOrWhiteSpace(timeline)) score += 0.14f;
            if (!string.IsNullOrWhiteSpace(email)) score += 0.13f;
            if (!string.IsNullOrWhiteSpace(phone)) score += 0.13f;

            return Math.Clamp(score, 0, 1);
        }

        private static float ParseBudget(string? budget)
        {
            if (string.IsNullOrWhiteSpace(budget))
            {
                return 0;
            }

            var matches = Regex.Matches(budget.ToUpperInvariant(), @"(\d+(?:\.\d+)?)\s*([MK])?");

            if (matches.Count == 0)
            {
                return 0;
            }

            var values = matches
                .Select(match =>
                {
                    var numeric = float.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                    return match.Groups[2].Value switch
                    {
                        "M" => numeric * 1_000_000f,
                        "K" => numeric * 1_000f,
                        _ => numeric
                    };
                })
                .ToList();

            return values.Count == 0 ? 0 : values.Average();
        }

        private static bool HasStrongIntent(string? summary, string? interest, string? timeline)
        {
            var normalizedInterest = Normalize(interest);
            var normalizedTimeline = Normalize(timeline);
            var normalizedSummary = Normalize(summary);

            var urgentTimeline = normalizedTimeline.Contains("this month") ||
                                 normalizedTimeline.Contains("immediate") ||
                                 normalizedTimeline.Contains("asap") ||
                                 normalizedTimeline.Contains("urgent") ||
                                 normalizedTimeline.Contains("within 30 days");

            var strongInterest = normalizedInterest.Contains("schedule viewing") ||
                                 normalizedInterest.Contains("schedule a viewing") ||
                                 normalizedInterest.Contains("buy") ||
                                 normalizedInterest.Contains("visit") ||
                                 normalizedInterest.Contains("book a tour") ||
                                 normalizedSummary.Contains("schedule viewing") ||
                                 normalizedSummary.Contains("schedule a viewing") ||
                                 normalizedSummary.Contains("book a tour");

            return urgentTimeline && strongInterest;
        }

        private static float BuildIntentBoost(string? summary, string? interest, string? timeline)
        {
            var normalizedInterest = Normalize(interest);
            var normalizedTimeline = Normalize(timeline);
            var normalizedSummary = Normalize(summary);
            float boost = 0;

            if (normalizedTimeline.Contains("this month") ||
                normalizedTimeline.Contains("within 30 days") ||
                normalizedTimeline.Contains("immediate") ||
                normalizedTimeline.Contains("asap"))
            {
                boost += 0.14f;
            }

            if (normalizedInterest.Contains("schedule viewing") ||
                normalizedInterest.Contains("schedule a viewing") ||
                normalizedInterest.Contains("visit") ||
                normalizedInterest.Contains("buy"))
            {
                boost += 0.12f;
            }

            if (normalizedSummary.Contains("need") ||
                normalizedSummary.Contains("urgent") ||
                normalizedSummary.Contains("as soon as possible"))
            {
                boost += 0.06f;
            }

            return Math.Clamp(boost, 0, 0.28f);
        }

        private static string Normalize(string? value)
        {
            return (value ?? string.Empty).Trim().ToLowerInvariant();
        }

        private sealed class ModelState
        {
            public ModelState(bool isModelTrained, PredictionEngine<LeadPredictionInput, LeadPredictionOutput>? predictionEngine)
            {
                IsModelTrained = isModelTrained;
                PredictionEngine = predictionEngine;
            }

            public bool IsModelTrained { get; }
            public PredictionEngine<LeadPredictionInput, LeadPredictionOutput>? PredictionEngine { get; }
        }

        private class LeadPredictionInput
        {
            public float Budget { get; set; }
            public string Summary { get; set; } = string.Empty;
            public string Interest { get; set; } = string.Empty;
            public string Timeline { get; set; } = string.Empty;
            public string PropertyTitle { get; set; } = string.Empty;
            public string PropertyLocation { get; set; } = string.Empty;
            public float HasEmail { get; set; }
            public float HasPhone { get; set; }
        }

        private sealed class LeadTrainingRow : LeadPredictionInput
        {
            [ColumnName("Label")]
            public bool Label { get; set; }
        }

        private sealed class LeadPredictionOutput
        {
            public bool PredictedLabel { get; set; }
            public float Probability { get; set; }
            public float Score { get; set; }
        }
    }
}
