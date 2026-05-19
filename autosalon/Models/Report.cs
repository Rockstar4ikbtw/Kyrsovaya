namespace autosalon.Models
{
    public class Report
    {
        public int Id { get; set; }

        public DateTime CreatedAt { get; set; }

        public int Period { get; set; }

        public DateTime DateFrom { get; set; }

        public DateTime DateTo { get; set; }

        public int AccountantId { get; set; }

        public int TotalSales { get; set; }

        public long TotalRevenue { get; set; }

        public long TotalPayments { get; set; }

        public string? Notes { get; set; }
    }
}