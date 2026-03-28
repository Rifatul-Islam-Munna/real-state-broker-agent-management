using System.Globalization;
using System.Text.RegularExpressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Microsoft.ML.Data;

namespace Services
{
    public record PropertySellPredictionResponse(
        int PredictedDays,
        bool IsModelTrained,
        int TrainingSampleSize,
        float Confidence,
        int HistoricalAverageDays,
        string Basis
    );

    public class PropertySalesPredictionService
    {
        private readonly AppDbContext _db;
        private readonly MLContext _mlContext = new(seed: 42);
        private Task<ModelState>? _modelTask;

        public PropertySalesPredictionService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<PropertySellPredictionResponse> PredictAsync(Property property, CancellationToken ct = default)
        {
            var model = await EnsureModelAsync(ct);
            var comparableRows = SelectComparableRows(property, model.Rows);
            var historicalAverageDays = comparableRows.Count > 0
                ? (int)Math.Round(comparableRows.Average(item => item.Label))
                : model.Rows.Count > 0
                    ? (int)Math.Round(model.Rows.Average(item => item.Label))
                    : EstimateWithoutHistory(property);

            if (!model.IsModelTrained || model.PredictionEngine is null)
            {
                return new PropertySellPredictionResponse(
                    Math.Max(7, historicalAverageDays),
                    false,
                    model.Rows.Count,
                    model.Confidence,
                    Math.Max(7, historicalAverageDays),
                    model.Rows.Count > 0
                        ? "Historical closed-property average"
                        : "Rule-based estimate until enough history exists"
                );
            }

            var predictedScore = model.PredictionEngine.Predict(MapInput(property)).Score;
            var predictedDays = NormalizePredictedDays(predictedScore, historicalAverageDays);

            return new PropertySellPredictionResponse(
                predictedDays,
                true,
                model.Rows.Count,
                model.Confidence,
                Math.Max(7, historicalAverageDays),
                "ML.NET regression trained from closed-property history"
            );
        }

        private Task<ModelState> EnsureModelAsync(CancellationToken ct)
        {
            _modelTask ??= TrainModelAsync(ct);
            return _modelTask;
        }

        private async Task<ModelState> TrainModelAsync(CancellationToken ct)
        {
            var rows = await BuildTrainingRowsAsync(ct);

            if (rows.Count < 5)
            {
                return new ModelState(rows, false, null, Math.Clamp(rows.Count / 10f, 0.15f, 0.45f));
            }

            var dataView = _mlContext.Data.LoadFromEnumerable(rows);
            var trainData = dataView;
            IDataView? testData = null;

            if (rows.Count >= 8)
            {
                var split = _mlContext.Data.TrainTestSplit(dataView, testFraction: 0.2);
                trainData = split.TrainSet;
                testData = split.TestSet;
            }

            var pipeline = _mlContext.Transforms.Categorical.OneHotEncoding(new[]
                {
                    new InputOutputColumnPair("PropertyTypeEncoded", nameof(SalesTrainingRow.PropertyType)),
                    new InputOutputColumnPair("ListingTypeEncoded", nameof(SalesTrainingRow.ListingType)),
                })
                .Append(_mlContext.Transforms.Text.FeaturizeText("LocationFeatures", nameof(SalesTrainingRow.Location)))
                .Append(_mlContext.Transforms.Text.FeaturizeText("ExactLocationFeatures", nameof(SalesTrainingRow.ExactLocation)))
                .Append(_mlContext.Transforms.Text.FeaturizeText("DescriptionFeatures", nameof(SalesTrainingRow.Description)))
                .Append(_mlContext.Transforms.Concatenate(
                    "NumericFeatures",
                    nameof(SalesTrainingRow.Price),
                    nameof(SalesTrainingRow.Bedrooms),
                    nameof(SalesTrainingRow.Bathrooms),
                    nameof(SalesTrainingRow.Size),
                    nameof(SalesTrainingRow.AmenityCount)))
                .Append(_mlContext.Transforms.NormalizeMinMax("NumericFeatures"))
                .Append(_mlContext.Transforms.Concatenate(
                    "Features",
                    "PropertyTypeEncoded",
                    "ListingTypeEncoded",
                    "LocationFeatures",
                    "ExactLocationFeatures",
                    "DescriptionFeatures",
                    "NumericFeatures"))
                .Append(_mlContext.Regression.Trainers.FastTree(
                    labelColumnName: nameof(SalesTrainingRow.Label),
                    featureColumnName: "Features"));

            var fittedModel = pipeline.Fit(trainData);
            float confidence = Math.Clamp(rows.Count / 25f, 0.35f, 0.8f);

            if (testData is not null)
            {
                var predictions = fittedModel.Transform(testData);
                var metrics = _mlContext.Regression.Evaluate(predictions, labelColumnName: nameof(SalesTrainingRow.Label));
                confidence = Math.Clamp(
                    ((float)Math.Max(metrics.RSquared, 0.1) * 0.65f) + (Math.Min(rows.Count, 40) / 40f * 0.35f),
                    0.2f,
                    0.92f);
            }

            var predictionEngine = _mlContext.Model.CreatePredictionEngine<SalesPredictionInput, SalesPredictionOutput>(fittedModel);
            return new ModelState(rows, true, predictionEngine, confidence);
        }

