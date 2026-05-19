using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace autosalon.Models
{
    public class Payment
    {
        public int Id { get; set; }

        [Range(0, 100000000, ErrorMessage = "Сумма указана неверно!")]
        public int Sum { get; set; }

        [Required(ErrorMessage = "Дата обязательна!")]
        public DateTime DateTime { get; set; }

        [Required]
        public int SaleId { get; set; }
        [JsonIgnore]
        public Sale? Sale { get; set; }

        [Required]
        public int ManagerId { get; set; }
        [JsonIgnore]
        public User? Manager { get; set; }

        public string? Note { get; set; }
    }
}