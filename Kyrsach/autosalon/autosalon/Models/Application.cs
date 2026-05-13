using System.ComponentModel.DataAnnotations;

namespace autosalon.Models
{
    public enum Statuse
    {
        New = 1,
        InProgress = 2,
        Approved = 3,
        Rejected = 4
    }

    public class Application
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Дата обязательна!")]
        public DateTime DateTime { get; set; }

        public int? SaleId { get; set; }

        public Sale? Sale { get; set; }
    }
}
