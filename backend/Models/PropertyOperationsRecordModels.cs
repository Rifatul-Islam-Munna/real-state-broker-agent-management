namespace Models
{
    public sealed class PropertyOperationsRecordResponse
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string ModuleKey { get; set; } = string.Empty;
        public string RecordType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public decimal? Amount { get; set; }
        public DateTime? DueAt { get; set; }
        public string PayloadJson { get; set; } = "{}";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public sealed class SavePropertyOperationsRecordRequest
    {
        public int? Id { get; set; }
        public int PropertyId { get; set; }
        public string ModuleKey { get; set; } = string.Empty;
        public string RecordType { get; set; } = "Item";
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "Open";
        public string Priority { get; set; } = "Normal";
        public decimal? Amount { get; set; }
        public DateTime? DueAt { get; set; }
        public string PayloadJson { get; set; } = "{}";
    }
}