        private async Task<List<SalesTrainingRow>> BuildTrainingRowsAsync(CancellationToken ct)
        {
            var closedProperties = await _db.Properties
                .AsNoTracking()
                .Where(item => item.Status == PropertyStatus.Closed && item.ClosedAt.HasValue && item.ClosedAt.Value > item.CreatedAt)
                .ToListAsync(ct);

            return closedProperties
                .Select(item => new SalesTrainingRow
                {
                    AmenityCount = item.KeyAmenities?.Count ?? 0,
                    Bathrooms = ParseNumericValue(item.BathRoom),
                    Bedrooms = ParseNumericValue(item.BedRoom),
                    Description = item.Description ?? string.Empty,
                    ExactLocation = item.ExactLocation ?? string.Empty,
                    Label = (float)Math.Max(1, Math.Ceiling((item.ClosedAt!.Value - item.CreatedAt).TotalDays)),
                    ListingType = item.ListingType.ToString(),
                    Location = item.Location ?? string.Empty,
                    Price = ParseNumericValue(item.Price),
                    PropertyType = item.PropertyType.ToString(),
                    Size = ParseNumericValue(item.Width),
                })
                .Where(item => item.Label > 0)
                .ToList();
        }

        private static SalesPredictionInput MapInput(Property property)
        {
            return new SalesPredictionInput
            {
                AmenityCount = property.KeyAmenities?.Count ?? 0,
                Bathrooms = ParseNumericValue(property.BathRoom),
                Bedrooms = ParseNumericValue(property.BedRoom),
                Description = property.Description ?? string.Empty,
                ExactLocation = property.ExactLocation ?? string.Empty,
                ListingType = property.ListingType.ToString(),
                Location = property.Location ?? string.Empty,
                Price = ParseNumericValue(property.Price),
                PropertyType = property.PropertyType.ToString(),
                Size = ParseNumericValue(property.Width),
            };
        }

        private static List<SalesTrainingRow> SelectComparableRows(Property property, List<SalesTrainingRow> rows)
        {
            var location = NormalizeText(property.Location);
            var propertyType = property.PropertyType.ToString();
            var listingType = property.ListingType.ToString();

            var exactMatches = rows
                .Where(item =>
                    item.PropertyType == propertyType &&
                    item.ListingType == listingType &&
                    NormalizeText(item.Location) == location)
                .ToList();

            if (exactMatches.Count > 0)
            {
                return exactMatches;
            }

            var typeMatches = rows
                .Where(item => item.PropertyType == propertyType && item.ListingType == listingType)
                .ToList();

            return typeMatches.Count > 0 ? typeMatches : rows;
        }

        private static int NormalizePredictedDays(float predictedScore, int historicalAverageDays)
        {
            if (float.IsNaN(predictedScore) || float.IsInfinity(predictedScore) || predictedScore <= 0)
            {
                return Math.Max(7, historicalAverageDays);
            }

            var rounded = (int)Math.Round(predictedScore);
            return Math.Clamp(rounded, 7, 365);
        }

        private static int EstimateWithoutHistory(Property property)
        {
            var price = ParseNumericValue(property.Price);
            var baseDays = property.PropertyType == PropertyCategory.Commercial ? 120 : 75;

            if (price > 1_500_000)
            {
                baseDays += 30;
            }
            else if (price > 750_000)
            {
                baseDays += 14;
            }

            if (!string.IsNullOrWhiteSpace(property.Description) && property.Description.Length >= 180)
            {
                baseDays -= 8;
            }

            if ((property.KeyAmenities?.Count ?? 0) >= 5)
            {
                baseDays -= 6;
            }

            return Math.Clamp(baseDays, 21, 180);
        }

        private static float ParseNumericValue(string? rawValue)
        {
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                return 0;
            }

            var matches = Regex.Matches(rawValue.ToUpperInvariant(), @"(\d+(?:\.\d+)?)\s*([MK])?");

            if (matches.Count == 0)
            {
                return 0;
            }

            var values = matches
                .Select(match =>
                {
                    var numeric = float.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                    var unit = match.Groups[2].Value;

                    return unit switch
                    {
                        "M" => numeric * 1_000_000f,
                        "K" => numeric * 1_000f,
                        _ => numeric
                    };
                })
                .ToList();

            return values.Count == 0 ? 0 : values.Average();
        }

        private static string NormalizeText(string? value)
        {
            return (value ?? string.Empty).Trim().ToLowerInvariant();
        }

        private sealed class ModelState
        {
            public ModelState(
                List<SalesTrainingRow> rows,
                bool isModelTrained,
                PredictionEngine<SalesPredictionInput, SalesPredictionOutput>? predictionEngine,
                float confidence)
            {
                Rows = rows;
                IsModelTrained = isModelTrained;
                PredictionEngine = predictionEngine;
                Confidence = confidence;
            }

            public List<SalesTrainingRow> Rows { get; }
            public bool IsModelTrained { get; }
            public PredictionEngine<SalesPredictionInput, SalesPredictionOutput>? PredictionEngine { get; }
            public float Confidence { get; }
        }

        private class SalesPredictionInput
        {
            public float Price { get; set; }
            public string Location { get; set; } = string.Empty;
            public string ExactLocation { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string PropertyType { get; set; } = string.Empty;
            public string ListingType { get; set; } = string.Empty;
            public float Bedrooms { get; set; }
            public float Bathrooms { get; set; }
            public float Size { get; set; }
            public float AmenityCount { get; set; }
        }

        private sealed class SalesTrainingRow : SalesPredictionInput
        {
            [ColumnName("Label")]
            public float Label { get; set; }
        }

        private sealed class SalesPredictionOutput
        {
            public float Score { get; set; }
        }
    }
}
