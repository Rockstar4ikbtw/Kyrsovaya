using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

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

        [Required(ErrorMessage = "Автомобиль обязателен!")]
        public int? CarId { get; set; }

        [JsonIgnore]
        public Car? Car { get; set; }

        public int? SaleId { get; set; }

        [JsonIgnore]
        public Sale? Sale { get; set; }
    }
}